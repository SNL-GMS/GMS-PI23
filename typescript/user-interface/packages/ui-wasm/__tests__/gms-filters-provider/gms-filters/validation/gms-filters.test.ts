/* eslint-disable jest/no-conditional-expect */
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

import type {
  CascadedFilterDefinition,
  LinearFilterDefinition,
  LinearFilterDescription
} from '@gms/common-model/lib/filter/types';
import {
  isCascadedFilterDefinition,
  isLinearFilterDefinition
} from '@gms/common-model/lib/filter/types';
import { getSecureRandomNumber } from '@gms/common-util';

import {
  cascadeFilterApply,
  cascadeFilterDesign
} from '../../../../src/ts/gms-filters-provider/gms-filters/cascade-filter-processor';
import {
  defaultIndexInc,
  defaultIndexOffset,
  defaultRemoveGroupDelay,
  defaultTaper
} from '../../../../src/ts/gms-filters-provider/gms-filters/constants';
import type { GmsFiltersModule } from '../../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import { gmsFiltersModulePromise } from '../../../../src/ts/gms-filters-provider/gms-filters/gms-filters-module';
import {
  iirFilterApply,
  iirFilterDesign
} from '../../../../src/ts/gms-filters-provider/gms-filters/iir-filter-processor';
import { design, filter } from '../../../../src/ts/ui-wasm';
// ! IGNORED TO SUPPORT ESLINT CHECKS WITHOUT REQUIRING TO BUILD THE WASM
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import gmsFilters from '../../../../src/ts/wasm/gms-filters-provider';
import { DOUBLE_SIZE } from '../util';
import dataIn from './data-in.json';
import dataOut1 from './data-out-1.json';
import dataOut2 from './data-out-2.json';
import dataOut3 from './data-out-3.json';
import dataOut4 from './data-out-4.json';
import dataOut5 from './data-out-5.json';
import dataOut6 from './data-out-6.json';
import { filterList } from './test-filter-list';
import { designedFilterList } from './test-filter-list-designed';

const DEFAULT_PRECISION = 15; // number of decimal places

function numberPrecisionCompare(a: number, b: number, precision: number = DEFAULT_PRECISION): void {
  expect(a.toFixed(precision)).toEqual(b.toFixed(precision));
}

function precisionCompare(
  a: number[] | Float64Array,
  b: number[] | Float64Array,
  precision: number = DEFAULT_PRECISION
): void {
  expect((a === undefined && b !== undefined) || (a !== undefined && b === undefined)).toBeFalsy();
  expect(a.length === b.length).toBeTruthy();
  a.every((val, i) => numberPrecisionCompare(val, b[i], precision));
}

const dataOut: {
  y: number[];
}[] = [dataOut1, dataOut2, dataOut3, dataOut4, dataOut5, dataOut6];

const frequency = 40;
const twoHoursInSeconds = 2 * 60 * 60;
const twoHourDataSize = twoHoursInSeconds * frequency;

const twoHourData = Float64Array.from(
  Array.from({ length: twoHourDataSize }, () => getSecureRandomNumber() * 100)
);

