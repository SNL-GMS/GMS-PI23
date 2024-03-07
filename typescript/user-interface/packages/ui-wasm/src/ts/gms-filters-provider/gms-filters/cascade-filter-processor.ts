import type { CascadedFilterDefinition } from '@gms/common-model/lib/filter/types';
import { FilterType } from '@gms/common-model/lib/filter/types';
import { Timer, uuid } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';
import produce from 'immer';

import {
  defaultIndexInc,
  defaultIndexOffset,
  defaultRemoveGroupDelay,
  defaultTaper
} from './constants';
import { gmsFiltersModulePromise } from './gms-filters-module';
import type { CascadedFiltersParameters } from './types/cascade-filter-parameters';
import type { FilterDefinition as GMSFiltersFilterDefinition } from './types/filter-definition';
import type { FilterDescription } from './types/filter-description';
import type { IIRFilterParameters } from './types/iir-filter-parameters';
import type { LinearIIRFilterDescription } from './types/linear-iir-filter-definition';
import type { VectorFilterDescription } from './types/vector-filter-description';
import {
  areCoefficientsPopulated,
  getFilterBandType,
  getFilterComputationType,
  getFilterDesignModel
} from './util';

const logger = UILogger.create('GMS_FILTERS', process.env.GMS_FILTERS);

const validateCascadedFilterDefinition = (filterDefinition: CascadedFilterDefinition) => {
  if (filterDefinition.filterDescription.filterType !== FilterType.CASCADE) {
    throw new Error(`FilterType must be of type ${FilterType.CASCADE}`);
  }

  if (
    filterDefinition.filterDescription.filterDescriptions === undefined ||
    filterDefinition.filterDescription.filterDescriptions.length === 0
  ) {
    throw new Error(`Filter Descriptions should be defined for Cascade Filter Definition`);
  }

  filterDefinition.filterDescription.filterDescriptions.forEach(desc => {
    const { aCoefficients, bCoefficients } = desc.parameters;

    if (desc.filterType !== FilterType.IIR_BUTTERWORTH) {
      throw new Error(`FilterTyp type ${FilterType.IIR_BUTTERWORTH} is only supported`);
    }

    if (aCoefficients && bCoefficients && aCoefficients.length !== bCoefficients.length) {
      throw new Error('Invalid aCoefficients or bCoefficients');
    }
  });
};

/**
 * Converts a GMS COI Filter Definition to a GMS Filters Filter Definition
 *
 * ! Must properly free/delete the memory of the returned object
 *
 * @param filterDefinition a GMS COI Filter Definition to convert
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay boolean to determine if group delay should be applied
 * @returns a converted GMS Filters Filter Definition
 */
