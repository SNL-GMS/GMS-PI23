import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../request-priority';

/**
 * Event Manager definition request config definition
 */
export interface EventManagerRequestConfig extends RequestConfig {
  readonly eventManager: {
    readonly baseUrl: string;
    readonly services: {
      readonly predictFeaturesForLocationSolution: ServiceDefinition;
      readonly predictFeaturesForEventLocation: ServiceDefinition;
      readonly findEventStatusInfoByStageIdAndEventIds: ServiceDefinition;
      readonly updateEventStatus: ServiceDefinition;
      readonly findEventsByAssociatedSignalDetectionHypotheses: ServiceDefinition;
    };
  };
}

/**
 * The Event Manager definition request config for all services.
 */
export const config: EventManagerRequestConfig = {
  eventManager: {
    baseUrl: `${UI_URL}${Endpoints.EventManagerUrls.baseUrl}`,
    services: prioritizeRequests({
      predictFeaturesForLocationSolution: {
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.predict,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      },
      predictFeaturesForEventLocation: {
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.predictEvent,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      },
      findEventStatusInfoByStageIdAndEventIds: {
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.status,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 180000 // 3 mins
        }
      },
      updateEventStatus: {
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.update,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      },
      findEventsByAssociatedSignalDetectionHypotheses: {
        requestConfig: {
          method: 'post',
          url: Endpoints.EventManagerUrls.findEventsByAssociatedSignalDetectionHypotheses,
          responseType: 'json',
          proxy: false,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          timeout: 60000
        }
      }
    })
  }
};

export type EventManagerServices = keyof typeof config.eventManager.services;
