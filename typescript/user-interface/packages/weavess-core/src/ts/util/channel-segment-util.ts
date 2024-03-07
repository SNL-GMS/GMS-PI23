import type { ChannelSegment, TimeRange } from '../types/types';
import { getTimeRangeFromDataSegment } from './data-segment-util';

/**
 * Determines a {@link TimeRange} from a given {@link ChannelSegment} object.
 *
 * @returns startTime and endTime in seconds
 */
export const getTimeRangeFromChannelSegment = (cs: ChannelSegment): TimeRange => {
  return cs.dataSegments.reduce(
    (finalRange, dataSeg) => {
      const dataSegRange = getTimeRangeFromDataSegment(dataSeg);
      return {
        startTimeSecs: Math.min(finalRange.startTimeSecs, dataSegRange.startTimeSecs),
        endTimeSecs: Math.max(finalRange.endTimeSecs, dataSegRange.endTimeSecs)
      };
    },
    { startTimeSecs: Infinity, endTimeSecs: -Infinity }
  );
};
