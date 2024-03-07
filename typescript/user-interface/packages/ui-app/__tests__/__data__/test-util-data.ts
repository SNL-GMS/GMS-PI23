import type { CommonTypes } from '@gms/common-model';
import { ConfigurationTypes, EventTypes, WorkflowTypes } from '@gms/common-model';
import {
  defaultStations,
  eventData,
  signalDetectionsData
} from '@gms/common-model/__tests__/__data__';
import { Logger } from '@gms/common-util';
import type {
  AnalystWorkspaceTypes,
  ChannelSegmentFetchResult,
  EventsFetchResult,
  SignalDetectionFetchResult,
  UseQueryStateResult
} from '@gms/ui-state';
import { uiChannelSegmentRecord } from '@gms/ui-state/__tests__/__data__';
import cloneDeep from 'lodash/cloneDeep';
import uniq from 'lodash/uniq';

import type { AnalystCurrentFk } from '../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-rendering/fk-rendering';
import type { AzimuthSlownessProps } from '../../src/ts/components/analyst-ui/components/azimuth-slowness/types';

const logger = Logger.create('GMS_LOG_JEST', process.env.GMS_LOG_JEST);

// 11:59:59 05/19/2010
export const startTimeSeconds = 1274313599;

// 02:00:01 05/20/2010
export const endTimeSeconds = 1274320801;

// time block 2 hours = 7200 seconds
export const timeBlock = 7200;

export const timeInterval: CommonTypes.TimeRange = {
  startTimeSecs: startTimeSeconds,
  endTimeSecs: endTimeSeconds
};

export const currentProcStageIntId = '3';

export const analystCurrentFk: AnalystCurrentFk = {
  x: 10,
  y: 11
};

const sdIdsFullMap: string[] = signalDetectionsData.map(sd => sd.id);

export const signalDetectionsIds = uniq(sdIdsFullMap);
export const eventId = eventData.id;

export const selectedSignalDetectionID = signalDetectionsIds[0];
export const testMagTypes: AnalystWorkspaceTypes.DisplayedMagnitudeTypes = {};
testMagTypes[EventTypes.MagnitudeType.MB] = true;
testMagTypes[EventTypes.MagnitudeType.MB_MLE] = true;
testMagTypes[EventTypes.MagnitudeType.MS] = true;
testMagTypes[EventTypes.MagnitudeType.MS_MLE] = true;

export const useQueryStateResult: UseQueryStateResult<any> = {
  isError: false,
  isFetching: false,
  isLoading: false,
  isSuccess: true,
  isUninitialized: true,
  currentData: undefined,
  data: undefined,
  endpointName: undefined,
  error: undefined,
  fulfilledTimeStamp: undefined,
  originalArgs: undefined,
  requestId: undefined,
  startedTimeStamp: undefined,
  status: undefined
};
const processingAnalystConfigurationQuery = cloneDeep(useQueryStateResult);
processingAnalystConfigurationQuery.data = {
  defaultNetwork: 'demo',
  defaultInteractiveAnalysisStationGroup: 'ALL_1',
  defaultFilters: []
};
export const eventResults: EventsFetchResult = {
  fulfilled: 1,
  isError: true,
  isLoading: false,
  pending: 0,
  rejected: 0,
  data: [eventData]
};

const signalDetectionResults: SignalDetectionFetchResult = {
  fulfilled: 1,
  isError: true,
  isLoading: false,
  pending: 0,
  rejected: 0,
  data: signalDetectionsData
};

const channelSegmentResults: ChannelSegmentFetchResult = {
  fulfilled: 1,
  isError: true,
  isLoading: false,
  pending: 0,
  rejected: 0,
  data: uiChannelSegmentRecord
};

const stationsQuery = cloneDeep(useQueryStateResult);
stationsQuery.data = defaultStations;

const eventStatusQuery = cloneDeep(useQueryStateResult);
eventStatusQuery.data = {};

export const azSlowProps: Partial<AzimuthSlownessProps> = {
  location: undefined,
  viewableInterval: timeInterval,
  openEventId: eventData.id,
  sdIdsToShowFk: [],
  analysisMode: WorkflowTypes.AnalysisMode.EVENT_REVIEW,
  setSdIdsToShowFk: () => {
    logger.debug('azSlowProps - setSdIdsToShowFk');
  },
  selectedSortType: undefined,
  setMeasurementModeEntries: jest.fn(),
  unassociatedSDColor: ConfigurationTypes.defaultColorTheme.unassociatedSDColor,
  signalDetectionResults,
  channelSegmentResults,
  eventResults,
  eventStatusQuery,
  stationsQuery,
  processingAnalystConfigurationQuery,
  stageNames: [],
  openIntervalName: 'foo'
};
