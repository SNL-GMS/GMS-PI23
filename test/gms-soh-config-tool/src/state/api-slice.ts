import { QueryReturnValue } from '@reduxjs/toolkit/dist/query/baseQueryTypes';
import {
  FetchArgs,
  FetchBaseQueryArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/dist/query/fetchBaseQuery';
import {
  BaseQueryFn,
  createApi,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query/react';
import type { AppState } from './store';
import {
  MonitorTypesWithThresholds,
  retrieveThresholdsForMonitorsInStation,
} from './retrieve-thresholds-for-monitors-in-station';
import {
  ChannelWithThresholds,
  retrieveThresholdsForChannelForMonitorInStation,
} from './retrieve-thresholds-for-channels-for-monitor-in-station';
import {
  ChannelsByMonitorType,
  retrieveChannelsByMonitorType,
  RetrieveChannelsByMonitorTypeQueryProps,
} from './retrieve-channels-by-monitor-type';
import {
  retrieveStationGroups,
  StationGroups,
} from './retrieve-station-groups';
import {
  ChannelsPerMonitorForStationParams,
  ThresholdParams,
  TimeWindowParams,
} from '../output/build-configuration-option';
import {
  RetrieveStationCapabilityQueryProps,
  retrieveStationCapability,
  StationCapability,
  retrieveAllStationCapabilitiesForGroup,
  RetrieveAllStationCapabilitiesForGroupQueryProps,
} from './retrieve-station-capability';
import {
  ChannelCapabilityRollup,
  retrieveChannelCapabilityRollup,
  RetrieveChannelCapabilityRollupQueryProps,
} from './retrieve-channel-capability-rollups';
import {
  retrieveStationEnvMonitorTypes,
  RetrieveStationEnvMonitorTypesQueryProps,
  StationEnvMonitorTypes,
} from './retrieve-station-env-monitor-types';
import {
  retrieveStationGroupCapability,
  RetrieveStationGroupCapabilityQueryProps,
  StationGroupCapability,
} from './retrieve-station-group-capability';

const baseRequestConfig: FetchBaseQueryArgs = {
  mode: 'no-cors',
  method: 'POST',
  redirect: 'follow',
};

export type OperatorConfig = {
  type: string;
  negated: boolean;
};

export type ConfigConstraints = {
  constraintType: string;
  criterion: string;
  operator: OperatorConfig;
  value: string[];
};

export type TimeWindowsConfig = {
  name: string;
  constraints: ConfigConstraints[];
  parameters: TimeWindowParams;
};

export type MonitorsForRollupStationConfig = {
  name: string;
  constraints: ConfigConstraints[];
  parameters: { sohMonitorTypesForRollup: string[] };
};

export type ChannelsPerMonitorForStationConfig = {
  name: string;
  constraints: ConfigConstraints[];
  parameters: ChannelsPerMonitorForStationParams;
};

export type DefaultThresholdsForStation = {
  monitors: Record<string, ThresholdParams>;
  channels: Record<string, Record<string, ThresholdParams>>;
};

export interface ResolveStationConfigArgs {
  stationName: string;
  /**
   * This should be the same as the name of the directory where the config files would be found
   */
  configName: string;
}

export interface RetrieveThresholdsForMonitorsInStationQueryProps {
  stationName: string;
  monitorTypes: string[];
}

export interface RetrieveThresholdsForChannelsForMonitorTypeInStationQueryProps {
  stationName: string;
  monitorType: string;
  channelNames: string[];
}

const dynamicBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args: any, WebApi: any, extraOptions: any) => {
  const baseUrl = (WebApi.getState() as AppState)['app-settings'].serviceURL;
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
  });
  const customExtraOptions = { ...extraOptions, timeout: 180000 };
  return rawBaseQuery(args, WebApi, customExtraOptions);
};

