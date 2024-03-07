/* eslint-disable react/destructuring-assignment */
import { Intent, NonIdealState, Spinner } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { FkTypes } from '@gms/common-model';
import { EventTypes, SignalDetectionTypes, WorkflowTypes } from '@gms/common-model';
import { DeprecatedToolbar, DeprecatedToolbarTypes } from '@gms/ui-core-components';
import { addGlForceUpdateOnResize, addGlForceUpdateOnShow, UILogger } from '@gms/ui-util';
import Immutable from 'immutable';
import filter from 'lodash/filter';
import isEqual from 'lodash/isEqual';
import React from 'react';

import {
  getDistanceToStationsForPreferredLocationSolutionId,
  getOpenEvent
} from '~analyst-ui/common/utils/event-util';
import {
  computeFkFrequencyThumbnails,
  computeFks,
  createComputeFkInput,
  getAssociatedDetectionsWithFks,
  getDefaultFkConfigurationForSignalDetection,
  getFkData,
  getFkDummyData,
  getFkUnitForSdId
} from '~analyst-ui/common/utils/fk-utils';
import { systemConfig } from '~analyst-ui/config/system-config';
import { userPreferences } from '~analyst-ui/config/user-preferences';

import { AzimuthSlownessPanel } from './azimuth-slowness-panel';
import { FilterType, FkThumbnailSize } from './components/fk-thumbnail-list/fk-thumbnails-controls';
import * as fkUtil from './components/fk-util';
import { FrequencyBands } from './constants';
import type { AzimuthSlownessProps, AzimuthSlownessState, FkParams, FkUnits } from './types';

const logger = UILogger.create('GMS_LOG_AZIMUTH_SLOWNESS', process.env.GMS_LOG_AZIMUTH_SLOWNESS);

/**
 * Default width for the fk thumbnail list
 * Was previously in css, but moved here to enable persistent resizing
 */
const DEFAULT_FK_THUMBNAIL_LIST_SIZE_PX = 255;

/**
 * Different P types we filter on for first P
 */
const FIRST_P_FILTER_NAMES = ['P', 'Pn', 'Pg'];

/**
 * Azimuth Slowness primary component
 */
export class AzimuthSlowness extends React.Component<AzimuthSlownessProps, AzimuthSlownessState> {
  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Constructor.
   *
   * @param props The initial props
   */
  public constructor(props: AzimuthSlownessProps) {
    super(props);
    this.state = {
      fkThumbnailSizePx: FkThumbnailSize.MEDIUM,
      filterType: FilterType.all,
      fkThumbnailColumnSizePx: DEFAULT_FK_THUMBNAIL_LIST_SIZE_PX,
      userInputFkFrequency: {
        minFrequencyHz: 1.25,
        maxFrequencyHz: 3.25
      },
      userInputFkWindowParameters: {
        leadSeconds: 1,
        stepSize: 1,
        lengthSeconds: 4
      },
      fkInnerContainerWidthPx: 0,
      numberOfOutstandingComputeFkMutations: 0,
      fkUnitsForEachSdId: Immutable.Map<string, FkUnits>(),
      fkFrequencyThumbnails: Immutable.Map<string, FkTypes.FkFrequencyThumbnail[]>(),
      displayedSignalDetection: undefined
    };
  }

  /**
   * Invoked when the component mounted.
   */
  public componentDidMount(): void {
    addGlForceUpdateOnShow(this.props.glContainer, this);
    addGlForceUpdateOnResize(this.props.glContainer, this);
  }

