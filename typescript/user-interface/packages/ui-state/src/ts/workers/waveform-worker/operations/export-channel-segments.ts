import type { ChannelSegment, TimeSeries } from '@gms/common-model/lib/channel-segment/types';
import { TimeSeriesType } from '@gms/common-model/lib/channel-segment/types';
import { Units } from '@gms/common-model/lib/common/types';
import { serializeTypeTransformer } from '@gms/ui-workers';
import { WeavessTypes } from '@gms/weavess-core';

import type { FilterDefinitionAssociationsObject, UiChannelSegment } from '../../../types';
import { WaveformStore } from '../worker-store';

/**
 * Converts dataSegments to OSD timeseries and hydrates claim check's.
 *
 * @param dataSegments A list of DataSegment's
 * @throws {@link Error} any exceptions
 * @returns Promise of converted OSD data including waveform data
 */
export const convertUiTimeSeriesToCoiTimeseries = async (
  dataSegments: WeavessTypes.DataSegment[],
  timeseriesType: TimeSeriesType
): Promise<TimeSeries[]> => {
  return Promise.all(
    dataSegments.map(async uiDataSegment => {
      if (!WeavessTypes.isDataClaimCheck(uiDataSegment.data)) {
        throw new Error('Cannot convert timeseries that is not data claim check');
      }
      // Get wave from store
      let samples = Array.from(await WaveformStore.retrieve(uiDataSegment.data.id));

      // Drop all even values. Even values are X and OSD data only contains Y values
      samples = samples.filter((value, index) => index % 2 !== 0);

      return {
        type: timeseriesType,
        startTime: uiDataSegment.data.startTimeSecs,
        endTime: uiDataSegment.data.endTimeSecs,
        sampleRateHz: uiDataSegment.data.sampleRate,
        sampleCount: samples.length,
        samples
      };
    })
  );
};

/**
 * Converts UiChannelSegments to OSD model, with hydrated claim check's.
 *
 * @param uiChannelSegments A list of UIChannelSegments
 *
 * @returns Promise of converted OSD data including waveform data
 */
export const convertUiChannelSegmentsToChannelSegments = async (
  uiChannelSegments: UiChannelSegment[]
): Promise<ChannelSegment<TimeSeries>[]> => {
  return Promise.all(
    uiChannelSegments.map(async uiChannelSegment => {
      const timeseries = await convertUiTimeSeriesToCoiTimeseries(
        uiChannelSegment.channelSegment.dataSegments,
        TimeSeriesType[uiChannelSegment.channelSegment.timeseriesType]
      );

      return {
        id: {
          channel: {
            name: uiChannelSegment.channelSegmentDescriptor.channel.name,
            effectiveAt: uiChannelSegment.channelSegmentDescriptor.channel.effectiveAt
          },
          startTime: uiChannelSegment.channelSegmentDescriptor.startTime,
          endTime: uiChannelSegment.channelSegmentDescriptor.endTime,
          creationTime: uiChannelSegment.channelSegmentDescriptor.creationTime
        },
        units: Units[uiChannelSegment.channelSegment.units],
        timeseriesType: TimeSeriesType[uiChannelSegment.channelSegment.timeseriesType],
        timeseries,
        maskedBy: uiChannelSegment.processingMasks
      };
    })
  );
};

/**
 * Exports UIChannelSegments as a Blob containing OSD ChannelSegments in JSON format.
 *
 * @param uiChannelSegments A list of UIChannelSegments
 *
 * @returns Promise of Blob containing converted OSD format data
 */
export const exportChannelSegmentsWithFilterAssociations = async (
  params: FilterDefinitionAssociationsObject
): Promise<Blob> => {
  let data = {
    channelSegments: await convertUiChannelSegmentsToChannelSegments(params.channelSegments),
    filterAssociations: params.filterAssociations
  };
  data = serializeTypeTransformer(data);
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
};