export const convertToGMSFiltersFilterDefinition = async (
  filterDefinition: CascadedFilterDefinition,
  taper: number = defaultTaper,
  removeGroupDelay: boolean = defaultRemoveGroupDelay
): Promise<GMSFiltersFilterDefinition> => {
  const gmsFiltersModule = await gmsFiltersModulePromise;

  validateCascadedFilterDefinition(filterDefinition);

  let cascadedFiltersParameters: CascadedFiltersParameters;
  const iirFilterParameters: IIRFilterParameters[] = [];
  const linearIIRFilterDescription: LinearIIRFilterDescription[] = [];
  const filterDescription: FilterDescription[] = [];
  let vectorFilterDescription: VectorFilterDescription;
  let gmsFilterDefinition: GMSFiltersFilterDefinition;

  try {
    // * map GMS Filter Definition to GMS Filter Algorithm Definition

    cascadedFiltersParameters = gmsFiltersModule.CascadedFiltersParameters.build(
      filterDefinition.filterDescription.comments,
      filterDefinition.filterDescription.causal,
      filterDefinition.filterDescription.parameters.sampleRateHz,
      filterDefinition.filterDescription.parameters.sampleRateToleranceHz,
      filterDefinition.filterDescription.parameters.groupDelaySec
    );

    vectorFilterDescription = new gmsFiltersModule.VectorFilterDescription();
    filterDefinition.filterDescription.filterDescriptions.forEach((desc, i) => {
      const { aCoefficients, bCoefficients } = desc.parameters;

      // bCoefficients => sosNumerator
      const sosNumerator = new Float64Array(bCoefficients || []);

      // aCoefficients => sosDenominator
      const sosDenominator = new Float64Array(aCoefficients || []);

      // ! sosCoefficients can be ignored for now
      const sosCoefficients = new Float64Array(Array(sosNumerator.length));

      const numberOfSos = sosNumerator.length / 3;

      const isDesigned = areCoefficientsPopulated(aCoefficients, bCoefficients);

      const groupDelay = desc.parameters.groupDelaySec;

      iirFilterParameters[i] = gmsFiltersModule.IIRFilterParameters.buildWithTypedArray(
        sosNumerator,
        sosDenominator,
        sosCoefficients,
        isDesigned,
        numberOfSos,
        groupDelay
      );

      const filterDesignModel = getFilterDesignModel(desc.filterType);

      const filterComputationType = getFilterComputationType(desc.filterType);

      const filterBandType = getFilterBandType(desc.passBandType);

      const cutoffLow = desc.lowFrequency;
      const cutoffHigh = desc.highFrequency;
      const filterOrder = desc.order;
      const sampleRate = desc.parameters.sampleRateHz;
      const sampleRateTolerance = desc.parameters.sampleRateToleranceHz;
      const zeroPhase = +desc.zeroPhase;

      linearIIRFilterDescription[i] = gmsFiltersModule.LinearIIRFilterDescription.build(
        iirFilterParameters[i],
        filterDesignModel,
        filterBandType,
        cutoffLow,
        cutoffHigh,
        filterOrder,
        sampleRate,
        sampleRateTolerance,
        zeroPhase,
        taper
      );

      filterDescription[i] = gmsFiltersModule.FilterDescription.build(
        linearIIRFilterDescription[i],
        filterComputationType,
        desc.comments,
        desc.causal
      );

      vectorFilterDescription.push_back(filterDescription[i]);
    });

    gmsFilterDefinition = gmsFiltersModule.FilterDefinition.build(
      cascadedFiltersParameters,
      vectorFilterDescription,
      filterDefinition.name,
      filterDefinition.comments,
      iirFilterParameters.every(entry => entry.isDesigned),
      removeGroupDelay,
      vectorFilterDescription.size()
    );
  } catch (e) {
    logger.error('Failed to design filter using GMS cascade filter design', e);
    throw e;
  } finally {
    // ! free any memory used for WASM
    /* eslint-disable no-underscore-dangle */
    cascadedFiltersParameters.delete();
    gmsFiltersModule._free(cascadedFiltersParameters as any);

    filterDefinition.filterDescription.filterDescriptions.forEach((_, i) => {
      iirFilterParameters[i].delete();
      gmsFiltersModule._free(iirFilterParameters[i] as any);

      linearIIRFilterDescription[i].delete();
      gmsFiltersModule._free(linearIIRFilterDescription[i] as any);

      filterDescription[i].delete();
      gmsFiltersModule._free(filterDescription[i] as any);
    });

    gmsFiltersModule._free(vectorFilterDescription as any);
    /* eslint-enable no-underscore-dangle */
  }

  return gmsFilterDefinition;
};

/**
 * Converts a GMS Filters Filter Definition to a GMS COI Filter Definition.
 *
 * @param filterDefinition a GMS COI Filter Definition
 * @param linearIIRFilterDescription a GMS Filters Filter Definition
 * @returns a GMS COI Filter Definition
 */
