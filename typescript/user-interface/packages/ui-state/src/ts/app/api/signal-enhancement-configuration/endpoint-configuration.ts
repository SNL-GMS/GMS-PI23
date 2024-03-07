import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../request-priority';

/**
 * Station definition request config definition
 */
export interface SignalEnhancementConfigurationRequestConfig extends RequestConfig {
  readonly signalEnhancementConfiguration: {
    readonly baseUrl: string;
    readonly services: {
      readonly getSignalEnhancementConfiguration: ServiceDefinition;
      readonly getDefaultFilterDefinitionsForSignalDetectionHypotheses: ServiceDefinition;
    };
  };
}
const baseUrl = `${UI_URL}${Endpoints.SignalEnhancementConfigurationUrls.baseUrl}`;
/**
 * The station definition request config for all services.
 */
export const config: SignalEnhancementConfigurationRequestConfig = {
  signalEnhancementConfiguration: {
    baseUrl,
    services: prioritizeRequests({
      getSignalEnhancementConfiguration: {
        requestConfig: {
          baseURL: baseUrl,
          method: 'get',
          url: Endpoints.SignalEnhancementConfigurationUrls.getSignalEnhancementConfiguration,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      },
      getDefaultFilterDefinitionsForSignalDetectionHypotheses: {
        requestConfig: {
          baseURL: baseUrl,
          method: 'POST',
          url:
            Endpoints.SignalEnhancementConfigurationUrls
              .getDefaultFilterDefinitionsForSignalDetectionHypotheses,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          proxy: false,
          timeout: 60000
        }
      }
    })
  }
};

export type SignalEnhancementConfigurationServices = keyof typeof config;
