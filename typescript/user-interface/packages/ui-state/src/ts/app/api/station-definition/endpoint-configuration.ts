import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../request-priority';

/**
 * Station definition request config definition
 */
export interface StationDefinitionRequestConfig extends RequestConfig {
  readonly stationDefinition: {
    readonly baseUrl: string;
    readonly services: {
      readonly getStationGroupsByNames: ServiceDefinition;
      readonly getStations: ServiceDefinition;
      readonly getStationsEffectiveAtTimes: ServiceDefinition;
      readonly getChannelsByNamesTimeRange: ServiceDefinition;
    };
  };
}

/**
 * The station definition request config for all services.
 */
export const config: StationDefinitionRequestConfig = {
  stationDefinition: {
    baseUrl: `${UI_URL}${Endpoints.StationDefinitionUrls.baseUrl}`,
    services: prioritizeRequests({
      getStationGroupsByNames: {
        requestConfig: {
          method: 'post',
          url: Endpoints.StationDefinitionUrls.getStationGroupsByNames,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      },
      getStations: {
        requestConfig: {
          method: 'post',
          url: Endpoints.StationDefinitionUrls.getStations,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      },
      getStationsEffectiveAtTimes: {
        requestConfig: {
          method: 'post',
          url: Endpoints.StationDefinitionUrls.getStationsEffectiveAtTimes,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      },
      getChannelsByNamesTimeRange: {
        requestConfig: {
          method: 'post',
          url: Endpoints.StationDefinitionUrls.getChannelsByNamesTimeRange,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          // TODO: reduce timeout once query is parallelized
          timeout: 180000
        }
      }
    })
  }
};

export type StationManagerServices = keyof typeof config.stationDefinition.services;
