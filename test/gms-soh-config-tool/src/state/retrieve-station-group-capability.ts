import { QueryReturnValue } from '@reduxjs/toolkit/dist/query/baseQueryTypes';
import {
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/dist/query/react';
import { MaybePromise } from '@reduxjs/toolkit/dist/query/tsHelpers';
import uniqueId from 'lodash/uniqueId';
import { stationGroupCapabilityRollupConfigName } from '../coi-types';
import { windowAPI } from '../electron-util';
import { ALL_STATION_GROUP_NAME } from '../renderers/station-groups-checklist/util';
import {
  OperatorType,
  RollupEntry,
  RollupType,
} from './station-controls-slice';

export interface RetrieveStationGroupCapabilityQueryProps {
  groupNames: string[];
  allStationNames: string[];
}

/**
 * Type of data returned from query after being processed for station group capability
 */
export interface StationGroupCapability {
  groupName: string;
  defaultRollup: RollupEntry;
}

export type RollupOperatorOperands = {
  operatorType: OperatorType;
  stationOperands?: string[];
  sohMonitorTypeOperands?: string[];
  goodThreshold?: number;
  marginalThreshold?: number;
  rollupOperatorOperands?: RollupOperatorOperands[];
};

export type StationGroupCapabilityQueryResults = {
  stationsToGroupRollupOperator: {
    operatorType: OperatorType;
    goodThreshold?: number;
    marginalThreshold?: number;
    rollupOperatorOperands?: RollupOperatorOperands[];
    stationOperands?: string[];
  };
};

const convertQueryEntryToRollup = (
  rollupOperatorOperands: RollupOperatorOperands,
  stationNames: string[]
): RollupEntry => {
  let stations = rollupOperatorOperands.stationOperands;
  if (
    !rollupOperatorOperands.stationOperands ||
    rollupOperatorOperands.stationOperands.length === 0
  ) {
    stations = stationNames;
  }
  return {
    id: uniqueId(),
    rollupType: rollupOperatorOperands.rollupOperatorOperands
      ? RollupType.ROLLUP_OF_ROLLUPS
      : RollupType.ROLLUP_OF_STATIONS,
    operatorType: rollupOperatorOperands.operatorType,
    rollups: rollupOperatorOperands.rollupOperatorOperands
      ? rollupOperatorOperands.rollupOperatorOperands.map(
          (rollupOperatorOperand) =>
            convertQueryEntryToRollup(rollupOperatorOperand, stationNames)
        )
      : undefined,
    threshold: {
      goodThreshold: rollupOperatorOperands.goodThreshold ?? 1,
      marginalThreshold: rollupOperatorOperands.marginalThreshold ?? 0,
    },
    stations: stations,
  };
};

export const convertStationGroupCapabilityQueryDataToRollup = (
  queryData: StationGroupCapabilityQueryResults,
  stationNames: string[]
): RollupEntry => {
  return {
    id: `default ${uniqueId()}`,
    rollupType: queryData.stationsToGroupRollupOperator.rollupOperatorOperands
      ? RollupType.ROLLUP_OF_ROLLUPS
      : RollupType.ROLLUP_OF_STATIONS,
    operatorType: queryData.stationsToGroupRollupOperator.operatorType,
    rollups: queryData.stationsToGroupRollupOperator.rollupOperatorOperands
      ? queryData.stationsToGroupRollupOperator.rollupOperatorOperands.map(
          (rollupOperatorOperand) =>
            convertQueryEntryToRollup(rollupOperatorOperand, stationNames)
        )
      : undefined,
    threshold: {
      goodThreshold: queryData.stationsToGroupRollupOperator.goodThreshold ?? 1,
      marginalThreshold:
        queryData.stationsToGroupRollupOperator.marginalThreshold ?? 0,
    },
    stations:
      queryData.stationsToGroupRollupOperator.stationOperands ?? stationNames,
  };
};

/**
 * Function that returns an array of promises where each promise is a query to the config service
 * to get the station group capability info
 *
 * @param stationGroups groups to get data for
 * @param allStationNames list of all the station names
 * @param baseQuery base query function from rtk
 * @returns array of promises object for station group capability
 */
export const retrieveStationGroupCapability = async (
  stationGroups: string[],
  allStationNames: string[], // needed for ALL group as it's a special case
  baseQuery: (
    arg: string | FetchArgs
  ) => MaybePromise<
    QueryReturnValue<
      StationGroupCapabilityQueryResults,
      FetchBaseQueryError,
      {}
    >
  >
): Promise<StationGroupCapability[]> => {
  try {
    const processingStationGroupDefinitionFromDisk =
      (await windowAPI.electronAPI.loadFile(
        `${windowAPI.electronAPI.defaultPaths.processingStationGroupDefinitionFilePath}`
      )) as [{ name: string; stationNames: string[] }];
    const groupsWithStations: Record<string, string[]> = {};
    stationGroups.forEach((groupName) => {
      const group = processingStationGroupDefinitionFromDisk.find(
        (g) => g.name === groupName
      );
      if (group && group.stationNames) {
        groupsWithStations[groupName] = group.stationNames;
      }
    });
    // ALL is a special case and is not in processingStationGroupDefinition
    // So adding manually
    groupsWithStations[ALL_STATION_GROUP_NAME] = allStationNames;
    return await Promise.all<StationGroupCapability>(
      stationGroups.map(async (stationGroup) => {
        const result = await baseQuery({
          method: 'post',
          url: `/ui-processing-configuration-service/resolve`,
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: {
            configName: stationGroupCapabilityRollupConfigName,
            selectors: [
              {
                criterion: 'StationGroupName',
                value: stationGroup,
              },
            ],
          },
        });

        if (!result.data) {
          throw new Error(JSON.stringify(result.error));
        }

        return {
          groupName: stationGroup,
          defaultRollup: convertStationGroupCapabilityQueryDataToRollup(
            result.data,
            groupsWithStations[stationGroup]
          ),
        };
      })
    );
  } catch (e) {
    console.error(e);
    throw e;
  }
};
