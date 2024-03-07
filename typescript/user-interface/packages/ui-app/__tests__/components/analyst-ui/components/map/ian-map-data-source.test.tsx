import { ConfigurationTypes } from '@gms/common-model';
import { eventData, signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import type { Entity } from 'cesium';
import cloneDeep from 'lodash/cloneDeep';

import { createAssociatedSignalDetectionEntities } from '~analyst-ui/components/map/create-ian-entities';

import { EdgeTypes } from '../../../../../src/ts/components/analyst-ui/components/events/types';
import {
  sdOnMouseEnterHandler,
  sdOnMouseLeaveHandler
} from '../../../../../src/ts/components/analyst-ui/components/map/ian-map-utils';
import { ASAR_NO_CHANNEL_GROUPS } from '../../../../__data__/geojson-data';

describe('ian map data source', () => {
  const associatedEvent = cloneDeep(eventData);
  signalDetectionsData.forEach(sd => {
    associatedEvent.eventHypotheses[0].associatedSignalDetectionHypotheses.push(
      sd.signalDetectionHypotheses[0]
    );
  });

  const entities: Entity[] = createAssociatedSignalDetectionEntities(
    signalDetectionsData,
    [ASAR_NO_CHANNEL_GROUPS as any],
    ConfigurationTypes.defaultColorTheme.unassociatedSDColor,
    ConfigurationTypes.defaultColorTheme.unassociatedSDHoverColor,
    [associatedEvent],
    [],
    'Associated to completed event',
    EdgeTypes.INTERVAL
  );

  test('sdOnMouseEnterHandler', () => {
    const result = sdOnMouseEnterHandler({} as any, entities[0]);
    expect(result).toMatchSnapshot();
  });

  test('sdOnMouseLeaveHandler', () => {
    const result = sdOnMouseLeaveHandler({} as any, entities[0]);
    expect(result).toMatchSnapshot();
  });
});
