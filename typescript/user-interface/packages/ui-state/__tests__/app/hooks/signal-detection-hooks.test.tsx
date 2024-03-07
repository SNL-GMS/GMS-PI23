/* eslint-disable react/jsx-no-useless-fragment */
/* eslint-disable react/function-component-definition */
import type { CommonTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { uuid } from '@gms/common-util';
import { renderHook } from '@testing-library/react-hooks';
import { enableMapSet } from 'immer';
import React from 'react';
import { Provider } from 'react-redux';
import { create } from 'react-test-renderer';
import type { AnyAction } from 'redux';
import type { MockStoreCreator } from 'redux-mock-store';
import createMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type { GetFilterDefinitionsForSignalDetectionsQueryArgs } from '../../../src/ts/app';
import { AsyncActionStatus, dataSlice, useViewableInterval } from '../../../src/ts/app';
import {
  useFilterDefinitionsForSignalDetectionsQueryHistory,
  useGetFilterDefinitionsForSignalDetections,
  useGetSignalDetections
} from '../../../src/ts/app/hooks/signal-detection-hooks';
import { workflowActions } from '../../../src/ts/app/state';
import type { AppState } from '../../../src/ts/app/store';
import { getStore } from '../../../src/ts/app/store';
import type { SignalDetectionWithSegmentsFetchResults } from '../../../src/ts/workers/waveform-worker/operations/fetch-signal-detections-segments-by-stations-time';
import { uiChannelSegmentWithDataBySampleRate } from '../../__data__';
import { appState, expectHookToCallWorker } from '../../test-util';

const signalDetectionWithSegmentsFetchResults: SignalDetectionWithSegmentsFetchResults = {
  signalDetections: signalDetectionsData,
  uiChannelSegments: [uiChannelSegmentWithDataBySampleRate]
};

signalDetectionWithSegmentsFetchResults.signalDetections.forEach(sd => {
  // Set first SD arrival to pre transformed since signalDetection fetch results is post transform
  let fixedArrivalTimeFM = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
    SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).featureMeasurements
  );
  fixedArrivalTimeFM.measurementValue = {
    arrivalTime: {
      value: 1546715054.2,
      standardDeviation: 1.162
    },
    travelTime: null
  };

  // Set second SD arrival to null feature measurement value
  fixedArrivalTimeFM = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
    SignalDetectionTypes.Util.getCurrentHypothesis(
      signalDetectionWithSegmentsFetchResults.signalDetections[1].signalDetectionHypotheses
    ).featureMeasurements
  );
  fixedArrivalTimeFM.measurementValue = null;

  // Set third SD arrival time value to null
  fixedArrivalTimeFM = SignalDetectionTypes.Util.findArrivalTimeFeatureMeasurement(
    SignalDetectionTypes.Util.getCurrentHypothesis(
      signalDetectionWithSegmentsFetchResults.signalDetections[2].signalDetectionHypotheses
    ).featureMeasurements
  );
  fixedArrivalTimeFM.measurementValue = {
    arrivalTime: {
      value: 1546715054.2,
      standardDeviation: 1.162
    },
    travelTime: null
  };
});

enableMapSet();
const MOCK_TIME = 1606818240000;
global.Date.now = jest.fn(() => MOCK_TIME);

// mock the uuid
uuid.asString = jest.fn().mockImplementation(() => '12345789');

jest.mock('worker-rpc', () => ({
  RpcProvider: jest.fn().mockImplementation(() => {
    // eslint-disable-next-line no-var
    var mockRpc = jest.fn(async () => {
      return new Promise(resolve => {
        resolve(signalDetectionWithSegmentsFetchResults);
      });
    });
    return { rpc: mockRpc };
  })
}));

jest.mock('../../../src/ts/app/hooks/workflow-hooks', () => {
  return {
    useStageId: jest.fn().mockReturnValue({
      startTime: 0,
      definitionId: {
        name: 'AL1'
      }
    })
  };
});

const mockedGetFilterDefinitionsForSignalDetections = jest.fn();
jest.mock(
  '../../../src/ts/app/api/data/signal-detection/get-filter-definitions-for-signal-detections',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/app/api/data/signal-detection/get-filter-definitions-for-signal-detections'
    );
    return {
      ...actual,
      getFilterDefinitionsForSignalDetections: () => mockedGetFilterDefinitionsForSignalDetections
    };
  }
);

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const now = 1234567890 / 1000;
const timeRange: CommonTypes.TimeRange = {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  startTimeSecs: now - 3600,
  endTimeSecs: now
};

