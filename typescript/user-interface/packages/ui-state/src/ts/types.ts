import type {
  ChannelSegmentTypes,
  ChannelTypes,
  EventTypes,
  FilterTypes,
  SignalDetectionTypes
} from '@gms/common-model';
import type { Event } from '@gms/common-model/lib/event';
import type {
  FilterDefinition,
  FilterDefinitionByFilterDefinitionUsage
} from '@gms/common-model/lib/filter/types';
import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import type { SignalDetectionHypothesis } from '@gms/common-model/lib/signal-detection';
import type { Station } from '@gms/common-model/lib/station-definitions/station-definitions/station-definitions';
import type { WeavessTypes } from '@gms/weavess-core';

export interface UiChannelSegment {
  channelSegmentDescriptor: ChannelSegmentTypes.ChannelSegmentDescriptor;
  processingMasks: ChannelSegmentTypes.ProcessingMask[];
  channelSegment: WeavessTypes.ChannelSegment;
}

export type ChannelName = UiChannelSegment['channelSegmentDescriptor']['channel']['name'];
export type StationName = Station['name'];
/** Weavess row could be a channel name or station name */
export type WeavessRowName = ChannelName | StationName;
export type FilterName = FilterDefinition['name'];
export type SampleRate = FilterDefinition['filterDescription']['parameters']['sampleRateHz'];
/**
 * JSON.stringify({@link ChannelSegmentTypes.ChannelSegmentDescriptor})
 */
export type ChannelSegmentDescriptorId = string;
export type SignalDetectionHypothesisId = SignalDetectionHypothesis['id']['id'];
export type EventId = Event['id'];
export type QcSegmentId = QcSegment['id'];

/**
 * Record<{@link ChannelName}, Record<{@link FilterName}, {@link UiChannelSegment}[]>>
 *
 * A record of channel names, each containing a record of filter names to an array of ui channel segments.
 */
export type UIChannelSegmentRecord = Record<ChannelName, Record<FilterName, UiChannelSegment[]>>;

/**
 * Record<{@link ChannelName}, {@link ChannelTypes.Channel}>
 *
 * A record of channel names to a matching channel.
 */
export type ChannelRecord = Record<ChannelName, ChannelTypes.Channel>;

/**
 * Record<{@link WeavessRowName}, {@link FilterTypes.Filter}>
 *
 * A record of weavess row names (either a channel name or station name) to a filter.
 */
export type ChannelFilterRecord = Record<WeavessRowName, FilterTypes.Filter>;

/**
 * Record<{@link FilterName}, Record<{@link SampleRate}, {@link FilterDefinition}[]>>
 *
 * A record of filter names, each containing a record of sample rates to a filter definition.
 */
export type FilterDefinitionsRecord = Record<FilterName, Record<SampleRate, FilterDefinition>>;

/**
 * Record<{@link SignalDetectionHypothesisId}, {@link FilterDefinitionByFilterDefinitionUsage}>
 */
export type FilterDefinitionsForSignalDetectionsRecord = Record<
  SignalDetectionHypothesisId,
  FilterDefinitionByFilterDefinitionUsage
>;

/**
 * Record<JSON.stringify({@link ChannelSegmentTypes.ChannelSegmentDescriptor}), {@link FilterDefinitionByFilterDefinitionUsage}>
 */
export type FilterDefinitionsForChannelSegmentsRecord = Record<
  ChannelSegmentDescriptorId,
  FilterDefinitionByFilterDefinitionUsage
>;

/**
 * Record<{@link FilterName}, Record<{@link ChannelName}, Set<{@link ChannelSegmentDescriptorId}>>>
 *
 * A record of filter names, each containing a record of channel names to a set of unique
 * channel segment descriptor ids (stringified channelSegmentDescriptors).
 */
export type ProcessedItemsCacheRecord = Record<
  FilterName,
  Record<ChannelName, Set<ChannelSegmentDescriptorId>>
>;

/**
 * Record<{@link StationName}, {@link SignalDetectionTypes.SignalDetection}>
 *
 * A record of station names to a signal detection.
 */
export type SignalDetectionsRecord = Record<StationName, SignalDetectionTypes.SignalDetection>;

/**
 * Record<{@link EventId}, {@link EventTypes.Event}>
 *
 * A record of event names to an event.
 */
export type EventsRecord = Record<EventId, EventTypes.Event>;

/**
 * Record<{@link ChannelName}, Record<{@link QcSegmentId}, {@link QcSegment}>>
 *
 * A record of channel names containing a record of qc segment id's to qc segments.
 */
export type QcSegmentRecord = Record<ChannelName, Record<QcSegmentId, QcSegment>>;

/**
 * Used by {@link FilterAssociation} in conjunction
 * with {@link FilterDefinitionAssociationsObject}.
 * Represents the id/startTime of a ChannelSegment that was filtered using a
 * particular {@link FilterTypes.FilterDefinition}
 */
export interface WaveformIdentifier {
  channelSegmentId: string;
  startTime: number;
}

/**
 * Used in conjunction with {@link FilterDefinitionAssociationsObject}.
 * Represents a collection of ChannelSegments that were filtered with a
 * particular {@link FilterTypes.FilterDefinition}
 */
export interface FilterAssociation {
  definition: FilterTypes.FilterDefinition;
  waveformIdentifiers: WaveformIdentifier[];
}

/**
 * This object associates {@link WeavessTypes.DataSegment}s to
 * designed {@link FilterTypes.FilterDefinition} objects for the purpose of file exporting.
 */
export interface FilterDefinitionAssociationsObject {
  filterAssociations: FilterAssociation[];
  channelSegments: UiChannelSegment[];
}
