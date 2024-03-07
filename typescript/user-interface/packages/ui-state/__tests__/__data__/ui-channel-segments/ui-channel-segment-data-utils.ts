import type { WaveformTypes } from '@gms/common-model';
import { ChannelSegmentTypes } from '@gms/common-model';
import { isDataClaimCheck } from '@gms/weavess-core/lib/types';

import type { UiChannelSegment, UIChannelSegmentRecord } from '../../../src/ts/types';
import { WaveformStore } from '../../../src/ts/workers';
import { generateUniqueId } from '../../../src/ts/workers/waveform-worker/util/data-segment-util';
import {
  filteredUiChannelSegmentWithDataBySampleRate,
  uiChannelSegmentWithEmptyClaimCheck,
  valuesAsFloat64Array
} from './ui-channel-segment-data';

/**
 * Creates a channel segment with a populated data claim check in the WaveformStore
 *
 * @return uiChannelSegment the channel segment with the populated claim check
 */
export const buildUiChannelSegmentWithPopulatedDataClaim = async () => {
  const newUiChannelSegment: UiChannelSegment = { ...uiChannelSegmentWithEmptyClaimCheck };
  let dataSegmentId = '';
  if (isDataClaimCheck(newUiChannelSegment.channelSegment.dataSegments[0].data)) {
    const domain = newUiChannelSegment.channelSegment.dataSegments[0].data.domainTimeRange;

    const wave: WaveformTypes.Waveform = {
      type: ChannelSegmentTypes.TimeSeriesType.WAVEFORM,
      startTime: 0,
      endTime: 100,
      sampleCount: 10,
      sampleRateHz: 100,
      samples: []
    };

    dataSegmentId = generateUniqueId(newUiChannelSegment.channelSegment, wave, domain);
    newUiChannelSegment.channelSegment.dataSegments[0].data.id = dataSegmentId;
  }

  // Populated data for the data segment id
  await WaveformStore.store(dataSegmentId, valuesAsFloat64Array);

  return newUiChannelSegment;
};

/**
 * Creates a uiChannelSegment record from dummy data based on a list of station names.
 * Channels will be grouped under stations based on . (period) deliniation.
 * ex: ASAR.A and ASAR.B will group under ASAR
 *
 * @param listOfNames an array of station.channel names to associate with the record
 * @returns the uiChannelSegment record
 */
export const buildUiChannelSegmentRecordFromList = (
  listOfNames: string[]
): UIChannelSegmentRecord => {
  const baseChannelSegments: UiChannelSegment[] = [
    uiChannelSegmentWithEmptyClaimCheck,
    filteredUiChannelSegmentWithDataBySampleRate
  ];

  const uiChannelSegments: UiChannelSegment[] = [] as UiChannelSegment[];
  baseChannelSegments.forEach(channelSegment => {
    const tempSegments = listOfNames.map(name => {
      return {
        channelSegmentDescriptor: {
          ...channelSegment.channelSegmentDescriptor,
          channel: {
            ...channelSegment.channelSegmentDescriptor.channel,
            name
          }
        },
        channelSegment: {
          ...channelSegment.channelSegment,
          channelName: name,
          description: `${name}-description`
        },
        processingMasks: []
      };
    });
    uiChannelSegments.push(...tempSegments);
  });

  const record = {};

  uiChannelSegments.forEach(uiChannelSegment => {
    const { wfFilterId, channelName } = uiChannelSegment.channelSegment;
    const stationName = channelName.split('.')[0];

    if (!record[stationName]) {
      record[stationName] = {};
    }

    if (!record[stationName][wfFilterId]) {
      record[stationName][wfFilterId] = [];
    }

    record[stationName][wfFilterId].push(uiChannelSegment);
  });

  return record;
};
