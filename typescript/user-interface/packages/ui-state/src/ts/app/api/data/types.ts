import type { SignalDetectionTypes } from '@gms/common-model';

import type {
  ChannelRecord,
  EventsRecord,
  FilterDefinitionsForChannelSegmentsRecord,
  FilterDefinitionsForSignalDetectionsRecord,
  FilterDefinitionsRecord,
  QcSegmentRecord,
  SignalDetectionsRecord,
  UIChannelSegmentRecord
} from '../../../types';
import type { GetChannelsByNamesHistory } from './channel/types';
import type {
  FindEventsByAssociatedSignalDetectionHypothesesHistory,
  GetEventsWithDetectionsAndSegmentsByTimeHistory
} from './event/types';
import type {
  GetFilterDefinitionsForSignalDetectionHypothesesHistory,
  GetFilterDefinitionsForSignalDetectionsHistory,
  GetSignalDetectionsWithSegmentsByStationAndTimeHistory
} from './signal-detection/types';
import type { GetDefaultFilterDefinitionByUsageForChannelSegmentsHistory } from './signal-enhancement/types';
import type {
  FindQCSegmentsByChannelAndTimeRangeHistory,
  GetChannelSegmentsByChannelHistory
} from './waveform/types';

/**
 * Defines the Data slice state.
 */
export interface DataState {
  /** the channel segments - by unique channel name - populated by multiple queries */
  uiChannelSegments: UIChannelSegmentRecord;
  /** the channels by effectiveTime populated by the getChannelsByNamesTimeRange query */
  channels: {
    raw: ChannelRecord;
    derived: ChannelRecord;
  };
  /** the signal detections - by unique station name - populated by multiple queries */
  signalDetections: SignalDetectionsRecord;
  /** the events - by time- populated by multiple queries */
  events: EventsRecord;
  /** events by associated sd hypotheses */
  associatedEvents: EventsRecord;
  /** designed filter definitions */
  filterDefinitions: FilterDefinitionsRecord;
  /** filter definitions for signal detections */
  filterDefinitionsForSignalDetections: FilterDefinitionsForSignalDetectionsRecord;
  /** filter definitions for signal detections for the open event */
  filterDefinitionsForSignalDetectionHypothesesEventOpen: FilterDefinitionsForSignalDetectionsRecord;
  /** filter definitions for signal detections for the open event */
  filterDefinitionsForSignalDetectionHypotheses: FilterDefinitionsForSignalDetectionsRecord;
  /** missing SignalDetectionsHypotheses id's for filter definitions for signal detections for the open event */
  missingSignalDetectionsHypothesesForFilterDefinitions: SignalDetectionTypes.SignalDetectionHypothesisFaceted[];
  /** filter definitions for channel segments */
  defaultFilterDefinitionByUsageForChannelSegments: FilterDefinitionsForChannelSegmentsRecord;
  /** filter definitions for channel segments for open event */
  defaultFilterDefinitionByUsageForChannelSegmentsEventOpen: FilterDefinitionsForChannelSegmentsRecord;
  /** qc segments by unique channel name */
  qcSegments: QcSegmentRecord;
  /** query history */
  queries: {
    /** the history record of the getChannelSegmentsByChannel query */
    getChannelSegmentsByChannel: GetChannelSegmentsByChannelHistory;
    /** the history record of the findQCSegmentsByChannelAndTimeRange query */
    findQCSegmentsByChannelAndTimeRange: FindQCSegmentsByChannelAndTimeRangeHistory;
    /** the history record of the getSignalDetectionWithSegmentsByStationAndTime query */
    getSignalDetectionWithSegmentsByStationAndTime: GetSignalDetectionsWithSegmentsByStationAndTimeHistory;
    /** the history record of the getEventsWithDetectionsAndSegmentsByTime query */
    getEventsWithDetectionsAndSegmentsByTime: GetEventsWithDetectionsAndSegmentsByTimeHistory;
    /** the history record of the findEventsByAssociatedSignalDetectionHypotheses query */
    findEventsByAssociatedSignalDetectionHypotheses: FindEventsByAssociatedSignalDetectionHypothesesHistory;
    /** the history record of the getChannelsByName query */
    getChannelsByNamesTimeRange: GetChannelsByNamesHistory;
    /** the history record of the getFilterDefinitionsByUsage query */
    getFilterDefinitionsForSignalDetections: GetFilterDefinitionsForSignalDetectionsHistory;
    /** the history record of the getFilterDefinitionsByUsage query */
    getFilterDefinitionsForSignalDetectionHypotheses: GetFilterDefinitionsForSignalDetectionHypothesesHistory;
    /** the history record of the getDefaultFilterDefinitionByUsageForChannelSegments query */
    getDefaultFilterDefinitionByUsageForChannelSegments: GetDefaultFilterDefinitionByUsageForChannelSegmentsHistory;
  };
}
