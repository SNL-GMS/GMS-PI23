import type { CommonTypes } from '@gms/common-model';
import Immutable from 'immutable';

import {
  configureAdditionalRoutesAckSoh,
  configureAdditionalRoutesClientLogs,
  configureAdditionalRoutesMockAcei,
  configureAdditionalRoutesMockHistoricalSoh,
  configureAdditionalRoutesQuietSoh,
  consumeSystemEventMessages,
  initializeWebsocketServer,
  registerKafkaConsumerCallbacks
} from '../src/ts/server/api-gateway-server';
import { shutDownHttpServer } from '../src/ts/server/http-server';
import { shutDownWebsocketServer } from '../src/ts/server/websocket-server';
import { systemMessages } from './__data__/system-message-data';

describe('api SOH gateway server tests', () => {
  beforeAll(() => {
    shutDownWebsocketServer();
    shutDownHttpServer();
  });
  it('can parse system event type messages', () => {
    expect(() => registerKafkaConsumerCallbacks()).not.toThrow();
    const systemEvent: CommonTypes.SystemEvent = {
      id: '1',
      specversion: '0.2',
      source: 'api-gateway',
      type: 'soh-message',
      data: 'soh-message-data'
    };
    expect(() => consumeSystemEventMessages(Immutable.List([systemEvent]))).not.toThrow();
    systemMessages.forEach(msg => {
      systemEvent.type = 'system-message';
      systemEvent.data = msg;
      expect(() => consumeSystemEventMessages(Immutable.List([systemEvent]))).not.toThrow();
    });
    expect(() => configureAdditionalRoutesClientLogs()).not.toThrow();
    expect(() => configureAdditionalRoutesAckSoh()).not.toThrow();
    expect(() => configureAdditionalRoutesMockHistoricalSoh()).not.toThrow();
    expect(() => configureAdditionalRoutesQuietSoh()).not.toThrow();
    expect(() => configureAdditionalRoutesMockAcei()).not.toThrow();
  });

  it('initializeWebsocketServer', () => {
    expect(initializeWebsocketServer).toBeDefined();
  });
});