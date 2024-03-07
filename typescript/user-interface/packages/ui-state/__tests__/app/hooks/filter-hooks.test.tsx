/* eslint-disable react/function-component-definition */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable react/display-name */
import type { ChannelTypes } from '@gms/common-model';
import {
  defaultStations,
  filterDefinitionsData,
  linearFilter
} from '@gms/common-model/__tests__/__data__';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';
import renderer from 'react-test-renderer';

import { dataSlice, workflowActions } from '../../../src/ts/app';
import {
  useFilterCycle,
  useFilterQueue,
  usePreferredFilterListForActivity,
  useSelectedFilterList,
  useSetFilterList
} from '../../../src/ts/app/hooks/filter-hooks';
import { analystActions, waveformActions } from '../../../src/ts/app/state';
import { getStore } from '../../../src/ts/app/store';
import type { ChannelDescriptor } from '../../../src/ts/workers/api/ui-filter-processor';
import { designFilterDefinitions, filter } from '../../../src/ts/workers/api/ui-filter-processor';
import { testChannel } from '../../__data__/channel-data';
import { buildUiChannelSegmentWithPopulatedDataClaim } from '../../__data__/ui-channel-segments/ui-channel-segment-data-utils';
import { testFilterList } from '../../filter-list-data';

const mockDispatch = jest.fn();
jest.mock('../../../src/ts/app/hooks/react-redux-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/react-redux-hooks');
  return {
    ...actual,
    useAppDispatch: () => mockDispatch
  };
});

jest.mock('../../../src/ts/app/api/signal-enhancement-configuration/selectors', () => {
  return {
    selectFilterLists: jest.fn().mockReturnValue([
      {
        defaultFilterIndex: 0,
        name: 'test',
        filters: [
          {
            withinHotKeyCycle: true,
            unfiltered: true,
            namedFilter: null,
            filterDefinition: null
          },
          {
            withinHotKeyCycle: false,
            unfiltered: null,
            namedFilter: 'Test Filter should appear in snapshot',
            filterDefinition: null
          }
        ],
        description: 'foo'
      }
    ])
  };
});

jest.mock(
  '../../../src/ts/app/api/signal-enhancement-configuration/signal-enhancement-api-slice',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/app/api/signal-enhancement-configuration/signal-enhancement-api-slice'
    );
    return {
      ...actual,
      useGetFilterListsDefinitionQuery: jest.fn().mockReturnValue({
        data: {
          preferredFilterListByActivity: [
            { name: 'test', workflowDefinitionId: { name: 'test-open-interval' } }
          ],
          filterLists: [
            {
              defaultFilterIndex: 0,
              name: 'test',
              filters: [
                {
                  withinHotKeyCycle: true,
                  unfiltered: true,
                  namedFilter: null,
                  filterDefinition: null
                },
                {
                  withinHotKeyCycle: false,
                  unfiltered: null,
                  namedFilter: 'Test Filter should appear in snapshot',
                  filterDefinition: null
                },
                {
                  withinHotKeyCycle: true,
                  unfiltered: null,
                  namedFilter: 'Test Filter should appear in snapshot',
                  filterDefinition: null
                }
              ],
              description: 'foo'
            }
          ]
        }
      })
    };
  }
);

jest.mock('../../../src/ts/app/hooks/station-definition-hooks', () => {
  const actual = jest.requireActual('../../../src/ts/app/hooks/station-definition-hooks');
  return {
    ...actual,
    useVisibleStations: () => defaultStations
  };
});

jest.mock(
  '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice',
  () => {
    const actual = jest.requireActual(
      '../../../src/ts/app/api/processing-configuration/processing-configuration-api-slice'
    );
    return {
      ...actual,
      useGetProcessingAnalystConfigurationQuery: jest.fn(() => ({
        data: {
          gmsFilters: {
            defaultTaper: 0,
            defaultRemoveGroupDelay: 0,
            defaultGroupDelaySecs: 0,
            defaultSampleRateToleranceHz: 0.1
          }
        }
      }))
    };
  }
);

jest.mock('../../../src/ts/workers/api/ui-filter-processor');

jest.mock('../../../src/ts/app/hooks/operational-time-period-configuration-hooks', () => {
  return {
    useEffectiveTime: jest.fn(() => 0),
    useOperationalTimePeriodConfiguration: jest.fn(() => ({
      timeRange: {
        startTimeSecs: 0,
        endTimeSecs: 1
      }
    }))
  };
});

