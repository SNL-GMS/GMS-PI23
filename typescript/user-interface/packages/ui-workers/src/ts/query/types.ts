import type { PriorityRequestConfig } from './axios';

/**
 * Service definition
 */
export interface ServiceDefinition {
  readonly requestConfig: PriorityRequestConfig;
}

/**
 * Request config definition
 */
export interface RequestConfig {
  readonly [domain: string]: {
    readonly baseUrl: string;
    readonly services: {
      readonly [serviceName: string]: ServiceDefinition;
    };
  };
}
