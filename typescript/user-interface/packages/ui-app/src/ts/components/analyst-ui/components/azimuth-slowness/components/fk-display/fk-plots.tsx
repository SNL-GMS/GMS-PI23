/* eslint-disable react/destructuring-assignment */
import { NonIdealState } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { EventTypes, FkTypes } from '@gms/common-model';
import { FilterTypes, SignalDetectionTypes } from '@gms/common-model';
import { findArrivalTimeFeatureMeasurement } from '@gms/common-model/lib/signal-detection/util';
import type { EventStatus, UiChannelSegment } from '@gms/ui-state';
import { getPositionBuffer } from '@gms/ui-state';
import { Weavess } from '@gms/weavess';
import { WeavessTypes, WeavessUtil } from '@gms/weavess-core';
import isEqual from 'lodash/isEqual';
import memoizeOne from 'memoize-one';
import React from 'react';

import { getSignalDetectionAssociationColor } from '~analyst-ui/common/utils/event-util';
import {
  createChannelSegmentString,
  filterSignalDetectionsByStationId
} from '~analyst-ui/common/utils/signal-detection-util';
import { systemConfig } from '~analyst-ui/config/system-config';
import { gmsColors, semanticColors } from '~scss-config/color-preferences';

import { getFkDummyData, getFkParamsForSd } from '../../../../common/utils/fk-utils';
import type { FkParams } from '../../types';
import { getChannelSegmentBoundaries, getPredictedPoint } from '../fk-util';
/**
 * FkPlots Props
 */
export interface FkPlotsProps {
  eventsInTimeRange: EventTypes.Event[];
  eventStatuses: Record<string, EventStatus>;
  currentOpenEvent?: EventTypes.Event;
  unassociatedSignalDetectionByColor: string;
  signalDetection: SignalDetectionTypes.SignalDetection;
  signalDetectionsByStation: SignalDetectionTypes.SignalDetection[];
  channelSegments: Record<string, Record<string, UiChannelSegment[]>>;
  signalDetectionFeaturePredictions: EventTypes.FeaturePrediction[];
  fkPowerSpectra: FkTypes.FkPowerSpectra;
  windowParams: FkTypes.WindowParameters;
  currentMovieSpectrumIndex: number;
  updateCurrentMovieTimeIndex(time: number): void;
  onNewFkParams(fkParams: FkParams, fkConfiguration: FkTypes.FkConfiguration): void;
}

/**
 * FkPlots State
 */
export interface FkPlotsState {
  selectionWindow: {
    startTime: number;
    endTime: number;
  };
}

/**
 * Renders the FK waveform data with Weavess
 */
export class FkPlots extends React.PureComponent<FkPlotsProps, FkPlotsState> {
  /** The precision of displayed lead/lag pair */
  private readonly digitPrecision: number = 1;

  /** Hard-coded height of the waveform panel */
  private readonly waveformPanelHeight: number = 70;

  /** Determines if the selection window should snap or not */
  private selectionWindowSnapMode = false;

  /** Interval from FK Spectra for selected SD */
  private fkSpectraInterval: WeavessTypes.TimeRange;

  /** Memoization function that uses cached results if params haven't changed */
  private readonly memoizedSelectionMarkers: (
    startEpochSecs: number,
    leadFkSpectrumSeconds: number
  ) => WeavessTypes.Markers;

  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Constructor.
   *
   * @param props The initial props
   */
  public constructor(props: FkPlotsProps) {
    super(props);
    this.state = {
      // eslint-disable-next-line react/no-unused-state
      selectionWindow: undefined
    };
    this.memoizedSelectionMarkers = memoizeOne(this.buildSelectionMarkers, isEqual);
  }

  /**
   * React life update cycle method, that resets the should snap class variable
   *
   * @param prevProps previous component props
   */
  public componentDidUpdate(prevProps: FkPlotsProps): void {
    if (
      !isEqual(
        getFkDummyData(prevProps.signalDetection),
        getFkDummyData(this.props.signalDetection)
      )
    ) {
      this.selectionWindowSnapMode = false;
    }
  }

  /**
   * Renders the component.
   */
  // eslint-disable-next-line react/sort-comp, complexity
  public render(): JSX.Element {
    const sdHypo = SignalDetectionTypes.Util.getCurrentHypothesis(
      this.props.signalDetection.signalDetectionHypotheses
    );
    const arrivalTimeFmValue = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
      sdHypo.featureMeasurements
    );
    const arrivalTime = arrivalTimeFmValue?.arrivalTime.value;
    const timePadding: number = systemConfig.fkPlotTimePadding;

