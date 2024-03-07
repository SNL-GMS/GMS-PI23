/* eslint-disable @typescript-eslint/no-magic-numbers */
import cloneDeep from 'lodash/cloneDeep';

import type { TimeRange, TimeValuePair } from '../../src/ts/types/types';
import { getTimeRangeFromDataSegment } from '../../src/ts/util';
import { WeavessUtil } from '../../src/ts/weavess-core';

const timeRange: TimeRange = {
  startTimeSecs: 1000,
  endTimeSecs: 2000
};

const valueInput = [0, 100, -5, 10, -5, 1];
const float32Input: number[] = [];
const timeValuePairs: TimeValuePair[] = [];
const timeInc = (timeRange.endTimeSecs - timeRange.startTimeSecs) / (valueInput.length - 1);
valueInput.forEach((value, index) => {
  const timeSecs = timeInc * index + timeRange.startTimeSecs;
  timeValuePairs.push({ timeSecs, value });
  float32Input.push(timeSecs);
  float32Input.push(value);
});

const float32Buffer = Float32Array.from(float32Input);
const dataSegment = WeavessUtil.createFlatLineDataSegment(
  timeRange.startTimeSecs,
  timeRange.endTimeSecs,
  5
);
describe('Data segment util tests', () => {
  test('getTimeRangeFromDataSegment isDataBySampleRate', () => {
    expect(getTimeRangeFromDataSegment(dataSegment)).toEqual(timeRange);
  });

  test('getTimeRangeFromDataSegment DataClaimCheck', () => {
    const claimCheckDataSegment = cloneDeep(dataSegment);
    claimCheckDataSegment.data = {
      ...claimCheckDataSegment.data,
      values: undefined,
      id: 'foo'
    };
    expect(getTimeRangeFromDataSegment(claimCheckDataSegment)).toEqual(timeRange);
  });

  test('getTimeRangeFromDataSegment DataByTime float32Array', () => {
    const dataByTime = cloneDeep(dataSegment);
    dataByTime.data = {
      values: float32Buffer
    };
    expect(getTimeRangeFromDataSegment(dataByTime)).toEqual(timeRange);
  });

  test('getTimeRangeFromDataSegment DataByTime TimeValuePair', () => {
    const dataByTime = cloneDeep(dataSegment);
    dataByTime.data = {
      values: timeValuePairs
    };
    expect(getTimeRangeFromDataSegment(dataByTime)).toEqual(timeRange);
  });
});
