import type { EventTypes, SignalDetectionTypes, WorkflowTypes } from '@gms/common-model';
import type { EntityReference } from '@gms/common-model/lib/faceted';
import type { SignalDetectionHypothesisFaceted } from '@gms/common-model/lib/signal-detection';

import type { AsyncFetchHistory } from '../../../query';

export interface SignalDetectionId {
  id: string;
}

export interface GetFilterDefinitionsForSignalDetectionsQueryArgs {
  stageId: {
    name: string;
  };
  signalDetectionsHypotheses: SignalDetectionHypothesisFaceted[];
}
export interface GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs {
  stageId: {
    name: string;
  };
  signalDetectionsHypotheses: SignalDetectionHypothesisFaceted[];
  eventHypothesis?: EventTypes.EventHypothesis;
}

export type GetFilterDefinitionsForSignalDetectionsHistory = AsyncFetchHistory<
  GetFilterDefinitionsForSignalDetectionsQueryArgs
>;

export type GetFilterDefinitionsForSignalDetectionHypothesesHistory = AsyncFetchHistory<
  GetFilterDefinitionsForSignalDetectionHypothesesQueryArgs
>;
/**
 * The interface required to make a signal detection query by stations.
 */
export interface GetSignalDetectionsAndSegmentsByStationsAndTimeQueryArgs {
  /**
   * Entity references contain only the station name.
   */
  stations: EntityReference<'name'>[];

  /**
   * In seconds. This will get converted into a UTC time string by the AxiosTransformers.
   */
  startTime: number;

  /**
   * In seconds. This will get converted into a UTC time string by the AxiosTransformers.
   */
  endTime: number;

  /**
   * The stage for which to request signal detections by station.
   */
  stageId: WorkflowTypes.WorkflowDefinitionId;

  /**
   * A list of signal detections to exclude from the result (so a request
   * with the same times could return newer results, in the case of late-arriving
   * data for example).
   */
  excludedSignalDetections?: SignalDetectionTypes.SignalDetection[];
}

/**
 * The interface required to make a signal detection query by a single station.
 */
export type GetSignalDetectionsWithSegmentsByStationAndTimeQueryArgs = Omit<
  GetSignalDetectionsAndSegmentsByStationsAndTimeQueryArgs & {
    station: EntityReference<'name'>;
  },
  'stations'
>;

/**
 * Defines the history record type for the getSignalDetectionsAndSegmentsByStationAndTime query
 */
export type GetSignalDetectionsWithSegmentsByStationAndTimeHistory = AsyncFetchHistory<
  GetSignalDetectionsWithSegmentsByStationAndTimeQueryArgs
>;
