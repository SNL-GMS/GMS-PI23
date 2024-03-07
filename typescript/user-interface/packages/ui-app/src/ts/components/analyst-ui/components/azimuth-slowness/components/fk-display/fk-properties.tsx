/* eslint-disable class-methods-use-this */
/* eslint-disable react/destructuring-assignment */
import { Classes, NumericInput, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { ChannelTypes, EventTypes, FkTypes, StationTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import type { Row } from '@gms/ui-core-components';
import { DropDown, PopoverButton, Table } from '@gms/ui-core-components';
import classNames from 'classnames';
import isEqual from 'lodash/isEqual';
import memoizeOne from 'memoize-one';
import React from 'react';

import {
  frequencyBandToString,
  getFkDummyData,
  getFkParamsForSd
} from '~analyst-ui/common/utils/fk-utils';

import { FrequencyBands } from '../../constants';
import type { FkConfigurationWithUnits, FkParams } from '../../types';
import { FkUnits } from '../../types';
import type { AnalystCurrentFk } from '../fk-rendering/fk-rendering';
import {
  getAnalystSelectedPoint,
  getFkHeatmapArrayFromFkSpectra,
  getPeakValueFromAzSlow,
  getPredictedPoint
} from '../fk-util';
import type { PropertiesRow } from './column-defs';
import { columnDefs } from './column-defs';
import { FkConfigurationPopover } from './fk-configuration-popover';
import { FkFrequencyThumbnails } from './fk-frequency-thumbnails';

const dropdownWidthPx = 100;

/**
 * FkProperties Props
 */
export interface FkPropertiesProps {
  defaultStations: StationTypes.Station[];
  signalDetection: SignalDetectionTypes.SignalDetection;
  signalDetectionFeaturePredictions: EventTypes.FeaturePrediction[];
  analystCurrentFk: AnalystCurrentFk;
  userInputFkFrequency: FkTypes.FrequencyBand;
  fkUnitDisplayed: FkUnits;
  fkFrequencyThumbnails: FkTypes.FkFrequencyThumbnail[];
  currentMovieSpectrumIndex: number;
  arrivalTimeMovieSpectrumIndex: number;

  onNewFkParams(fkParams: FkParams, fkConfiguration: FkTypes.FkConfiguration): void;
  onFkConfigurationChange(fkConfigurationWithUnits: FkConfigurationWithUnits);
}

/**
 * FkProperties State
 */
export interface FkPropertiesState {
  presetFrequency: boolean;
}

/**
 * Creates a table of FK properties
 */
export class FkProperties extends React.Component<FkPropertiesProps, FkPropertiesState> {
  private lowFreqControl: NumericInput;

  private highFreqControl: NumericInput;

  private configurationPopoverRef: PopoverButton;

  private thumbnailPopoverRef: PopoverButton;

  /** Memoization function that uses cached results if params haven't changed */
  private readonly memoizedGetFkPropertiesRowData: (
    analystCurrentFk: AnalystCurrentFk,
    fkUnitDisplayed: FkUnits,
    currentMovieIndex: number
  ) => Row[];

  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Constructor.
   *
   * @param props The initial props
   */
  public constructor(props: FkPropertiesProps) {
    super(props);
    this.memoizedGetFkPropertiesRowData = memoizeOne(this.getFkPropertiesRowData, isEqual);
    const fkData = getFkDummyData(this.props.signalDetection);
    this.state = {
      presetFrequency: FkProperties.isPresetFrequency([fkData.lowFrequency, fkData.highFrequency])
    };
  }

  /**
   * Updates the derived state from the next props.
   *
   * @param nextProps The next (new) props
   * @param prevState The previous state
   */
  public static getDerivedStateFromProps(
    nextProps: FkPropertiesProps
  ): {
    presetFrequency: boolean;
  } {
    const fkData = getFkDummyData(nextProps.signalDetection);
    return {
      presetFrequency: FkProperties.isPresetFrequency([fkData.lowFrequency, fkData.highFrequency])
    };
  }

  /**
   * Renders the component.
   */
  // eslint-disable-next-line react/sort-comp
  public render(): JSX.Element {
    const stationName = this.props.signalDetection.station.name;
    // Find the station to get channels for the total trackers
    const station = this.props.defaultStations.find(
      sta => sta.name === this.props.signalDetection.station.name
    );
    const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(
        this.props.signalDetection.signalDetectionHypotheses
      ).featureMeasurements
    );
    const fkData = getFkDummyData(this.props.signalDetection);
    const totalAvailableChannels = station ? station.allRawChannels : [];
    const trackers = this.getChannelConfigTrackers(fkData.configuration, totalAvailableChannels);
    const defaultStepSize = 0.1;
    const minorStepSize = 0.01;
    const fkConfigurationPopover = (
      <FkConfigurationPopover
        contributingChannelsConfiguration={trackers}
        maximumSlowness={fkData.configuration.maximumSlowness}
        numberOfPoints={fkData.configuration.numberOfPoints}
        mediumVelocity={fkData.configuration.mediumVelocity}
        normalizeWaveforms={fkData.configuration.normalizeWaveforms}
        useChannelVerticalOffset={fkData.configuration.useChannelVerticalOffset}
        fkUnitDisplayed={this.props.fkUnitDisplayed}
        leadFkSpectrumSeconds={fkData.configuration.leadFkSpectrumSeconds}
        applyFkConfiguration={fkConfig => {
          this.configurationPopoverRef.togglePopover();
          this.props.onFkConfigurationChange(fkConfig);
        }}
        close={() => {
          this.configurationPopoverRef.togglePopover();
        }}
      />
    );
    const fkFrequencyThumbnails = (
      <FkFrequencyThumbnails
        fkFrequencySpectra={
          this.props.fkFrequencyThumbnails ? this.props.fkFrequencyThumbnails : []
        }
        fkUnit={this.props.fkUnitDisplayed}
        onThumbnailClick={this.onThumbnailClick}
        arrivalTimeMovieSpectrumIndex={this.props.arrivalTimeMovieSpectrumIndex}
      />
    );
    const tableData = this.memoizedGetFkPropertiesRowData(
      this.props.analystCurrentFk,
      this.props.fkUnitDisplayed,
      this.props.currentMovieSpectrumIndex
    );
    const frequencyBand: FkTypes.FrequencyBand = {
      minFrequencyHz: fkData.lowFrequency,
      maxFrequencyHz: fkData.highFrequency
    };

    return (
      <div className="ag-theme-dark fk-properties">
        <div className="fk-properties__column">
          <div className="fk-properties-label-row">
            <div className="fk-properties-label-row__left">
              <div>
                Station:
                <span className="fk-properties__label">{stationName}</span>
              </div>
              <div>
                Phase:
                <span className="fk-properties__label">{fmPhase.value.toString()}</span>
              </div>
            </div>
            <div className="fk-properties-label-row__right">
              <PopoverButton
                label="Configure..."
                tooltip="Opens configuration options for continuous fk"
                popupContent={fkConfigurationPopover}
                onPopoverDismissed={() => {
                  // This empty arrow function is intentional.  This comment satisfies removing a SonarQube's critical issue
                }}
                onlyShowIcon
                icon={IconNames.COG}
                ref={ref => {
                  if (ref) {
                    this.configurationPopoverRef = ref;
                  }
                }}
              />
            </div>
          </div>
          <div className="fk-properties__table">
            <div className="max">
              <Table
                columnDefs={columnDefs}
                rowData={tableData}
                getRowId={node => node.data.id}
                overlayNoRowsTemplate="No data available"
              />
            </div>
          </div>
          <div className="fk-controls">
            <div>
              <div className="grid-container fk-control__grid">
                <div className="grid-item">Frequency:</div>
                <div
                  className="grid-item"
                  style={{
                    display: 'flex'
                  }}
                >
                  <DropDown
                    dropDownItems={this.generateFrequencyBandOptions()}
                    widthPx={dropdownWidthPx}
                    value={
                      this.state.presetFrequency ? frequencyBandToString(frequencyBand) : 'Custom'
                    }
                    onMaybeValue={maybeVal => {
                      this.onClickFrequencyMenu(maybeVal);
                    }}
                  />
                  <div style={{ marginLeft: '4px' }}>
                    <PopoverButton
                      ref={ref => {
                        if (ref) {
                          this.thumbnailPopoverRef = ref;
                        }
                      }}
                      label="FK Frequency Thumbnails"
                      onlyShowIcon
                      popupContent={fkFrequencyThumbnails}
                      onPopoverDismissed={() => {
                        // This empty arrow function is intentional.  This comment satisfies removing a SonarQube's critical issue
                      }}
                      tooltip="Preview thumbnails of the fk for configured frequency sk"
                      icon={IconNames.GRID_VIEW}
                    />
                  </div>
                </div>
                <div className="grid-item">Low:</div>
                <div
                  className={classNames('fk-properties__frequency-low-high-inputs', 'grid-item')}
                >
                  <NumericInput
                    ref={ref => {
                      this.lowFreqControl = ref;
                    }}
                    className={Classes.FILL}
                    allowNumericCharactersOnly
                    buttonPosition={Position.RIGHT}
                    value={this.props.userInputFkFrequency.minFrequencyHz}
                    onValueChange={this.onChangeLowFrequency}
                    selectAllOnFocus
                    stepSize={defaultStepSize}
                    minorStepSize={minorStepSize}
                    majorStepSize={1}
                  />
                </div>
                <div className="grid-item">High:</div>
                <div
                  className={classNames('fk-properties__frequency-low-high-inputs', 'grid-item')}
                >
                  <NumericInput
                    ref={ref => {
                      this.highFreqControl = ref;
                    }}
                    className={Classes.FILL}
                    allowNumericCharactersOnly
                    buttonPosition={Position.RIGHT}
                    value={this.props.userInputFkFrequency.maxFrequencyHz}
                    onValueChange={this.onChangeHighFrequency}
                    selectAllOnFocus
                    stepSize={defaultStepSize}
                    minorStepSize={minorStepSize}
                    majorStepSize={1}
                  />
                </div>
              </div>
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
   * Checks if the passed in frequency is in the list of preset filters
   *
   * @param freq frequency to check if it is in the preset list
   */
  // eslint-disable-next-line react/sort-comp
  private static isPresetFrequency(freq: number[]) {
    return (
      FrequencyBands.filter(
        freqs => freqs.minFrequencyHz === freq[0] && freqs.maxFrequencyHz === freq[1]
      ).length > 0
    );
  }

  /**
   * Creates menu options for frequency bands
   */
  private generateFrequencyBandOptions(): JSX.Element[] {
    const items = [];
    FrequencyBands.forEach(frequency => {
      items.push(this.frequencyBandToString([frequency.minFrequencyHz, frequency.maxFrequencyHz]));
    });
    return items;
  }

  /**
   * Validates numeric entries in the numeric control
   */
  // eslint-disable-next-line react/sort-comp
  private readonly validNumericEntry = (
    valueAsString: string,
    prevValue: number,
    controlReference: NumericInput
  ) => {
    if (valueAsString === '') {
      // eslint-disable-next-line no-param-reassign
      valueAsString = String(prevValue);
    }

    // eslint-disable-next-line no-param-reassign
    valueAsString = valueAsString.replace(/e|\+/, '');

    controlReference.setState(() => ({
      value: valueAsString
    }));

    // eslint-disable-next-line no-restricted-globals
    const newValue = isNaN(parseFloat(valueAsString)) ? prevValue : parseFloat(valueAsString);
    return {
      valid:
        // eslint-disable-next-line no-restricted-globals
        !valueAsString.endsWith('.') && !isNaN(parseFloat(valueAsString)) && newValue !== prevValue,
      value: newValue
    };
  };

  /**
   * Changes the high end of the frequency when the input changes
   */
  private readonly onChangeHighFrequency = (highFreq: number, numberAsString: string) => {
    const fkData = getFkDummyData(this.props.signalDetection);
    if (!fkData) {
      return;
    }

    const currentHigh = fkData.highFrequency;
    const result = this.validNumericEntry(numberAsString, currentHigh, this.highFreqControl);

    if (result.valid) {
      const currentParams = getFkParamsForSd(this.props.signalDetection);
      const priorConfig = fkData.configuration;
      this.props.onNewFkParams(
        {
          ...currentParams,
          frequencyPair: {
            maxFrequencyHz: result.value,
            minFrequencyHz: currentParams.frequencyPair.minFrequencyHz
          }
        },
        priorConfig
      );
    }
  };

  /**
   * Changes the low end of the frequency when the input changes
   */
  private readonly onChangeLowFrequency = (lowFreq: number, numberAsString: string) => {
    const fkData = getFkDummyData(this.props.signalDetection);
    if (!fkData) {
      return;
    }

    const currentLow = fkData.lowFrequency;
    const result = this.validNumericEntry(numberAsString, currentLow, this.lowFreqControl);
    if (result.valid) {
      const currentParams = getFkParamsForSd(this.props.signalDetection);
      const priorConfig = getFkDummyData(this.props.signalDetection).configuration;

      this.props.onNewFkParams(
        {
          windowParams: currentParams.windowParams,
          frequencyPair: {
            maxFrequencyHz: currentParams.frequencyPair.maxFrequencyHz,
            minFrequencyHz: result.value
          }
        },
        priorConfig
      );
    }
  };

  /**
   * Updates frequency bands from their menu
   */
  private readonly onClickFrequencyMenu = (value: any) => {
    const newFreq = FrequencyBands.filter(
      pair => this.frequencyBandToString([pair.minFrequencyHz, pair.maxFrequencyHz]) === value
    )[0];
    if (newFreq) {
      const currentParams = getFkParamsForSd(this.props.signalDetection);
      const priorConfig = getFkDummyData(this.props.signalDetection).configuration;
      this.props.onNewFkParams(
        {
          ...currentParams,
          frequencyPair: {
            maxFrequencyHz: newFreq.maxFrequencyHz,
            minFrequencyHz: newFreq.minFrequencyHz
          }
        },
        priorConfig
      );
    }
  };

  /**
   * Create Fstat/Power properties row
   *
   * @param fkUnitDisplayed
   * @param peakFkValue
   * @param predictedFkValue
   * @param selectedFkValue
   * @returns PropertiesRow
   */
  private readonly addFstatPowerRow = (
    fkUnitDisplayed: FkUnits,
    peakFkValue: number,
    predictedFkValue: number,
    selectedFkValue: number
  ) => {
    // Fstat or Power Row
    return {
      id: fkUnitDisplayed === FkUnits.FSTAT ? 'Fstat' : 'Power',
      description: fkUnitDisplayed === FkUnits.FSTAT ? 'Fstat' : 'Power (dB)',
      peak: peakFkValue ? { value: peakFkValue, uncertainty: undefined } : undefined,
      predicted: predictedFkValue ? { value: predictedFkValue, uncertainty: undefined } : undefined,
      selected: selectedFkValue ? { value: selectedFkValue, uncertainty: undefined } : undefined,
      residual: { value: undefined, uncertainty: undefined }
    };
  };

  /**
   * Gets the row data for the tables from the props
   */
  private readonly getFkPropertiesRowData = (
    analystCurrentFk: AnalystCurrentFk,
    fkUnitDisplayed: FkUnits,
    currentMovieIndex: number
  ): Row[] => {
    const fkData = getFkDummyData(this.props.signalDetection);
    const currentMovieFk = fkData.values[currentMovieIndex];

    const heatMap = getFkHeatmapArrayFromFkSpectra(
      fkData.values[currentMovieIndex],
      fkUnitDisplayed
    );

    let analystSelectedPoint;
    let selectedFkValue;
    // CONVERTS XY TO POLAR - doesn't seem quite right
    const x = analystCurrentFk ? analystCurrentFk.x : undefined;
    const y = analystCurrentFk ? analystCurrentFk.y : undefined;
    if (x && y) {
      analystSelectedPoint = getAnalystSelectedPoint(x, y);
      selectedFkValue = getPeakValueFromAzSlow(
        fkData,
        heatMap,
        analystSelectedPoint.azimuth,
        analystSelectedPoint.slowness,
        fkUnitDisplayed
      );
    }

    const predictedPoint = getPredictedPoint(this.props.signalDetectionFeaturePredictions);
    const dataRows: PropertiesRow[] = [];

    // Azimuth Row
    const predictedAzimuth = predictedPoint ? predictedPoint.azimuth : undefined;
    const predictedAzimuthUncertainty = predictedPoint
      ? predictedPoint.azimuthUncertainty
      : undefined;

    dataRows.push({
      id: 'Azimuth',
      description: 'Azimuth (°)',
      peak: {
        value: currentMovieFk.attributes.azimuth,
        uncertainty: currentMovieFk.attributes.azimuthUncertainty
      },
      predicted: predictedPoint
        ? { value: predictedAzimuth, uncertainty: predictedAzimuthUncertainty }
        : undefined,
      selected: analystSelectedPoint
        ? { value: analystSelectedPoint.azimuth, uncertainty: undefined }
        : undefined,
      residual: analystSelectedPoint
        ? { value: analystSelectedPoint.azimuth - predictedAzimuth, uncertainty: undefined }
        : undefined
    });

    // Slowness Row
    const predictedSlowness = predictedPoint ? predictedPoint.slowness : undefined;
    const predictedSlownessUncertainty = predictedPoint
      ? predictedPoint.slownessUncertainty
      : undefined;

    dataRows.push({
      id: 'Slowness',
      description: 'Slowness (s/°)',
      peak: {
        value: currentMovieFk.attributes.slowness,
        uncertainty: currentMovieFk.attributes.slownessUncertainty
      },
      predicted: predictedPoint
        ? { value: predictedSlowness, uncertainty: predictedSlownessUncertainty }
        : undefined,
      selected: analystSelectedPoint
        ? { value: analystSelectedPoint.slowness, uncertainty: undefined }
        : undefined,
      residual: analystSelectedPoint
        ? { value: analystSelectedPoint.slowness - predictedSlowness, uncertainty: undefined }
        : undefined
    });

    // Fstat or Power Row
    const peakFkValue = getPeakValueFromAzSlow(
      fkData,
      heatMap,
      currentMovieFk.attributes.azimuth,
      currentMovieFk.attributes.slowness,
      fkUnitDisplayed
    );
    let predictedFkValue;
    if (predictedPoint) {
      predictedFkValue = getPeakValueFromAzSlow(
        fkData,
        heatMap,
        predictedPoint.azimuth,
        predictedPoint.slowness,
        fkUnitDisplayed
      );
    }
    dataRows.push(
      this.addFstatPowerRow(fkUnitDisplayed, peakFkValue, predictedFkValue, selectedFkValue)
    );
    return dataRows;
  };

  /**
   * Formats a frequency band into a string for the drop down
   *
   * @param band Frequency band to format
   */
  private readonly frequencyBandToString = (band: number[]): string => `${band[0]} - ${band[1]} Hz`;

  /**
   * Merges the enabled channel trackers returned by the gateway with the full list of channels
   * From the station's channels in the SD
   *
   * @param fkConfiguration the fk configuration from the gateway
   * @param allAvailableChannels the channels for the SD's station
   */
  private readonly getChannelConfigTrackers = (
    fkConfiguration: FkTypes.FkConfiguration,
    allAvailableChannels: ChannelTypes.Channel[]
  ) => {
    const allChannelsAsTrackers: FkTypes.ContributingChannelsConfiguration[] = allAvailableChannels.map(
      channel => ({
        id: channel.name,
        name: channel.name,
        enabled: false
      })
    );
    return allChannelsAsTrackers.map(channelTracker => {
      const maybeMatchedChannelFromConfig = fkConfiguration.contributingChannelsConfiguration.find(
        ccc => ccc.id === channelTracker.id
      );
      if (maybeMatchedChannelFromConfig) {
        return maybeMatchedChannelFromConfig;
      }
      return channelTracker;
    });
  };

  private readonly onThumbnailClick = (minFrequency: number, maxFrequency: number) => {
    if (this.thumbnailPopoverRef && this.thumbnailPopoverRef.isExpanded) {
      this.thumbnailPopoverRef.togglePopover();
    }
    const fk = getFkDummyData(this.props.signalDetection);

    const newParams: FkParams = {
      windowParams: {
        leadSeconds: fk.windowLead,
        lengthSeconds: fk.windowLength,
        stepSize: fk.stepSize
      },
      frequencyPair: {
        minFrequencyHz: minFrequency,
        maxFrequencyHz: maxFrequency
      }
    };
    this.props.onNewFkParams(newParams, fk.configuration);
  };
}
