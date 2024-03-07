import type {
  ChannelSegment,
  ChannelSegmentDescriptor,
  TimeSeries
} from '../channel-segment/types';
import type { PhaseType, Units } from '../common/types';
import type { Faceted, VersionReference } from '../faceted';
import type { Channel } from '../station-definitions/channel-definitions/channel-definitions';
import type { Station } from '../station-definitions/station-definitions/station-definitions';

// ***************************************
// Model
// ***************************************

/**
 * Represents a measurement of a signal detection feature,
 * including arrival time, azimuth, slowness and phase
 */
export interface FeatureMeasurement {
  channel: VersionReference<'name'> | Channel;
  measuredChannelSegment: {
    id: ChannelSegmentDescriptor;
  };
  measurementValue: FeatureMeasurementValue;
  featureMeasurementType: FeatureMeasurementType;
  snr?: DoubleValue; // Signal to Noise Ratio as a DoubleValue
}

export interface AmplitudeFeatureMeasurement extends FeatureMeasurement {
  measuredValue: AmplitudeMeasurementValue;
  featureMeasurementType:
    | FeatureMeasurementType.AMPLITUDE
    | FeatureMeasurementType.AMPLITUDE_A5_OVER_2
    | FeatureMeasurementType.AMPLITUDE_A5_OVER_2_OR
    | FeatureMeasurementType.AMPLITUDE_ALR_OVER_2
    | FeatureMeasurementType.AMPLITUDEh_ALR_OVER_2
    | FeatureMeasurementType.AMPLITUDE_ANL_OVER_2
    | FeatureMeasurementType.AMPLITUDE_SBSNR
    | FeatureMeasurementType.AMPLITUDE_FKSNR;
}

export interface ArrivalTimeFeatureMeasurement extends FeatureMeasurement {
  measurementValue: ArrivalTimeMeasurementValue;
  featureMeasurementType: FeatureMeasurementType.ARRIVAL_TIME;
}

export interface AzimuthFeatureMeasurement extends FeatureMeasurement {
  measurementValue: NumericMeasurementValue;
  featureMeasurementType:
    | FeatureMeasurementType.RECEIVER_TO_SOURCE_AZIMUTH
    | FeatureMeasurementType.SOURCE_TO_RECEIVER_AZIMUTH;
}

export interface SlownessFeatureMeasurement extends FeatureMeasurement {
  measurementValue: NumericMeasurementValue;
  featureMeasurementType: FeatureMeasurementType.SLOWNESS;
}

export interface PhaseTypeFeatureMeasurement extends FeatureMeasurement {
  measurementValue: PhaseTypeMeasurementValue;
  featureMeasurementType: FeatureMeasurementType.PHASE;
}

export interface RectilinearityFeatureMeasurement extends FeatureMeasurement {
  measurementValue: RectilinearityMeasurementValue;
  featureMeasurementType: FeatureMeasurementType.RECTILINEARITY;
}

export interface EmergenceAngleFeatureMeasurement extends FeatureMeasurement {
  measurementValue: EmergenceAngleMeasurementValue;
  featureMeasurementType: FeatureMeasurementType.EMERGENCE_ANGLE;
}

export interface LongPeriodFirstMotionFeatureMeasurement extends FeatureMeasurement {
  measurementValue: LongPeriodFirstMotionMeasurementValue;
  featureMeasurementType: FeatureMeasurementType.LONG_PERIOD_FIRST_MOTION;
}

export interface ShortPeriodFirstMotionFeatureMeasurement extends FeatureMeasurement {
  measurementValue: ShortPeriodFirstMotionMeasurementValue;
  featureMeasurementType: FeatureMeasurementType.SHORT_PERIOD_FIRST_MOTION;
}

/**
 * Represents Feature Measurement Value (fields are dependent on type of FM)
 */
export type FeatureMeasurementValue =
  | AmplitudeMeasurementValue
  | ArrivalTimeMeasurementValue
  | NumericMeasurementValue
  | PhaseTypeMeasurementValue
  | RectilinearityMeasurementValue
  | EmergenceAngleMeasurementValue
  | LongPeriodFirstMotionMeasurementValue
  | ShortPeriodFirstMotionMeasurementValue;

/**
 * Generic value object which are the foundational building blocks to
 * the FeatureMeasurementValue definition
 */
export type ValueType = DoubleValue | DurationValue | InstantValue;

/**
 * Represents Feature Measurement Value for a doSuble type.
 */
export interface DoubleValue {
  value: number;
  standardDeviation: number;
  units: Units;
}

export interface DurationValue {
  value: number;
  standardDeviation: number;
  units: Units;
}

export interface InstantValue {
  value: number;
  standardDeviation: number;
}

/**
 * Represents Feature Measurement Value for a amplitude type.
 */
export interface AmplitudeMeasurementValue {
  startTime: number;
  period: number;
  amplitude: DoubleValue;
}

/**
 * Represents Feature Measurement Value for Arrival Time FM Type.
 */
export interface ArrivalTimeMeasurementValue {
  arrivalTime: InstantValue;
  travelTime: DurationValue;
}

/**
 * Represents Feature Measurement Value for a numeric type.
 */
