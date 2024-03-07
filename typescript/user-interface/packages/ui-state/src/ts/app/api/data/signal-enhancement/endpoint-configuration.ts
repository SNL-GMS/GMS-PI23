import { Endpoints } from '@gms/common-model';
import { UI_URL } from '@gms/common-util';
import type { RequestConfig, ServiceDefinition } from '@gms/ui-workers';

import { prioritizeRequests } from '../../request-priority';

/**
 * Station definition request config definition
 */
export interface SignalEnhancementRequestConfig extends RequestConfig {
  readonly signalEnhancementConfiguration: {
    readonly baseUrl: string;
    readonly services: {
      readonly getDefaultFilterDefinitionByUsageForChannelSegments: ServiceDefinition;
    };
  };
}

const baseUrl = `${UI_URL}${Endpoints.SignalEnhancementConfigurationUrls.baseUrl}`;

/**
 * The station definition request config for all services.
 */
export const config: SignalEnhancementRequestConfig = {
  signalEnhancementConfiguration: {
    baseUrl,
    services: prioritizeRequests({
      getDefaultFilterDefinitionByUsageForChannelSegments: {
        requestConfig: {
          baseURL: baseUrl,
          method: 'POST',
          url:
            Endpoints.SignalEnhancementConfigurationUrls
              .getDefaultFilterDefinitionByUsageForChannelSegments,
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
