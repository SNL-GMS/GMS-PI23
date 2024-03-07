import type { ChannelSegmentTypes, WaveformTypes } from '@gms/common-model';
import { WeavessTypes } from '@gms/weavess-core';

import { WaveformStore } from '../worker-store/waveform-store';
import { convertToPositionBuffer } from './position-buffer-util';

/**
 * Make a DataBySampleRate object from the provided waveform
 *
 * @param wave the waveform from which to get the data
 * @returns the DataBySampleRate object
 */
export const getDataBySampleRate = (
  wave: WaveformTypes.Waveform
): WeavessTypes.DataBySampleRate => ({
  sampleRate: wave.sampleRateHz,
  startTimeSecs: wave.startTime,
  endTimeSecs: wave.endTime,
  values: wave.samples
});

/**
 * Make a DataBySampleRate object from the provided waveform
 *
 * @param id the generated unique id of the waveform
 * @param wave the waveform data
 * @param domain the domain of the waveform
 * @param parallelize whether to parallelize the operation
 * @returns the stored id of the saved waveform data
 */
export const calculateAndStorePositionBuffer = async (
  id: string,
  wave: WaveformTypes.Waveform,
  domain: WeavessTypes.TimeRange,
  parallelize = false
): Promise<string> => {
  if (!(await WaveformStore.has(id))) {
    const positionBufferPromise = Promise.resolve(
      convertToPositionBuffer(getDataBySampleRate(wave), domain)
    );
    if (parallelize) {
      await WaveformStore.store(id, positionBufferPromise);
    } else {
      await WaveformStore.store(id, await positionBufferPromise);
    }
  }
  return Promise.resolve(id);
};

/**
 * Stores waveform data (if it is not already stored) to the waveform cache
 *
 * @param id the id of the waveform to save the data to
 * @param wave the waveform data
 * @returns the stored id of the saved waveform data
 */
export const storePositionBuffer = async (id: string, wave: Float64Array): Promise<string> => {
  if (!(await WaveformStore.has(id))) {
    await WaveformStore.store(id, wave);
  }
  return Promise.resolve(id);
};

/**
 * Generate a unique id based on the data fields of the channel segment and waveform
 */
export const generateUniqueId = (
  channelSegment,
  wave,
  domain: WeavessTypes.TimeRange,
  filter = WeavessTypes.UNFILTERED
) => {
  return JSON.stringify({
    domain,
    id: channelSegment.id,
    type: channelSegment.timeseriesType,
    filter,
    waveform: {
      type: wave.type,
      startTime: wave.startTime,
      endTime: wave.endTime,
      sampleCount: wave.sampleCount,
      sampleRateHz: wave.sampleRateHz
    }
  });
};

/**
 * Updates an existing waveform store claim check id with a new filter name
 *
 * @param uniqueId returned from waveform cache or channel data claim check
 * @param filter Filter name from a FilterDefinition
 * @returns A string based uniqueId with just the filter param updated
 */
export const changeUniqueIdFilter = (uniqueId, filter = WeavessTypes.UNFILTERED) => {
  try {
    const uniqueIdData = JSON.parse(uniqueId);
    uniqueIdData.filter = filter;
    return JSON.stringify(uniqueIdData);
  } catch (error) {
    throw new Error('There was an error parsing the uniqueId');
  }
};

/**
 * Converts the ChannelSegmentTypes.ChannelSegment waveform to a WeavessTypes.DataSegment[]
 *
 * @param channelSegment returned from waveform query
 * @param domain TimeRange of Current Interval
 * @param semanticColors Color for raw waveform
 * @returns object with list of dataSegments, description, showLabel (boolean), channelSegmentBoundaries
 */
export async function formatAndStoreDataSegments(
  channelSegment: ChannelSegmentTypes.ChannelSegment<WaveformTypes.Waveform>,
  domain: WeavessTypes.TimeRange,
  waveformColor: string
): Promise<WeavessTypes.DataSegment[]> {
  // If there was no raw data and no filtered data return empty data segments
  if (!channelSegment || !channelSegment.timeseries || channelSegment.timeseries.length === 0) {
    return [];
  }

  return Promise.all(
    channelSegment.timeseries.map<Promise<WeavessTypes.DataSegment>>(
      async (wave: WaveformTypes.Waveform) => {
        // generate a unique id based on the data fields
        const id = generateUniqueId(channelSegment, wave, domain);
        const dataSegId = await calculateAndStorePositionBuffer(id, wave, domain);
        return {
          displayType: [WeavessTypes.DisplayType.LINE],
          color: waveformColor,
          pointSize: 1,
          data: {
            startTimeSecs: wave.startTime,
            endTimeSecs: wave.endTime,
            sampleRate: wave.sampleRateHz,
            values: undefined, // vertices
            id: dataSegId,
            domainTimeRange: domain
          }
        };
      }
    )
  );
}
