import type { ChannelSegmentDescriptor } from '../channel-segment/types';
import type { EntityReference, Faceted, VersionReference } from '../faceted';
import type { WorkflowDefinitionId } from '../workflow/types';

export enum QcSegmentType {
  AGGREGATE = 'AGGREGATE',
  CALIBRATION = 'CALIBRATION',
  FLAT = 'FLAT',
  GAP = 'GAP',
  NOISY = 'NOISY',
  SENSOR_PROBLEM = 'SENSOR_PROBLEM',
  SPIKE = 'SPIKE',
  STATION_PROBLEM = 'STATION_PROBLEM',
  STATION_SECURITY = 'STATION_SECURITY',
  TIMING = 'TIMING'
}

export enum QcSegmentCategory {
  ANALYST_DEFINED = 'ANALYST_DEFINED',
  DATA_AUTHENTICATION = 'DATA_AUTHENTICATION',
  STATION_SOH = 'STATION_SOH',
  WAVEFORM = 'WAVEFORM',
  LONG_TERM = 'LONG_TERM',
  UNPROCESSED = 'UNPROCESSED'
}

export interface QcSegment {
  id: string;
  channel: EntityReference<'name'>;
  versionHistory: QCSegmentVersion[];
}

export interface QCSegmentVersion {
  id: QcSegmentVersionId;
  startTime: number;
  endTime: number;
  createdBy: string;
  rejected: boolean;
  rationale: string;
  type: QcSegmentType;
  /** Faceted<ChannelSegment<TimeSeries>> that only contains an id of ChannelSegmentDescriptors */
  discoveredOn: Faceted<{
    id: ChannelSegmentDescriptor;
  }>[];
  stageId: WorkflowDefinitionId;
  category: QcSegmentCategory;
  channels: VersionReference<'name'>[];
}

export interface QcSegmentVersionId {
  parentQcSegmentId: string;
  effectiveAt: number;
}
