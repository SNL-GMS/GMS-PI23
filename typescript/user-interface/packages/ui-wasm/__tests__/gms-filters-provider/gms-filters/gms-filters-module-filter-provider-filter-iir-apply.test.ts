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
  linearFilterDefinition,
  linearFilterDefinitionDesigned,
  smallSampleData
} from '@gms/common-model/__tests__/__data__';

import {
  defaultIndexInc,
  defaultIndexOffset,
  defaultTaper
} from '../../../src/ts/gms-filters-provider/gms-filters/constants';
import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { convertFromGMSFiltersLinearIIRFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/iir-filter-processor';
import { FilterBandType } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-band-type';
import { FilterDesignModel } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-design-model';
import type { IIRFilterParameters } from '../../../src/ts/gms-filters-provider/gms-filters/types/iir-filter-parameters';
import type { LinearIIRFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/linear-iir-filter-definition';
// ! IGNORED TO SUPPORT ESLINT CHECKS WITHOUT REQUIRING TO BUILD THE WASM
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import gmsFilters from '../../../src/ts/wasm/gms-filters-provider';

describe('FilterProvider::filterIIRApply', () => {
  test('FilterProvider::filterIIRApply test', async () => {
    const gmsFiltersModule: GmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    let iirFilterParameters: IIRFilterParameters;
    let linearIIRFilterDescription: LinearIIRFilterDescription;
    let designedLinearIIRFilterDescription: LinearIIRFilterDescription;

    try {
      const sosNumerator = new Float64Array(
        linearFilterDefinition.filterDescription.parameters.bCoefficients
      );
      const sosDenominator = new Float64Array(
        linearFilterDefinition.filterDescription.parameters.aCoefficients
      );
      const sosCoefficients = new Float64Array(Array(sosNumerator.length));

      const isDesigned = false;

      iirFilterParameters = gmsFiltersModule.IIRFilterParameters.buildWithTypedArray(
        sosNumerator,
        sosDenominator,
        sosCoefficients,
        isDesigned,
        sosNumerator.length / 3,
        linearFilterDefinition.filterDescription.parameters.groupDelaySec
      );

      const filterDesignModel =
        FilterDesignModel[
          linearFilterDefinition.filterDescription.filterType.split(
            '_'
          )[1] as keyof typeof FilterDesignModel
        ];

      const filterBandType =
        FilterBandType[
          linearFilterDefinition.filterDescription.passBandType as keyof typeof FilterBandType
        ];

      linearIIRFilterDescription = gmsFiltersModule.LinearIIRFilterDescription.build(
        iirFilterParameters,
        filterDesignModel,
        filterBandType,
        linearFilterDefinition.filterDescription.lowFrequency,
        linearFilterDefinition.filterDescription.highFrequency,
        linearFilterDefinition.filterDescription.order,
        linearFilterDefinition.filterDescription.parameters.sampleRateHz,
        linearFilterDefinition.filterDescription.parameters.sampleRateToleranceHz,
        +linearFilterDefinition.filterDescription.zeroPhase,
        defaultTaper
      );

      designedLinearIIRFilterDescription = gmsFiltersModule.FilterProvider.filterIIRDesign(
        linearIIRFilterDescription
      );
      expect(designedLinearIIRFilterDescription).toBeDefined();
      expect(designedLinearIIRFilterDescription.iirFilterParameters.isDesigned).toBeTruthy();

      const converted = convertFromGMSFiltersLinearIIRFilterDescription(
        linearFilterDefinitionDesigned,
        designedLinearIIRFilterDescription
      );
      expect(JSON.stringify(converted)).toEqual(JSON.stringify(linearFilterDefinitionDesigned));

      const result = gmsFiltersModule.FilterProvider.filterIIRApply(
        smallSampleData,
        defaultIndexOffset,
        defaultIndexInc,
        linearIIRFilterDescription
      );
      expect(result).toBeDefined();
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      iirFilterParameters.delete();
      gmsFiltersModule._free(iirFilterParameters as any);

      linearIIRFilterDescription.delete();
      gmsFiltersModule._free(linearIIRFilterDescription as any);

      designedLinearIIRFilterDescription.delete();
      gmsFiltersModule._free(designedLinearIIRFilterDescription as any);
    }
  });
});
