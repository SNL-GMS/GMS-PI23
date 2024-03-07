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
  cascadedFilterDefinitionDesigned
} from '@gms/common-model/__tests__/__data__';

import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import type { CascadedFiltersParameters } from '../../../src/ts/gms-filters-provider/gms-filters/types/cascade-filter-parameters';
import { FilterBandType } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-band-type';
import { FilterComputationType } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-computation-type';
import type { FilterDefinition } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-definition';
import type { FilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-description';
import { FilterDesignModel } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-design-model';
import type { IIRFilterParameters } from '../../../src/ts/gms-filters-provider/gms-filters/types/iir-filter-parameters';
import type { LinearIIRFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/linear-iir-filter-definition';
import type { VectorFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/vector-filter-description';
// ! IGNORED TO SUPPORT ESLINT CHECKS WITHOUT REQUIRING TO BUILD THE WASM
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import gmsFilters from '../../../src/ts/wasm/gms-filters-provider';

describe('FilterProvider::filterCascadeDesign', () => {
  test('FilterProvider::filterCascadeDesign test', async () => {
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
        cascadedFilterDefinition.filterDescription.parameters.sampleRateToleranceHz
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

      const sosNumerator2 = new Float64Array(
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters.bCoefficients
      );
      const sosDenominator2 = new Float64Array(
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters.aCoefficients
      );
      const sosCoefficients2 = new Float64Array(Array(sosNumerator2.length));

      iirFilterParameters2 = gmsFiltersModule.IIRFilterParameters.buildWithTypedArray(
        sosNumerator2,
        sosDenominator2,
        sosCoefficients2,
        false,
        sosNumerator2.length / 3,
        cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters.groupDelaySec
      );

      const filterDesignModel1 =
        FilterDesignModel[
          cascadedFilterDefinition.filterDescription.filterDescriptions[0].filterType.split(
            '_'
          )[1] as keyof typeof FilterDesignModel
        ];

      const filterComputationType1 =
        FilterComputationType[
          cascadedFilterDefinition.filterDescription.filterDescriptions[0].filterType.split(
            '_'
          )[0] as keyof typeof FilterComputationType
        ];

      const filterBandType1 =
        FilterBandType[
          cascadedFilterDefinition.filterDescription.filterDescriptions[0]
            .passBandType as keyof typeof FilterBandType
        ];

      const filterDesignModel2 =
        FilterDesignModel[
          cascadedFilterDefinition.filterDescription.filterDescriptions[1].filterType.split(
            '_'
          )[1] as keyof typeof FilterDesignModel
        ];

      const filterComputationType2 =
        FilterComputationType[
          cascadedFilterDefinition.filterDescription.filterDescriptions[1].filterType.split(
            '_'
          )[0] as keyof typeof FilterComputationType
        ];

      const filterBandType2 =
        FilterBandType[
          cascadedFilterDefinition.filterDescription.filterDescriptions[1]
            .passBandType as keyof typeof FilterBandType
        ];

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
        0
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
        0
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

      filterDefinition = gmsFiltersModule.FilterDefinition.build(
        cascadedFiltersParameters,
        vectorFilterDescription,
        cascadedFilterDefinition.name,
        cascadedFilterDefinition.comments,
        false,
        true,
        vectorFilterDescription.size()
      );

      expect(iirFilterParameters1.isDesigned).toBeFalsy();
      expect(iirFilterParameters2.isDesigned).toBeFalsy();
      expect(filterDefinition.numberOfFilterDescriptions).toEqual(2);

      const result = gmsFiltersModule.FilterProvider.filterCascadeDesign(filterDefinition);
      expect(result).toBeDefined();
      expect(result.isDesigned).toBeTruthy();

      expect(result.cascadedFiltersParameters.comments).toEqual(
        cascadedFilterDefinitionDesigned.filterDescription.comments
      );
      expect(result.cascadedFiltersParameters.isCausal).toEqual(
        cascadedFilterDefinitionDesigned.filterDescription.causal
      );
      expect(result.cascadedFiltersParameters.sampleRate).toEqual(
        cascadedFilterDefinitionDesigned.filterDescription.parameters.sampleRateHz
      );
      expect(result.cascadedFiltersParameters.sampleRateTolerance).toEqual(
        cascadedFilterDefinitionDesigned.filterDescription.parameters.sampleRateToleranceHz
      );
      expect(result.cascadedFiltersParameters.groupDelay).toEqual(
        cascadedFilterDefinitionDesigned.filterDescription.parameters.groupDelaySec
      );

      expect(result.filterDescriptions).toBeDefined();
      expect(result.numberOfFilterDescriptions).toEqual(
        cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions.length
      );

      for (let i = 0; i < result.filterDescriptions.size(); i += 1) {
        expect(
          result.filterDescriptions
            .get(i)
            .linearIIRFilterDescription.iirFilterParameters.sosNumerator.size()
        ).toEqual(
          cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].parameters
            .bCoefficients.length
        );
        for (
          let j = 0;
          j <
          result.filterDescriptions
            .get(i)
            .linearIIRFilterDescription.iirFilterParameters.sosNumerator.size();
          j += 1
        ) {
          expect(
            result.filterDescriptions
              .get(i)
              .linearIIRFilterDescription.iirFilterParameters.sosNumerator.get(j)
          ).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].parameters
              .bCoefficients[j]
          );
        }

        expect(
          result.filterDescriptions
            .get(i)
            .linearIIRFilterDescription.iirFilterParameters.sosDenominator.size()
        ).toEqual(
          cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].parameters
            .aCoefficients.length
        );
        for (
          let j = 0;
          j <
          result.filterDescriptions
            .get(i)
            .linearIIRFilterDescription.iirFilterParameters.sosDenominator.size();
          j += 1
        ) {
          expect(
            result.filterDescriptions
              .get(i)
              .linearIIRFilterDescription.iirFilterParameters.sosDenominator.get(j)
          ).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].parameters
              .aCoefficients[j]
          );

          expect(
            result.filterDescriptions.get(i).linearIIRFilterDescription.iirFilterParameters
              .isDesigned
          ).toBeTruthy();
          expect(
            result.filterDescriptions.get(i).linearIIRFilterDescription.iirFilterParameters
              .numberOfSos
          ).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].parameters
              .aCoefficients.length / 3
          );
          expect(
            result.filterDescriptions.get(i).linearIIRFilterDescription.iirFilterParameters
              .groupDelay
          ).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].parameters
              .groupDelaySec
          );

          expect(
            result.filterDescriptions.get(i).linearIIRFilterDescription.filterDesignModel
          ).toEqual(FilterDesignModel.BUTTERWORTH);

          expect(
            result.filterDescriptions.get(i).linearIIRFilterDescription.filterBandType
          ).toEqual(FilterBandType.BAND_PASS);

          expect(result.filterDescriptions.get(i).linearIIRFilterDescription.cutoffLow).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].lowFrequency
          );

          expect(result.filterDescriptions.get(i).linearIIRFilterDescription.cutoffHigh).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].highFrequency
          );

          expect(result.filterDescriptions.get(i).linearIIRFilterDescription.filterOrder).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].order
          );

          expect(result.filterDescriptions.get(i).linearIIRFilterDescription.sampleRate).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].parameters
              .sampleRateHz
          );

          expect(
            result.filterDescriptions.get(i).linearIIRFilterDescription.sampleRateTolerance
          ).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].parameters
              .sampleRateToleranceHz
          );

          expect(!!result.filterDescriptions.get(i).linearIIRFilterDescription.zeroPhase).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].zeroPhase
          );

          expect(result.filterDescriptions.get(i).filterComputationType).toEqual(
            FilterComputationType.IIR
          );

          expect(result.filterDescriptions.get(i).comments).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].comments
          );

          expect(result.filterDescriptions.get(i).isCausal).toEqual(
            cascadedFilterDefinitionDesigned.filterDescription.filterDescriptions[i].causal
          );

          expect(result.isDesigned).toBeTruthy();

          expect(result.name).toEqual(cascadedFilterDefinitionDesigned.name);
          expect(result.comments).toEqual(cascadedFilterDefinitionDesigned.comments);
        }
      }

      // * test 2nd description
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
