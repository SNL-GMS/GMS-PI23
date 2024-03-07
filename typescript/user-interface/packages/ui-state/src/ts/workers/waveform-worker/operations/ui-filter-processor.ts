import type { FilterTypes } from '@gms/common-model';
import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import { design, filter } from '@gms/ui-wasm';
import { WeavessTypes } from '@gms/weavess-core';

import type { SampleRate } from '../../../types';
import { changeUniqueIdFilter, storePositionBuffer } from '../util/data-segment-util';
import { WaveformStore } from '../worker-store';

// !NOTE: the data is in a format like [time,value,time,value,...] set the index offset appropriately
const indexOffset = 1; // start with the first y value of the data
const indexInc = 2; // have the algorithm skip each x value of the data (only filter y values)

/**
 * Defines the parameters for the {@link designFilter} operation.
 */
interface DesignFilterParams {
  filterDefinition: FilterTypes.FilterDefinition;
  taper: number;
  removeGroupDelay: boolean;
}

/**
 * Designs a Filter Definition by populating the coefficients
 *
 * @param filterDefinition the filter definition to design
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay optional boolean to determine if group delay should be applied
 * @returns the designed filter definition
 */
export const designFilter = async ({
  filterDefinition,
  taper,
  removeGroupDelay
}: DesignFilterParams): Promise<FilterTypes.FilterDefinition> =>
  Promise.resolve(design(filterDefinition, taper, removeGroupDelay));

const filterDataSegments = async (
  dataSegments: WeavessTypes.DataSegment[],
  filterDefinitions: Record<SampleRate, FilterDefinition>,
  taper: number,
  removeGroupDelay: boolean
): Promise<WeavessTypes.DataSegment[]> => {
  return Promise.all(
    dataSegments.map(async (dataSegment: WeavessTypes.DataSegment) => {
      if (WeavessTypes.isDataClaimCheck(dataSegment.data)) {
        // Get wave from store
        const wave = await WaveformStore.retrieve(dataSegment.data.id);
        // Apply filter to wave
        const data = await filter(
          filterDefinitions[dataSegment.data.sampleRate],
          wave,
          indexOffset,
          indexInc,
          taper,
          removeGroupDelay
        );

        // store the new filtered data in the waveform cache
        const filteredId = changeUniqueIdFilter(
          dataSegment.data.id,
          filterDefinitions[dataSegment.data.sampleRate].name
        );
        // TODO: Try parallelizing this request by storing the promise for the filter operation rather than the filtered value
        await storePositionBuffer(filteredId, data);

        return {
          ...dataSegment,
          data: {
            ...dataSegment.data,
            // update the claim check id for the new data segment
            id: filteredId
          }
        };
      }
      throw new Error('Filter processor filter operation was passed invalid channelSegment data');
    })
  );
};

/**
 * Defines the parameters for the {@link filterChannelSegments} operation.
 */
interface FilterChannelSegmentsParams {
  channelSegments: WeavessTypes.ChannelSegment[];
  filterDefinitions: Record<SampleRate, FilterDefinition>;
  taper: number;
  removeGroupDelay: boolean;
}

/**
 * Applies a Filter Definition to the provided channel segments (filters the data).
 *
 * @param channelSegments the waveform channel segments
 * @param filterDefinition a Linear Filter Definition
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay optional boolean to determine if group delay should be applied
 * @returns the filtered waveform channel segments
 */
export const filterChannelSegments = async ({
  channelSegments,
  filterDefinitions,
  taper,
  removeGroupDelay
}: FilterChannelSegmentsParams): Promise<WeavessTypes.ChannelSegment[]> => {
  const filterDefinitionName = Object.values(filterDefinitions)?.[0]?.name;
  return Promise.all(
    channelSegments.map(async channelSegment => {
      const dataSegments = await filterDataSegments(
        channelSegment.dataSegments,
        filterDefinitions,
        taper,
        removeGroupDelay
      );
      return {
        ...channelSegment,
        wfFilterId: filterDefinitionName,
        description: filterDefinitionName,
        dataSegments
      };
    })
  );
};
