/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/**
 * !!! Super important info about returning array values
 * https://stackoverflow.com/questions/17883799/how-to-handle-passing-returning-array-pointers-to-emscripten-compiled-code
 */
import {
  linearFilterDefinition,
  linearFilterDefinitionDesigned,
  smallSampleData
} from '@gms/common-model/__tests__/__data__';
import { FilterType } from '@gms/common-model/lib/filter/types';

import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import {
  convertToGMSFiltersLinearIIRFilterDescription,
  iirFilterApply,
  iirFilterDesign
} from '../../../src/ts/gms-filters-provider/gms-filters/iir-filter-processor';
// ! IGNORED TO SUPPORT ESLINT CHECKS WITHOUT REQUIRING TO BUILD THE WASM
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import gmsFilters from '../../../src/ts/wasm/gms-filters-provider';

describe('GMS IIR Filters Test', () => {
  beforeAll(async () => {
    await gmsFiltersModulePromise;
  });

  test('exists', async () => {
    const gmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    expect(iirFilterDesign).toBeDefined();
    expect(iirFilterApply).toBeDefined();
  });

  test('can call iirFilterDesign', async () => {
    const designed1 = await iirFilterDesign(linearFilterDefinition);
    const designed2 = await iirFilterDesign(linearFilterDefinition);

    expect(designed1).toBeDefined();
    expect(JSON.stringify(designed1)).toEqual(JSON.stringify(linearFilterDefinitionDesigned));

    expect(designed2).toBeDefined();
    expect(JSON.stringify(designed2)).toEqual(JSON.stringify(linearFilterDefinitionDesigned));

    expect(designed1).toEqual(designed2);
  });

  test('can call iirFilterApply', async () => {
    const designed = await iirFilterDesign(linearFilterDefinition);

    expect(designed).toBeDefined();
    expect(JSON.stringify(designed)).toEqual(JSON.stringify(linearFilterDefinitionDesigned));

    const result = await iirFilterApply(designed, new Float64Array(smallSampleData));

    expect(result).toBeDefined();
  });

  test('can call convertToGMSFiltersFilterDefinition', async () => {
    const converted = await convertToGMSFiltersLinearIIRFilterDescription(linearFilterDefinition);
    expect(converted).toBeDefined();
    expect(converted.iirFilterParameters.isDesigned).toBeFalsy();
  });

  test('check iirFilterDesign error conditions', async () => {
    await expect(
      iirFilterDesign({
        ...linearFilterDefinition,
        filterDescription: {
          ...linearFilterDefinition.filterDescription,
          filterType: FilterType.FIR_HAMMING
        }
      })
    ).rejects.toThrow();

    await expect(
      iirFilterDesign(({
        ...linearFilterDefinition,
        filterDescription: {
          ...linearFilterDefinition.filterDescription,
          filterDescriptions: []
        }
      } as unknown) as any)
    ).rejects.toThrow();

    await expect(
      iirFilterDesign({
        ...linearFilterDefinition,
        filterDescription: {
          ...linearFilterDefinition.filterDescription,
          parameters: {
            ...linearFilterDefinition.filterDescription.parameters,
            aCoefficients: [1],
            bCoefficients: [1, 2]
          }
        }
      })
    ).rejects.toThrow();

    await expect(iirFilterDesign(undefined)).rejects.toThrow();
  });

  test('check iirFilterApply error conditions', async () => {
    await expect(iirFilterApply(undefined, new Float64Array())).rejects.toThrow();
  });
});
