import { QueryReturnValue } from '@reduxjs/toolkit/dist/query/baseQueryTypes';
import {
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/dist/query/react';
import { MaybePromise } from '@reduxjs/toolkit/dist/query/tsHelpers';

export type StationEnvMonitorTypes = {
  stationName: string;
  envMonitorTypes: string[];
};

export interface RetrieveStationEnvMonitorTypesQueryProps {
  stationName: string;
}

export interface RetrieveStationEnvMonitorTypesQueryResults {
  envMonitorTypes: string[];
}

/**
 * Query to retrieve included env monitors for station
 *
 * @param stationName name of the station
 * @param baseQuery default query function
 * @returns string[] of env monitor types
 */
export const retrieveStationEnvMonitorTypes = async (
  stationName: string,
  baseQuery: (
    arg: string | FetchArgs
  ) => MaybePromise<
    QueryReturnValue<
      RetrieveStationEnvMonitorTypesQueryResults,
      FetchBaseQueryError,
      {}
    >
  >
): Promise<StationEnvMonitorTypes> => {
  try {
    const result = await baseQuery({
      method: 'post',
      url: `/ui-processing-configuration-service/resolve`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: {
        configName: 'soh-control.station-env-monitor-types',
        selectors: [
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
    return { stationName, envMonitorTypes: result.data.envMonitorTypes };
  } catch (e) {
    console.error(e);
    throw e;
  }
};
