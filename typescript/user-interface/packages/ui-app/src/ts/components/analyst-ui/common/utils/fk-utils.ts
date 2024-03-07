import type { ChannelTypes, EventTypes, FkTypes } from '@gms/common-model';
import { CommonTypes, SignalDetectionTypes, WaveformTypes } from '@gms/common-model';
import { convertSecondsToDuration } from '@gms/common-util';
import type { UiChannelSegment } from '@gms/ui-state';
import { UILogger } from '@gms/ui-util';
import type Immutable from 'immutable';

import type { FkParams } from '~analyst-ui/components/azimuth-slowness/types';
import { FkUnits } from '~analyst-ui/components/azimuth-slowness/types';
import { systemConfig } from '~analyst-ui/config/system-config';
import { userPreferences } from '~analyst-ui/config/user-preferences';

import { getDummyFkSpectra } from '../../components/azimuth-slowness/fk-spectra';
import { getAssociatedDetections } from './event-util';
import { findAssociatedChannelSegment } from './signal-detection-util';

const logger = UILogger.create('GMS_FK_UTILS', process.env.GMS_FK_UTILS);

/**
 * Utility functions for the Azimuth Slowness Display
 */

/**
 * Finds Azimuth Feature Measurements for the FkData object
 *
 * @param sd Signal Detection
 *
 * @returns FkData or undefined if not found
 */
export function getFkData(
  sd: SignalDetectionTypes.SignalDetection,
  channelSegmentRecord: Record<string, Record<string, UiChannelSegment[]>>
): FkTypes.FkPowerSpectra | undefined {
  if (!sd) {
    return undefined;
  }
  const { featureMeasurements } = SignalDetectionTypes.Util.getCurrentHypothesis(
    sd.signalDetectionHypotheses
  );
  const azimuthTimeFm = SignalDetectionTypes.Util.findAzimuthFeatureMeasurement(
    featureMeasurements
  );
  // Find the corresponding ChannelSegment using ChannelSegmentDescriptor
  if (azimuthTimeFm) {
    const uiChannelSegment = findAssociatedChannelSegment(
      azimuthTimeFm.measuredChannelSegment.id,
      channelSegmentRecord,
      sd,
      WaveformTypes.UNFILTERED
    );
    if (uiChannelSegment) {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Dummy query for FkData (temp till backend compute query)
 *
 * @param sd Signal Detection
 *
 * @returns FkData or undefined if not found
 */
export function getFkDummyData(
  sd: SignalDetectionTypes.SignalDetection
): FkTypes.FkPowerSpectra | undefined {
  if (!sd) {
    return undefined;
  }
  const { featureMeasurements } = SignalDetectionTypes.Util.getCurrentHypothesis(
    sd.signalDetectionHypotheses
  );
  const arrivalTimeFm = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
    featureMeasurements
  );
  if (arrivalTimeFm) {
    return getDummyFkSpectra(arrivalTimeFm.measuredChannelSegment.id.startTime);
  }
  return undefined;
}

/**
 * Dummy query that updates SD Azimuth FM timeseries (FkPowerSpectra) future work
 * The updated SD FM then trickles back down to the Fk Display
 *
 * @param fkInput array
 * @returns void promise
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const computeFks = async (fkInput: FkTypes.FkInputWithConfiguration[]): Promise<void> => {
  return Promise.resolve();
};

// eslint-disable-next-line class-methods-use-this
export const computeFkFrequencyThumbnails = async (
  input: FkTypes.FkInputWithConfiguration,
  signalDetection: SignalDetectionTypes.SignalDetection
): Promise<FkTypes.FkFrequencyThumbnail> => {
  if (!signalDetection) {
    return Promise.resolve(undefined);
  }
  const res = getFkDummyData(signalDetection);
  return {
    frequencyBand: {
      minFrequencyHz: input.fkComputeInput.lowFrequency,
      maxFrequencyHz: input.fkComputeInput.highFrequency
    },
    fkSpectra: res
  };
};

/**
 * Find all signal detections associated to the event that have FKs
 *
 * @param event openEvent
 * @param signalDetections all signal detections
 * @returns associated signal detections
 */
export const getAssociatedDetectionsWithFks = (
  event: EventTypes.Event,
  signalDetections: SignalDetectionTypes.SignalDetection[]
): SignalDetectionTypes.SignalDetection[] => {
  if (event && signalDetections && signalDetections.length > 0) {
    const associatedSds = getAssociatedDetections(event, signalDetections);
    return associatedSds.filter(sd => sd && getFkDummyData(sd) !== undefined);
  }
  return [];
};

export function getFkParamsForSd(sd: SignalDetectionTypes.SignalDetection): FkParams {
  if (!sd) {
    return undefined;
  }
  const fk = getFkDummyData(sd);
  return {
    frequencyPair: {
      maxFrequencyHz: fk.highFrequency,
      minFrequencyHz: fk.lowFrequency
    },
    windowParams: {
      leadSeconds: fk.windowLead,
      lengthSeconds: fk.windowLength,
      stepSize: fk.stepSize
    }
  };
}

/**
 * Returns an empty FK Spectrum configuration. The values are NOT default values,
 * but instead values that will make it obvious within the UI that a correct
 * configuration was never added to the FK
 */
const defaultFkConfiguration: FkTypes.FkConfiguration = {
  contributingChannelsConfiguration: [],
  maximumSlowness: systemConfig.continuousFkConfiguration.defaultMaximumSlowness,
  mediumVelocity: 1,
  normalizeWaveforms: false,
  numberOfPoints: systemConfig.continuousFkConfiguration.defaultNumberOfPoints,
  useChannelVerticalOffset: false,
  leadFkSpectrumSeconds: userPreferences.azimuthSlowness.defaultLead
};

/**
 * Returns an Fk Configuration for the correct phase
 */
export function getDefaultFkConfigurationForSignalDetection(
  sd: SignalDetectionTypes.SignalDetection,
  contributingChannels: ChannelTypes.Channel[]
): FkTypes.FkConfiguration {
  // Check and see if SD is well formed
  if (
    !sd ||
    !SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses) ||
    !SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses)
      .featureMeasurements
  ) {
    return undefined;
  }
  const phase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).featureMeasurements
  ).value;
  if (!phase) {
    return undefined;
  }
  const phaseAsString = CommonTypes.PhaseType[phase];
  const contributingChannelsConfiguration = contributingChannels.map(channel => ({
    name: channel.name,
    id: channel.name,
    enabled: true
  }));
  let mediumVelocity = 0;
  // eslint-disable-next-line newline-per-chained-call
  if (phaseAsString.toLowerCase().startsWith('p') || phaseAsString.toLowerCase().endsWith('p')) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    mediumVelocity = 5.8;
    // eslint-disable-next-line newline-per-chained-call
  } else if (
    phaseAsString.toLowerCase().startsWith('s') ||
    phaseAsString.toLowerCase().endsWith('s')
  ) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    mediumVelocity = 3.6;
  } else if (phaseAsString === CommonTypes.PhaseType.Lg) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    mediumVelocity = 3.5;
  } else if (phaseAsString === CommonTypes.PhaseType.Rg) {
    // eslint-disable-next-line
    mediumVelocity = 3;
  } else {
    // Cause Tx or N...undefined behavior ok
    mediumVelocity = 1;
  }
  return {
    ...defaultFkConfiguration,
    mediumVelocity,
    contributingChannelsConfiguration
  };
}