export const configApi = createApi({
  reducerPath: 'configApi',
  baseQuery: dynamicBaseQuery,
  endpoints(build) {
    return {
      updateConfig: build.mutation<void, Record<string, any>>({
        query: (data) => ({
          ...baseRequestConfig,
          url: '/frameworks-configuration-service/processing-cfg/put',
          body: data,
        }),
      }),
      putConfig: build.query<void, Record<string, any>>({
        query: (data) => ({
          ...baseRequestConfig,
          url: '/frameworks-configuration-service/processing-cfg/put',
          body: data,
        }),
      }),
      refreshUiConfig: build.mutation<void, void>({
        query: () => ({
          ...baseRequestConfig,
          url: '/ui-processing-configuration-service/update',
          body: {},
        }),
      }),
      isAliveQuery: build.query<boolean, string>({
        queryFn: async (url: string, WebApi: any, _extraOptions: any) => {
          const response: Response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
              'Content-Type': 'text/plain',
              Accept: '*/*',
            },
          }).catch((reason) => {
            console.error(reason);
            return reason;
          });
          const isAlive = response.ok;
          const returnVal: QueryReturnValue<boolean> = {
            data: isAlive,
          };
          return returnVal;
        },
      }),
      resolveStationConfig: build.query<any, ResolveStationConfigArgs>({
        query: ({ stationName, configName }) => {
          return {
            url: '/ui-processing-configuration-service/resolve',
            method: 'POST',
            body: {
              configName: configName,
              selectors: [
                {
                  criterion: 'StationName',
                  value: stationName,
                },
              ],
            },
          };
        },
      }),
      resolveThresholdsForMonitorsInStation: build.query<
        MonitorTypesWithThresholds[],
        RetrieveThresholdsForMonitorsInStationQueryProps
      >({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveThresholdsForMonitorsInStation(
            arg.stationName,
            arg.monitorTypes,
            baseQuery as unknown as any
          );

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
      resolveStationGroupCapability: build.query<
        StationGroupCapability[],
        RetrieveStationGroupCapabilityQueryProps
      >({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveStationGroupCapability(
            arg.groupNames,
            arg.allStationNames,
            baseQuery as unknown as any
          );

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
      resolveStationCapability: build.query<
        StationCapability[],
        RetrieveStationCapabilityQueryProps
      >({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveStationCapability(
            arg.stationName,
            arg.groupNames,
            arg.channelNames,
            baseQuery as unknown as any
          );

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
      resolveAllStationCapabilitiesForGroup: build.query<
        StationCapability[],
        RetrieveAllStationCapabilitiesForGroupQueryProps
      >({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveAllStationCapabilitiesForGroup(
            arg.stationNames,
            arg.groupName,
            arg.processingStationGroups,
            baseQuery as unknown as any
          );

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
      resolveChannelCapabilityRollup: build.query<
        ChannelCapabilityRollup[],
        RetrieveChannelCapabilityRollupQueryProps
      >({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveChannelCapabilityRollup(
            arg.stationName,
            arg.groupNames,
            arg.channelNames,
            arg.allMonitorNames,
            baseQuery as unknown as any
          );

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
      resolveThresholdsForChannelsForMonitorInStation: build.query<
        ChannelWithThresholds[],
        RetrieveThresholdsForChannelsForMonitorTypeInStationQueryProps
      >({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveThresholdsForChannelForMonitorInStation(
            arg.stationName,
            arg.monitorType,
            arg.channelNames,
            baseQuery as unknown as any
          );

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
      resolveChannelsByMonitorType: build.query<
        ChannelsByMonitorType,
        RetrieveChannelsByMonitorTypeQueryProps
      >({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveChannelsByMonitorType(
            arg.stationName,
            baseQuery as unknown as any
          );

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
      resolveStationEnvMonitorTypes: build.query<
        StationEnvMonitorTypes,
        RetrieveStationEnvMonitorTypesQueryProps
      >({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveStationEnvMonitorTypes(
            arg.stationName,
            baseQuery as unknown as any
          );

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
      resolveStationGroups: build.query<StationGroups, {}>({
        queryFn: async (arg, api, extraOptions, baseQuery) => {
          const result = await retrieveStationGroups(baseQuery as any);

          return {
            data: result,
            error: undefined,
            meta: undefined,
          };
        },
      }),
    };
  },
});

export const useUpdateConfig = configApi.endpoints.updateConfig.useMutation;
export const usePutConfig = configApi.endpoints.putConfig.useQuery;
export const useRefreshUiConfig =
  configApi.endpoints.refreshUiConfig.useMutation;
export const useResolveStationConfig =
  configApi.endpoints.resolveStationConfig.useQuery;
export const useResolveThresholdsForMonitorsInStation =
  configApi.endpoints.resolveThresholdsForMonitorsInStation.useQuery;
export const useResolveChannelsByMonitorType =
  configApi.endpoints.resolveChannelsByMonitorType.useQuery;
export const useResolveStationGroups =
  configApi.endpoints.resolveStationGroups.useQuery;
export const useResolveStationEnvMonitorTypes =
  configApi.endpoints.resolveStationEnvMonitorTypes.useQuery;
export const useResolveStationCapability =
  configApi.endpoints.resolveStationCapability.useQuery;
export const useResolveAllStationCapabilitiesForGroup =
  configApi.endpoints.resolveAllStationCapabilitiesForGroup.useLazyQuery;
export const useResolveStationGroupCapability =
  configApi.endpoints.resolveStationGroupCapability.useQuery;
export const useResolveChannelCapabilityRollup =
  configApi.endpoints.resolveChannelCapabilityRollup.useQuery;
export const useResolveThresholdsForChannelsForMonitorInStation =
  configApi.endpoints.resolveThresholdsForChannelsForMonitorInStation
    .useLazyQuery;
export const useIsAliveQuery = configApi.endpoints.isAliveQuery.useQuery;
