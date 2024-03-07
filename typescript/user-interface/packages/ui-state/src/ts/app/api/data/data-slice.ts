import type { EventTypes, SignalDetectionTypes } from '@gms/common-model';
import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import type { Channel } from '@gms/common-model/lib/station-definitions/channel-definitions/channel-definitions';
import { UILogger } from '@gms/ui-util';
import { isDesigned } from '@gms/ui-wasm';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { UiChannelSegment } from '../../../types';
import { clearWaveforms } from '../../../workers/api/clear-waveforms';
import { addGetChannelsByNamesReducers } from './channel/get-channels-by-names-timerange';
import { addFindEventsByAssociatedSignalDetectionHypothesesReducers } from './event/find-events-by-assoc-sd-hypotheses';
import { addGetEventsWithDetectionsAndSegmentsByTimeReducers } from './event/get-events-detections-segments-by-time';
import { addGetFilterDefinitionsForSignalDetectionHypothesesReducers } from './signal-detection/get-filter-definitions-for-signal-detection-hypotheses';
import { addGetFilterDefinitionsForSignalDetectionsReducers } from './signal-detection/get-filter-definitions-for-signal-detections';
import { addGetSignalDetectionsWithSegmentsByStationAndTimeReducers } from './signal-detection/get-signal-detections-segments-by-station-time';
import { addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers } from './signal-enhancement/get-filter-definitions-for-channel-segments';
import type { DataState } from './types';
import { addFindQCSegmentsByChannelAndTimeRangeReducers } from './waveform/find-qc-segments-by-channel-and-time-range';
import { addGetChannelSegmentsByChannelReducers } from './waveform/get-channel-segments-by-channel';
import { mutateUiChannelSegmentsRecord } from './waveform/mutate-channel-segment-record';

const logger = UILogger.create('DATA_SLICE', process.env.DATA_SLICE);

/**
 * The initial state for the data state.
 * This is the starting state for the {@link dataSlice}
 */
export const dataInitialState: DataState = {
  uiChannelSegments: {},
  signalDetections: {},
  events: {},
  associatedEvents: {},
  filterDefinitions: {},
  filterDefinitionsForSignalDetections: {},
  filterDefinitionsForSignalDetectionHypothesesEventOpen: {},
  filterDefinitionsForSignalDetectionHypotheses: {},
  missingSignalDetectionsHypothesesForFilterDefinitions: [],
  // RAW channel segments only keyed on createChannelSegmentString(id)
  defaultFilterDefinitionByUsageForChannelSegments: {},
  defaultFilterDefinitionByUsageForChannelSegmentsEventOpen: {},
  channels: {
    raw: {},
    derived: {}
  },
  qcSegments: {},
  queries: {
    getFilterDefinitionsForSignalDetectionHypotheses: {},
    getSignalDetectionWithSegmentsByStationAndTime: {},
    getChannelSegmentsByChannel: {},
    findQCSegmentsByChannelAndTimeRange: {},
    getEventsWithDetectionsAndSegmentsByTime: {},
    findEventsByAssociatedSignalDetectionHypotheses: {},
    getChannelsByNamesTimeRange: {}, // don't blow this away on clearAll() call
    getFilterDefinitionsForSignalDetections: {},
    getDefaultFilterDefinitionByUsageForChannelSegments: {}
  }
};

/**
 * Defines a Redux slice that contains various data that is fetched using async thunk requests.
 */
