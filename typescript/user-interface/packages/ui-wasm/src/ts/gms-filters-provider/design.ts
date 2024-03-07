import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import {
  isCascadedFilterDefinition,
  isLinearFilterDefinition
} from '@gms/common-model/lib/filter/types';

import { cascadeFilterDesign } from './gms-filters/cascade-filter-processor';
import { defaultRemoveGroupDelay, defaultTaper } from './gms-filters/constants';
import { iirFilterDesign } from './gms-filters/iir-filter-processor';

/**
 * Designs a Filter Definition by populating the coefficients
 *
 * @param filterDefinition the filter definition to design
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay optional boolean to determine if group delay should be applied, defaults to false
 * @returns the designed filter definition
 */
export const design = async (
  filterDefinition: FilterDefinition,
  taper: number = defaultTaper,
  removeGroupDelay: boolean = defaultRemoveGroupDelay
): Promise<FilterDefinition> => {
  if (isLinearFilterDefinition(filterDefinition)) {
    return iirFilterDesign(filterDefinition, taper);
  }

  if (isCascadedFilterDefinition(filterDefinition)) {
    return cascadeFilterDesign(filterDefinition, taper, removeGroupDelay);
  }

  throw new Error(`Invalid filter definition provided, unable to design filter definition`);
};
