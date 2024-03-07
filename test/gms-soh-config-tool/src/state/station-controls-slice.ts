import { createSlice } from '@reduxjs/toolkit';
import { DataNames } from '../coi-types/data-names';
import { MonitorTypeConfig } from '../coi-types/monitor-types';
import { ThresholdParams } from '../output/build-configuration-option';
import { StationsConfig } from '../routes/Station';

export type StationGroup = { name: string; included: boolean };
export type UserInputError = { hasError: boolean; reason: string };
export type ErrorRecord = {
  id: string;
  hasError: boolean;
  reason: string;
  type: string;
};

export enum RollupType {
  ROLLUP_OF_ROLLUPS = 'ROLLUP_OF_ROLLUPS',
  ROLLUP_OF_CHANNELS = 'ROLLUP_OF_CHANNELS',
  ROLLUP_OF_MONITORS = 'ROLLUP_OF_MONITORS',
  ROLLUP_OF_STATIONS = 'ROLLUP_OF_STATIONS',
}

export enum OperatorType {
  BEST_OF = 'BEST_OF',
  WORST_OF = 'WORST_OF',
  MIN_GOOD_OF = 'MIN_GOOD_OF',
}
export interface RollupEntry {
  id: string;
  rollupType: RollupType;
  operatorType: OperatorType;
  rollups?: RollupEntry[];
  threshold?: ThresholdParams;
  channels?: string[];
  monitors?: string[];
  stations?: string[];
}

export interface StationEnvironmental {
  envMonitorTypes: string[];
  included: boolean;
}

const resetInitialLoadingState = (
  reSyncConfig: boolean
): Record<string, boolean> => {
  const initialLoadingState: Record<string, boolean> = {};
  initialLoadingState[DataNames.STATIONS_IN_GROUPS] = false;
  initialLoadingState[DataNames.STATION_CAPABILITY_ROLLUP] = false;
  initialLoadingState[DataNames.STATION_GROUP_CAPABILITY_ROLLUP] = false;
  initialLoadingState[DataNames.MONITOR_THRESHOLDS] = false;
  initialLoadingState[DataNames.CHANNEL_CAPABILITY_ROLLUP] = false;
  initialLoadingState[DataNames.STATION_GROUPS] = false;
  initialLoadingState[DataNames.STATION_ENV_MONITOR_TYPES] = false;

  if (reSyncConfig) {
    initialLoadingState[DataNames.SYNC_DEPLOYMENT_WITH_PROCESSING] = false;
  } else {
    initialLoadingState[DataNames.SYNC_DEPLOYMENT_WITH_PROCESSING] = true;
  }

  return initialLoadingState;
};
export interface StationControlsState {
  /** The station currently being edited */
  stationName: string | null;

  /** Record mapping station names to a list of included channel names */
  selectedChannels: Record<string, string[]>;

  /** Record mapping station config settings */
  stationsConfig: StationsConfig;

  /** Record mapping station names to a list of monitor types for roll up */
  monitorTypesForRollup: Record<string, MonitorTypeConfig[]>;

  /** Record mapping stations to its calculation interval */
  calculationInterval: Record<string, string>;

  /** Record mapping stations to its back off duration  */
  backOffDuration: Record<string, string>;

  /** Record mapping stations to its station groups*/
  stationGroups: Record<string, StationGroup[]>;

  /** String of all station groups in desired order  */
  allGroupNames: string[];

  /** Record mapping which stations are included for each group */
  groupsWithIncludedStations: Record<string, string[]>;

  /** Record mapping stations to its station env monitor types */
  stationEnvironmental: Record<string, StationEnvironmental>;

  /** Records if the station tab has caused an error for station group capabilities */
  hasStationUpdateCausedStationGroupCapabilityError: Record<string, boolean>;

  /** Determines if config has user inputs that puts tool in error state */
  error: Record<string, UserInputError>;

  /** Record mapping station capability rollup per group*/
  stationCapabilityRollup: Record<string, Record<string, RollupEntry>>;

  /** Record mapping station group capability rollup per group*/
  stationGroupCapabilityRollup: Record<string, RollupEntry>;

  /** Record of records for each station group and each of the channels for the station*/
  channelCapabilityRollup: Record<
    string,
    Record<string, Record<string, RollupEntry>>
  >;

  /** Keeps track of what query data has been loaded */
  loadedData: Record<string, boolean>;
}

