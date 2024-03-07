import { QueryReturnValue } from '@reduxjs/toolkit/dist/query/baseQueryTypes';
import {
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/dist/query/react';
import { MaybePromise } from '@reduxjs/toolkit/dist/query/tsHelpers';

export type ProcessingStationGroupsDefinition = {
  name: string;
  description: string;
  stationNames: string[];
};
export type StationGroups = { stationGroupNames: string[] };

/**
 * Query to retrieve station groups
 *
 * @param baseQuery default query function
 * @returns StationGroups
 */
export const retrieveStationGroups = async (
  baseQuery: (
    arg: string | FetchArgs
  ) => MaybePromise<QueryReturnValue<StationGroups, FetchBaseQueryError, {}>>
): Promise<StationGroups> => {
  try {
    const result = await baseQuery({
      method: 'post',
      url: `/ui-processing-configuration-service/resolve`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: {
        configName: 'soh-control.station-group-names',
        selectors: [],
      },
    });

    if (!result.data) {
      throw new Error(JSON.stringify(result.error));
    }
    return result.data;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