  /**
   * Invoked when the component mounted.
   *
   * @param prevProps The previous props
   * @param prevState The previous state
   */
  public componentDidUpdate(prevProps: AzimuthSlownessProps): void {
    // Only care about the first one, since when multi selected, no fk is displayed
    if (!isEqual(this.props.sdIdsToShowFk, prevProps.sdIdsToShowFk)) {
      const assocSds = this.getAssociatedSDsWithFkData();
      const signalDetectionsByStation = this.props.signalDetectionResults.data
        ? this.props.signalDetectionResults.data
        : [];
      const newIdsToShow = this.props.sdIdsToShowFk
        .filter(sdId => !assocSds.find(assocSd => assocSd.id === sdId))
        .filter(
          sdId =>
            // no need to compute an FK if we already have an fk
            !getFkData(
              signalDetectionsByStation.find(sd => sd.id === sdId),
              this.props.channelSegmentResults.data
            )
        );
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.showOrGenerateSignalDetectionFk(newIdsToShow).catch(error =>
        logger.error(`Failed to show or generate Signal Detection DK: ${error}`)
      );
    }

    // Check and see if we are missing any thumbnails from the state
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.checkIfNeedMissingThumbnails().then(() => {
      if (this.props.analysisMode) {
        const { analysisMode } = this.props;
        const prevPropsAnalysisMode = prevProps.analysisMode;

        if (analysisMode && analysisMode !== prevPropsAnalysisMode) {
          if (analysisMode === WorkflowTypes.AnalysisMode.EVENT_REVIEW) {
            this.setState({
              filterType: FilterType.firstP
            });
          } else if (analysisMode === WorkflowTypes.AnalysisMode.SCAN) {
            this.setState({
              filterType: FilterType.all
            });
          }
        }
      }
    });
  }

