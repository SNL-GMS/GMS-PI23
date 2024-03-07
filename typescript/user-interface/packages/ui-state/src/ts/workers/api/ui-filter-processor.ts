import type { ChannelTypes, FilterTypes } from '@gms/common-model';
import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import { isCascadedFilterDefinition } from '@gms/common-model/lib/filter/types';
import type { WeavessTypes } from '@gms/weavess-core';
import produce from 'immer';
import flatMap from 'lodash/flatMap';

import { createFiltered } from '../../app/util/channel-factory';
import type { SampleRate, UiChannelSegment } from '../../types';
import { WorkerOperations } from '../waveform-worker/operations';
import { waveformWorkerRpc } from '../worker-rpcs';

export interface ChannelDescriptor {
  // passing in the fully populated channel here because channel on the
  // uiChannelSegment.channelSegmentDescriptor could just be a version reference channel
  channel: ChannelTypes.Channel;
  uiChannelSegments: UiChannelSegment[];
}

export interface ApplyFilterParams {
  channelDescriptor: ChannelDescriptor[];
  filterDefinition: FilterTypes.FilterDefinition;
  taper: number;
  removeGroupDelay: boolean;
}

/**
 * The Worker API for the Filter Processor design feature
 *
 * @param filterDefinition the requested filter definition
 *
 * @returns A designed filterDefinition
 */
export const design = async (
  filterDefinition: FilterTypes.FilterDefinition,
  taper: number,
  removeGroupDelay: boolean
): Promise<FilterTypes.FilterDefinition> =>
  waveformWorkerRpc.rpc(WorkerOperations.DESIGN_FILTER, {
    filterDefinition,
    taper,
    removeGroupDelay
  });

/**
 * An operation to design filter definitions
 *
 * @param filterDefinitions the filter definitions
 * @param sampleRates the different sample rates which we should design each filter definition for
 * @param groupDelaySec the group delay seconds config setting
 * @param sampleRateToleranceHz the sample rate tolerance in hertz config setting
 * @param taper the taper config setting
 * @param removeGroupDelay the remove group delay config setting
 */
export const designFilterDefinitions = async (
  filterDefinitions: FilterTypes.FilterDefinition[],
  sampleRates: number[],
  groupDelaySec: number,
  sampleRateToleranceHz: number,
  taper: number,
  removeGroupDelay: boolean
): Promise<FilterTypes.FilterDefinition[]> => {
  return Promise.all(
    // design each filter definition for each provided sample rate
    flatMap(
      sampleRates.map(sampleRateHz =>
        filterDefinitions.map(async fd => {
          const filterDefinition = produce(fd, draft => {
            draft.filterDescription.parameters = {
              sampleRateHz,
              groupDelaySec,
              sampleRateToleranceHz
            };
            if (isCascadedFilterDefinition(draft)) {
              draft.filterDescription.filterDescriptions = draft.filterDescription.filterDescriptions.map(
                desc => ({
                  ...desc,
                  parameters: {
                    sampleRateHz,
                    groupDelaySec,
                    sampleRateToleranceHz
                  }
                })
              );
            }
          });
          return design(filterDefinition, taper, removeGroupDelay);
        })
      )
    )
  );
};

/**
 * The Worker API for the Filter Processor filter feature.
 * Creates a new derived channel and filters the data using the provided Filter Definition.
 *
 * @param channelDescriptor an array of objs that contain a fully populated channel
 * and the corresponding UI channel segment
 * @param filterDefinition a record of Filter Definitions by hz
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay optional boolean to determine if group delay should be applied
 * @returns An array of channel descriptors with
 *   * the created derived channel
 *   * the created ui channel segment with new data claims check ids
 */
export const filter = async (
  channelDescriptor: ChannelDescriptor,
  filterDefinitions: Record<SampleRate, FilterDefinition>,
  taper: number,
  removeGroupDelay: boolean
): Promise<ChannelDescriptor> => {
  const filterDefinition = Object.values(filterDefinitions)?.[0];
  const filteredChannel = await createFiltered(channelDescriptor.channel, filterDefinition);
  const channelSegments = channelDescriptor.uiChannelSegments.map(
    ({ channelSegment }) => channelSegment
  );

  const filteredChannelSegments: WeavessTypes.ChannelSegment[] = await waveformWorkerRpc.rpc(
    WorkerOperations.FILTER_CHANNEL_SEGMENTS,
    {
      channelSegments,
      filterDefinitions,
      taper,
      removeGroupDelay
    }
  );

  // Apply filtered channel data and build uiChannelSegments
  const uiChannelSegments = filteredChannelSegments.map((filteredChannelSegment, index) => ({
    channelSegment: {
      ...filteredChannelSegment,
      channelName: filteredChannel.name
    },
    channelSegmentDescriptor: {
      ...channelDescriptor.uiChannelSegments[index].channelSegmentDescriptor,
      // ! store as a version reference channel
      channel: {
        name: filteredChannel.name,
        effectiveAt: filteredChannel.effectiveAt
      }
    },
    processingMasks: channelDescriptor.uiChannelSegments[index].processingMasks
  }));

  // return the newly created derived channel and ui channel segment
  return {
    channel: filteredChannel,
    uiChannelSegments
  };
};