export const convertFromGMSFiltersFilterDefinition = (
  filterDefinition: CascadedFilterDefinition,
  gmsFilterDefinition: GMSFiltersFilterDefinition
): CascadedFilterDefinition => {
  // * map GMS Filter Algorithm Definition to GMS Filter Definition

  return produce(filterDefinition, draft => {
    draft.filterDescription.comments = gmsFilterDefinition.cascadedFiltersParameters.comments;
    draft.filterDescription.causal = gmsFilterDefinition.cascadedFiltersParameters.isCausal;
    draft.filterDescription.parameters.sampleRateHz =
      gmsFilterDefinition.cascadedFiltersParameters.sampleRate;
    draft.filterDescription.parameters.sampleRateToleranceHz =
      gmsFilterDefinition.cascadedFiltersParameters.sampleRateTolerance;
    draft.filterDescription.parameters.groupDelaySec =
      gmsFilterDefinition.cascadedFiltersParameters.groupDelay;

    for (let i = 0; i < gmsFilterDefinition.filterDescriptions.size(); i += 1) {
      // sosNumerator => bCoefficients
      draft.filterDescription.filterDescriptions[i].parameters.bCoefficients = Array.from(
        gmsFilterDefinition.filterDescriptions
          .get(i)
          .linearIIRFilterDescription.iirFilterParameters.getSosNumeratorAsTypedArray()
      );

      // aCoefficients => sosDenominator
      draft.filterDescription.filterDescriptions[i].parameters.aCoefficients = Array.from(
        gmsFilterDefinition.filterDescriptions
          .get(i)
          .linearIIRFilterDescription.iirFilterParameters.getSosDenominatorAsTypedArray()
      );

      // ! sosCoefficients can be ignored for now

      draft.filterDescription.filterDescriptions[
        i
      ].parameters.groupDelaySec = gmsFilterDefinition.filterDescriptions.get(
        i
      ).linearIIRFilterDescription.iirFilterParameters.groupDelay;
      draft.filterDescription.filterDescriptions[
        i
      ].lowFrequency = gmsFilterDefinition.filterDescriptions.get(
        i
      ).linearIIRFilterDescription.cutoffLow;
      draft.filterDescription.filterDescriptions[
        i
      ].highFrequency = gmsFilterDefinition.filterDescriptions.get(
        i
      ).linearIIRFilterDescription.cutoffHigh;
      draft.filterDescription.filterDescriptions[
        i
      ].order = gmsFilterDefinition.filterDescriptions.get(
        i
      ).linearIIRFilterDescription.filterOrder;
      draft.filterDescription.filterDescriptions[
        i
      ].parameters.sampleRateHz = gmsFilterDefinition.filterDescriptions.get(
        i
      ).linearIIRFilterDescription.sampleRate;
      draft.filterDescription.filterDescriptions[
        i
      ].parameters.sampleRateToleranceHz = gmsFilterDefinition.filterDescriptions.get(
        i
      ).linearIIRFilterDescription.sampleRateTolerance;
      draft.filterDescription.filterDescriptions[
        i
      ].zeroPhase = !!gmsFilterDefinition.filterDescriptions.get(i).linearIIRFilterDescription
        .zeroPhase;

      draft.filterDescription.filterDescriptions[
        i
      ].comments = gmsFilterDefinition.filterDescriptions.get(i).comments;

      draft.filterDescription.filterDescriptions[
        i
      ].causal = gmsFilterDefinition.filterDescriptions.get(i).isCausal;

      draft.name = gmsFilterDefinition.name;
      draft.comments = gmsFilterDefinition.comments;
    }
  });
};

/**
 * Designs a Cascaded Filter Definition
 *
 * @param filterDefinition the filter definition to design
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay boolean to determine if group delay should be applied
 * @returns the designed filter definition
 */
