import type { FkTypes, StationTypes } from '@gms/common-model';
import { CommonTypes } from '@gms/common-model';
/**
 * Returns an empty FK Spectrum configuration. The values are NOT default values,
 * but instead values that will make it obvious within the UI that a correct
 * configuration was never added to the FK
 *
 * @returns a FKConfiguration
 */
const defaultFkConfiguration: FkTypes.FkConfiguration = {
  contributingChannelsConfiguration: [],
  maximumSlowness: 40,
  mediumVelocity: 1,
  normalizeWaveforms: false,
  numberOfPoints: 81,
  useChannelVerticalOffset: false,
  leadFkSpectrumSeconds: 1
};

/**
 * Returns an Fk Configuration for the correct phase
 */
export function getDefaultFkConfigurationForSignalDetection(
  phase: CommonTypes.PhaseType,
  station: StationTypes.Station
) {
  const mediumVelocityP = 5.8;
  const mediumVelocityS = 3.6;
  const mediumVelocityLg = 3.5;
  const mediumVelocityRg = 3.0;
  const phaseAsString = CommonTypes.PhaseType[phase];
  const channels = station.allRawChannels;
  const contributingChannelsConfiguration = channels.map(channel => ({
    name: channel.name,
    id: channel.name,
    enabled: true
  }));
  let mediumVelocity = 0;
  if (phaseAsString.toLowerCase().startsWith('p') || phaseAsString.toLowerCase().endsWith('p')) {
    mediumVelocity = mediumVelocityP;
  } else if (
    phaseAsString.toLowerCase().startsWith('s') ||
    phaseAsString.toLowerCase().endsWith('s')
  ) {
    mediumVelocity = mediumVelocityS;
  } else if (phaseAsString === CommonTypes.PhaseType.Lg) {
    mediumVelocity = mediumVelocityLg;
  } else if (phaseAsString === CommonTypes.PhaseType.Rg) {
    mediumVelocity = mediumVelocityRg;
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
