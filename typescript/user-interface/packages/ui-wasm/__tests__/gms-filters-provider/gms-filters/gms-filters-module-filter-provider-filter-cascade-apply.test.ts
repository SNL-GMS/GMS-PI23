/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/**
 * @jest-environment node
 */

/**
 * !!! Super important info about returning array values
 * https://stackoverflow.com/questions/17883799/how-to-handle-passing-returning-array-pointers-to-emscripten-compiled-code
 */

import {
  cascadedFilterDefinition,
  cascadedFilterDefinitionDesigned,
  smallSampleData
} from '@gms/common-model/__tests__/__data__';

import { convertFromGMSFiltersFilterDefinition } from '../../../src/ts/gms-filters-provider/gms-filters/cascade-filter-processor';
import {
  defaultIndexInc,
  defaultIndexOffset,
  defaultRemoveGroupDelay,
  defaultTaper
} from '../../../src/ts/gms-filters-provider/gms-filters/constants';
import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import type { CascadedFiltersParameters } from '../../../src/ts/gms-filters-provider/gms-filters/types/cascade-filter-parameters';
import type { FilterDefinition } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-definition';
import type { FilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-description';
import type { IIRFilterParameters } from '../../../src/ts/gms-filters-provider/gms-filters/types/iir-filter-parameters';
import type { LinearIIRFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/linear-iir-filter-definition';
import type { VectorFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/vector-filter-description';
import {
  getFilterBandType,
  getFilterComputationType,
  getFilterDesignModel
} from '../../../src/ts/gms-filters-provider/gms-filters/util';
// ! IGNORED TO SUPPORT ESLINT CHECKS WITHOUT REQUIRING TO BUILD THE WASM
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import gmsFilters from '../../../src/ts/wasm/gms-filters-provider';

describe('FilterProvider::filterCascadeApply', () => {
  test('FilterProvider::filterCascadeApply test', async () => {
    const gmsFiltersModule: GmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    let cascadedFiltersParameters: CascadedFiltersParameters;
    let iirFilterParameters1: IIRFilterParameters;
    let iirFilterParameters2: IIRFilterParameters;
    let linearIIRFilterDescription1: LinearIIRFilterDescription;
    let linearIIRFilterDescription2: LinearIIRFilterDescription;
    let filterDescription1: FilterDescription;
    let filterDescription2: FilterDescription;
    const vectorFilterDescription: VectorFilterDescription = new gmsFiltersModule.VectorFilterDescription();
    let filterDefinition: FilterDefinition;

    try {
      cascadedFiltersParameters = gmsFiltersModule.CascadedFiltersParameters.build(
        cascadedFilterDefinition.filterDescription.comments,
        cascadedFilterDefinition.filterDescription.causal,
        cascadedFilterDefinition.filterDescription.parameters.sampleRateHz,
        cascadedFilterDefinition.filterDescription.parameters.sampleRateToleranceHz,
        cascadedFilterDefinition.filterDescription.parameters.groupDelaySec
      );

      const sosNumerator1 = new Float64Array(
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].parameters.bCoefficients
      );
      const sosDenominator1 = new Float64Array(
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].parameters.aCoefficients
      );
      const sosCoefficients1 = new Float64Array(Array(sosNumerator1.length));

      iirFilterParameters1 = gmsFiltersModule.IIRFilterParameters.buildWithTypedArray(
        sosNumerator1,
        sosDenominator1,
        sosCoefficients1,
        false,
        sosNumerator1.length / 3,
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].parameters.groupDelaySec
      );

      const filterDesignModel1 = getFilterDesignModel(
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].filterType
      );

      const filterComputationType1 = getFilterComputationType(
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].filterType
      );

      const filterBandType1 = getFilterBandType(
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].passBandType
      );

      linearIIRFilterDescription1 = gmsFiltersModule.LinearIIRFilterDescription.build(
        iirFilterParameters1,
        filterDesignModel1,
        filterBandType1,
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].lowFrequency,
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].highFrequency,
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].order,
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].parameters.sampleRateHz,
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].parameters
          .sampleRateToleranceHz,
        +cascadedFilterDefinition.filterDescription.filterDescriptions[0].zeroPhase,
        defaultTaper
      );

      const sosNumerator2 = new Float64Array(
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters.bCoefficients
      );
      const sosDenominator2 = new Float64Array(
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters.aCoefficients
      );
      const sosCoefficients2 = new Float64Array(Array(sosNumerator2.length));

      const filterDesignModel2 = getFilterDesignModel(
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].filterType
      );

      const filterComputationType2 = getFilterComputationType(
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].filterType
      );

      const filterBandType2 = getFilterBandType(
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].passBandType
      );

      iirFilterParameters2 = gmsFiltersModule.IIRFilterParameters.buildWithTypedArray(
        sosNumerator2,
        sosDenominator2,
        sosCoefficients2,
        false,
        sosNumerator2.length / 3,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters.groupDelaySec
      );

      linearIIRFilterDescription2 = gmsFiltersModule.LinearIIRFilterDescription.build(
        iirFilterParameters2,
        filterDesignModel2,
        filterBandType2,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].lowFrequency,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].highFrequency,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].order,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters.sampleRateHz,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters
          .sampleRateToleranceHz,
        +cascadedFilterDefinition.filterDescription.filterDescriptions[1].zeroPhase,
        defaultTaper
      );

      filterDescription1 = gmsFiltersModule.FilterDescription.build(
        linearIIRFilterDescription1,
        filterComputationType1,
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].comments,
        cascadedFilterDefinition.filterDescription.filterDescriptions[0].causal
      );

      filterDescription2 = gmsFiltersModule.FilterDescription.build(
        linearIIRFilterDescription2,
        filterComputationType2,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].comments,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].causal
      );

      vectorFilterDescription.push_back(filterDescription1);
      vectorFilterDescription.push_back(filterDescription2);

      expect(vectorFilterDescription.size()).toEqual(2);

      filterDefinition = gmsFiltersModule.FilterDefinition.build(
        cascadedFiltersParameters,
        vectorFilterDescription,
        cascadedFilterDefinition.name,
        cascadedFilterDefinition.comments,
        false,
        defaultRemoveGroupDelay,
        vectorFilterDescription.size()
      );

      const designedFilterDefinition = gmsFiltersModule.FilterProvider.filterCascadeDesign(
        filterDefinition
      );

      expect(designedFilterDefinition.isDesigned).toBeTruthy();
      cascadedFilterDefinition.filterDescription.filterDescriptions.forEach((_, i) => {
        expect(
          designedFilterDefinition.filterDescriptions.get(i).linearIIRFilterDescription
            .iirFilterParameters.isDesigned
        ).toBeTruthy();
      });

      const converted = convertFromGMSFiltersFilterDefinition(
        cascadedFilterDefinition,
        designedFilterDefinition
      );
      expect(JSON.stringify(converted)).toEqual(JSON.stringify(cascadedFilterDefinitionDesigned));

      const result = gmsFiltersModule.FilterProvider.filterCascadeApply(
        designedFilterDefinition,
        smallSampleData,
        defaultIndexOffset,
        defaultIndexInc
      );

      expect(result).toBeDefined();
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      cascadedFiltersParameters.delete();
      gmsFiltersModule._free(cascadedFiltersParameters as any);

      iirFilterParameters1.delete();
      gmsFiltersModule._free(iirFilterParameters1 as any);

      iirFilterParameters2.delete();
      gmsFiltersModule._free(iirFilterParameters2 as any);

      linearIIRFilterDescription1.delete();
      gmsFiltersModule._free(linearIIRFilterDescription1 as any);

      linearIIRFilterDescription2.delete();
      gmsFiltersModule._free(linearIIRFilterDescription2 as any);

      filterDescription1.delete();
      gmsFiltersModule._free(filterDescription1 as any);

      filterDescription2.delete();
      gmsFiltersModule._free(filterDescription2 as any);

      gmsFiltersModule._free(vectorFilterDescription as any);

      filterDefinition.delete();
      gmsFiltersModule._free(filterDefinition as any);
    }
  });
});
