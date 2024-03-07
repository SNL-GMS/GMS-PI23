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
  linearFilterDefinitionDesigned
} from '@gms/common-model/__tests__/__data__';

import type { GmsFiltersModule } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { FilterBandType } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-band-type';
import { FilterDesignModel } from '../../../src/ts/gms-filters-provider/gms-filters/types/filter-design-model';
import type { IIRFilterParameters } from '../../../src/ts/gms-filters-provider/gms-filters/types/iir-filter-parameters';
import type { LinearIIRFilterDescription } from '../../../src/ts/gms-filters-provider/gms-filters/types/linear-iir-filter-definition';
// ! IGNORED TO SUPPORT ESLINT CHECKS WITHOUT REQUIRING TO BUILD THE WASM
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import gmsFilters from '../../../src/ts/wasm/gms-filters-provider';

describe('FilterProvider::filterIIRDesign', () => {
  test('FilterProvider::filterIIRDesign test', async () => {
    const gmsFiltersModule: GmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    let iirFilterParameters: IIRFilterParameters;
    let linearIIRFilterDescription: LinearIIRFilterDescription;
    let result: LinearIIRFilterDescription;

    try {
      const sosNumerator = new Float64Array(
        linearFilterDefinition.filterDescription.parameters.bCoefficients
      );
      const sosDenominator = new Float64Array(
        linearFilterDefinition.filterDescription.parameters.aCoefficients
      );
      const sosCoefficients = new Float64Array(Array(sosNumerator.length));

      iirFilterParameters = gmsFiltersModule.IIRFilterParameters.buildWithTypedArray(
        sosNumerator,
        sosDenominator,
        sosCoefficients,
        false,
        sosNumerator.length / 3,
        linearFilterDefinition.filterDescription.parameters.groupDelaySec
      );

      linearIIRFilterDescription = gmsFiltersModule.LinearIIRFilterDescription.build(
        iirFilterParameters,
        FilterDesignModel.BUTTERWORTH,
        FilterBandType.BAND_PASS,
        linearFilterDefinition.filterDescription.lowFrequency,
        linearFilterDefinition.filterDescription.highFrequency,
        linearFilterDefinition.filterDescription.order,
        linearFilterDefinition.filterDescription.parameters.sampleRateHz,
        linearFilterDefinition.filterDescription.parameters.sampleRateToleranceHz,
        +linearFilterDefinition.filterDescription.zeroPhase,
        0
      );

      result = gmsFiltersModule.FilterProvider.filterIIRDesign(linearIIRFilterDescription);

      expect(result).toBeDefined();

      expect(result.iirFilterParameters.sosNumerator.size()).toEqual(
        linearFilterDefinitionDesigned.filterDescription.parameters.bCoefficients.length
      );
      expect(result.iirFilterParameters.sosNumerator.get(0)).toEqual(
        linearFilterDefinitionDesigned.filterDescription.parameters.bCoefficients[0]
      );
      expect(result.iirFilterParameters.sosNumerator.get(1)).toEqual(
        linearFilterDefinitionDesigned.filterDescription.parameters.bCoefficients[1]
      );
      expect(result.iirFilterParameters.getSosNumeratorAsTypedArray()).toEqual(
        new Float64Array(linearFilterDefinitionDesigned.filterDescription.parameters.bCoefficients)
      );

      expect(result.iirFilterParameters.sosDenominator.size()).toEqual(
        linearFilterDefinitionDesigned.filterDescription.parameters.aCoefficients.length
      );
      expect(result.iirFilterParameters.sosDenominator.get(0)).toEqual(
        linearFilterDefinitionDesigned.filterDescription.parameters.aCoefficients[0]
      );
      expect(result.iirFilterParameters.sosDenominator.get(1)).toEqual(
        linearFilterDefinitionDesigned.filterDescription.parameters.aCoefficients[1]
      );
      expect(result.iirFilterParameters.getSosDenominatorAsTypedArray()).toEqual(
        new Float64Array(linearFilterDefinitionDesigned.filterDescription.parameters.aCoefficients)
      );

      expect(result.iirFilterParameters.sosCoefficients.size()).toEqual(6);
      expect(result.iirFilterParameters.sosCoefficients.get(0)).toEqual(0);
      expect(result.iirFilterParameters.sosCoefficients.get(1)).toEqual(0);
      expect(result.iirFilterParameters.sosCoefficients.get(1)).toEqual(0);

      expect(result.iirFilterParameters.numberOfSos).toEqual(2);
      expect(result.iirFilterParameters.isDesigned).toBeTruthy();

      expect(result.filterDesignModel).toEqual(FilterDesignModel.BUTTERWORTH);
      expect(result.filterBandType).toEqual(FilterBandType.BAND_PASS);
      expect(result.cutoffLow).toEqual(
        linearFilterDefinitionDesigned.filterDescription.lowFrequency
      );
      expect(result.cutoffHigh).toEqual(
        linearFilterDefinitionDesigned.filterDescription.highFrequency
      );
      expect(result.filterOrder).toEqual(linearFilterDefinitionDesigned.filterDescription.order);
      expect(result.sampleRate).toEqual(
        linearFilterDefinitionDesigned.filterDescription.parameters.sampleRateHz
      );
      expect(result.sampleRateTolerance).toEqual(
        linearFilterDefinitionDesigned.filterDescription.parameters.sampleRateToleranceHz
      );
      expect(result.taper).toEqual(0);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).not.toBeDefined();
    } finally {
      iirFilterParameters.delete();
      gmsFiltersModule._free(iirFilterParameters as any);

      linearIIRFilterDescription.delete();
      gmsFiltersModule._free(linearIIRFilterDescription as any);

      result.delete();
      gmsFiltersModule._free(result as any);
    }
  });
});
