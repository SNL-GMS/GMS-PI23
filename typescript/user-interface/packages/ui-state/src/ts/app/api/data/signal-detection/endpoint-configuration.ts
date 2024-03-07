import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../../request-priority';

/**
 * Data request config definition
 */
export interface SignalDetectionRequestConfig extends RequestConfig {
  readonly signalDetection: {
    readonly baseUrl: string;
    readonly services: {
      readonly getDetectionsWithSegmentsByStationsAndTime: ServiceDefinition;
      readonly getFilterDefinitionsForSignalDetections: ServiceDefinition;
    };
  };
}

const baseUrl = `${UI_URL}${Endpoints.SignalDetectionManagerUrls.baseUrl}`;

/**
 * The signal detection request config for all endpoints.
 */
export const config: SignalDetectionRequestConfig = {
  signalDetection: {
    baseUrl,
    // service endpoints
    services: prioritizeRequests({
      getDetectionsWithSegmentsByStationsAndTime: {
        requestConfig: {
          baseURL: baseUrl,
          method: 'post',
          url: Endpoints.SignalDetectionManagerUrls.getDetectionsWithSegmentsByStationsAndTime,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 120000
        }
      },
      getFilterDefinitionsForSignalDetections: {
        requestConfig: {
          baseURL: baseUrl,
          method: 'post',
          url: Endpoints.SignalDetectionManagerUrls.getFilterDefinitionsForSignalDetections,
          proxy: false,
          headers: {
            // configure to receive msgpack encoded data
            accept: 'application/msgpack',
            'content-type': 'application/json'
          },
          timeout: 120000
        }
      }
    })
  }
};

export type SignalDetectionServices = keyof typeof config.signalDetection.services;
