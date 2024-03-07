/* eslint-disable react/function-component-definition */
import { renderHook } from '@testing-library/react-hooks';
import clone from 'lodash/clone';
import React from 'react';
import { Provider } from 'react-redux';
import { create } from 'react-test-renderer';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import { dataInitialState } from '../../../src/ts/app';
import type { GetChannelSegmentsByChannelsQueryArgs } from '../../../src/ts/app/api/data/waveform/types';
import {
  useGetChannelSegments,
  useGetChannelSegmentsByChannels
} from '../../../src/ts/app/hooks/channel-segment-hooks';
import type { AppState } from '../../../src/ts/app/store';
import { getStore } from '../../../src/ts/app/store';
import { appState } from '../../test-util';
import { uiChannelSegment } from './weavess-channel-segment-data';

describe('channel segment hooks', () => {
  it('exists', () => {
    expect(useGetChannelSegments).toBeDefined();
    expect(useGetChannelSegmentsByChannels).toBeDefined();
  });

  it('useGetChannelSegmentsByChannels returns an object with loading values', () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
    const dataInitialStateCopy = clone(dataInitialState);
    dataInitialStateCopy.uiChannelSegments = {
      'PDAR.BHZ': { unfiltered: [uiChannelSegment] }
    };
    const mockAppState = appState;
    mockAppState.data = dataInitialStateCopy;
    const store = mockStoreCreator(mockAppState);
    const queryArgs: GetChannelSegmentsByChannelsQueryArgs = {
      startTime: 1274391900,
      endTime: 1274399099,
      channels: [
        { name: 'PDAR.BHZ', effectiveAt: 101 },
        { name: 'PDAR.BHA', effectiveAt: 101 }
      ]
    };
    const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useGetChannelSegmentsByChannels(queryArgs), {
      wrapper: Wrapper
    });
    expect(result.current).toMatchSnapshot();
  });

  it('useGetChannelSegmentsByChannels filters out channel segments outside the requested range', () => {
    const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
    const dataInitialStateCopy = clone(dataInitialState);
    dataInitialStateCopy.uiChannelSegments = {
      'PDAR.BHZ': { unfiltered: [uiChannelSegment] }
    };
    const mockAppState = appState;
    mockAppState.data = dataInitialStateCopy;
    const store = mockStoreCreator(mockAppState);
    const queryArgs: GetChannelSegmentsByChannelsQueryArgs = {
      startTime: 0,
      endTime: 100,
      channels: [
        { name: 'PDAR.BHZ', effectiveAt: 101 },
        { name: 'PDAR.BHA', effectiveAt: 101 }
      ]
    };
    const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useGetChannelSegmentsByChannels(queryArgs), {
      wrapper: Wrapper
    });
    expect(result.current).toMatchSnapshot();
  });

  it('hook query for channel segments', () => {
    const store = getStore();

    const Component1: React.FC = () => {
      const result = useGetChannelSegments({ startTimeSecs: 1274391900, endTimeSecs: 1274399099 });
      return <>{JSON.stringify(result.data)}</>;
    };

    const Component2: React.FC = () => {
      // call twice to hit other blocks of code
      const result = useGetChannelSegments({ startTimeSecs: 1274391900, endTimeSecs: 1274399099 });
      return <>{JSON.stringify(result.data)}</>;
    };

    expect(
      create(
        <Provider store={store}>
          <Component1 />
          <Component2 />
        </Provider>
      ).toJSON()
    ).toMatchSnapshot();

    expect(
      create(
        <Provider store={store}>
          <Component1 />
          <Component2 />
        </Provider>
      ).toJSON()
    ).toMatchSnapshot();
  });
});
