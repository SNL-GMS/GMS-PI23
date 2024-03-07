import type { TimeSeries } from '../channel-segment/types';
import type { PhaseType } from '../common/types';
import type { EntityReference } from '../faceted';
import type { Waveform } from '../waveform/types';

/**
 * Input type for Compute FK service call. This input
 * is compatible with the COI input i.e. start/end are strings
 */
export interface ComputeFkInput {
  readonly startTime: number;
  readonly sampleRate: number;
  readonly sampleCount: number;
  readonly channels: EntityReference<'name'>[];
  readonly windowLead: string;
  readonly windowLength: string;
  readonly lowFrequency: number;
  readonly highFrequency: number;
  readonly useChannelVerticalOffset: boolean;
  readonly phaseType: PhaseType;
  readonly normalizeWaveforms: boolean;
  // Optional fields
  readonly slowStartX?: number;
  readonly slowDeltaX?: number;
  readonly slowCountX?: number;
  readonly slowStartY?: number;
  readonly slowDeltaY?: number;
  readonly slowCountY?: number;
}

/**
 * Build FkInput for backend with configuration values to restore
 * with FkSpectra returned in fk configuration
 */
export interface FkInputWithConfiguration {
  readonly fkComputeInput: ComputeFkInput;
  readonly configuration: FkConfiguration;
  readonly signalDetectionId: string;
}
/**
 * Input type for creating new Beam
 */
export interface BeamInput {
  readonly signalDetectionId: string;
  readonly windowParams: WindowParameters;
}

// ***************************************
// Model
// ***************************************

/**
 * Fk meta data from the COI
 */
export interface FkMetadata {
  readonly phaseType: PhaseType;
  readonly slowDeltaX: number;
  readonly slowDeltaY: number;
  readonly slowStartX: number;
  readonly slowStartY: number;
}

export interface FrequencyBand {
  readonly minFrequencyHz: number;
  readonly maxFrequencyHz: number;
}

export interface WindowParameters {
  readonly leadSeconds: number;
  readonly lengthSeconds: number;
  readonly stepSize: number;
}

export interface FstatData {
  readonly azimuthWf: Waveform;
  readonly slownessWf: Waveform;
  readonly fstatWf: Waveform;
}

/**
 * Fk power spectra COI representation
 */
export interface FkPowerSpectraCOI extends TimeSeries {
  readonly metadata: FkMetadata;
  readonly values: FkPowerSpectrum[];
  readonly stepSize: number;
  readonly windowLead: number;
  readonly windowLength: number;
  readonly lowFrequency: number;
  readonly highFrequency: number;
}

/**
 * Fk power spectra UI representation
 */
export interface FkPowerSpectra extends FkPowerSpectraCOI {
  // Needed for UI processing added when query returns FkPowerSpectraCOI
  fstatData: FstatData;
  configuration: FkConfiguration;
  reviewed: boolean;
}
export interface FkPowerSpectrum {
  readonly power: number[][];
  readonly fstat: number[][];
  readonly quality: number;
  readonly attributes: FkAttributes;
}

export interface FkAttributes {
  readonly peakFStat: number;
  readonly azimuth: number;
  readonly slowness: number;
  readonly azimuthUncertainty: number;
  readonly slownessUncertainty: number;
  readonly xSlow: number;
  readonly ySlow: number;
}

/**
 * FkFrequencyThumbnail preview Fk at a preset FrequencyBand
 */
export interface FkFrequencyThumbnail {
  readonly frequencyBand: FrequencyBand;
  readonly fkSpectra: FkPowerSpectra;
}

/**
 * Collection of thumbnails by signal detection id
 */
export interface FkFrequencyThumbnailBySDId {
  readonly signalDetectionId: string;
  readonly fkFrequencyThumbnails: FkFrequencyThumbnail[];
}

/**
 * Tracks whether a channel is used to calculate fk
 */

export interface ContributingChannelsConfiguration {
  readonly id: string;
  readonly enabled: boolean;
  readonly name: string;
}

/**
 * Holds the configuration used to calculate an Fk
 */
export interface FkConfiguration {
  readonly maximumSlowness: number;
  readonly mediumVelocity: number;
  readonly numberOfPoints: number;
  readonly normalizeWaveforms: boolean;
  readonly useChannelVerticalOffset: boolean;
  readonly leadFkSpectrumSeconds: number;
  readonly contributingChannelsConfiguration: ContributingChannelsConfiguration[];
}