    // TODO: At a later date need to design/implement how filtered waveforms will
    // be selected
    const selectedFilterName = FilterTypes.UNFILTERED;

    // az, slowness, and fstat have the same rate and num samples
    // but we need to calculate the data to send to weavess for beam
    if (
      !this.props.fkPowerSpectra ||
      this.fStatDataContainsUndefined(this.props.fkPowerSpectra.fstatData)
    ) {
      return (
        <NonIdealState
          icon={IconNames.TIMELINE_LINE_CHART}
          title="Missing waveform data"
          description="Fk plots currently not supported for analyst created SDs"
        />
      );
    }

    // If waveform has no samples then startTime and endTime will be epoch zero or undefined
    const startTimeSecs =
      this.props.fkPowerSpectra.startTime && this.props.fkPowerSpectra.startTime > 0
        ? this.props.fkPowerSpectra.startTime
        : arrivalTime - timePadding / 2;
    let endTimeSecs =
      this.props.fkPowerSpectra.endTime && this.props.fkPowerSpectra.endTime > 0
        ? this.props.fkPowerSpectra.endTime
        : 0;
    if (endTimeSecs <= arrivalTime) {
      endTimeSecs += timePadding;
    }

    this.fkSpectraInterval = {
      startTimeSecs,
      endTimeSecs
    };

    const beamChannelSegmentsRecord: Record<
      string,
      WeavessTypes.ChannelSegment[]
    > = this.getBeamChannelSegmentRecord(sdHypo, selectedFilterName);
    const predictedPoint = getPredictedPoint(this.props.signalDetectionFeaturePredictions);
    const signalDetections: WeavessTypes.PickMarker[] = this.buildSignalDetectionPickMarkers();
    const KEY = selectedFilterName;
    const fStatChannelSegmentsRecord: Record<string, WeavessTypes.ChannelSegment[]> = {};
    fStatChannelSegmentsRecord[KEY] = [
      {
        channelName: 'FstatChannel',
        wfFilterId: selectedFilterName,
        isSelected: false,
        dataSegments: [
          {
            color: semanticColors.waveformRaw,
            pointSize: 2,
            displayType: [WeavessTypes.DisplayType.LINE, WeavessTypes.DisplayType.SCATTER],
            data: {
              startTimeSecs: this.props.fkPowerSpectra.fstatData.fstatWf.startTime,
              endTimeSecs: this.props.fkPowerSpectra.fstatData.fstatWf.endTime,
              sampleRate: this.props.fkPowerSpectra.fstatData.fstatWf.sampleRateHz,
              values: this.props.fkPowerSpectra.fstatData.fstatWf.samples
            }
          }
        ]
      }
    ];

    const azimuthChannelSegmentsRecord: Record<string, WeavessTypes.ChannelSegment[]> = {};
    azimuthChannelSegmentsRecord[KEY] = [
      {
        channelName: 'AzimuthChannel',
        wfFilterId: selectedFilterName,
        isSelected: false,
        dataSegments: [
          {
            displayType: [WeavessTypes.DisplayType.LINE, WeavessTypes.DisplayType.SCATTER],
            color: semanticColors.waveformRaw,
            pointSize: 2,
            data: {
              startTimeSecs: this.props.fkPowerSpectra.fstatData.azimuthWf.startTime,
              endTimeSecs: this.props.fkPowerSpectra.fstatData.azimuthWf.endTime,
              sampleRate: this.props.fkPowerSpectra.fstatData.azimuthWf.sampleRateHz,
              values: this.props.fkPowerSpectra.fstatData.azimuthWf.samples
            }
          }
        ]
      }
    ];

