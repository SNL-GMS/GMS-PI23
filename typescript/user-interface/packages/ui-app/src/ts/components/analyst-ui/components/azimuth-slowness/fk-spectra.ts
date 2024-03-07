import type { FkTypes, WaveformTypes } from '@gms/common-model';
import { ChannelSegmentTypes } from '@gms/common-model';
import { deserializeTypeTransformer } from '@gms/ui-workers';

import dummyFkSpectra from './fk-spectra-sample.json';

let startTime = 0;

/**
 * Helper method to create the FkData waveforms (azimuthWf, fstatWf, slownessWf)
 *
 * @param fkSpectra the fk spectra
 */
function createFkWaveform(fkSpectra: FkTypes.FkPowerSpectraCOI): WaveformTypes.Waveform {
  return {
    sampleRateHz: fkSpectra.sampleRateHz,
    sampleCount: fkSpectra.sampleCount,
    startTime: startTime + Number(fkSpectra.windowLead),
    endTime: startTime + fkSpectra.sampleCount / fkSpectra.sampleRateHz,
    type: ChannelSegmentTypes.TimeSeriesType.FK_SPECTRA,
    samples: []
  };
}

/**
 * Convert a FkSpectra (received from COI or Streaming Service) into an FstatData representation.
 *
 * @param fkSpectra: FkPowerSpectra from COI/Streaming Service
 * @param beamWaveform: beam from the SD Arrival Time Feature measurement Channel Segment
 * @param arrivalTime: arrival time value
 *
 * @returns FK Stat Data or undefined if not able to create
 */
function convertToPlotData(fkSpectra: FkTypes.FkPowerSpectraCOI): FkTypes.FstatData | undefined {
  // If the channel segment is populated at the top properly
  if (!fkSpectra) {
    return undefined;
  }

  const fstatData: FkTypes.FstatData = {
    azimuthWf: createFkWaveform(fkSpectra),
    fstatWf: createFkWaveform(fkSpectra),
    slownessWf: createFkWaveform(fkSpectra)
  };

  // Populate fstatData waveforms beams was a parameter
  if (fkSpectra && fkSpectra.values) {
    fkSpectra.values.forEach((fkSpectrum: FkTypes.FkPowerSpectrum) => {
      fstatData.azimuthWf.samples.push(fkSpectrum.attributes.azimuth);
      fstatData.fstatWf.samples.push(fkSpectrum.attributes.peakFStat);
      fstatData.slownessWf.samples.push(fkSpectrum.attributes.slowness);
    });
  }
  return fstatData;
}

export const getDummyFkSpectra = (arrivalTime: number): FkTypes.FkPowerSpectra => {
  const fkSpectra: FkTypes.FkPowerSpectraCOI = deserializeTypeTransformer(dummyFkSpectra);
  startTime = arrivalTime;
  return {
    ...fkSpectra,
    startTime,
    endTime: startTime + fkSpectra.sampleCount / fkSpectra.sampleRateHz,
    fstatData: convertToPlotData(dummyFkSpectra as FkTypes.FkPowerSpectraCOI),
    configuration: {
      maximumSlowness: 1.0,
      mediumVelocity: 1.0,
      numberOfPoints: 1.0,
      normalizeWaveforms: false,
      useChannelVerticalOffset: false,
      leadFkSpectrumSeconds: 1.0,
      contributingChannelsConfiguration: []
    },
    reviewed: false
  };
};
