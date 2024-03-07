import {
  cascadedFilterDefinition,
  cascadedFilterDefinitionDesigned,
  linearFilterDefinition,
  linearFilterDefinitionDesigned
} from '@gms/common-model/__tests__/__data__';
import { FilterType } from '@gms/common-model/lib/filter/types';

import { isDesigned } from '../../../src/ts/gms-filters-provider';
import {
  getFilterBandType,
  getFilterComputationType,
  getFilterDesignModel
} from '../../../src/ts/gms-filters-provider/gms-filters/util';

describe('GMS Filter Processor Util', () => {
  test('exists', () => {
    expect(getFilterBandType).toBeDefined();
    expect(getFilterDesignModel).toBeDefined();
    expect(getFilterComputationType).toBeDefined();
  });

  test('check if designed', () => {
    expect(isDesigned(undefined)).toBeFalsy();

    expect(
      isDesigned({
        ...linearFilterDefinition,
        filterDescription: {
          ...linearFilterDefinition.filterDescription,
          parameters: null
        }
      })
    ).toBeFalsy();
    expect(isDesigned(linearFilterDefinition)).toBeFalsy();
    expect(isDesigned(cascadedFilterDefinition)).toBeFalsy();
    expect(isDesigned(linearFilterDefinition, 100)).toBeFalsy();
    expect(isDesigned(cascadedFilterDefinition, 100)).toBeFalsy();

    expect(isDesigned(linearFilterDefinitionDesigned)).toBeTruthy();
    expect(isDesigned(cascadedFilterDefinitionDesigned)).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    expect(isDesigned(linearFilterDefinitionDesigned, 30)).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    expect(isDesigned(cascadedFilterDefinitionDesigned, 30)).toBeTruthy();
  });

  test('should throw', () => {
    expect(() => {
      getFilterDesignModel(FilterType.CASCADE);
    }).toThrow();

    expect(() => {
      getFilterComputationType(FilterType.CASCADE);
    }).toThrow();
  });
});