    const slownessChannelSegmentsRecord: Record<string, WeavessTypes.ChannelSegment[]> = {};
    slownessChannelSegmentsRecord[KEY] = [
      {
        channelName: 'SlownessChannel',
        wfFilterId: selectedFilterName,
        isSelected: false,
        dataSegments: [
          {
            displayType: [WeavessTypes.DisplayType.LINE, WeavessTypes.DisplayType.SCATTER],
            color: semanticColors.waveformRaw,
            pointSize: 2,
            data: {
              startTimeSecs: this.props.fkPowerSpectra.fstatData.slownessWf.startTime,
              endTimeSecs: this.props.fkPowerSpectra.fstatData.slownessWf.endTime,
              sampleRate: this.props.fkPowerSpectra.fstatData.slownessWf.sampleRateHz,
              values: this.props.fkPowerSpectra.fstatData.slownessWf.samples
            }
          }
        ]
      }
    ];
    const stations: WeavessTypes.Station[] = [
      // Beam
      {
        id: 'Beam',
        name: 'Beam',
        defaultChannel: {
          id: `Beam-${this.props.signalDetection.station.name}`,
          name: 'Beam',
          height: this.waveformPanelHeight,
          description: selectedFilterName,
          waveform: {
            channelSegmentId: selectedFilterName,
            channelSegmentsRecord: beamChannelSegmentsRecord,
            signalDetections
          }
        },
        areChannelsShowing: false
      },
      // Fstat
      {
        id: 'Fstat',
        name: 'Fstat',
        defaultChannel: {
          id: `Fstat-${this.props.signalDetection.station.name}`,
          name: 'Fstat',
          height: this.waveformPanelHeight,
          description: '',
          waveform: {
            channelSegmentId: KEY,
            channelSegmentsRecord: fStatChannelSegmentsRecord
          }
        },
        areChannelsShowing: false
      },
      // Azimuth
      {
        id: 'Azimuth',
        name: 'Azimuth',
        defaultChannel: {
          id: `Azimuth-${this.props.signalDetection.station.name}`,
          name: (
            <div style={{ whiteSpace: 'nowrap' }}>
              Azimuth <sup>(&deg;)</sup>
            </div>
          ),
          height: this.waveformPanelHeight,
          // set the min to zero and max to 360, so that WEAVESS does not use the calculated min/max
          defaultRange: {
            min: 0,
            max: 360
          },
          description: '',
          waveform: {
            channelSegmentId: KEY,
            channelSegmentsRecord: azimuthChannelSegmentsRecord
          }
        },
        areChannelsShowing: false
      },
      // Slowness
      {
        id: 'Slowness',
        name: 'Slowness',
        defaultChannel: {
          id: `Slowness-${this.props.signalDetection.station.name}`,
          name: (
            <div style={{ whiteSpace: 'nowrap' }}>
              Slowness (<sup>s</sup>
              &#8725;
              <sub>&deg;</sub>)
            </div>
          ),
          height: this.waveformPanelHeight,
          description: '',
          waveform: {
            channelSegmentId: KEY,
            channelSegmentsRecord: slownessChannelSegmentsRecord
          }
        },
        areChannelsShowing: false
      }
    ];

    // add the Azimuth and Slowness flat lines if the appropriate predicted value exists
    if (predictedPoint) {
      stations[2].defaultChannel.waveform.channelSegmentsRecord[KEY][0].dataSegments.push(
        WeavessUtil.createFlatLineDataSegment(
          startTimeSecs,
          endTimeSecs,
          predictedPoint.azimuth,
          semanticColors.analystOpenEvent
        )
      );
    }

    if (predictedPoint) {
      stations[3].defaultChannel.waveform.channelSegmentsRecord[KEY][0].dataSegments.push(
        WeavessUtil.createFlatLineDataSegment(
          startTimeSecs,
          endTimeSecs,
          predictedPoint.slowness,
          semanticColors.analystOpenEvent
        )
      );
    }