export interface NumericMeasurementValue {
  measuredValue: DoubleValue;
  referenceTime?: number;
}

/**
 * Represents Feature Measurement Value for a phase type.
 */
export interface PhaseTypeMeasurementValue {
  value: PhaseType;
  confidence: number;
  referenceTime: number;
}

/**
 * Represents Feature Measurement Value for Rectilinearity
 */
export interface RectilinearityMeasurementValue {
  measuredValue: DoubleValue;
  referenceTime: number;
}

/**
 * Represents Feature Measurement Value for EmergenceAngle
 */
export interface EmergenceAngleMeasurementValue {
  measuredValue: DoubleValue;
  referenceTime: number;
}

/**
 * Represents Feature Measurement Value for LongPeriodFirstMotion
 */
export interface LongPeriodFirstMotionMeasurementValue {
  value: string;
  confidence: number;
  referenceTime: number;
}
/**
 * Represents Feature Measurement Value for ShortPeriodFirstMotion
 */
export interface ShortPeriodFirstMotionMeasurementValue {
  value: string;
  confidence: number;
  referenceTime: number;
}

/**
 * Represents Feature Measurement Value for first motion.
 */
export interface FirstMotionMeasurementValue extends FeatureMeasurement {
  value: string;
  confidence: number;
  referenceTime: number;
}

export enum AmplitudeType {
  AMPLITUDE_A5_OVER_2 = 'AMPLITUDE_A5_OVER_2',
  AMPLITUDE_A5_OVER_2_OR = 'AMPLITUDE_A5_OVER_2_OR',
  AMPLITUDE_ALR_OVER_2 = 'AMPLITUDE_ALR_OVER_2',
  AMPLITUDEh_ALR_OVER_2 = 'AMPLITUDEh_ALR_OVER_2',
  AMPLITUDE_ANL_OVER_2 = 'AMPLITUDE_ANL_OVER_2',
  AMPLITUDE_SBSNR = 'AMPLITUDE_SBSNR',
  AMPLITUDE_FKSNR = 'AMPLITUDE_FKSNR'
}

/**
 * Enumeration of feature measurement type names
 */
export enum FeatureMeasurementType {
  ARRIVAL_TIME = 'ARRIVAL_TIME',
  RECEIVER_TO_SOURCE_AZIMUTH = 'RECEIVER_TO_SOURCE_AZIMUTH',
  SOURCE_TO_RECEIVER_AZIMUTH = 'SOURCE_TO_RECEIVER_AZIMUTH',
  SLOWNESS = 'SLOWNESS',
  PHASE = 'PHASE',
  EMERGENCE_ANGLE = 'EMERGENCE_ANGLE',
  PERIOD = 'PERIOD',
  RECTILINEARITY = 'RECTILINEARITY',
  SNR = 'SNR',
  AMPLITUDE = 'AMPLITUDE',
  AMPLITUDE_A5_OVER_2 = 'AMPLITUDE_A5_OVER_2',
  AMPLITUDE_A5_OVER_2_OR = 'AMPLITUDE_A5_OVER_2_OR',
  AMPLITUDE_ALR_OVER_2 = 'AMPLITUDE_ALR_OVER_2',
  AMPLITUDEh_ALR_OVER_2 = 'AMPLITUDEh_ALR_OVER_2',
  AMPLITUDE_ANL_OVER_2 = 'AMPLITUDE_ANL_OVER_2',
  AMPLITUDE_SBSNR = 'AMPLITUDE_SBSNR',
  AMPLITUDE_FKSNR = 'AMPLITUDE_FKSNR',
  LONG_PERIOD_FIRST_MOTION = 'LONG_PERIOD_FIRST_MOTION',
  SHORT_PERIOD_FIRST_MOTION = 'SHORT_PERIOD_FIRST_MOTION',
  SOURCE_TO_RECEIVER_DISTANCE = 'SOURCE_TO_RECEIVER_DISTANCE'
}

/**
 * Signal detection hypothesis id interface
 */
export interface SignalDetectionHypothesisId {
  id: string;
  signalDetectionId: string;
}

/**
 * Faceted Signal Detection Hypotheses
 */
export interface SignalDetectionHypothesisFaceted {
  id: SignalDetectionHypothesisId;
}

/**
 * Signal detection hypothesis interface used in Signal detection
 */
export interface SignalDetectionHypothesis extends Faceted<SignalDetectionHypothesisFaceted> {
  monitoringOrganization: string;
  rejected: boolean;
  featureMeasurements: FeatureMeasurement[];
  parentSignalDetectionHypothesis: SignalDetectionHypothesis | null;
}

/**
 * Represents a Signal detection
 */
export interface SignalDetection {
  id: string;
  monitoringOrganization: string;
  station: VersionReference<'name'> | Station;
  signalDetectionHypotheses: SignalDetectionHypothesis[];
}

export interface SignalDetectionsWithChannelSegments {
  signalDetections: SignalDetection[];
  channelSegments: ChannelSegment<TimeSeries>[];
}

/**
 * Basic info for a hypothesis
 */
export interface ConflictingSdHypData {
  eventId: string;
  phase: PhaseType;
  arrivalTime: number;
  stationName?: string;
  eventTime?: number;
}