/**
 * Gets the user-set fk unit for a given fk id, or returns the default unit
 *
 * @param fkId the id of the fk
 */
export function getFkUnitForSdId(
  sdId: string,
  fkUnitsForEachSdId: Immutable.Map<string, FkUnits>
): FkUnits {
  return fkUnitsForEachSdId.has(sdId) ? fkUnitsForEachSdId.get(sdId) : FkUnits.FSTAT;
}

/**
 * Formats a frequency band into a string for the drop down
 *
 * @param band Frequency band to format
 */
export function frequencyBandToString(band: FkTypes.FrequencyBand): string {
  return `${band.minFrequencyHz} - ${band.maxFrequencyHz} Hz`;
}

/**
 * Approximate conversion between km and degrees
 */
export function kmToDegreesApproximate(km: number): number {
  const DEGREES_IN_CIRCLE = 360;
  const RAD_EARTH = 6371;
  const TWO_PI = Math.PI * 2;
  return km * (DEGREES_IN_CIRCLE / (RAD_EARTH * TWO_PI));
}

/**
 * Calculates start time for fk service
 *
 * @param wfStartTime start of the signal detection beam
 * @param arrivalTime arrival time of the signal detection
 * @param leadTime lead time for fk calculation
 * @param stepSize step size for fk calculation
 *
 * @return epoch seconds representing the start time for fk calculation
 */
