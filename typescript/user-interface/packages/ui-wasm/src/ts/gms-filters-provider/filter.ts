import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import {
  isCascadedFilterDefinition,
  isLinearFilterDefinition
} from '@gms/common-model/lib/filter/types';

import { cascadeFilterApply } from './gms-filters/cascade-filter-processor';
import {
  defaultIndexInc,
  defaultIndexOffset,
  defaultRemoveGroupDelay,
  defaultTaper
} from './gms-filters/constants';
import { iirFilterApply } from './gms-filters/iir-filter-processor';

/**
 * Applies a Filter Definition to the provided data (filters the data).
 *
 * !NOTE: the data is in a format like [time,value,time,value,...] then set the index offset appropriately
 *
 * @param filterDefinition a Linear Filter Definition
 * @param data  waveform data
 * @param indexOffset the index offset (starting position) when accessing the data
 * @param indexInc the index incrementor (starting from indexOffset) used when accessing the data
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay optional boolean to determine if group delay should be applied, defaults to false
 * @returns the filtered waveform data
 */
export const filter = async (
  filterDefinition: FilterDefinition,
  data: Float64Array,
  indexOffset: number = defaultIndexOffset,
  indexInc: number = defaultIndexInc,
  taper: number = defaultTaper,
  removeGroupDelay: boolean = defaultRemoveGroupDelay
): Promise<Float64Array> => {
  if (isLinearFilterDefinition(filterDefinition)) {
    return iirFilterApply(filterDefinition, data, indexOffset, indexInc, taper);
  }

  if (isCascadedFilterDefinition(filterDefinition)) {
    return cascadeFilterApply(
      filterDefinition,
      data,
      indexOffset,
      indexInc,
      taper,
      removeGroupDelay
    );
  }

  throw new Error(`Invalid filter definition provided, unable to filter data`);
};