describe('Validate GMS Filters Test', () => {
  beforeAll(async () => {
    await gmsFiltersModulePromise;
  });

  test('exists', async () => {
    const gmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();
  });

  test('validate cFilterApply', async () => {
    const gmsFiltersModule: GmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    // test all of the non-cascaded filters
    const indexes = [0, 1, 2, 3];

    indexes.forEach(index => {
      let inputPtr = 0;
      let sosNumeratorPtr = 0;
      let sosDenominatorPtr = 0;
      let sosCoefficientsPtr = 0;
      let results: Float64Array = new Float64Array();

      // Filter is destructive. Preserve inputs for comparison!
      const data = new Float64Array(dataIn.x);
      const expectedResult = new Float64Array(dataOut[index].y);
      const { length } = expectedResult;

      const designedFilter = designedFilterList.filters[index].filterDefinition
        .filterDescription as LinearFilterDescription;

      const sosNumerator = new Float64Array(designedFilter.parameters.bCoefficients);
      const sosDenominator = new Float64Array(designedFilter.parameters.aCoefficients);
      const sosCoefficients = new Float64Array([]);

      try {
        inputPtr = gmsFiltersModule._malloc(data.length * DOUBLE_SIZE);
        gmsFiltersModule.HEAPF64.set(data, inputPtr / DOUBLE_SIZE);

        sosNumeratorPtr = gmsFiltersModule._malloc(
          sosNumerator.BYTES_PER_ELEMENT * sosNumerator.length
        );
        gmsFiltersModule.HEAPF64.set(
          sosNumerator,
          sosNumeratorPtr / sosNumerator.BYTES_PER_ELEMENT
        );

        sosDenominatorPtr = gmsFiltersModule._malloc(
          sosDenominator.BYTES_PER_ELEMENT * sosDenominator.length
        );
        gmsFiltersModule.HEAPF64.set(
          sosDenominator,
          sosDenominatorPtr / sosDenominator.BYTES_PER_ELEMENT
        );

        sosCoefficientsPtr = gmsFiltersModule._malloc(
          sosCoefficients.BYTES_PER_ELEMENT * sosCoefficients.length
        );
        gmsFiltersModule.HEAPF64.set(
          sosCoefficients,
          sosCoefficientsPtr / sosCoefficients.BYTES_PER_ELEMENT
        );

        const cFilterApply = gmsFiltersModule.cwrap('cFilterApply', null, [
          'number',
          'number',
          'number',
          'number',
          'number',
          'number',
          'number',
          'number',
          'number'
        ]);

        cFilterApply(
          inputPtr,
          data.length,
          defaultIndexOffset,
          defaultIndexInc,
          defaultTaper,
          +designedFilter.zeroPhase,
          sosNumeratorPtr,
          sosDenominatorPtr,
          sosNumerator.length / 3
        );

        // this is the values stored in the input pointer. They should have changed.
        results = new Float64Array(
          gmsFiltersModule.HEAPF64.subarray(
            inputPtr / DOUBLE_SIZE,
            inputPtr / DOUBLE_SIZE + data.length
          )
        );

        expect(results).toHaveLength(length);
        precisionCompare(results, expectedResult, 11);
      } catch (e) {
        console.error(e);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(e).not.toBeDefined();
      } finally {
        gmsFiltersModule._free(sosNumeratorPtr);
        gmsFiltersModule._free(sosDenominatorPtr);
        gmsFiltersModule._free(sosCoefficientsPtr);
        gmsFiltersModule._free(inputPtr);
        gmsFiltersModule._free(results as any);
      }
    });
  });

  test('validate gms filters', async () => {
    const gmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    function* getIndex() {
      for (let i = 0; i < 5; i += 1) {
        yield i;
      }
    }

    const run = async () => {
      // eslint-disable-next-line no-restricted-syntax
      for await (const index of getIndex()) {
        let designed: LinearFilterDefinition | CascadedFilterDefinition;
        let filtered: Float64Array;
        let filteredXY: Float64Array;

        const filterItem = filterList.filters[index];
        const designedFilter = designedFilterList.filters[index];
        const data = new Float64Array(dataIn.x);
        const expectedResult = new Float64Array(dataOut[index].y);

        const dataXY = new Float64Array(data.length * 2);
        for (let i = 0; i < data.length; i += 1) {
          dataXY[i * 2] = i;
          dataXY[i * 2 + 1] = data[i];
        }

        const expectedResultXY = new Float64Array(expectedResult.length * 2);
        for (let i = 0; i < expectedResult.length; i += 1) {
          expectedResultXY[i * 2] = i;
          expectedResultXY[i * 2 + 1] = expectedResult[i];
        }

        if (
          isLinearFilterDefinition(filterItem.filterDefinition) &&
          isLinearFilterDefinition(designedFilter.filterDefinition)
        ) {
          designed = await iirFilterDesign(filterItem.filterDefinition, defaultTaper);

          expect(designed.filterDescription.causal).toEqual(
            designedFilter.filterDefinition.filterDescription.causal
          );
          expect(designed.filterDescription.filterType).toEqual(
            designedFilter.filterDefinition.filterDescription.filterType
          );
          expect(designed.filterDescription.highFrequency).toEqual(
            designedFilter.filterDefinition.filterDescription.highFrequency
          );
          expect(designed.filterDescription.order).toEqual(
            designedFilter.filterDefinition.filterDescription.order
          );
          expect(designed.filterDescription.passBandType).toEqual(
            designedFilter.filterDefinition.filterDescription.passBandType
          );
          expect(designed.filterDescription.zeroPhase).toEqual(
            designedFilter.filterDefinition.filterDescription.zeroPhase
          );
          expect(designed.filterDescription.parameters.groupDelaySec).toEqual(
            designedFilter.filterDefinition.filterDescription.parameters.groupDelaySec
          );
          expect(designed.filterDescription.parameters.sampleRateHz).toEqual(
            designedFilter.filterDefinition.filterDescription.parameters.sampleRateHz
          );
          expect(designed.filterDescription.parameters.sampleRateToleranceHz).toEqual(
            designedFilter.filterDefinition.filterDescription.parameters.sampleRateToleranceHz
          );

          precisionCompare(
            designed.filterDescription.parameters.aCoefficients,
            designedFilter.filterDefinition.filterDescription.parameters.aCoefficients
          );

          precisionCompare(
            designed.filterDescription.parameters.bCoefficients,
            designedFilter.filterDefinition.filterDescription.parameters.bCoefficients
          );

          filtered = await iirFilterApply(
            designed,
            data,
            defaultIndexOffset,
            defaultIndexInc,
            defaultTaper
          );

          filteredXY = await iirFilterApply(designed, dataXY, 1, 2, defaultTaper);
        } else if (
          isCascadedFilterDefinition(filterItem.filterDefinition) &&
          isCascadedFilterDefinition(designedFilter.filterDefinition)
        ) {
          designed = await cascadeFilterDesign(
            filterItem.filterDefinition,
            defaultTaper,
            defaultRemoveGroupDelay
          );

          const dFd = designedFilter.filterDefinition.filterDescription.filterDescriptions;

          designed.filterDescription.filterDescriptions.forEach((fd, i) => {
            expect(fd.causal).toEqual(dFd[i].causal);
            expect(fd.filterType).toEqual(dFd[i].filterType);
            expect(fd.highFrequency).toEqual(dFd[i].highFrequency);
            expect(fd.order).toEqual(dFd[i].order);
            expect(fd.passBandType).toEqual(dFd[i].passBandType);
            expect(fd.zeroPhase).toEqual(dFd[i].zeroPhase);
            expect(fd.parameters.groupDelaySec).toEqual(dFd[i].parameters.groupDelaySec);
            expect(fd.parameters.sampleRateHz).toEqual(dFd[i].parameters.sampleRateHz);
            expect(fd.parameters.sampleRateToleranceHz).toEqual(
              dFd[i].parameters.sampleRateToleranceHz
            );

            precisionCompare(fd.parameters.aCoefficients, dFd[i].parameters.aCoefficients);
            precisionCompare(fd.parameters.bCoefficients, dFd[i].parameters.bCoefficients);
          });

          filtered = await cascadeFilterApply(
            designed,
            data,
            defaultIndexOffset,
            defaultIndexInc,
            defaultTaper,
            defaultRemoveGroupDelay
          );

          filteredXY = await cascadeFilterApply(
            designed,
            dataXY,
            1,
            2,
            defaultTaper,
            defaultRemoveGroupDelay
          );
        }

        precisionCompare(filtered, expectedResult, 11);
        precisionCompare(filteredXY, expectedResultXY, 11);
      }
    };

    await run();
  });

  test('validate design and filter', async () => {
    const gmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    function* getIndex() {
      for (let i = 0; i < 5; i += 1) {
        yield i;
      }
    }

    const run = async () => {
      // eslint-disable-next-line no-restricted-syntax
      for await (const index of getIndex()) {
        const filterItem = filterList.filters[index];
        // const designedFilter = designedFilterList.filters[index];
        const data = new Float64Array(dataIn.x);
        const expectedResult = new Float64Array(dataOut[index].y);

        const dataXY = new Float64Array(data.length * 2);
        for (let i = 0; i < data.length; i += 1) {
          dataXY[i * 2] = i;
          dataXY[i * 2 + 1] = data[i];
        }

        const expectedResultXY = new Float64Array(expectedResult.length * 2);
        for (let i = 0; i < expectedResult.length; i += 1) {
          expectedResultXY[i * 2] = i;
          expectedResultXY[i * 2 + 1] = expectedResult[i];
        }

        const designed = await design(
          filterItem.filterDefinition,
          defaultTaper,
          defaultRemoveGroupDelay
        );

        const filtered = await filter(
          designed,
          data,
          defaultIndexOffset,
          defaultIndexInc,
          defaultTaper,
          defaultRemoveGroupDelay
        );

        const filteredXY = await filter(
          designed,
          dataXY,
          1,
          2,
          defaultTaper,
          defaultRemoveGroupDelay
        );

        precisionCompare(filtered, expectedResult, 11);
        precisionCompare(filteredXY, expectedResultXY, 11);
      }
    };

    await run();
  });

  test('cFilterApply performance', async () => {
    const gmsFiltersModule: GmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    // test all of the non-cascaded filters
    const indexes = [0, 1, 2, 3];

    indexes.forEach(index => {
      let inputPtr = 0;
      let sosNumeratorPtr = 0;
      let sosDenominatorPtr = 0;
      let sosCoefficientsPtr = 0;
      let results: Float64Array = new Float64Array();

      // Filter is destructive. Preserve inputs for comparison!
      const data = new Float64Array(dataIn.x);
      const expectedResult = new Float64Array(dataOut[index].y);
      const { length } = expectedResult;

      const designedFilter = designedFilterList.filters[index].filterDefinition
        .filterDescription as LinearFilterDescription;

      const sosNumerator = new Float64Array(designedFilter.parameters.bCoefficients);
      const sosDenominator = new Float64Array(designedFilter.parameters.aCoefficients);
      const sosCoefficients = new Float64Array([]);

      try {
        inputPtr = gmsFiltersModule._malloc(data.length * DOUBLE_SIZE);
        gmsFiltersModule.HEAPF64.set(data, inputPtr / DOUBLE_SIZE);

        sosNumeratorPtr = gmsFiltersModule._malloc(
          sosNumerator.BYTES_PER_ELEMENT * sosNumerator.length
        );
        gmsFiltersModule.HEAPF64.set(
          sosNumerator,
          sosNumeratorPtr / sosNumerator.BYTES_PER_ELEMENT
        );

        sosDenominatorPtr = gmsFiltersModule._malloc(
          sosDenominator.BYTES_PER_ELEMENT * sosDenominator.length
        );
        gmsFiltersModule.HEAPF64.set(
          sosDenominator,
          sosDenominatorPtr / sosDenominator.BYTES_PER_ELEMENT
        );

        sosCoefficientsPtr = gmsFiltersModule._malloc(
          sosCoefficients.BYTES_PER_ELEMENT * sosCoefficients.length
        );
        gmsFiltersModule.HEAPF64.set(
          sosCoefficients,
          sosCoefficientsPtr / sosCoefficients.BYTES_PER_ELEMENT
        );

        const cFilterApply = gmsFiltersModule.cwrap('cFilterApply', null, [
          'number',
          'number',
          'number',
          'number',
          'number',
          'number',
          'number',
          'number',
          'number'
        ]);

        const startingMs = Date.now();

        cFilterApply(
          inputPtr,
          data.length,
          defaultIndexOffset,
          defaultIndexInc,
          defaultTaper,
          +designedFilter.zeroPhase,
          sosNumeratorPtr,
          sosDenominatorPtr,
          sosNumerator.length / 3
        );

        // this is the values stored in the input pointer. They should have changed.
        results = new Float64Array(
          gmsFiltersModule.HEAPF64.subarray(
            inputPtr / DOUBLE_SIZE,
            inputPtr / DOUBLE_SIZE + data.length
          )
        );

        const totalMs = Date.now() - startingMs;
        if (totalMs > 50) {
          console.warn(` --> ${index} Running cFilterApply took more than 50ms`, totalMs);
        }

        expect(results).toHaveLength(length);
      } catch (e) {
        console.error(e);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(e).not.toBeDefined();
      } finally {
        gmsFiltersModule._free(sosNumeratorPtr);
        gmsFiltersModule._free(sosDenominatorPtr);
        gmsFiltersModule._free(sosCoefficientsPtr);
        gmsFiltersModule._free(inputPtr);
        gmsFiltersModule._free(results as any);
      }
    });
  });

  test('gms filters performance', async () => {
    const gmsFiltersModule = await gmsFilters();
    expect(gmsFiltersModule).toBeDefined();

    function* getIndex() {
      for (let i = 0; i < 5; i += 1) {
        yield i;
      }
    }

    const run = async () => {
      // eslint-disable-next-line no-restricted-syntax
      for await (const index of getIndex()) {
        const filterItem = filterList.filters[index];

        const startingMs = Date.now();
        const designed = await design(filterItem.filterDefinition);
        const totalDesignMs = Date.now() - startingMs;

        const filtered = await filter(designed, twoHourData);
        const totalFilterMs = Date.now() - startingMs - totalDesignMs;

        const totalMs = Date.now() - startingMs;

        if (totalDesignMs > 50) {
          console.warn(` --> ${index} Running filter design took more than 50ms`, totalDesignMs);
        }
        if (totalFilterMs > 50) {
          console.warn(` --> ${index} Running filter took more than 50ms`, totalFilterMs);
        }
        expect(totalMs).toBeLessThanOrEqual(1000); // 1000 ms

        expect(filtered).toBeDefined();
      }
    };

    await run();
  });

  test('gms filters error case', async () => {
    await expect(design(undefined)).rejects.toThrow();
    await expect(filter(undefined, twoHourData)).rejects.toThrow();
  });
});