export const dataSlice = createSlice({
  name: 'data',
  initialState: dataInitialState,
  reducers: {
    /**
     * Add channel segments to the state.
     */
    addChannelSegments(
      state,
      action: PayloadAction<
        {
          name: string;
          channelSegments: UiChannelSegment[];
        }[]
      >
    ) {
      action.payload.forEach(entry => {
        mutateUiChannelSegmentsRecord(state.uiChannelSegments, entry.name, entry.channelSegments);
      });
    },

    /**
     * Adds raw channels
     */
    addRawChannels(state, action: PayloadAction<Channel[]>) {
      action.payload.forEach(channel => {
        state.channels.raw[channel.name] = channel;
      });
    },

    /**
     * Adds derived channels
     */
    addDerivedChannels(state, action: PayloadAction<Channel[]>) {
      action.payload.forEach(channel => {
        state.channels.derived[channel.name] = channel;
      });
    },

    /**
     * Clears the channel segments and channel segment request history from the state.
     */
    clearChannelSegmentsAndHistory(state) {
      state.queries.getChannelSegmentsByChannel = {};
      state.uiChannelSegments = {};
      clearWaveforms().catch(e => {
        logger.error(`Failed to clear out waveform cache`, e);
      });
    },

    /**
     * Add events to the state.
     */
    addEvents(state, action: PayloadAction<EventTypes.Event[]>) {
      action.payload.forEach(event => {
        state.events[event.id] = event;
      });
    },

    /**
     * Clears the events and event request history from the state.
     */
    clearEventsAndHistory(state) {
      state.queries.getEventsWithDetectionsAndSegmentsByTime = {};
      state.events = {};
    },

    /**
     * Add signal detections to the state.
     */
    addSignalDetections(state, action: PayloadAction<SignalDetectionTypes.SignalDetection[]>) {
      action.payload.forEach(sd => {
        state.signalDetections[sd.id] = sd;
      });
    },

    /**
     * Clears the signal detections and signal detection request history from the state.
     */
    clearSignalDetectionsAndHistory(state) {
      state.queries.getSignalDetectionWithSegmentsByStationAndTime = {};
      state.signalDetections = {};
    },

    /**
     * Adds (designed) filter definitions to the Redux state store
     */
    addDesignedFilterDefinitions: (state, action: PayloadAction<FilterDefinition[]>) => {
      action.payload.forEach(fd => {
        const { name } = fd;
        if (name != null) {
          const { sampleRateHz } = fd.filterDescription.parameters || { sampleRateHz: null };
          if (sampleRateHz != null) {
            if (isDesigned(fd, sampleRateHz)) {
              if (state.filterDefinitions[name] == null) {
                state.filterDefinitions[name] = {};
              }
              // save as `[name][sample-rate]`
              state.filterDefinitions[name][sampleRateHz] = fd;
            } else {
              logger.error('Failed to add filter definition to state store; must be designed', fd);
            }
          } else {
            logger.error(
              'Failed to add filter definition to state store; sample rate must be defined',
              fd
            );
          }
        } else {
          logger.error(
            'Failed to add filter definition to state store; unique name must be defined',
            fd
          );
        }
      });
    },

    /**
     * clears all data and history from the state
     */
    clearAll(state) {
      state.signalDetections = {};
      state.filterDefinitionsForSignalDetectionHypothesesEventOpen = {};
      state.filterDefinitionsForSignalDetectionHypotheses = {};
      state.events = {};
      state.uiChannelSegments = {};
      state.signalDetections = {};
      state.filterDefinitions = {};
      state.filterDefinitionsForSignalDetections = {};
      // RAW channel segments only
      state.defaultFilterDefinitionByUsageForChannelSegments = {};
      state.defaultFilterDefinitionByUsageForChannelSegmentsEventOpen = {};
      state.channels = {
        raw: {},
        derived: {}
      };
      state.queries.getFilterDefinitionsForSignalDetectionHypotheses = {};
      state.queries.getSignalDetectionWithSegmentsByStationAndTime = {};
      state.queries.getEventsWithDetectionsAndSegmentsByTime = {};
      state.queries.getFilterDefinitionsForSignalDetections = {};
      state.queries.getChannelSegmentsByChannel = {};
      clearWaveforms().catch(e => {
        logger.error(`Failed to clear out waveform cache`, e);
      });
    }
  },

  extraReducers: builder => {
    // add any extra reducers at the data slice level
    addGetChannelSegmentsByChannelReducers(builder);
    addFindQCSegmentsByChannelAndTimeRangeReducers(builder);
    addGetEventsWithDetectionsAndSegmentsByTimeReducers(builder);
    addGetSignalDetectionsWithSegmentsByStationAndTimeReducers(builder);
    addFindEventsByAssociatedSignalDetectionHypothesesReducers(builder);
    addGetChannelsByNamesReducers(builder);
    addGetFilterDefinitionsForSignalDetectionsReducers(builder);
    addGetFilterDefinitionsForSignalDetectionHypothesesReducers(builder);
    addGetDefaultFilterDefinitionByUsageForChannelSegmentsReducers(builder);
  }
});