  // ***************************************
  // END REACT COMPONENT LIFECYCLE METHODS
  // ***************************************
  /**
   * Returns an immutable map of signal detection ids to an array of feature predictions.
   *
   * @param signalDetections the signal detections
   * @returns an immutable map of signal detections ids to feature predictions
   */
  private readonly getSignalDetectionsWithFeaturePredictions = (
    signalDetections: SignalDetectionTypes.SignalDetection[]
  ): Immutable.Map<string, EventTypes.FeaturePrediction[]> => {
    const signalDetectionsIdToFeaturePredictions: Map<
      string,
      EventTypes.FeaturePrediction[]
    > = new Map<string, EventTypes.FeaturePrediction[]>();

    const openEvent = getOpenEvent(
      this.props.openEventId,
      this.props.eventResults.data ? this.props.eventResults.data : undefined
    );

    const preferredHypothesis = EventTypes.findPreferredEventHypothesis(
      openEvent,
      this.props.openIntervalName,
      this.props.stageNames
    );

    const locationSolution = preferredHypothesis
      ? EventTypes.findPreferredLocationSolution(
          preferredHypothesis.id.hypothesisId,
          openEvent.eventHypotheses
        )
      : undefined;
    const featurePredictions: EventTypes.FeaturePrediction[] = locationSolution
      ? locationSolution.featurePredictions.featurePredictions
      : [];

    signalDetections.forEach(sd => {
      const signalDetectionFeaturePredictions = featurePredictions.filter(featurePrediction => {
        const signalDetectionPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
          SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
            .featureMeasurements
        ).value;
        return (
          featurePrediction.channel.name === sd.station.name &&
          featurePrediction.phase === signalDetectionPhase
        );
      });
      signalDetectionsIdToFeaturePredictions.set(sd.id, signalDetectionFeaturePredictions);
    });
    return Immutable.Map(signalDetectionsIdToFeaturePredictions);
  };

  /**
   * Update the FK thumbnail pixel size.
   *
   * @param size The pixel width of the fk thumbnails
   */
  private readonly updateFkThumbnailSize = (size: FkThumbnailSize) => {
    this.setState({
      fkThumbnailSizePx: size
    });
  };

  /**
   * Return the signal detections that could be used
   */
  private readonly getSignalDetectionsToDisplay = (): SignalDetectionTypes.SignalDetection[] => {
    if (this.props.signalDetectionResults.data) {
      const allSignalDetections = this.props.signalDetectionResults.data;
      const associatedSdWithFkData = this.getAssociatedSDsWithFkData();
      const fkSdsToShow = allSignalDetections.filter(
        sd =>
          this.props.sdIdsToShowFk.find(sdId => sdId === sd.id) &&
          !associatedSdWithFkData.find(sdWithFk => sdWithFk.id === sd.id)
      );
      const openEvent = getOpenEvent(
        this.props.openEventId,
        this.props.eventResults.data ? this.props.eventResults.data : undefined
      );
      if (openEvent) {
        return [...fkSdsToShow, ...associatedSdWithFkData];
      }
      return fkSdsToShow;
    }
    return [];
  };

  /**
   * Gets a list of associated signal detections with fk data to render
   */
  private readonly getAssociatedSDsWithFkData = (): SignalDetectionTypes.SignalDetection[] => {
    const openEvent = getOpenEvent(
      this.props.openEventId,
      this.props.eventResults.data ? this.props.eventResults.data : undefined
    );
    const allSignalDetections = this.props.signalDetectionResults.data
      ? this.props.signalDetectionResults.data
      : [];
    return getAssociatedDetectionsWithFks(openEvent, allSignalDetections);
  };

  /**
   * Filters signal detections based on the selected filter
   *
   * @param sds Signal detections to filter
   */
  private readonly filterSignalDetections = (
    sds: SignalDetectionTypes.SignalDetection[],
    assocSDs: SignalDetectionTypes.SignalDetection[]
  ): SignalDetectionTypes.SignalDetection[] => {
    // Removing rejected sd hypotheses
    const signalDetectionsToFilter = sds.filter(
      sd => !SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).rejected
    );
    let sdToDraw = signalDetectionsToFilter
      ? filter<SignalDetectionTypes.SignalDetection>(
          signalDetectionsToFilter,
          (sd: SignalDetectionTypes.SignalDetection) =>
            sd ? getFkDummyData(sd) !== undefined : false
        )
      : [];

    switch (this.state.filterType) {
      case FilterType.all: {
        // No action needs to be taken
        // Maybe refactor so it is in a method
        break;
      }
      // Further filter down the signal detection associations to first P phases
      // if the display is configured to do so
      case FilterType.firstP: {
        sdToDraw = this.firstPfilter(sdToDraw);
        break;
      }
      case FilterType.needsReview: {
        sdToDraw = fkUtil.filterInFksThatNeedReview(sdToDraw, assocSDs);
        break;
      }
      default: {
        sdToDraw = this.firstPfilter(sdToDraw);
      }
    }
    return sdToDraw;
  };

  /**
   * Update the filter
   *
   * @param filterType Filter to apply to fk display
   */
  private readonly updateFkFilter = (filterType: FilterType) => {
    this.setState({
      filterType
    });
  };

  /**
   * Filter for First P FKs
   */
  // eslint-disable-next-line class-methods-use-this
  private readonly firstPfilter = (sdsToFilter: SignalDetectionTypes.SignalDetection[]) => {
    const seenStations: string[] = [];
    // Sort by arrival time then only take the first p for each station
    sdsToFilter.sort((sd1, sd2) => {
      const sd1Arrival = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
        SignalDetectionTypes.Util.getCurrentHypothesis(sd1.signalDetectionHypotheses)
          .featureMeasurements
      );
      const sd2Arrival = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
        SignalDetectionTypes.Util.getCurrentHypothesis(sd2.signalDetectionHypotheses)
          .featureMeasurements
      );
      return sd1Arrival.arrivalTime.value - sd2Arrival.arrivalTime.value;
    });
    return sdsToFilter.filter(sd => {
      const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
        SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
          .featureMeasurements
      );
      const phaseStr = fmPhase.value.toString();
      const stationId = sd.station.name;
      const unseenStation = seenStations.indexOf(stationId) < 0;
      if (FIRST_P_FILTER_NAMES.indexOf(phaseStr) > -1 && unseenStation) {
        seenStations.push(stationId);
        return true;
      }
      return false;
    });
  };

  /**
   * Adjusts the inner container width of the FK thumbnails to ensure that it
   * is always centered properly.
   */
  private readonly adjustFkInnerContainerWidth = (
    fkThumbnailsContainer: HTMLDivElement,
    fkThumbnailsInnerContainer: HTMLDivElement
  ) => {
    const scrollbarWidth = 15;
    if (fkThumbnailsContainer && fkThumbnailsInnerContainer) {
      // calculate the inner container to allow the container to be centered
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      const outerContainerWidth: number = fkThumbnailsContainer.clientWidth + 2;
      const thumbnailSize: number = this.state.fkThumbnailSizePx;
      const innerContainerWidth: number =
        outerContainerWidth - (outerContainerWidth % (thumbnailSize + scrollbarWidth));
      // eslint-disable-next-line no-param-reassign
      fkThumbnailsInnerContainer.style.width = `${innerContainerWidth}px`;
      this.setState({ fkInnerContainerWidthPx: innerContainerWidth });
    }
  };

  private readonly setFkThumbnailColumnSizePx = (newSizePx: number) =>
    this.setState({ fkThumbnailColumnSizePx: newSizePx });

  /**
   * Changes the User Input Fk params in the state so that the
   * Controls in FK Display reflect the fk
   *
   * @param windowParams The new params to set in the state
   * @param frequencyBand The new frequency band to use in the state
   */
  private readonly changeUserInputFks = (
    windowParams: FkTypes.WindowParameters,
    frequencyBand: FkTypes.FrequencyBand
  ) =>
    this.setState({
      userInputFkFrequency: frequencyBand,
      userInputFkWindowParameters: windowParams
    });

  /**
   * Calls computeFk, adds a loading indicator, and handles the return
   *
   * @params fkInput Input to the computeFk resolver
   */
  private readonly computeFkAndUpdateState = async (
    fkParams: FkParams,
    fkConfiguration: FkTypes.FkConfiguration
  ): Promise<void> => {
    this.setState(prevState => ({
      userInputFkFrequency: fkParams.frequencyPair,
      userInputFkWindowParameters: fkParams.windowParams,
      numberOfOutstandingComputeFkMutations: prevState.numberOfOutstandingComputeFkMutations + 1
    }));

    const osdFkInput = createComputeFkInput(
      this.state.displayedSignalDetection,
      fkParams,
      fkConfiguration
    );

    if (!osdFkInput) {
      logger.warn(
        `Failed to create Fk Request for Signal Detection ${this.state.displayedSignalDetection?.id}`
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await computeFks([osdFkInput])
      .then(() => {
        this.setState(prevState => ({
          numberOfOutstandingComputeFkMutations: prevState.numberOfOutstandingComputeFkMutations - 1
        }));
      })
      .then(async () => this.queryFkFrequencyThumbnails(osdFkInput))
      .catch(error => logger.error(`Failed computeFkAndUpdateState: ${error}`));
  };

  /**
   * Call create Fks for the list of unassociated signal detections
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private readonly showOrGenerateSignalDetectionFk = async (sdIds: string[]): Promise<void> => {
    // If SD ids or SD query results are empty nothing to do
    if (
      !sdIds ||
      sdIds.length === 0 ||
      !this.props.signalDetectionResults.data ||
      this.props.signalDetectionResults.data.length === 0
    ) {
      return;
    }

    // Build a list of potential FkInputs to call computeFk on
    const fkInputs: FkTypes.FkInputWithConfiguration[] = sdIds.map(sdId => {
      const signalDetection = this.props.signalDetectionResults.data.find(sd => sd.id === sdId);

      // Find the station for this SD to get get the contributing channels
      const station = this.props.stationsQuery.data.find(
        sta => sta.name === signalDetection.station.name
      );
      const configuration = getDefaultFkConfigurationForSignalDetection(
        signalDetection,
        station ? station.allRawChannels : []
      );
      const fkParams: FkParams = {
        frequencyPair: {
          minFrequencyHz: systemConfig.defaultFkConfig.fkPowerSpectrumDefinition.lowFrequency,
          maxFrequencyHz: systemConfig.defaultFkConfig.fkPowerSpectrumDefinition.highFrequency
        },
        windowParams: {
          leadSeconds: userPreferences.azimuthSlowness.defaultLead,
          lengthSeconds: userPreferences.azimuthSlowness.defaultLength,
          stepSize: userPreferences.azimuthSlowness.defaultStepSize
        }
      };
      return createComputeFkInput(signalDetection, fkParams, configuration);
    });

    // filter out FkInputs that we already have an fk; no need to recompute the fk
    const filteredComputeFkInputs = fkInputs.filter(
      input =>
        // no need to compute an FK if we already have an fk in SignalDetection
        !getFkData(
          this.props.signalDetectionResults.data.find(sd => sd.id === input.signalDetectionId),
          this.props.channelSegmentResults.data
        )
    );
    if (filteredComputeFkInputs && filteredComputeFkInputs.length > 0) {
      await computeFks(filteredComputeFkInputs).catch(err =>
        logger.error(`Failed to compute Fk: ${err.message}`)
      );
    }

    // Compute thumbnails for Signal Detection
    const filteredThumbnailInputs = fkInputs.filter(
      input =>
        // no need to compute an FK if we already have an fk in SignalDetection
        !this.state.fkFrequencyThumbnails.has(input.signalDetectionId)
    );

    if (filteredThumbnailInputs && filteredThumbnailInputs.length > 0) {
      filteredThumbnailInputs.forEach(async input => {
        await this.queryFkFrequencyThumbnails(input).catch(err =>
          logger.error(`Failed to compute FK thumbnails: ${err.message}`)
        );
      });
    }
  };

  /**
   * Call create Fk thumbnails for the list of associated signal detections that have Fks but
   * no thumbnails in the state
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private readonly checkIfNeedMissingThumbnails = async (): Promise<void> => {
    const sds: SignalDetectionTypes.SignalDetection[] = this.getAssociatedSDsWithFkData().filter(
      sd => {
        const hasFk = getFkDummyData(sd);
        return hasFk && !this.state.fkFrequencyThumbnails.has(sd.id);
      }
    );
    if (!sds || sds.length === 0) {
      return;
    }

    // Build a list of potential FkInputs to call computeFk on
    const fkInputs: FkTypes.FkInputWithConfiguration[] = sds
      .map(sd => {
        if (
          sd &&
          SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses) &&
          SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
            .featureMeasurements
        ) {
          // Find the station for this SD to get get the contributing channels
          const station = this.props.stationsQuery.data.find(sta => sta.name === sd.station.name);

          const configuration = getDefaultFkConfigurationForSignalDetection(
            sd,
            station ? station.allRawChannels : []
          );
          const fkParams: FkParams = {
            frequencyPair: {
              minFrequencyHz: systemConfig.defaultFkConfig.fkPowerSpectrumDefinition.lowFrequency,
              maxFrequencyHz: systemConfig.defaultFkConfig.fkPowerSpectrumDefinition.highFrequency
            },
            windowParams: {
              leadSeconds: userPreferences.azimuthSlowness.defaultLead,
              lengthSeconds: userPreferences.azimuthSlowness.defaultLength,
              stepSize: userPreferences.azimuthSlowness.defaultStepSize
            }
          };
          return createComputeFkInput(sd, fkParams, configuration, true);
        }
        return undefined;
      })
      .filter(fkInput => fkInput !== undefined);

    // Loop thru for missing thumbnails
    if (fkInputs && fkInputs.length > 0) {
      // Loop through calling each one for thumbnails
      fkInputs.forEach(async fkInput => this.queryFkFrequencyThumbnails(fkInput));
    }
  };

  /**
   * Queries for fk frequency thumbnail list
   *
   * @param fkInput input variables for requesting frequency thumbnails
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private readonly queryFkFrequencyThumbnails = async (
    fkInput: FkTypes.FkInputWithConfiguration
  ): Promise<void> => {
    const signalDetection = this.props.signalDetectionResults?.data?.find(
      sd => sd.id === fkInput.signalDetectionId
    );

    // eslint-disable-next-line @typescript-eslint/require-await
    const promises = FrequencyBands.map(async fb => {
      const input: FkTypes.FkInputWithConfiguration = {
        ...fkInput,
        fkComputeInput: {
          ...fkInput.fkComputeInput,
          lowFrequency: fb.minFrequencyHz,
          highFrequency: fb.maxFrequencyHz
        }
      };
      return computeFkFrequencyThumbnails(input, signalDetection);
    });

    // filter out any thumbnails that were returned as undefined
    const thumbnails = (await Promise.all(promises)).filter(tb => tb !== undefined);
    this.setState(prevState => ({
      fkFrequencyThumbnails: prevState.fkFrequencyThumbnails.set(signalDetection.id, thumbnails)
    }));
  };

  /**
   * Set the user-set fk unit for a given fk id
   *
   * @param fkId the id of the fk
   * @param fkUnit the new unit
   */
  private readonly setFkUnitForSdId = (sdId: string, fkUnit: FkUnits) => {
    this.setState(prevState => ({
      fkUnitsForEachSdId: prevState.fkUnitsForEachSdId.set(sdId, fkUnit)
    }));
  };

  /**
   * Marks fks for given signal detection ids as reviewed
   *
   * @param sdIds the signal detection id's that should be marked as reviewed
   */
  private readonly markFksForSdIdsAsReviewed = (sdIds: string[]) => {
    const variables = {
      markFksReviewedInput: {
        signalDetectionIds: sdIds,
        reviewed: true
      }
    };
    this.markFksReviewed(variables);
  };

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  private readonly markFksReviewed = (args: any) => {
    // TODO: need mutation to set reviewed for SD!!!
    logger.warn(`Need mutation to set FK to reviewed.`);
  };

  /**
   * Build SignalDetectionsId FeaturePredictions map
   *
   * @param signalDetections allSdsAssociatedToTheOpenEvent
   * @returns built map
   */
  private readonly getFeaturePredictionMap = (
    signalDetections: SignalDetectionTypes.SignalDetection[]
  ): Immutable.Map<string, EventTypes.FeaturePrediction[]> => {
    const sds: SignalDetectionTypes.SignalDetection[] = this.getSignalDetectionsToDisplay();
    const filteredSds = this.filterSignalDetections(sds, signalDetections);
    return this.getSignalDetectionsWithFeaturePredictions(filteredSds);
  };

  /**
   * Generate non-ideal state if glContainer is hidden or various queries have not finished
   *
   * @returns JSK.Element if non ideal state exists or undefine
   */
  private readonly getNonIdealState = (): JSX.Element => {
    // if the golden-layout container is not visible, do not attempt to render
    // the component, this is to prevent JS errors that may occur when trying to
    // render the component while the golden-layout container is hidden
    if (this.props.glContainer && this.props.glContainer.isHidden) {
      return <NonIdealState />;
    }

    // If Events, SignalDetections or Stations have not
    // loaded then return Loading state
    if (
      this.props.eventResults?.isLoading ||
      this.props.eventStatusQuery?.isLoading ||
      this.props.signalDetectionResults?.isLoading ||
      this.props.stationsQuery?.isLoading
    ) {
      return (
        <NonIdealState
          action={<Spinner intent={Intent.PRIMARY} />}
          icon={IconNames.HEAT_GRID}
          title="Loading:"
          description="FK data for current event"
        />
      );
    }
    return undefined;
  };

  /**
   * Set selected SD in state from which to select Fk to display
   *
   * @param sd SignalDetection
   */
  private readonly setDisplayedSignalDetection = (sd: SignalDetectionTypes.SignalDetection) => {
    this.setState({ displayedSignalDetection: sd });
  };

  /**
   * Renders the component.
   */
  public render(): JSX.Element {
    const nonIdealState = this.getNonIdealState();
    if (nonIdealState) {
      return nonIdealState;
    }

    // Filter down to signal detection associations with valid FK data
    const events = this.props.eventResults.data ? this.props.eventResults.data : [];
    const openEvent = getOpenEvent(this.props.openEventId, events);
    const signalDetectionsByStation = this.props.signalDetectionResults.data ?? [];
    const allSdsAssociatedToTheOpenEvent = getAssociatedDetectionsWithFks(
      openEvent,
      signalDetectionsByStation
    );

    const signalDetectionsIdToFeaturePredictions: Immutable.Map<
      string,
      EventTypes.FeaturePrediction[]
    > = this.getFeaturePredictionMap(allSdsAssociatedToTheOpenEvent);

    // Find SD to draw
    const sdsToDraw: SignalDetectionTypes.SignalDetection[] = signalDetectionsByStation.filter(sd =>
      signalDetectionsIdToFeaturePredictions.has(sd.id)
    );
    if (sdsToDraw.length < 1 && this.props.sdIdsToShowFk.length < 1) {
      return <NonIdealState icon={IconNames.HEAT_GRID} title="No FK Data Available" />;
    }

    // TODO Need to rework NonIdealState
    if (sdsToDraw.length === 0 && this.props.sdIdsToShowFk.length > 0) {
      const toolbarItemsLeft: DeprecatedToolbarTypes.ToolbarItem[] = [];
      toolbarItemsLeft.push({
        rank: 1,
        label: 'Filter',
        type: DeprecatedToolbarTypes.ToolbarItemType.Dropdown,
        tooltip: 'Filter the fks',
        dropdownOptions: FilterType,
        widthPx: 130,
        value: this.state.filterType,
        onChange: value => this.updateFkFilter(value as FilterType)
      });
      return (
        <div>
          <DeprecatedToolbar itemsLeft={toolbarItemsLeft} toolbarWidthPx={250} itemsRight={[]} />
          <NonIdealState
            icon={IconNames.HEAT_GRID}
            title="No Signal Detections Found With Filter Selected"
          />
        </div>
      );
    }
    const featurePredictionsForSignalDetection = signalDetectionsIdToFeaturePredictions.has(
      this.state.displayedSignalDetection?.id
    )
      ? signalDetectionsIdToFeaturePredictions.get(this.state.displayedSignalDetection?.id)
      : [];

    const distances = getDistanceToStationsForPreferredLocationSolutionId(
      openEvent,
      this.props.stationsQuery.data,
      this.props.openIntervalName,
      signalDetectionsByStation,
      undefined
    );

    let fkDisplayWidthPx = 0;
    let fkDisplayHeightPx = 0;
    if (this.props.glContainer) {
      fkDisplayWidthPx = this.props.glContainer.width - this.state.fkThumbnailColumnSizePx;
      fkDisplayHeightPx = this.props.glContainer.height;
    }

    const fkUnitForDisplayedSignalDetection = getFkUnitForSdId(
      this.state.displayedSignalDetection?.id,
      this.state.fkUnitsForEachSdId
    );

    const sortedSignalDetections =
      distances && distances.length > 0
        ? fkUtil.getSortedSignalDetections(sdsToDraw, this.props.selectedSortType, distances)
        : sdsToDraw;
    const channelSegments = this.props.channelSegmentResults.data ?? {};

    return (
      <AzimuthSlownessPanel
        defaultStations={this.props.stationsQuery.data ? this.props.stationsQuery.data : []}
        eventsInTimeRange={events}
        eventStatuses={this.props.eventStatusQuery.data ? this.props.eventStatusQuery.data : {}}
        displayedSignalDetection={this.state.displayedSignalDetection}
        openEvent={openEvent}
        unassociatedSignalDetectionByColor={this.props.unassociatedSDColor}
        associatedSignalDetections={allSdsAssociatedToTheOpenEvent}
        signalDetectionsToDraw={sortedSignalDetections}
        signalDetectionsIdToFeaturePredictions={signalDetectionsIdToFeaturePredictions}
        signalDetectionsByStation={signalDetectionsByStation}
        channelSegments={channelSegments}
        featurePredictionsForDisplayedSignalDetection={featurePredictionsForSignalDetection}
        distances={distances}
        sdIdsToShowFk={this.props.sdIdsToShowFk}
        location={this.props.location}
        fkFrequencyThumbnails={
          this.state.displayedSignalDetection
            ? this.state.fkFrequencyThumbnails.get(this.state.displayedSignalDetection.id)
            : []
        }
        fkThumbnailColumnSizePx={this.state.fkThumbnailColumnSizePx}
        fkDisplayWidthPx={fkDisplayWidthPx - this.state.fkThumbnailColumnSizePx}
        fkDisplayHeightPx={fkDisplayHeightPx}
        selectedSortType={this.props.selectedSortType}
        filterType={this.state.filterType}
        fkThumbnailSizePx={this.state.fkThumbnailSizePx}
        fkUnitsForEachSdId={this.state.fkUnitsForEachSdId}
        numberOfOutstandingComputeFkMutations={this.state.numberOfOutstandingComputeFkMutations}
        userInputFkFrequency={this.state.userInputFkFrequency}
        fkUnitForDisplayedSignalDetection={fkUnitForDisplayedSignalDetection}
        userInputFkWindowParameters={this.state.userInputFkWindowParameters}
        fkInnerContainerWidthPx={this.state.fkInnerContainerWidthPx}
        adjustFkInnerContainerWidth={this.adjustFkInnerContainerWidth}
        markFksForSdIdsAsReviewed={this.markFksForSdIdsAsReviewed}
        updateFkThumbnailSize={this.updateFkThumbnailSize}
        updateFkFilter={this.updateFkFilter}
        setFkThumbnailColumnSizePx={this.setFkThumbnailColumnSizePx}
        computeFkAndUpdateState={this.computeFkAndUpdateState}
        changeUserInputFks={this.changeUserInputFks}
        setFkUnitForSdId={this.setFkUnitForSdId}
        setSdIdsToShowFk={this.props.setSdIdsToShowFk}
        setDisplayedSignalDetection={this.setDisplayedSignalDetection}
        setMeasurementModeEntries={this.props.setMeasurementModeEntries}
      />
    );
  }
}
