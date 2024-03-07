import { QueryReturnValue } from '@reduxjs/toolkit/dist/query/baseQueryTypes';
import {
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/dist/query/react';
import { MaybePromise } from '@reduxjs/toolkit/dist/query/tsHelpers';
import uniqueId from 'lodash/uniqueId';
import { ProcessingStationGroups } from '../coi-types/processing-types';
import { getChannels } from '../renderers/channel-checklist/ChannelChecklist';
import {
  OperatorType,
  RollupEntry,
  RollupType,
} from './station-controls-slice';

export interface RetrieveStationCapabilityQueryProps {
  stationName: string;
  groupNames: string[];
  channelNames: string[];
}

export interface RetrieveAllStationCapabilitiesForGroupQueryProps {
  stationNames: string[];
  groupName: string;
  processingStationGroups: ProcessingStationGroups;
}

/**
 * Type of data returned from query after being processed for station capability
 */
export interface StationCapability {
  stationName: string;
  groupName: string;
  defaultRollup: RollupEntry;
}

export type RollupOperatorOperands = {
  operatorType: OperatorType;
  stationOperands?: string[];
  channelOperands?: string[];
  sohMonitorTypeOperands?: string[];
  goodThreshold?: number;
  marginalThreshold?: number;
  rollupOperatorOperands?: RollupOperatorOperands[];
};

export type StationCapabilityQueryResults = {
  channelsToStationRollupOperator: {
    operatorType: OperatorType;
    goodThreshold?: number;
    marginalThreshold?: number;
    rollupOperatorOperands?: RollupOperatorOperands[];
    channelOperands?: string[];
  };
};

const convertQueryEntryToRollup = (
  rollupOperatorOperands: RollupOperatorOperands,
  channelNames: string[]
): RollupEntry => {
  let channels = rollupOperatorOperands.channelOperands;
  if (
    !rollupOperatorOperands.channelOperands ||
    rollupOperatorOperands.channelOperands.length === 0
  ) {
    channels = channelNames;
  }
  return {
    id: uniqueId(),
    rollupType: rollupOperatorOperands.rollupOperatorOperands
      ? RollupType.ROLLUP_OF_ROLLUPS
      : RollupType.ROLLUP_OF_CHANNELS,
    operatorType: rollupOperatorOperands.operatorType,
    rollups: rollupOperatorOperands.rollupOperatorOperands
      ? rollupOperatorOperands.rollupOperatorOperands.map(
          (rollupOperatorOperand) =>
            convertQueryEntryToRollup(rollupOperatorOperand, channelNames)
        )
      : undefined,
    threshold: {
      goodThreshold: rollupOperatorOperands.goodThreshold ?? 1,
      marginalThreshold: rollupOperatorOperands.marginalThreshold ?? 0,
    },
    channels: channels,
  };
};

const convertQueryDataToRollup = (
  queryData: StationCapabilityQueryResults,
  channelNames: string[]
): RollupEntry => {
  return {
    id: `default ${uniqueId()}`,
    rollupType: queryData.channelsToStationRollupOperator.rollupOperatorOperands
      ? RollupType.ROLLUP_OF_ROLLUPS
      : RollupType.ROLLUP_OF_CHANNELS,
    operatorType: queryData.channelsToStationRollupOperator.operatorType,
    rollups: queryData.channelsToStationRollupOperator.rollupOperatorOperands
      ? queryData.channelsToStationRollupOperator.rollupOperatorOperands.map(
          (rollupOperatorOperand) =>
            convertQueryEntryToRollup(rollupOperatorOperand, channelNames)
        )
      : undefined,
    threshold: {
      goodThreshold:
        queryData.channelsToStationRollupOperator.goodThreshold ?? 1,
      marginalThreshold:
        queryData.channelsToStationRollupOperator.marginalThreshold ?? 0,
    },
    channels: channelNames,
  };
};

/**
 * Function that returns an array of promises where each promise is a query to the config service
 * to get the station capability info
 *
 * @param stationName name of the station
 * @param stationGroups list of groups to get data for
 * @param baseQuery base query function from rtk
 * @returns array of promises object for station capability
 */
export const retrieveStationCapability = async (
  stationName: string,
  stationGroups: string[],
  channelNames: string[],
  baseQuery: (
    arg: string | FetchArgs
  ) => MaybePromise<
    QueryReturnValue<StationCapabilityQueryResults, FetchBaseQueryError, {}>
  >
): Promise<StationCapability[]> => {
  try {
    return await Promise.all<StationCapability>(
      stationGroups.map(async (stationGroup) => {
        const result = await baseQuery({
          method: 'post',
          url: `/ui-processing-configuration-service/resolve`,
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: {
            configName: 'soh-control.station-capability-rollup',
            selectors: [
              {
                criterion: 'StationGroupName',
                value: stationGroup,
              },
              {
                criterion: 'StationName',
                value: stationName,
              },
            ],
          },
        });

        if (!result.data) {
          throw new Error(JSON.stringify(result.error));
        }

        return {
          stationName: stationName,
          groupName: stationGroup,
          defaultRollup: convertQueryDataToRollup(result.data, channelNames),
        };
      })
    );
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/**
 * Function that returns an array of promises where each promise is a query to the config service
 * to get all station capabilities for a single group
 *
 * @param stationNames name of the stations in group
 * @param stationGroup group to get capabilities for
 * @param baseQuery base query function from rtk
 * @returns array of promises object for station capability
 */
export const retrieveAllStationCapabilitiesForGroup = async (
  stationNames: string[],
  stationGroup: string,
  processingStationGroups: ProcessingStationGroups,
  baseQuery: (
    arg: string | FetchArgs
  ) => MaybePromise<
    QueryReturnValue<StationCapabilityQueryResults, FetchBaseQueryError, {}>
  >
): Promise<StationCapability[]> => {
  try {
    return await Promise.all<StationCapability>(
      stationNames.map(async (stationName) => {
        const allChannelNames = getChannels(
          stationName,
          processingStationGroups
        ).map((channel) => channel.name);
        const result = await baseQuery({
          method: 'post',
          url: `/ui-processing-configuration-service/resolve`,
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: {
            configName: 'soh-control.station-capability-rollup',
            selectors: [
              {
                criterion: 'StationGroupName',
                value: stationGroup,
              },
              {
                criterion: 'StationName',
                value: stationName,
              },
            ],
          },
        });

        if (!result.data) {
          throw new Error(JSON.stringify(result.error));
        }

        return {
          stationName: stationName,
          groupName: stationGroup,
          defaultRollup: convertQueryDataToRollup(result.data, allChannelNames),
        };
      })
    );
  } catch (e) {
    console.error(e);
    throw e;
  }
};
