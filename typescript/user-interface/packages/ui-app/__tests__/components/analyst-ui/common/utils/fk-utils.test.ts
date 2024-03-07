import type { FkTypes } from '@gms/common-model';
import { eventData, signalDetectionsData } from '@gms/common-model/__tests__/__data__';

import {
  calculateStartTimeForFk,
  computeFkFrequencyThumbnails,
  computeFks,
  createComputeFkInput,
  frequencyBandToString,
  getAssociatedDetectionsWithFks,
  getDefaultFkConfigurationForSignalDetection,
  getFkData,
  getFkDummyData,
  getFkParamsForSd,
  kmToDegreesApproximate
} from '../../../../../src/ts/components/analyst-ui/common/utils/fk-utils';
import { configuration, fkInput } from '../../../../__data__/azimuth-slowness'; // '__tests__/__data__/azimuth-slowness';
import { uiChannelSegmentRecord } from '../../../__data__/weavess-channel-segment-data';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

/**
 * Tests the ability to check if the peak trough is in warning
 */
describe('frequencyBandToString', () => {
  test('correctly creates frequency band string', () => {
    const band: FkTypes.FrequencyBand = {
      maxFrequencyHz: 5,
      minFrequencyHz: 1
    };
    const testString = '1 - 5 Hz';
    expect(frequencyBandToString(band)).toEqual(testString);
  });
});

describe('Can retrieve FkData', () => {
  test('getFkData', () => {
    expect(getFkData(undefined, uiChannelSegmentRecord)).toBeUndefined();
    expect(getFkData(signalDetectionsData[0], uiChannelSegmentRecord)).toBeUndefined();
  });

  test('getFkDummyData', () => {
    expect(getFkDummyData(undefined)).toBeUndefined();
    expect(getFkDummyData(signalDetectionsData[0])).toBeDefined();
  });

  test('createComputeFkInput', () => {
    const fkParams = getFkParamsForSd(signalDetectionsData[0]);
    expect(createComputeFkInput(undefined, fkParams, configuration)).toBeUndefined();
    expect(
      createComputeFkInput(signalDetectionsData[0], fkParams, configuration, false)
    ).toMatchSnapshot();
  });
  test('computeFks', () => {
    expect(computeFks([fkInput])).toBeDefined();
  });

  test('computeFkFrequencyThumbnails', async () => {
    expect(await computeFkFrequencyThumbnails(fkInput, undefined)).toBeUndefined();
    expect(await computeFkFrequencyThumbnails(fkInput, signalDetectionsData[0])).toBeDefined();
  });

  test('getFkParamsForSd', () => {
    expect(getFkParamsForSd(undefined)).toBeUndefined();
    expect(getFkParamsForSd(signalDetectionsData[0])).toBeDefined();
  });

  describe('General Fk configuration and SD associations', () => {
    test('getAssociatedDetectionsWithFks', () => {
      expect(getAssociatedDetectionsWithFks(undefined, signalDetectionsData)).toHaveLength(0);
      expect(getAssociatedDetectionsWithFks(eventData, undefined)).toHaveLength(0);
      expect(getAssociatedDetectionsWithFks(eventData, [])).toHaveLength(0);
      expect(getAssociatedDetectionsWithFks(eventData, signalDetectionsData)).toHaveLength(1);
    });
  });

  test('getDefaultFkConfigurationForSignalDetection', () => {
    expect(
      getDefaultFkConfigurationForSignalDetection(signalDetectionsData[0], [])
    ).toMatchSnapshot();
  });

  test('kmToDegreesApproximate', () => {
    const km = 125;
    expect(kmToDegreesApproximate(km)).toMatchInlineSnapshot(`1.124152007398413`);
  });

  test('calculateStartTimeForFk', () => {
    let startTime = 130;
    const arrivalTime = 120;
    const leadTime = 1;
    const stepSize = 2;
    expect(calculateStartTimeForFk(startTime, arrivalTime, leadTime, undefined)).toBeUndefined();
    expect(calculateStartTimeForFk(startTime, arrivalTime, leadTime, stepSize)).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    startTime = 100;
    expect(
      calculateStartTimeForFk(startTime, arrivalTime, leadTime, stepSize)
    ).toMatchInlineSnapshot(`101`);
  });
});
