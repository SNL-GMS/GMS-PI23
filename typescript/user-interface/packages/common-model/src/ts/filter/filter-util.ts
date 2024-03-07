import type { Filter } from './types';
import { UNFILTERED } from './types';

const getFilterNameIfExists = (filter: Filter | undefined): string =>
  filter?.filterDefinition?.name ?? filter?.namedFilter;

/**
 * Gets the unique id for a filter, which is its name, or `unfiltered`.
 *
 * @param filter the filter from which to get the id. If undefined, will return `unfiltered`
 */
export const getFilterName = (filter: Filter | undefined): string =>
  getFilterNameIfExists(filter) ?? UNFILTERED;