export function calculateStartTimeForFk(
  wfStartTime: number,
  arrivalTime: number,
  leadTime: number,
  stepSize: number
): number {
  if (
    wfStartTime === undefined ||
    arrivalTime === undefined ||
    leadTime === undefined ||
    stepSize === undefined
  ) {
    logger.error('Cannot calculate fk start time with undefined parameters');
    return undefined;
  }
  const stepTime = arrivalTime - wfStartTime - leadTime;
  const numberOfSteps = Math.floor(stepTime / stepSize);
  if (numberOfSteps < 0) {
    logger.error(
      'Cannot calculate fk start time. Wf start time is not far enough before arrival time'
    );
    return undefined;
  }
  const timeBeforeArrival = stepSize * numberOfSteps + leadTime;
  return arrivalTime - timeBeforeArrival;
}

/**
 * Helper function that builds the ComputeFk Input object. Shared by computeFk and computeFkFrequencyThumbnails
 *
 * @param userContext user context for current user
 * @param input FkInput sent by UI
 * @param sdHyp signal detection hypothesis for fk
 * @param areThumbnails (Modifies sample rate so Thumbnails only returns one spectrum in fk)
 *
 * @returns fk input
 */
export const createComputeFkInput = (
  detection: SignalDetectionTypes.SignalDetection,
  fkParams: FkParams,
  configuration: FkTypes.FkConfiguration,
  areThumbnails = false
): FkTypes.FkInputWithConfiguration => {
  if (!fkParams || !detection || !configuration) {
    return undefined;
  }

  const ONE_MINUTE = 60;
  const FOUR_MINUTES = 240;
  // Get arrivalTime segment to figure out length in secs
  // Lookup the Azimuth feature measurement and get the fkDataId (channel segment id)
  const arrivalFMV = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(detection.signalDetectionHypotheses)
      ?.featureMeasurements
  );

  const fkData = getFkDummyData(detection);
  const maximumSlownessInSPerKm = kmToDegreesApproximate(configuration.maximumSlowness);
  // Set start and end time based on arrival segment if it exists,
  // else default to one minute before and 4 minutes after arrival time
  const startTime = fkData ? fkData.startTime : arrivalFMV.arrivalTime.value - ONE_MINUTE;
  const endTime = fkData ? fkData.endTime : arrivalFMV.arrivalTime.value + FOUR_MINUTES;
  // For thumbnail with sample count of 1 just use arrival start time
  const offsetStartTime = areThumbnails
    ? startTime
    : calculateStartTimeForFk(
        startTime,
        arrivalFMV.arrivalTime.value,
        fkParams.windowParams.leadSeconds,
        fkParams.windowParams.stepSize
      );
  // const offsetStartTime = arrivalFMV - input.windowParams.leadSeconds;
  // Sample rate inverse of step size. If thumbnail set rate so we only get one spectrum back from service
  const sampleRate = areThumbnails
    ? 1 / (endTime - offsetStartTime)
    : 1 / fkParams.windowParams.stepSize;

  // const endTime = arrivalSegment.startTime + (arrivalSegment.timeseries[0].sampleCount / sampleRate);
  // Compute sample count if thumbnail only want one spectrum
  const timeSpanAvailable = endTime - startTime;
  const sampleCount = areThumbnails
    ? 1
    : Math.floor(timeSpanAvailable / fkParams.windowParams.stepSize);

  const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(detection.signalDetectionHypotheses)
      .featureMeasurements
  );
  return {
    fkComputeInput: {
      startTime: offsetStartTime,
      sampleRate,
      sampleCount,
      channels: configuration.contributingChannelsConfiguration,
      windowLead: convertSecondsToDuration(fkParams.windowParams.leadSeconds),
      windowLength: convertSecondsToDuration(fkParams.windowParams.lengthSeconds),
      lowFrequency: fkParams.frequencyPair.minFrequencyHz,
      highFrequency: fkParams.frequencyPair.maxFrequencyHz,
      useChannelVerticalOffset: configuration.useChannelVerticalOffset,
      phaseType: fmPhase.value,
      normalizeWaveforms: configuration.normalizeWaveforms,
      slowCountX: Math.floor(configuration.numberOfPoints),
      slowCountY: Math.floor(configuration.numberOfPoints),
      slowStartX: -maximumSlownessInSPerKm,
      slowStartY: -maximumSlownessInSPerKm,
      slowDeltaX: (maximumSlownessInSPerKm * 2) / configuration.numberOfPoints,
      slowDeltaY: (maximumSlownessInSPerKm * 2) / configuration.numberOfPoints
    },
    configuration,
    signalDetectionId: detection.id
  };
};
