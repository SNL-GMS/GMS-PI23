import React from 'react';
import renderer from 'react-test-renderer';

import { MapEventDetails } from '~analyst-ui/components/map/map-event-details';

import {} from '../../../../../src/ts/components/analyst-ui/components/map/map-station-details';

describe('MapEventDetails', () => {
  test('functions are defined', () => {
    expect(MapEventDetails).toBeDefined();
  });

  it('matches snapshot', () => {
    const component = renderer
      .create(
        <MapEventDetails
          time={0}
          latitudeDegrees={45}
          longitudeDegrees={45}
          depthKm={10}
          workflowStatus="Not Started"
        />
      )
      .toJSON();
    expect(component).toMatchSnapshot();
  });
});