export const stationControlsSlice = createSlice({
  name: 'stationControls',
  initialState: {
    stationName: null,
    selectedChannels: {},
    stationsConfig: {},
    monitorTypesForRollup: {},
    backOffDuration: {},
    calculationInterval: {},
    stationGroups: {},
    groupsWithIncludedStations: {},
    stationEnvironmental: {},
    hasStationUpdateCausedStationGroupCapabilityError: {},
    error: {},
    stationGroupCapabilityRollup: {},
    stationCapabilityRollup: {},
    channelCapabilityRollup: {},
    loadedData: resetInitialLoadingState(true),
  } as StationControlsState,
  reducers: {
    setStationName(state, action) {
      state.stationName = action.payload;
    },
    setChannelNames(state, action) {
      state.selectedChannels[action.payload.stationName] =
        action.payload.channelNames;
    },
    setStationControls(_state, action) {
      return action.payload;
    },
    setMonitorTypeForRollup(state, action) {
      state.monitorTypesForRollup[action.payload.stationName] =
        action.payload.monitorTypesForRollup;
    },
    setBackOffDuration(state, action) {
      state.backOffDuration[action.payload.stationName] =
        action.payload.backOffDuration;
    },
    setCalculationInterval(state, action) {
      state.calculationInterval[action.payload.stationName] =
        action.payload.calculationInterval;
    },
    setStationGroups(state, action) {
      state.stationGroups[action.payload.stationName] =
        action.payload.stationGroups;
    },
    setAllGroupNames(state, action) {
      state.allGroupNames = action.payload.allGroupNames;
    },
    setGroupsWithIncludedStations(state, action) {
      state.groupsWithIncludedStations =
        action.payload.groupsWithIncludedStationsRecord;
    },
    setStationEnvMonitorTypes(state, action) {
      if (
        state.stationEnvironmental[action.payload.stationName] === undefined
      ) {
        state.stationEnvironmental[action.payload.stationName] = {
          envMonitorTypes: [],
          included: false,
        };
      }
      state.stationEnvironmental[action.payload.stationName].envMonitorTypes =
        action.payload.envMonitorTypes;
      state.stationEnvironmental[action.payload.stationName].included =
        action.payload.included;
    },
    setHasStationUpdateCausedStationGroupCapabilityError(state, action) {
      state.hasStationUpdateCausedStationGroupCapabilityError[
        action.payload.groupName
      ] = action.payload.hasError;
    },
    setHasError(state, action) {
      state.error[action.payload.attributeName] = action.payload.errorInfo;
    },
    clearStationErrors(state) {
      state.error = {};
    },
    setStationCapabilityRollup(state, action) {
      if (
        state.stationCapabilityRollup[action.payload.stationName] === undefined
      ) {
        state.stationCapabilityRollup[action.payload.stationName] = {};
      }
      state.stationCapabilityRollup[action.payload.stationName][
        action.payload.groupName
      ] = action.payload.rollup;
    },
    setStationGroupCapabilityRollup(state, action) {
      state.stationGroupCapabilityRollup[action.payload.groupName] =
        action.payload.rollup;
    },
    setStationGroupCapabilityRollupRecord(state, action) {
      state.stationGroupCapabilityRollup =
        action.payload.updatedStationGroupCapabilityRollup;
    },
    setChannelCapabilityRollup(state, action) {
      if (
        state.channelCapabilityRollup[action.payload.stationName] === undefined
      ) {
        state.channelCapabilityRollup[action.payload.stationName] = {};
      }
      if (
        state.channelCapabilityRollup[action.payload.stationName][
          action.payload.groupName
        ] === undefined
      ) {
        state.channelCapabilityRollup[action.payload.stationName][
          action.payload.groupName
        ] = {};
      }
      state.channelCapabilityRollup[action.payload.stationName][
        action.payload.groupName
      ][action.payload.channelName] = action.payload.rollup;
    },
    setLoadedData(state, action) {
      state.loadedData[action.payload.dataName] = action.payload.hasLoaded;
    },
    resetLoadedData(state, action) {
      state.loadedData = resetInitialLoadingState(action.payload.reSyncConfig);
    },
  },
});

export const {
  setStationName,
  setChannelNames,
  setStationControls,
  setMonitorTypeForRollup,
  setBackOffDuration,
  setCalculationInterval,
  setAllGroupNames,
  setStationGroups,
  setGroupsWithIncludedStations,
  setStationEnvMonitorTypes,
  setHasStationUpdateCausedStationGroupCapabilityError,
  setHasError,
  clearStationErrors,
  setStationGroupCapabilityRollup,
  setStationGroupCapabilityRollupRecord,
  setStationCapabilityRollup,
  setChannelCapabilityRollup,
  setLoadedData,
  resetLoadedData,
} = stationControlsSlice.actions;
