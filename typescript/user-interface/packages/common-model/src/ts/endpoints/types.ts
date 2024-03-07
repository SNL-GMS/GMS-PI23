/**
 * Enumerates the different possible priorities for requests.
 * ! Note, these need to map to numbers in the transpiled javascript code.
 */
export enum Priority {
  HIGHEST = 7,
  HIGH = 6,
  MEDIUM_HIGH = 5,
  MEDIUM = 4,
  MEDIUM_LOW = 3,
  LOW = 2,
  LOWEST = 1
}

export const DEFAULT_PRIORITY = Priority.MEDIUM;

/**
 * Event Manager Service
 */
export const EventManagerUrls = {
  baseUrl: '/event-manager-service/event' as const,
  getEventsWithDetectionsAndSegmentsByTime: '/detections-and-segments/time' as const,
  findEventsByAssociatedSignalDetectionHypotheses: `/associated-signal-detection-hypotheses` as const,
  predict: `/predict` as const,
  predictEvent: `/predict-for-event-location` as const,
  status: `/status` as const,
  update: `/update` as const
};

/**
 * Frameworks OSD Service
 */
export const FrameworksOsdSUrls = {
  baseUrl: '/frameworks-osd-service/osd' as const,
  getProcessingStationGroups: `/station-groups` as const
};

/**
 * Processing Configuration
 */
export const ProcessingConfigUrls = {
  baseUrl: '/ui-processing-configuration-service' as const,
  getProcessingConfiguration: `/resolve` as const
};

/**
 * Signal Detections Manager Service
 */
export const SignalDetectionManagerUrls = {
  baseUrl: '/signal-detection-manager-service/signal-detection' as const,
  getFilterDefinitionsForSignalDetections: '/filter-definitions-by-usage/query/signal-detections' as const,
  getDetectionsWithSegmentsByStationsAndTime: '/signal-detections-with-channel-segments/query/stations-timerange' as const
};

/**
 * Signal Enhancement Configuration
 */
export const SignalEnhancementConfigurationUrls = {
  baseUrl: '/signal-enhancement-configuration-service/signal-enhancement-configuration' as const,
  getSignalEnhancementConfiguration: `/filter-lists-definition` as const,
  getDefaultFilterDefinitionsForSignalDetectionHypotheses: '/default-filter-definitions-for-signal-detection-hypotheses' as const,
  getDefaultFilterDefinitionByUsageForChannelSegments: '/default-filter-definitions-for-channel-segments' as const
};

/**
 * Station Definition Service
 */
export const StationDefinitionUrls = {
  baseUrl: '/station-definition-service/station-definition' as const,
  getStationGroupsByNames: `/station-groups/query/names` as const,
  getStations: `/stations/query/names` as const,
  getStationsEffectiveAtTimes: `/stations/query/change-times` as const,
  getChannelsByNames: `/channels/query/names` as const,
  getChannelsByNamesTimeRange: `/channels/query/names-timerange` as const
};

/**
 * System Event Gateway
 */
export const SystemEventGatewayUrls = {
  baseUrl: '/interactive-analysis-api-gateway' as const,
  sendClientLogs: `/client-log` as const,
  acknowledgeSohStatus: `/acknowledge-soh-status` as const,
  quietSohStatus: `/quiet-soh-status` as const,
  publishDerivedChannel: `/publish-derived-channel` as const
};

/**
 * System Messages
 */
export const SystemMessageUrls = {
  baseUrl: '/smds-service' as const,
  getSystemMessageDefinitions: `/retrieve-system-message-definitions` as const
};

/**
 * User Manager Service
 */
export const UserManagerServiceUrls = {
  baseUrl: '/user-manager-service' as const,
  getUserProfile: `/user-preferences` as const,
  setUserProfile: `/user-preferences/store` as const
};

/**
 * Waveform Manager Service
 */
export const WaveformManagerServiceUrls = {
  baseUrl: '/waveform-manager-service/waveform' as const,
  getChannelSegment: '/channel-segment/query/channel-timerange' as const,
  findQCSegmentsByChannelAndTimeRange: '/qc-segment/query/channel-timerange/canned' as const
};

/**
 * Workflow Manager Service
 */
export const WorkflowManagerServiceUrls = {
  baseUrl: '/workflow-manager-service/workflow-manager' as const,
  workflow: `/workflow-definition` as const,
  stageIntervalsByIdAndTime: `/interval/stage/query/ids-timerange` as const,
  updateActivityIntervalStatus: `/interval/activity/update` as const,
  updateStageIntervalStatus: `/interval/stage/interactive-analysis/update` as const
};