const mockedFilter = jest.mocked(filter);
const mockedDesignFilterDefinitions = jest.mocked(designFilterDefinitions);

describe('Filter Hooks', () => {
  describe('useSetFilterList', () => {
    it('gives us a set filter list function that can handle an object', () => {
      const store = getStore();
      const TestComponent: React.FC = () => {
        const setFilterList = useSetFilterList();
        expect(typeof setFilterList).toBe('function');
        setFilterList(testFilterList);
        return null;
      };
      renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );

      expect(mockDispatch.mock.calls[0][0]).toMatchObject(
        analystActions.setSelectedFilterList(testFilterList.name)
      );
    });
    it('gives us a set filter list function that can handle a string', () => {
      const TestComponent: React.FC = () => {
        const setFilterList = useSetFilterList();
        expect(typeof setFilterList).toBe('function');
        setFilterList(testFilterList.name);
        return null;
      };
      renderer.create(
        <Provider store={getStore()}>
          <TestComponent />
        </Provider>
      );

      expect(mockDispatch.mock.calls[0][0]).toMatchObject(
        analystActions.setSelectedFilterList(testFilterList.name)
      );
    });
  });

  describe('usePreferredFilterListForActivity', () => {
    const TestComponent: React.FC = () => {
      const preferredFilterList = usePreferredFilterListForActivity();
      // eslint-disable-next-line react/jsx-no-useless-fragment
      return <>{preferredFilterList}</>;
    };
    it('calls the query and gets a result', () => {
      const store = getStore();
      const tree = renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('returns the preferred list with the correct data', () => {
      const store = getStore();
      store.dispatch(workflowActions.setOpenIntervalName('test-open-interval'));
      const tree = renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });
  });

  describe('useSelectedFilterList', () => {
    const TestComponent: React.FC = () => {
      const selectedFilterList = useSelectedFilterList();
      return <>{JSON.stringify(selectedFilterList)}</>;
    };

    it('returns null with initial state', () => {
      const store = getStore();
      const tree = renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('returns filter list from state', () => {
      const store = getStore();
      store.dispatch(analystActions.setSelectedFilterList('test'));
      const tree = renderer.create(
        <Provider store={store}>
          <TestComponent />
        </Provider>
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });
  });
  describe('useFilterCycle', () => {
    const store = getStore();
    const { result } = renderHook(() => useFilterCycle(), {
      wrapper: (props: React.PropsWithChildren<unknown>) => (
        // eslint-disable-next-line react/destructuring-assignment
        <Provider store={store}>{props.children}</Provider>
      )
    });
    it('creates two functions', () => {
      expect(result.current?.selectNextFilter).toBeDefined();
      expect(result.current?.selectPreviousFilter).toBeDefined();
    });
    describe('selectNextFilter', () => {
      result.current.selectNextFilter();
      it('does not dispatch if no selectedFilterIndex is set', () => {
        mockDispatch.mockClear();
        expect(mockDispatch).not.toHaveBeenCalled();
      });
      it('does not dispatch if no hotkeyCycle is set', () => {
        // set this to make sure it hits the hotkey cycle condition
        mockDispatch.mockClear();
        store.dispatch(analystActions.setSelectedFilterIndex(0));
        renderHook(() => useFilterCycle(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            // eslint-disable-next-line react/destructuring-assignment
            <Provider store={store}>{props.children}</Provider>
          )
        });
        expect(mockDispatch).not.toHaveBeenCalled();
      });
      store.dispatch(analystActions.setSelectedFilterIndex(0));
      store.dispatch(analystActions.setSelectedFilterList('test'));
      store.dispatch(
        analystActions.setFilterHotkeyCycleOverridesForCurrentFilterList({
          0: false,
          1: true,
          2: true
        })
      );
      let renderedHook = renderHook(() => useFilterCycle(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          // eslint-disable-next-line react/destructuring-assignment
          <Provider store={store}>{props.children}</Provider>
        )
      });
      it('calls dispatch if hotkeyCycle and selectedFilterIndex are set', () => {
        store.dispatch(analystActions.setSelectedFilterIndex(0));
        store.dispatch(
          analystActions.setFilterHotkeyCycleOverridesForCurrentFilterList({
            0: false,
            1: true,
            2: true
          })
        );
        renderedHook = renderHook(() => useFilterCycle(), {
          wrapper: (props: React.PropsWithChildren<unknown>) => (
            // eslint-disable-next-line react/destructuring-assignment
            <Provider store={store}>{props.children}</Provider>
          )
        });
        renderedHook.result.current.selectNextFilter();
        expect(mockDispatch).toHaveBeenCalledWith({
          payload: 1,
          type: 'analyst/setSelectedFilterIndex'
        });
      });
    });
    describe('selectPreviousFilter', () => {
      store.dispatch(analystActions.setSelectedFilterIndex(2));
      store.dispatch(analystActions.setSelectedFilterList('test'));
      store.dispatch(
        analystActions.setFilterHotkeyCycleOverridesForCurrentFilterList({
          0: true,
          1: false,
          2: true
        })
      );
      mockDispatch.mockClear();
      const renderedHook = renderHook(() => useFilterCycle(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          // eslint-disable-next-line react/destructuring-assignment
          <Provider store={store}>{props.children}</Provider>
        )
      });

      it('calls dispatch if hotkeyCycle and selectedFilterIndex are set', () => {
        renderedHook.result.current.selectPreviousFilter();
        expect(mockDispatch).toHaveBeenCalledWith({
          payload: 0,
          type: 'analyst/setSelectedFilterIndex'
        });
      });
    });
    describe('selectUnfiltered', () => {
      store.dispatch(analystActions.setSelectedFilterIndex(2));
      store.dispatch(analystActions.setSelectedFilterList('test'));
      store.dispatch(
        analystActions.setFilterHotkeyCycleOverridesForCurrentFilterList({
          0: true,
          1: false,
          2: true
        })
      );
      mockDispatch.mockClear();
      const renderedHook = renderHook(() => useFilterCycle(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          // eslint-disable-next-line react/destructuring-assignment
          <Provider store={store}>{props.children}</Provider>
        )
      });

      it('calls dispatch to select the unfiltered option if hotkeyCycle and selectedFilterIndex are set', () => {
        renderedHook.result.current.selectUnfiltered();
        expect(mockDispatch).toHaveBeenCalledWith({
          payload: 0, // the index of the unfiltered option
          type: 'analyst/setSelectedFilterIndex'
        });
      });
    });
  });

  describe('useFilterQueue', () => {
    let uiChannelSegment;

    beforeAll(async () => {
      uiChannelSegment = await buildUiChannelSegmentWithPopulatedDataClaim();
    });

    beforeEach(() => {
      mockedDesignFilterDefinitions.mockImplementation(async filterDefinition =>
        Promise.resolve(filterDefinition)
      );
      mockedFilter.mockImplementation(
        async (descriptor: ChannelDescriptor): Promise<ChannelDescriptor> => {
          const uiChannelSegments = descriptor.uiChannelSegments.map(seg => {
            return {
              ...seg,
              channelSegment: {
                ...seg.channelSegment,
                wfFilterId: linearFilter.filterDefinition.name
              }
            };
          });

          return Promise.resolve({
            channel: descriptor.channel,
            uiChannelSegments
          });
        }
      );
    });

    it('designs the selected filter if needed', async () => {
      const store = getStore();

      const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
      const relatedChannel: ChannelTypes.Channel = {
        ...testChannel,
        name: channelName,
        canonicalName: channelName,
        station: {
          ...testChannel.station,
          name: channelName
        }
      };

      const channelFilters = {
        [relatedChannel.name]: linearFilter
      };

      store.dispatch(
        dataSlice.actions.addChannelSegments([
          {
            name: channelName,
            channelSegments: [uiChannelSegment]
          }
        ])
      );

      store.dispatch(dataSlice.actions.addRawChannels([relatedChannel]));
      store.dispatch(waveformActions.setChannelFilters(channelFilters));

      mockDispatch.mockClear();

      const { waitFor } = renderHook(() => useFilterQueue(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
      expect(mockDispatch.mock.calls[0][0].type).toBe('data/addDesignedFilterDefinitions');
      expect(mockDispatch.mock.calls[0][0].payload).toMatchObject([linearFilter.filterDefinition]);
    });

    it('does not redesign a filter thats already cached', async () => {
      const store = getStore();

      const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
      const relatedChannel: ChannelTypes.Channel = {
        ...testChannel,
        name: channelName,
        canonicalName: channelName,
        station: {
          ...testChannel.station,
          name: channelName
        }
      };

      const channelFilters = {
        [relatedChannel.name]: {
          withinHotKeyCycle: false,
          unfiltered: false,
          namedFilter: null,
          filterDefinition: filterDefinitionsData[0]
        }
      };

      store.dispatch(
        dataSlice.actions.addChannelSegments([
          {
            name: channelName,
            channelSegments: [uiChannelSegment]
          }
        ])
      );

      store.dispatch(dataSlice.actions.addRawChannels([relatedChannel]));
      store.dispatch(dataSlice.actions.addDesignedFilterDefinitions(filterDefinitionsData));
      store.dispatch(waveformActions.setChannelFilters(channelFilters));

      mockDispatch.mockClear();
      const { waitFor } = renderHook(() => useFilterQueue(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

      expect(mockDispatch.mock.calls[0][0].type).not.toBe('data/addDesignedFilterDefinitions');
    });

    it('processes the uiChannelSegment record with the selected filter', async () => {
      const store = getStore();

      const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
      const relatedChannel: ChannelTypes.Channel = {
        ...testChannel,
        name: channelName,
        canonicalName: channelName,
        station: {
          ...testChannel.station,
          name: channelName
        }
      };

      const channelFilters = {
        [relatedChannel.name]: linearFilter
      };

      store.dispatch(
        dataSlice.actions.addChannelSegments([
          {
            name: channelName,
            channelSegments: [uiChannelSegment]
          }
        ])
      );

      store.dispatch(dataSlice.actions.addRawChannels([relatedChannel]));
      store.dispatch(waveformActions.setChannelFilters(channelFilters));

      mockDispatch.mockClear();

      const { waitFor } = renderHook(() => useFilterQueue(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
      expect(mockDispatch.mock.calls[1][0].type).toBe('data/addChannelSegments');
    });

    it('falls back to the default filter if the filter operation fails', async () => {
      mockedFilter.mockImplementation(() => {
        throw new Error('boom');
      });
      const store = getStore();

      const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
      const relatedChannel: ChannelTypes.Channel = {
        ...testChannel,
        name: channelName,
        canonicalName: channelName,
        station: {
          ...testChannel.station,
          name: channelName
        }
      };

      const channelFilters = {
        [relatedChannel.name]: {
          ...linearFilter,
          filterDefinition: {
            ...linearFilter.filterDefinition,
            filterDescription: {
              ...linearFilter.filterDefinition.filterDescription,
              filterType: 'FAIL'
            }
          }
        }
      };

      store.dispatch(
        dataSlice.actions.addChannelSegments([
          {
            name: channelName,
            channelSegments: [uiChannelSegment]
          }
        ])
      );

      store.dispatch(dataSlice.actions.addRawChannels([relatedChannel]));
      store.dispatch(waveformActions.setChannelFilters(channelFilters as any));

      mockDispatch.mockClear();

      const { waitFor } = renderHook(() => useFilterQueue(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
      expect(mockDispatch.mock.calls[1][0].type).toBe('waveform/setFilterForChannel');
    });

    it('deals with missing channel definition gracefully', async () => {
      const store = getStore();

      const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
      const relatedChannel: ChannelTypes.Channel = {
        ...testChannel,
        name: channelName,
        canonicalName: channelName,
        station: {
          ...testChannel.station,
          name: channelName
        }
      };

      const channelFilters = {
        [relatedChannel.name]: linearFilter
      };

      store.dispatch(
        dataSlice.actions.addChannelSegments([
          {
            name: channelName,
            channelSegments: [uiChannelSegment]
          }
        ])
      );

      store.dispatch(waveformActions.setChannelFilters(channelFilters));

      mockDispatch.mockClear();

      const { waitFor } = renderHook(() => useFilterQueue(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      await waitFor(() => expect(mockDispatch).not.toHaveBeenCalled());
    });

    it('deals with missing channel segments gracefully', async () => {
      const store = getStore();

      const channelName = uiChannelSegment.channelSegmentDescriptor.channel.name;
      const relatedChannel: ChannelTypes.Channel = {
        ...testChannel,
        name: channelName,
        canonicalName: channelName,
        station: {
          ...testChannel.station,
          name: channelName
        }
      };

      const channelFilters = {
        [relatedChannel.name]: linearFilter
      };

      store.dispatch(waveformActions.setChannelFilters(channelFilters));

      mockDispatch.mockClear();

      const { waitFor } = renderHook(() => useFilterQueue(), {
        wrapper: (props: React.PropsWithChildren<unknown>) => (
          <Provider store={store}>{props.children}</Provider>
        )
      });

      await waitFor(() => expect(mockDispatch).not.toHaveBeenCalled());
    });
  });
});
