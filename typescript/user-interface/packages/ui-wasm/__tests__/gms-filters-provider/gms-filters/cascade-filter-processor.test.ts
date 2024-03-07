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
  cascadedFilterDefinition,
  cascadedFilterDefinitionDesigned,
  smallSampleData
} from '@gms/common-model/__tests__/__data__';
import { FilterType } from '@gms/common-model/lib/filter/types';
import produce from 'immer';

import {
  cascadeFilterApply,
  cascadeFilterDesign,
  convertToGMSFiltersFilterDefinition
} from '../../../src/ts/gms-filters-provider/gms-filters/cascade-filter-processor';
import { gmsFiltersModulePromise } from '../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
// ! IGNORED TO SUPPORT ESLINT CHECKS WITHOUT REQUIRING TO BUILD THE WASM
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import gmsFilters from '../../../src/ts/wasm/gms-filters-provider';

describe('GMS Cascade Filters Test', () => {
  beforeAll(async () => {
    await gmsFiltersModulePromise;
  });

  test('exists', async () => {
    const gmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    expect(cascadeFilterDesign).toBeDefined();
    expect(cascadeFilterApply).toBeDefined();
  });

  test('can call cascadeFilterDesign', async () => {
    const designed1 = await cascadeFilterDesign(cascadedFilterDefinition);
    const designed2 = await cascadeFilterDesign(cascadedFilterDefinition);

    expect(designed1).toBeDefined();
    expect(JSON.stringify(designed1)).toEqual(JSON.stringify(cascadedFilterDefinitionDesigned));

    expect(designed2).toBeDefined();
    expect(JSON.stringify(designed2)).toEqual(JSON.stringify(cascadedFilterDefinitionDesigned));

    expect(designed1).toEqual(designed2);
  });

  test('can call cascadeFilterApply', async () => {
    const designed = await cascadeFilterDesign(cascadedFilterDefinition);
    expect(designed).toBeDefined();
    expect(JSON.stringify(designed)).toEqual(JSON.stringify(cascadedFilterDefinitionDesigned));

    const result = await cascadeFilterApply(designed, smallSampleData);
    expect(result).toBeDefined();
  });

  test('can call convertToGMSFiltersFilterDefinition', async () => {
    const converted = await convertToGMSFiltersFilterDefinition(cascadedFilterDefinition);
    expect(converted).toBeDefined();
    expect(converted.isDesigned).toBeFalsy();
  });

  test('check cascadeFilterDesign error conditions', async () => {
    await expect(
      cascadeFilterDesign({
        ...cascadedFilterDefinition,
        filterDescription: {
          ...cascadedFilterDefinition.filterDescription,
          filterType: FilterType.FIR_HAMMING as any
        }
      })
    ).rejects.toThrow();

    await expect(
      cascadeFilterDesign(({
        ...cascadedFilterDefinition,
        filterDescription: {
          ...cascadedFilterDefinition.filterDescription,
          filterDescriptions: []
        }
      } as unknown) as any)
    ).rejects.toThrow();

    await expect(
      cascadeFilterDesign({
        ...cascadedFilterDefinition,
        filterDescription: {
          ...cascadedFilterDefinition.filterDescription,
          filterDescriptions: [
            cascadedFilterDefinition.filterDescription.filterDescriptions[0],
            produce(cascadedFilterDefinition.filterDescription.filterDescriptions[1], draft => {
              draft.filterType = FilterType.CASCADE as any;
            })
          ]
        }
      })
    ).rejects.toThrow();

    await expect(
      cascadeFilterDesign({
        ...cascadedFilterDefinition,
        filterDescription: {
          ...cascadedFilterDefinition.filterDescription,
          filterDescriptions: [
            cascadedFilterDefinition.filterDescription.filterDescriptions[0],
            produce(cascadedFilterDefinition.filterDescription.filterDescriptions[1], draft => {
              draft.parameters = {
                ...cascadedFilterDefinition.filterDescription.filterDescriptions[1].parameters,
                aCoefficients: [1],
                bCoefficients: [1, 2]
              };
            })
          ]
        }
      })
    ).rejects.toThrow();

    await expect(cascadeFilterDesign(undefined)).rejects.toThrow();
  });

  test('check cascadeFilterApply error conditions', async () => {
    await expect(cascadeFilterApply(undefined, new Float64Array())).rejects.toThrow();
  });
});
