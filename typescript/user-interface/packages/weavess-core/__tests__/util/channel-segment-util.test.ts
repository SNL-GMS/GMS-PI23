/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { TimeRange } from '../../src/ts/types/types';
import { getTimeRangeFromChannelSegment } from '../../src/ts/util';
import { WeavessUtil } from '../../src/ts/weavess-core';

const timeRange: TimeRange = {
  startTimeSecs: 1000,
  endTimeSecs: 2000
};

const channelSegment = WeavessUtil.createFlatLineChannelSegment(
  'AAK.AAK.BHZ',
  timeRange.startTimeSecs,
  timeRange.endTimeSecs - 500,
  5
);
channelSegment.dataSegments.push(
  WeavessUtil.createFlatLineDataSegment(timeRange.startTimeSecs + 500, timeRange.endTimeSecs, 5)
);
describe('Channel segment util test', () => {
  test('getTimeRangeFromChannelSegment isDataBySampleRate', () => {
    expect(getTimeRangeFromChannelSegment(channelSegment)).toEqual(timeRange);
  });
});
