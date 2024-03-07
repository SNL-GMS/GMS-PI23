import type { ChannelTypes, FacetedTypes, FilterTypes } from '@gms/common-model';
import { toOSDTime } from '@gms/common-util';
import { digestMessageSHA256 } from '@gms/ui-util';
import cloneDeep from 'lodash/cloneDeep';

export const ATTRIBUTE_SEPARATOR = ',';
export const COMPONENT_SEPARATOR = '/';

/**
 * Build a sorted array from channel param records. Used to generate channel name hashes.
 *
 * @param r the Record to be parsed
 * @returns a sorted array of the format [{key: value}, {key: value}, ...]
 */
export function buildSortedArrayFromRecord<T = unknown>(r: Record<string, T>) {
  return [...Object.keys(r)].sort().map(k => ({ [k]: r[k] }));
}

/**
 * Creates a filter parameter entry for a channel name.
 * Does not include the leading '/' character.
 * Replaces / characters in the filter name with | characters
 *
 * @param filterDefinition the filter to parse
 * @returns the string formatted in the format: filter,filter name
 */
export function createFilterAttributesForChannelName(
  filterDefinition: FilterTypes.FilterDefinition
) {
  if (filterDefinition?.name) {
    return `filter${ATTRIBUTE_SEPARATOR}${filterDefinition.name.replace(/\//, '|')}`;
  }
  return '';
}

/**
 * Creates the object that gets stringified for the derived channel name hash
 *
 * @param channel a channel to parse
 * @returns an object containing the channel data to be hashed
 */
export function generateChannelDataForHash(channel: ChannelTypes.Channel) {
  const sortedProcessingDefinition = buildSortedArrayFromRecord(channel.processingDefinition);
  const sortedProcessingMetadata = buildSortedArrayFromRecord(channel.processingMetadata);
  const configuredInputs = [{ effectiveAt: toOSDTime(channel.effectiveAt), name: channel.name }];
  return {
    channelBandType: channel.channelBandType,
    channelDataType: channel.channelDataType,
    channelInstrumentType: channel.channelInstrumentType,
    channelOrientationCode: channel.channelOrientationCode,
    channelOrientationType: channel.channelOrientationType,
    configuredInputs,
    description: channel.description,
    location: channel.location,
    nominalSampleRateHz: channel.nominalSampleRateHz,
    orientationAngles: channel.orientationAngles,
    processingDefinition: sortedProcessingDefinition,
    processingMetadata: sortedProcessingMetadata,
    response: channel.response?.id ?? null,
    station: channel.station.name,
    units: channel.units
  };
}

/**
 * Generates the JSON string used as the input for the channel name hash
 */
export function generateChannelJsonString(channel: ChannelTypes.Channel): string {
  return JSON.stringify(generateChannelDataForHash(channel));
}

/**
 * Takes a channel and returns a promise for the channel name hash, using SHA256.
 * Uses a custom json property order based on architecture guidance so that the
 * front end and back end align.
 *
 * @param channel a channel to parse
 * @returns a deterministic hash based on the channel details
 */
export async function generateChannelHash(channel: ChannelTypes.Channel): Promise<string> {
  const jsonStringToHash = generateChannelJsonString(channel);
  return digestMessageSHA256(jsonStringToHash);
}

/**
 * Strips the end hash from a channel name
 *
 * @param name channel name
 * @returns the channel name without the ending hash
 */
export function stripHashFromChannelName(name: string): string {
  // future proofing in case the COMPONENT_SEPARATOR changes, escapes the character for use in regex
  const escapedComponentSeparator = COMPONENT_SEPARATOR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stripHash = new RegExp(`${escapedComponentSeparator}[a-f0-9]{64}`);
  return name.replace(stripHash, '');
}

/**
 * Builds a channel name for a filtered, derived channel, in the format
 * [PREVIOUS_CHANNEL_NAME_WITHOUT_HASH]/[FILTER_PROCESSING_ATTRIBUTES]/[CHANNEL_HASH]
 *
 * @param inputChannel the channel that is being named (not the old channel)
 * @param filterDefinition the filter that is being applied
 */
export async function buildFilteredChannelName(
  inputChannel: ChannelTypes.Channel,
  filterDefinition: FilterTypes.FilterDefinition
): Promise<string> {
  const hash = await generateChannelHash(inputChannel);
  const channelNameWithoutHash = stripHashFromChannelName(inputChannel.name);
  return `${channelNameWithoutHash}${COMPONENT_SEPARATOR}${createFilterAttributesForChannelName(
    filterDefinition
  )}${COMPONENT_SEPARATOR}${hash}`;
}

/**
 * Builds the processing metadata entry for a derived, filtered channel
 */
export function buildProcessingMetadataForFilteredChannel(
  inputChannel: ChannelTypes.Channel,
  filterDefinition: FilterTypes.FilterDefinition
) {
  const processingMetadata = cloneDeep(inputChannel.processingMetadata);
  processingMetadata.FILTER_TYPE = filterDefinition.filterDescription.filterType;
  processingMetadata.FILTER_CAUSALITY = filterDefinition.filterDescription.causal;
  return processingMetadata;
}

/**
 * @param inputChannel the source channel
 * @returns the configured inputs, consisting of a version reference of the channel in an array
 */
export function buildConfiguredInputs(
  inputChannel: ChannelTypes.Channel
): [FacetedTypes.VersionReference<'name', ChannelTypes.Channel>] {
  return [
    {
      effectiveAt: inputChannel.effectiveAt,
      name: inputChannel.name
    }
  ];
}

/**
 * Determines if a channel is derived by checking the name for a component separator token.
 *
 * @param inputChannel the source channel
 * @returns true if the inputChannel is derived
 */
export function isDerivedChannel(inputChannel: ChannelTypes.Channel): boolean {
  return inputChannel.name.includes(COMPONENT_SEPARATOR);
}