    // Get the SD FK configure to set the start marker lead secs and
    // from there add length to get endMarker in epoch time
    const config = getFkDummyData(this.props.signalDetection).configuration;
    const startMarkerEpoch: number = this.selectionWindowSnapMode
      ? startTimeSecs + this.props.currentMovieSpectrumIndex * this.props.windowParams.stepSize
      : arrivalTime - config.leadFkSpectrumSeconds;
    const markers = this.memoizedSelectionMarkers(startMarkerEpoch, config.leadFkSpectrumSeconds);
    const events = {
      // stationEvents: {
      //   defaultChannelEvents: channelEvents
      // },
      onUpdateSelectionWindow: this.onUpdateSelectionWindow
    };
    return (
      <div
        style={{
          height: `${this.waveformPanelHeight}px`
        }}
        className="ag-dark fk-plots-wrapper-1"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        <div className="fk-plots-wrapper-2">
          <div className="weavess-container">
            <div className="weavess-container__wrapper">
              <Weavess
                viewableInterval={this.fkSpectraInterval}
                isControlledComponent={false}
                minimumOffset={0}
                maximumOffset={0}
                stations={stations}
                selections={{
                  channels: undefined
                }}
                initialConfiguration={{
                  labelWidthPx: 180,
                  defaultChannel: {
                    disableMeasureWindow: true,
                    disableMaskModification: true
                  }
                }}
                events={events}
                markers={markers}
                getPositionBuffer={this.getPositionBuffer}
                getBoundaries={getChannelSegmentBoundaries}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ***************************************
  // END REACT COMPONENT LIFECYCLE METHODS
  // ***************************************
  /**
   * Requests the Weavess formatted Float32Array position buffer data from the WaveformWorker.
   * Strip out the time (x values) and convert to Float32Array with new fkSpectra time interval (x values)
   *
   * @param id the id corresponding to this position buffer
   * @returns a promise for a Float32Array formatted for Weavess' consumption using the
   * position buffer format: x y x y x y...
   */
  private readonly getPositionBuffer = async (
    id: string,
    startTime: number,
    endTime: number
  ): Promise<Float32Array> => {
    // Strip out the X value since they are scaled to the viewable interval
    const res = await getPositionBuffer(id, startTime, endTime, this.fkSpectraInterval);
    const yValues = res.filter((value, index) => {
      if (index % 2 === 1) {
        return true;
      }
      return false;
    });
    // Recalculate using the fkInterval (~5 mins)
    const dataBySampleRate: WeavessTypes.DataBySampleRate = {
      values: yValues,
      startTimeSecs: this.fkSpectraInterval.startTimeSecs,
      endTimeSecs: this.fkSpectraInterval.endTimeSecs,
      sampleRate: res.length / (endTime - startTime) / 2
    };
    return WeavessUtil.convertToPositionBuffer(dataBySampleRate, this.fkSpectraInterval);
  };

  /**
   * Retrieve beam channel segment record for weavess
   *
   * @param sdHypo SignalDetectionTypes.SignalDetectionHypothesis
   * @param selectedFilterName Filter name string
   * @returns Beam channel segment record
   */
  private readonly getBeamChannelSegmentRecord = (
    sdHypo: SignalDetectionTypes.SignalDetectionHypothesis,
    selectedFilterName: string
  ): Record<string, WeavessTypes.ChannelSegment[]> => {
    // If there are Signal Detections populate Weavess Channel Segment from the FK_BEAM
    // else use the default channel Weavess Channel Segment built
    const arrivalTimeFm = findArrivalTimeFeatureMeasurement(sdHypo.featureMeasurements);
    const arrivalTimeCsString = createChannelSegmentString(arrivalTimeFm.measuredChannelSegment.id);
    // Get the ChannelSegment map for the channel name from the Waveform Cache
    // The key to the map is the waveform filter name
    const channelSegments =
      (this.props.signalDetection &&
        this.props.channelSegments &&
        this.props.channelSegments[this.props.signalDetection.station.name]) ??
      {};
    const beamChannelSegmentsRecord: Record<string, WeavessTypes.ChannelSegment[]> = {};
    beamChannelSegmentsRecord[selectedFilterName] = channelSegments[selectedFilterName]
      ? channelSegments[selectedFilterName]
          .map(uiCs => {
            if (createChannelSegmentString(uiCs.channelSegmentDescriptor) === arrivalTimeCsString) {
              return uiCs.channelSegment;
            }
            return undefined;
          })
          .filter(cs => cs !== undefined)
      : [];
    return beamChannelSegmentsRecord;
  };

  /**
   * Build the start and end selection markers
   *
   * @param startMarkerEpoch
   * @param leadFkSpectrumSeconds
   * @returns Selection markers
   */
  private readonly buildSelectionMarkers = (
    startMarkerEpoch: number,
    leadFkSpectrumSeconds: number
  ): WeavessTypes.Markers => {
    const endMarkerEpoch: number = startMarkerEpoch + this.props.windowParams.lengthSeconds;
    return {
      selectionWindows: [
        {
          id: 'fk-selection',
          startMarker: {
            id: `fk-start`,
            color: gmsColors.gmsProminent,
            lineStyle: WeavessTypes.LineStyle.DASHED,
            timeSecs: startMarkerEpoch
          },
          endMarker: {
            id: `fk-end`,
            color: gmsColors.gmsProminent,
            lineStyle: WeavessTypes.LineStyle.DASHED,
            timeSecs: endMarkerEpoch,
            minTimeSecsConstraint: startMarkerEpoch + leadFkSpectrumSeconds
          },
          isMoveable: true,
          color: 'rgba(200,200,200,0.2)'
        }
      ]
    };
  };

  /**
   * Create list of SD pick markers for the station
   *
   * @returns SD pick markers
   */
  private readonly buildSignalDetectionPickMarkers = (): WeavessTypes.PickMarker[] => {
    const signalDetectionsForStation = this.props.signalDetectionsByStation
      ? filterSignalDetectionsByStationId(
          this.props.signalDetection.station.name,
          this.props.signalDetectionsByStation
        )
      : [];

    return signalDetectionsForStation
      .map(sd => {
        const arrivalTime = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
          SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
            .featureMeasurements
        ).arrivalTime?.value;
        if (
          arrivalTime &&
          arrivalTime >= this.fkSpectraInterval.startTimeSecs &&
          arrivalTime <= this.fkSpectraInterval.endTimeSecs
        ) {
          return {
            timeSecs: SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
              SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
                .featureMeasurements
            ).arrivalTime.value,
            uncertaintySecs: SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
              SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
                .featureMeasurements
            ).arrivalTime.standardDeviation,
            showUncertaintyBars: false,
            id: sd.id,
            label: SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
              SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
                .featureMeasurements
            ).value.toString(),
            color: getSignalDetectionAssociationColor(
              sd,
              this.props.eventsInTimeRange,
              this.props.currentOpenEvent ? this.props.currentOpenEvent.id : undefined,
              this.props.eventStatuses,
              this.props.unassociatedSignalDetectionByColor
            ),
            // TODO SD no longer has a conflict flag
            isConflicted: false, // sd.hasConflict
            isSelected: sd.id === this.props.signalDetection.id
          };
        }
        return undefined;
      })
      .filter(sd => sd !== undefined);
  };

  /**
   * Call back for drag and drop change of the moveable selection
   *
   * @param verticalMarkers List of markers in the fk plot display
   */
  private readonly onUpdateSelectionWindow = (selection: WeavessTypes.SelectionWindow) => {
    const arrivalTime = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(
        this.props.signalDetection.signalDetectionHypotheses
      ).featureMeasurements
    ).arrivalTime.value;

    const lagTime = this.props.windowParams.lengthSeconds - this.props.windowParams.leadSeconds;
    const newLeadTime = parseFloat(
      (arrivalTime - selection.startMarker.timeSecs).toFixed(this.digitPrecision)
    );
    const newLagTime = parseFloat(
      (selection.endMarker.timeSecs - arrivalTime).toFixed(this.digitPrecision)
    );
    const minimumDeltaSize = 0.1;
    const priorParams = getFkParamsForSd(this.props.signalDetection);
    // If duration hasn't changed update new lead seconds and update user input which sets state
    // else call computeFk via onNewFkParams
    const durationDelta = Math.abs(
      this.props.windowParams.lengthSeconds - (newLagTime + newLeadTime)
    );
    if (durationDelta < minimumDeltaSize) {
      this.selectionWindowSnapMode = true;
      this.props.updateCurrentMovieTimeIndex(selection.startMarker.timeSecs);
    } else if (
      newLeadTime > this.props.windowParams.leadSeconds + minimumDeltaSize ||
      newLeadTime < this.props.windowParams.leadSeconds - minimumDeltaSize ||
      newLagTime > lagTime + minimumDeltaSize ||
      newLagTime < lagTime - minimumDeltaSize
    ) {
      const newParams: FkParams = {
        ...priorParams,
        windowParams: {
          ...priorParams.windowParams,
          lengthSeconds: parseFloat(
            (selection.endMarker.timeSecs - selection.startMarker.timeSecs).toFixed(
              this.digitPrecision
            )
          )
        }
      };
      const priorConfig = getFkDummyData(this.props.signalDetection).configuration;
      const config = {
        ...priorConfig,
        leadFkSpectrumSeconds: newParams.windowParams.leadSeconds
      };
      this.selectionWindowSnapMode = false;
      this.props.onNewFkParams(newParams, config);
    }
  };

  /**
   * Checks for any undefined waveforms inside of fstat data
   *
   * @param fstatData as FkTypes.FstatData
   * @returns boolean if defined or not
   */
  // eslint-disable-next-line class-methods-use-this
  private readonly fStatDataContainsUndefined = (fstatData: FkTypes.FstatData): boolean =>
    !fstatData || !fstatData.azimuthWf || !fstatData.fstatWf || !fstatData.slownessWf;
}
