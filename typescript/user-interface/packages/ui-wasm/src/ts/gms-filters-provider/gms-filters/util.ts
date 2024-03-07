import type {
  BandType,
  CascadedFilterDefinition,
  LinearFilterDefinition,
  LinearFilterDescription
} from '@gms/common-model/lib/filter/types';
import { FilterType } from '@gms/common-model/lib/filter/types';

import { FilterBandType } from './types/filter-band-type';
import { FilterComputationType } from './types/filter-computation-type';
import { FilterDesignModel } from './types/filter-design-model';

/**
 * Converts the GMS COI Band Type Enum to the GMS Filters Filter Band Type
 *
 * @param passBandType a GMS COI Band Type
 * @returns a GMS Filters Filter Band Type
 */
export const getFilterBandType = (passBandType: BandType): FilterBandType =>
  FilterBandType[passBandType as keyof typeof FilterBandType];

/**
 * Converts the GMS COI Filter Type Enum to the GMS Filters Filter Design Model
 *
 * @param filterType a GMS COI Filter Type
 * @returns a GMS Filters Filter Design Model
 */
export const getFilterDesignModel = (filterType: FilterType): FilterDesignModel => {
  if (filterType === FilterType.CASCADE) {
    throw new Error(`Unable to determine Filter Design Model of type ${FilterType.CASCADE}`);
  }
  // filterType field in the data model combines: filterComputationType and filterDesignModel with '_'
  return FilterDesignModel[filterType.split('_')[1] as keyof typeof FilterDesignModel];
};

/**
 * Converts the GMS COI Filter Type Enum to the GMS Filters Filter Computation Type
 *
 * @param filterType a GMS COI Filter Type
 * @returns a GMS Filters Filter Computation Type
 */
export const getFilterComputationType = (filterType: FilterType): FilterComputationType => {
  if (filterType === FilterType.CASCADE) {
    throw new Error(`Unable to determine Filter Design Model of type ${FilterType.CASCADE}`);
  }
  // filterType field in the data model combines: filterComputationType and filterDesignModel with '_'
  return FilterComputationType[filterType.split('_')[0] as keyof typeof FilterComputationType];
};

/**
 * Returns true if the coefficients are populated; false otherwise.
 *
 * @param aCoefficients the `a` coefficients
 * @param bCoefficients the `b` coefficients
 * @returns true if the coefficients are populated; false otherwise
 */
export const areCoefficientsPopulated = (
  aCoefficients: number[],
  bCoefficients: number[]
): boolean =>
  aCoefficients != null &&
  bCoefficients != null &&
  aCoefficients.length > 0 &&
  bCoefficients.length > 0;

/**
 * Returns true if the linear filter description is designed; false otherwise.
 *
 * @param filterDefinition the filter definition
 * @param sampleRateHz the sample rate to use if provided for checking if
 * the filter definition is designed for that sample rate
 * @returns true if designed; false otherwise
 */
export const isLinearFilterDescriptionDesigned = (
  filterDescription: LinearFilterDescription,
  sampleRateHz?: number
): boolean => {
  const {
    aCoefficients,
    bCoefficients,
    sampleRateHz: fdSampleRateHz
  } = filterDescription.parameters || {
    aCoefficients: null,
    bCoefficients: null,
    sampleRateHz: null
  };
  return (
    fdSampleRateHz != null &&
    (sampleRateHz == null || sampleRateHz === fdSampleRateHz) &&
    areCoefficientsPopulated(aCoefficients, bCoefficients)
  );
};

/**
 * Returns true if the linear filter definition is designed; false otherwise.
 *
 * @param filterDefinition the linear filter definition
 * @param sampleRateHz the sample rate to use if provided for checking if
 * the filter definition is designed for that sample rate
 * @returns true if designed; false otherwise
 */
export const isLinearFilterDefinitionDesigned = (
  filterDefinition: LinearFilterDefinition,
  sampleRateHz?: number
): boolean => isLinearFilterDescriptionDesigned(filterDefinition.filterDescription, sampleRateHz);

/**
 * Returns true if the cascaded filter definition is designed; false otherwise.
 *
 * @param filterDefinition the cascaded filter definition
 * @param sampleRateHz the sample rate to use if provided for checking if
 * the filter definition is designed for that sample rate
 * @returns true if designed; false otherwise
 */
export const isCascadedFilterDefinitionDesigned = (
  filterDefinition: CascadedFilterDefinition,
  sampleRateHz?: number
): boolean =>
  filterDefinition.filterDescription.filterDescriptions.every(desc =>
    isLinearFilterDescriptionDesigned(desc, sampleRateHz)
  );
