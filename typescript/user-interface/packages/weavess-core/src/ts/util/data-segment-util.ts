import { isDataBySampleRate, isDataClaimCheck, isFloat32Array } from '../types';
import type { DataSegment, TimeRange } from '../types/types';

/**
 * Determines a {@link TimeRange} from a given {@link DataSegment} object.
 *
 * @returns startTime and endTime in seconds
 */
export const getTimeRangeFromDataSegment = (dataSegment: DataSegment): TimeRange => {
  if (isDataBySampleRate(dataSegment.data) || isDataClaimCheck(dataSegment.data)) {
    return {
      startTimeSecs: dataSegment.data.startTimeSecs,
      endTimeSecs: dataSegment.data.endTimeSecs
    };
  }
  const startTimeSecs = isFloat32Array(dataSegment.data.values)
    ? dataSegment.data.values[0]
    : dataSegment.data.values[0].timeSecs;
  const endTimeSecs = isFloat32Array(dataSegment.data.values)
    ? dataSegment.data.values[dataSegment.data.values.length - 2]
    : dataSegment.data.values[dataSegment.data.values.length - 1].timeSecs;
  return {
    startTimeSecs,
    endTimeSecs
  };
};
