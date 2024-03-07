import type { WeavessTypes } from '@gms/weavess-core';
import { WeavessUtil } from '@gms/weavess-core';
/**
 * Convert data in the dataBySampleRate format into a Float64Array position buffer of the format: [x,y,x,y,...]
 *
 * @param dataSampleRate the data to convert
 * @param domain the visible domain in Epoch Seconds, in the form [startTimeSec, endTimeSec]
 *
 * @throws an error if the dataBySampleRate or its values are undefined
 *
 * @returns A promise of a Float64Array of vertices
 */
export const convertToPositionBuffer = (
  dataBySampleRate: WeavessTypes.DataBySampleRate,
  domain: WeavessTypes.TimeRange,
  glMin = 0,
  glMax = 100
): Float64Array => {
  return WeavessUtil.toPositionBuffer<Float64Array>(
    dataBySampleRate,
    domain,
    glMin,
    glMax,
    Float64Array
  );
};
