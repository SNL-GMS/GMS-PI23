import type { WaveformTypes } from '@gms/common-model';
import { ChannelSegmentTypes } from '@gms/common-model';
import {
  cascadedFilterDefinition,
  linearFilterDefinition
} from '@gms/common-model/__tests__/__data__';
import { WeavessTypes } from '@gms/weavess-core';
import type { DataClaimCheck } from '@gms/weavess-core/lib/types';

import {
  designFilter,
  filterChannelSegments
} from '../../../src/ts/workers/waveform-worker/operations/ui-filter-processor';
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
  sampleRate: 30
};

const sampleChannelSegment: WeavessTypes.ChannelSegment = {
  channelName: 'Sample Channel',
  wfFilterId: 'unfiltered',
  isSelected: true,
  dataSegments: [
    {
      data
    }
  ]
};

let sampleChannelSegmentId = '';

if (WeavessTypes.isDataClaimCheck(sampleChannelSegment.dataSegments[0].data)) {
  sampleChannelSegmentId = generateUniqueId(sampleChannelSegment, wave, domain);
  sampleChannelSegment.dataSegments[0].data.id = sampleChannelSegmentId;
}

const sampleChannelSegments: WeavessTypes.ChannelSegment[] = [sampleChannelSegment];

describe('UI Filter Processor', () => {
  describe('UI Filter Processor: designFilter', () => {
    it('designs a linear filter', async () => {
      const filter = await designFilter({
        filterDefinition: linearFilterDefinition,
        taper: 0,
        removeGroupDelay: false
      });
      expect(filter).toMatchObject(linearFilterDefinition);
    });

    it('designs a cascade filter', async () => {
      const filter = await designFilter({
        filterDefinition: cascadedFilterDefinition,
        taper: 0,
        removeGroupDelay: false
      });
      expect(filter).toMatchObject(cascadedFilterDefinition);
    });
  });
  describe('UI Filter Processor: filterChannelSegments', () => {
    beforeAll(async () => {
      // Arrange data in the store ahead of time
      await WaveformStore.store(
        sampleChannelSegmentId,
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        new Float64Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
      );
    });

    it('filters a channel segment by linear filter', async () => {
      const results = await filterChannelSegments({
        channelSegments: sampleChannelSegments,
        filterDefinitions: { 30: linearFilterDefinition },
        taper: 0,
        removeGroupDelay: false
      });
      const claimCheck = results[0].dataSegments[0].data as DataClaimCheck;
      const convertedClaimCheck = JSON.parse(claimCheck.id);
      expect(convertedClaimCheck.filter).toBe(linearFilterDefinition.name);
    });

    it('filters a channel segment by cascade filter', async () => {
      const results = await filterChannelSegments({
        channelSegments: sampleChannelSegments,
        filterDefinitions: { 30: cascadedFilterDefinition },
        taper: 0,
        removeGroupDelay: false
      });
      const claimCheck = results[0].dataSegments[0].data as DataClaimCheck;
      const convertedClaimCheck = JSON.parse(claimCheck.id);
      expect(convertedClaimCheck.filter).toBe(cascadedFilterDefinition.name);
    });
  });
});
