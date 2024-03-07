import type { ChannelSegmentTypes, CommonTypes, EventTypes } from '@gms/common-model';

import type { AsyncFetchHistory } from '../../../query';

// query args for GetDefaultFilterDefinitionByUsageForChannelSegments call
export interface GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs {
  interval: CommonTypes.TimeRange;
  channelSegments: ChannelSegmentTypes.ChannelSegmentFaceted[];
  eventHypothesis?: EventTypes.EventHypothesis;
}

export type GetDefaultFilterDefinitionByUsageForChannelSegmentsHistory = AsyncFetchHistory<
  GetDefaultFilterDefinitionByUsageForChannelSegmentsQueryArgs
>;
