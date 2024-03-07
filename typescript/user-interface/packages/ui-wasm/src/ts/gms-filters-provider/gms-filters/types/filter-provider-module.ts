import type { FilterDefinition } from './filter-definition';
import type { LinearIIRFilterDescription } from './linear-iir-filter-definition';

export interface FilterProviderModule {
  filterIIRDesign(
    linearIIRFilterDescription: LinearIIRFilterDescription
  ): LinearIIRFilterDescription;

  filterCascadeDesign(filterDefinition: FilterDefinition): FilterDefinition;

  filterIIRApply(
    data: Float64Array,
    indexOffset: number,
    indexInc: number,
    linearIIRFilterDescription: LinearIIRFilterDescription
  ): Float64Array;

  filterCascadeApply(
    filter_definition: FilterDefinition,
    data: Float64Array,
    indexOffset: number,
    indexInc: number
  ): Float64Array;
}
