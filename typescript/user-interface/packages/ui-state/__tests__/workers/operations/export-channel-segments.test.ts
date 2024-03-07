/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { WaveformTypes } from '@gms/common-model';
import { ChannelSegmentTypes } from '@gms/common-model';
import { TimeSeriesType } from '@gms/common-model/lib/channel-segment/types';
import { Units } from '@gms/common-model/lib/common/types';
import { WeavessTypes } from '@gms/weavess-core';

import type { UiChannelSegment } from '../../../src/ts/types';
import {
  convertUiChannelSegmentsToChannelSegments,
  exportChannelSegmentsWithFilterAssociations
} from '../../../src/ts/workers/waveform-worker/operations/export-channel-segments';
import { generateUniqueId } from '../../../src/ts/workers/waveform-worker/util/data-segment-util';
import { WaveformStore } from '../../../src/ts/workers/waveform-worker/worker-store/waveform-store';

const domain = {
  startTimeSecs: 0,
  endTimeSecs: 100
};

const wave: WaveformTypes.Waveform = {
  type: ChannelSegmentTypes.TimeSeriesType.WAVEFORM,
  startTime: 0,
  endTime: 100,
  sampleCount: 10,
  sampleRateHz: 100,
  samples: []
};

const data: WeavessTypes.DataClaimCheck = {
  values: undefined,
  id: 'temp',
  domainTimeRange: domain,
  startTimeSecs: 0,
  endTimeSecs: 100,
  sampleRate: 100
};

const badData: WeavessTypes.DataBySampleRate = {
  values: undefined,
  startTimeSecs: 0,
  endTimeSecs: 100,
  sampleRate: 100
};

const sampleChannelSegment: WeavessTypes.ChannelSegment = {
  channelName: 'Sample Channel',
  wfFilterId: 'unfiltered',
  isSelected: true,
  timeseriesType: TimeSeriesType.WAVEFORM,
  units: Units.NANOMETERS,
  dataSegments: [
    {
      data
    }
  ]
};

const badSampleChannelSegment: WeavessTypes.ChannelSegment = {
  channelName: 'Sample Channel',
  wfFilterId: 'unfiltered',
  isSelected: true,
  timeseriesType: TimeSeriesType.WAVEFORM,
  units: Units.NANOMETERS,
  dataSegments: [
    {
      data: badData
    }
  ]
};

let sampleChannelSegmentId = '';

if (WeavessTypes.isDataClaimCheck(sampleChannelSegment.dataSegments[0].data)) {
  sampleChannelSegmentId = generateUniqueId(sampleChannelSegment, wave, domain);
  sampleChannelSegment.dataSegments[0].data.id = sampleChannelSegmentId;
}

const uiChannelSegment: UiChannelSegment = {
  channelSegment: sampleChannelSegment,
  channelSegmentDescriptor: {
    channel: {
      name: 'AAK.AAK.BHZ',
      effectiveAt: 1274391900
    },
    startTime: 1274391900,
    endTime: 1274399099,
    creationTime: 1274391900
  },
  processingMasks: []
};

const badUiChannelSegment: UiChannelSegment = {
  ...uiChannelSegment,
  channelSegment: badSampleChannelSegment
};

describe('Export Channel Segments', () => {
  beforeAll(async () => {
    const sampleData = new Float64Array([
      1,
      2.0000000000001,
      3,
      4.0000000000001,
      5,
      6.0000000000001,
      7,
      8.0000000000001,
      9
    ]);
    // Arrange data in the store ahead of time
    await WaveformStore.store(sampleChannelSegmentId, sampleData);
  });
  describe('exportChannelSegmentsWithFilterAssociations', () => {
    it('will return a blob of the data', async () => {
      const uiChannelSegments = [];
      const result = await exportChannelSegmentsWithFilterAssociations({
        filterAssociations: [],
        channelSegments: uiChannelSegments
      });
      // Jest does not fully implement blob so we cant check the data
      expect(result.type).toBe('application/json');
    });
  });
  describe('convertUiChannelSegmentsToChannelSegments', () => {
    it('will not fail with empty data', async () => {
      const uiChannelSegments = [];
      const result = await convertUiChannelSegmentsToChannelSegments(uiChannelSegments);
      expect(result).toMatchObject([]);
    });

    it('will throw an error if a non claim check ui channel segment is processed', async () => {
      const uiChannelSegments = [badUiChannelSegment];
      await expect(convertUiChannelSegmentsToChannelSegments(uiChannelSegments)).rejects.toThrow(
        'Cannot convert timeseries that is not data claim check'
      );
    });

    it('will return properly formatted COI channel segments without loss of precision', async () => {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      // jest.setTimeout(30000);
      const uiChannelSegments = [uiChannelSegment];
      const result = await convertUiChannelSegmentsToChannelSegments(uiChannelSegments);
      const output = [
        {
          id: {
            channel: {
              effectiveAt: 1274391900,
              name: 'AAK.AAK.BHZ'
            },
            creationTime: 1274391900,
            endTime: 1274399099,
            startTime: 1274391900
          },
          timeseries: [
            {
              endTime: 100,
              sampleCount: 4,
              sampleRateHz: 100,
              samples: [2.0000000000001, 4.0000000000001, 6.0000000000001, 8.0000000000001],
              startTime: 0,
              type: 'WAVEFORM'
            }
          ],
          timeseriesType: 'WAVEFORM',
          units: 'NANOMETERS'
        }
      ];
      expect(result).toMatchObject(output);
    });
  });
});
