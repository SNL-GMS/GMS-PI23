/* eslint-disable react/jsx-props-no-spreading */
import Adapter from '@cfaester/enzyme-adapter-react-18';
import { getStore } from '@gms/ui-state';
import { act, render } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';

import { getFkParamsForSd } from '~analyst-ui/common/utils/fk-utils';
import { BaseDisplay } from '~common-ui/components/base-display';

import { AzimuthSlowness } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/azimuth-slowness-component';
import type { AzimuthSlownessProps } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/types';
import { configuration } from '../../../../__data__/azimuth-slowness';
import { azSlowProps } from '../../../../__data__/test-util-data';
import { glContainer } from '../workflow/gl-container';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Enzyme = require('enzyme');
// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

const buildAzimuthSlowness = (props: AzimuthSlownessProps): JSX.Element => {
  const store = getStore();

  return (
    <Provider store={store}>
      <BaseDisplay glContainer={glContainer} />
      <AzimuthSlowness {...props} />
    </Provider>
  );
};
describe('AzimuthSlowness Direct', () => {
  // enzyme needs a new adapter for each configuration
  beforeEach(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  // Mounting enzyme into the DOM
  // Using a testing DOM not real DOM
  // So a few things will be missing window.fetch, or alert etc...
  const wrapper: ReactWrapper = Enzyme.mount(buildAzimuthSlowness({ ...(azSlowProps as any) }));
  const instance: AzimuthSlowness = wrapper.find(AzimuthSlowness).instance() as AzimuthSlowness;
  const anyInstance: any = instance;

  it('AzimuthSlowness snapshot', () => {
    const { container } = render(buildAzimuthSlowness(azSlowProps as AzimuthSlownessProps));
    expect(container).toMatchSnapshot();
  });

  it('componentDidUpdate', () => {
    expect(() => instance.componentDidUpdate({ ...(azSlowProps as any) })).not.toThrow();
  });

  it('computeFkAndUpdateState', async () => {
    const fkParams = getFkParamsForSd(azSlowProps.signalDetectionResults.data[0]);
    expect(fkParams).toBeDefined();
    expect(
      await act(async () => {
        await anyInstance.computeFkAndUpdateState(fkParams, configuration);
      })
    ).toBeUndefined();
  });
  it('showOrGenerateSignalDetectionFk', async () => {
    const sdIds = azSlowProps.signalDetectionResults.data.map(sd => sd.id);
    expect(
      await act(async () => {
        await anyInstance.showOrGenerateSignalDetectionFk(sdIds);
      })
    ).toBeUndefined();
  });
});