describe('signal detection hooks', () => {
  describe('useGetSignalDetections', () => {
    const store = getStore();

    it('exists', () => {
      expect(useGetSignalDetections).toBeDefined();
    });

    it('calls useGetSignalDetections', async () => {
      const useTestHook = () => useGetSignalDetections({ startTimeSecs: 0, endTimeSecs: 1000 });
      const result = await expectHookToCallWorker(useTestHook);
      expect(result).toMatchSnapshot();
    });

    it('hook query for signal detections for current stations with initial state', () => {
      const Component: React.FC = () => {
        const [interval] = useViewableInterval();
        const result = useGetSignalDetections(interval);
        return <>{result.data}</>;
      };

      expect(
        create(
          <Provider store={store}>
            <Component />
          </Provider>
        ).toJSON()
      ).toMatchSnapshot();
    });

    it('hook query for signal detections for current stations', () => {
      store.dispatch(workflowActions.setTimeRange(timeRange));
      store.dispatch(dataSlice.actions.addSignalDetections(signalDetectionsData));

      const Component: React.FC = () => {
        const [interval] = useViewableInterval();
        const result = useGetSignalDetections(interval);
        return <>{result.data}</>;
      };

      expect(
        create(
          <Provider store={store}>
            <Component />
          </Provider>
        ).toJSON()
      ).toMatchSnapshot();
    });

    it('hook query for signal detections', () => {
      store.dispatch(workflowActions.setTimeRange(timeRange));
      const Component: React.FC = () => {
        const [interval] = useViewableInterval();
        const result = useGetSignalDetections(interval);
        return <>{result.data}</>;
      };

      expect(
        create(
          <Provider store={store}>
            <Component />
          </Provider>
        ).toJSON()
      ).toMatchSnapshot();

      expect(
        create(
          <Provider store={store}>
            <Component />
          </Provider>
        ).toJSON()
      ).toMatchSnapshot();
    });
  });

  describe('useFilterDefinitionsForSignalDetectionsQueryHistory', () => {
    it('exists', () => {
      expect(useFilterDefinitionsForSignalDetectionsQueryHistory).toBeDefined();
    });

    it('returns an empty array if nothing has been requested', () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(appState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useFilterDefinitionsForSignalDetectionsQueryHistory(), {
        wrapper: Wrapper
      });
      expect(result.current).toMatchObject({});
    });

    it('returns the ids of signal detections requested', () => {
      const queryArgs: GetFilterDefinitionsForSignalDetectionsQueryArgs = {
        stageId: {
          name: 'AL1'
        },
        signalDetectionsHypotheses: [
          {
            id: {
              id: 'a1',
              signalDetectionId: 'b1'
            }
          }
        ]
      };

      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          queries: {
            ...appState.data.queries,
            getFilterDefinitionsForSignalDetections: {
              AL1: {
                12345: {
                  arg: queryArgs,
                  status: AsyncActionStatus.pending,
                  error: undefined
                }
              }
            }
          }
        }
      };

      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { result } = renderHook(() => useFilterDefinitionsForSignalDetectionsQueryHistory(), {
        wrapper: Wrapper
      });
      expect(result.current).toMatchObject({ b1: ['a1'] });
    });
  });
  describe('useGetFilterDefinitionsForSignalDetections', () => {
    beforeEach(() => {
      mockedGetFilterDefinitionsForSignalDetections.mockClear();
    });

    it('exists', () => {
      expect(useGetFilterDefinitionsForSignalDetections).toBeDefined();
    });

    it('does not trigger a request if there are no signalDetections', async () => {
      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(appState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { waitFor } = renderHook(() => useGetFilterDefinitionsForSignalDetections(), {
        wrapper: Wrapper
      });

      await waitFor(() =>
        expect(mockedGetFilterDefinitionsForSignalDetections).not.toHaveBeenCalled()
      );
    });
    it('does not repeat a request for the same signal detection', async () => {
      const queryArgs: GetFilterDefinitionsForSignalDetectionsQueryArgs = {
        stageId: {
          name: 'AL1'
        },
        signalDetectionsHypotheses: [signalDetectionsData[0].signalDetectionHypotheses[0]]
      };

      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          signalDetections: {
            [signalDetectionsData[0].id]: signalDetectionsData[0]
          },
          queries: {
            ...appState.data.queries,
            getFilterDefinitionsForSignalDetections: {
              AL1: {
                12345: {
                  arg: queryArgs,
                  status: AsyncActionStatus.pending,
                  error: undefined
                }
              }
            }
          }
        }
      };

      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { waitFor } = renderHook(() => useGetFilterDefinitionsForSignalDetections(), {
        wrapper: Wrapper
      });

      await waitFor(() =>
        expect(mockedGetFilterDefinitionsForSignalDetections).not.toHaveBeenCalled()
      );
    });
    it('makes a request for a new signal detection', async () => {
      const mockAppState: AppState = {
        ...appState,
        data: {
          ...appState.data,
          signalDetections: {
            a1: signalDetectionsData[0]
          }
        }
      };

      const mockStoreCreator: MockStoreCreator<AppState, AnyAction> = createMockStore([thunk]);
      const store = mockStoreCreator(mockAppState);

      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      const { waitFor } = renderHook(() => useGetFilterDefinitionsForSignalDetections(), {
        wrapper: Wrapper
      });

      await waitFor(() => expect(mockedGetFilterDefinitionsForSignalDetections).toHaveBeenCalled());
    });
  });
});
