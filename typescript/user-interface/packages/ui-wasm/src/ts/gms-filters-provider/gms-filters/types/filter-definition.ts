import type { CascadedFiltersParameters } from './cascade-filter-parameters';
import type { VectorFilterDescription } from './vector-filter-description';

export interface FilterDefinitionModule {
  build: (
    cascadedFiltersParameters: CascadedFiltersParameters,
    desc: VectorFilterDescription,
    name: string,
    comments: string,
    isDesigned: boolean,
    removeGroupDelay: boolean,
    numberOfFilterDescriptions: number
  ) => FilterDefinition;
}

export interface FilterDefinition {
  $$: {
    ptr: number;
  };
  cascadedFiltersParameters: CascadedFiltersParameters;
  filterDescriptions: VectorFilterDescription;
  name: string;
  comments: string;
  isDesigned: boolean;
  removeGroupDelay: boolean;
  numberOfFilterDescriptions: number;
  delete: () => void;
}
