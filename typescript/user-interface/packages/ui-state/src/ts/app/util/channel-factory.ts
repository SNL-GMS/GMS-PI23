import type { ChannelTypes, FilterTypes, TypeUtil } from '@gms/common-model';
import { Logger, recordHasStringOrNumberKeys, sortRecordByKeys } from '@gms/common-util';
import { axiosBaseQuery, serializeTypeTransformer } from '@gms/ui-workers';

import { config } from '../api/system-event-gateway/endpoint-configuration';
import {
  buildConfiguredInputs,
  buildFilteredChannelName,
  buildProcessingMetadataForFilteredChannel
} from './channel-factory-util';

const logger = Logger.create('GMS_LOG_CHANNEL_FACTORY', process.env.GMS_LOG_CHANNEL_FACTORY);

/**
 * Publishes the newly created derived channel.
 */
async function publishDerivedChannelCreatedEvent(channel: ChannelTypes.Channel): Promise<boolean> {
  logger.debug(
    'publishDerivedChannelCreatedEvent not yet implemented. Channel to publish is:',
    JSON.stringify(channel)
  );

  try {
    const queryFn = axiosBaseQuery<ChannelTypes.Channel>({
      baseUrl: config.gateway.baseUrl
    });
    // ! pass undefined as the second and third args because our axios request doesn't use the api or extra options
    await queryFn(
      {
        requestConfig: {
          ...config.gateway.services.publishDerivedChannel.requestConfig,
          data: channel
        }
      },
      undefined,
      undefined
    );
    return true;
  } catch (error) {
    if (error.message !== 'canceled') {
      logger.error(`Error publishing channel`, error);
    }
    return false;
  }
}

/**
 * This operation creates and returns a filtered derived Channel describing the Channel
 * created by applying the provided FilterDefinition to the provided input Channel.
 * After creating the filtered Channel, this operation calls the ChannelFactory's
 * publishDerivedChannelCreatedEvent operation which publishes a DerivedChannelCreatedEvent
 * containing the new Channel.
 *
 * @param inputChannel the channel to filter
 * @param filterDefinition the filter to apply
 * @returns a derived channel that represents the new filtered channel
 */
export async function createFiltered(
  inputChannel: ChannelTypes.Channel,
  filterDefinition: FilterTypes.FilterDefinition
): Promise<ChannelTypes.Channel> {
  if (inputChannel == null) {
    throw new Error('inputChannel may not be null');
  }
  if (filterDefinition == null) {
    throw new Error('filterDefinition may not be null');
  }

  // make sure the keys are sorted so that the json string generated is deterministic
  if (!recordHasStringOrNumberKeys(filterDefinition)) {
    throw new Error('FilterDefinition type is not sortable');
  }
  const sortedFilterDef: FilterTypes.FilterDefinition = sortRecordByKeys(
    serializeTypeTransformer(filterDefinition)
  );

  const newChannel: TypeUtil.Writeable<ChannelTypes.Channel> = {
    channelBandType: inputChannel.channelBandType,
    canonicalName: undefined, // set later after creating the hash
    channelOrientationCode: inputChannel.channelOrientationCode,
    configuredInputs: buildConfiguredInputs(inputChannel),
    channelDataType: inputChannel.channelDataType,
    description: `${inputChannel.description} Filtered using a ${filterDefinition.name} filter.`,
    effectiveAt: inputChannel.effectiveAt,
    effectiveForRequestTime: inputChannel.effectiveForRequestTime,
    effectiveUntil: inputChannel.effectiveUntil,
    channelInstrumentType: inputChannel.channelInstrumentType,
    location: inputChannel.location,
    name: inputChannel.name, // override later after creating the hash
    nominalSampleRateHz: inputChannel.nominalSampleRateHz,
    orientationAngles: inputChannel.orientationAngles,
    channelOrientationType: inputChannel.channelOrientationType,
    processingDefinition: sortedFilterDef,
    processingMetadata: buildProcessingMetadataForFilteredChannel(inputChannel, sortedFilterDef),
    response: undefined,
    station: inputChannel.station,
    units: inputChannel.units
  };

  // Build the name using the new channel, and then add that name to the new channel
  const name = await buildFilteredChannelName(newChannel, filterDefinition);
  newChannel.canonicalName = name;
  newChannel.name = name;

  await publishDerivedChannelCreatedEvent(newChannel);
  return newChannel;
}