export const cascadeFilterDesign = async (
  filterDefinition: CascadedFilterDefinition,
  taper: number = defaultTaper,
  removeGroupDelay: boolean = defaultRemoveGroupDelay
): Promise<CascadedFilterDefinition> => {
  const id = uuid.asString();

  const gmsFiltersModule = await gmsFiltersModulePromise;

  let gmsFilterDefinition: GMSFiltersFilterDefinition;
  let result: GMSFiltersFilterDefinition;
  let draft: CascadedFilterDefinition;

  try {
    Timer.start(`${id} GMS Filter: cascade filter design`);

    gmsFilterDefinition = await convertToGMSFiltersFilterDefinition(
      filterDefinition,
      taper,
      removeGroupDelay
    );

    result = gmsFiltersModule.FilterProvider.filterCascadeDesign(gmsFilterDefinition);

    draft = convertFromGMSFiltersFilterDefinition(filterDefinition, result);
  } catch (e) {
    logger.error('Failed to design filter using GMS cascade filter design', e);
    throw e;
  } finally {
    Timer.end(`${id} GMS Filter: cascade filter design`);
    // ! free any memory used for WASM
    /* eslint-disable no-underscore-dangle */
    gmsFilterDefinition.delete();
    gmsFiltersModule._free(gmsFilterDefinition as any);

    result.delete();
    gmsFiltersModule._free(result as any);
    /* eslint-enable no-underscore-dangle */
  }

  return draft;
};

/**
 * Applies a Cascaded Filter Definition to the provided data (filters the data).
 *
 * !NOTE: the data is in a format like [time,value,time,value,...] then set the index offset appropriately
 *
 * @param filterDefinition a Cascaded Filter Definition
 * @param data  waveform data
 * @param indexOffset the index offset (starting position) when accessing the data
 * @param indexInc the index incrementor (starting from indexOffset) used when accessing the data
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay optional boolean to determine if group delay should be applied, defaults to false
 * @returns the filtered waveform data
 */
export const cascadeFilterApply = async (
  filterDefinition: CascadedFilterDefinition,
  data: Float64Array,
  indexOffset: number = defaultIndexOffset,
  indexInc: number = defaultIndexInc,
  taper: number = defaultTaper,
  removeGroupDelay: boolean = defaultRemoveGroupDelay
): Promise<Float64Array> => {
  const id = uuid.asString();

  const gmsFiltersModule = await gmsFiltersModulePromise;

  Timer.start(`${id} GMS Filter: cascade filter`);

  let gmsFilterDefinition: GMSFiltersFilterDefinition;
  let result: Float64Array;
  let inputPtr = 0;

  try {
    gmsFilterDefinition = await convertToGMSFiltersFilterDefinition(
      filterDefinition,
      taper,
      removeGroupDelay
    );

    // eslint-disable-next-line no-underscore-dangle
    inputPtr = gmsFiltersModule._malloc(data.length * data.BYTES_PER_ELEMENT);
    gmsFiltersModule.HEAPF64.set(data, inputPtr / data.BYTES_PER_ELEMENT);

    const cFilterCascadeApply = gmsFiltersModule.cwrap('cFilterCascadeApply', null, [
      'number',
      'number',
      'number',
      'number',
      'number'
    ]);

    cFilterCascadeApply(gmsFilterDefinition.$$.ptr, inputPtr, data.length, indexOffset, indexInc);

    result = new Float64Array(
      gmsFiltersModule.HEAPF64.subarray(
        inputPtr / data.BYTES_PER_ELEMENT,
        inputPtr / data.BYTES_PER_ELEMENT + data.length
      )
    );
  } catch (e) {
    logger.error('Failed to filter using GMS cascade filter', e);
    throw e;
  } finally {
    Timer.end(`${id} GMS Filter: cascade filter`);
    // ! free any memory used for WASM
    /* eslint-disable no-underscore-dangle */
    gmsFilterDefinition.delete();
    gmsFiltersModule._free(inputPtr);
    gmsFiltersModule._free(gmsFilterDefinition as any);
    /* eslint-enable no-underscore-dangle */
  }

  return result;
};
