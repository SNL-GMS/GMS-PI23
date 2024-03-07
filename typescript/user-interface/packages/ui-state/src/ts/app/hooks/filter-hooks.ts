import type { ChannelTypes, FilterTypes } from '@gms/common-model';
import type { FilterDefinition, FilterList } from '@gms/common-model/lib/filter/types';
import { Timer } from '@gms/common-util';
import { UILogger, usePrevious } from '@gms/ui-util';
import { isDataClaimCheck, UNFILTERED } from '@gms/weavess-core/lib/types';
import produce from 'immer';
import React, { useEffect, useMemo, useRef } from 'react';
import { batch } from 'react-redux';

import type {
  ChannelFilterRecord,
  FilterDefinitionsRecord,
  ProcessedItemsCacheRecord,
  SampleRate,
  UiChannelSegment,
  UIChannelSegmentRecord
} from '../../types';
import type { ChannelDescriptor } from '../../workers/api/ui-filter-processor';
import { designFilterDefinitions, filter } from '../../workers/api/ui-filter-processor';
import { createChannelSegmentString } from '../../workers/waveform-worker/util/channel-segment-util';
import type { ProcessingAnalystConfigurationQuery } from '../api';
import {
  dataSlice,
  selectFilterDefinitions,
  selectUiChannelSegments,
  useGetFilterListsDefinitionQuery,
  useGetProcessingAnalystConfigurationQuery
} from '../api';
import {
  analystActions,
  selectHotkeyCycle,
  selectSelectedFilterIndex,
  selectSelectedFilterList,
  waveformActions,
  waveformSlice
} from '../state';
import type { HotkeyCycleList } from '../state/analyst/types';
import { selectSelectedStationsAndChannelIds } from '../state/common/selectors';
import { selectChannelFilters } from '../state/waveform/selectors';
import { useChannels } from './channel-hooks';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { useVisibleStations } from './station-definition-hooks';

const logger = UILogger.create('GMS_LOG_FILTERS', process.env.GMS_LOG_FILTERS);

/**
 * @returns a setter function that dispatches an update to the redux store, updating the filter list.
 */
export const useSetFilterList = (): ((fl: FilterTypes.FilterList | string) => void) => {
  const dispatch = useAppDispatch();
  const filterQuery = useGetFilterListsDefinitionQuery();
  const filterLists = filterQuery.data?.filterLists;
  return React.useCallback(
    (fl: FilterTypes.FilterList | string) => {
      batch(() => {
        let filterList;
        if (typeof fl === 'string') {
          filterList = filterLists.find(f => f.name === fl);
          if (!filterList) {
            throw new Error(`Filter list ${fl} not found`);
          }
        } else {
          filterList = fl;
        }
        dispatch(analystActions.setSelectedFilterList(filterList.name));
        dispatch(analystActions.setSelectedFilterIndex(filterList.defaultFilterIndex));
      });
    },
    [dispatch, filterLists]
  );
};

/**
 * @returns the name of the preferred filter list for the currently open activity (interval)
 */
export const usePreferredFilterListForActivity = (): string => {
  const filterListQuery = useGetFilterListsDefinitionQuery();
  const openIntervalName = useAppSelector(state => state.app.workflow.openIntervalName);
  const preferredFilterList = filterListQuery.data?.preferredFilterListByActivity.find(
    pf => pf.workflowDefinitionId.name === openIntervalName
  );
  return preferredFilterList?.name;
};

/**
 * @returns the selected filter list, derived from the selected filter name and the filter lists from the signal-enhancement query
 * If no filter list is selected, will update the redux store to select the default filter list, and return that.
 */
export const useSelectedFilterList = (): FilterTypes.FilterList => {
  const filterListQuery = useGetFilterListsDefinitionQuery();
  const result = useAppSelector(selectSelectedFilterList);
  const dispatch = useAppDispatch();
  const preferred = usePreferredFilterListForActivity();
  React.useEffect(() => {
    // select the preferred filter list if none was already selected
    if (!result) {
      dispatch(analystActions.setSelectedFilterList(preferred));
    }
  }, [dispatch, preferred, result]);
  if (!result && filterListQuery.data) {
    return filterListQuery.data.filterLists.find(fl => fl.name === preferred);
  }
  return result;
};

/**
 * Returns the default filter for the selected filter list
 *
 * @returns the default filter
 */
export function useDefaultFilter() {
  const filterList: FilterList = useSelectedFilterList();

  return useMemo(() => {
    const defaultFilter = filterList.filters[filterList.defaultFilterIndex];
    const unfiltered = filterList.filters.find(f => f.unfiltered);
    return defaultFilter || unfiltered;
  }, [filterList]);
}

/**
 * Returns the default filter name for the selected filter list
 *
 * @returns the default filter name
 */
export function useDefaultFilterName() {
  const defaultFilter: FilterTypes.Filter = useDefaultFilter();

  return useMemo(() => defaultFilter?.filterDefinition?.name || UNFILTERED, [defaultFilter]);
}

/**
 * Will find all the unique sampleRates within uiChannelSegments by dataSegments.
 *
 * @param uiChannelSegments the uiChannelSegments will be used to find all unique sample rates
 * @param cachedFilterDefinitionsBySampleRate current record of cached filter definitions
 * @returns unique sample rates found in the given uiChannelSegments
 */
function getSampleRatesToDesign(
  uiChannelSegments: UiChannelSegment[],
  cachedFilterDefinitionsBySampleRate: Record<SampleRate, FilterDefinition> = {}
): number[] {
  const sampleRateMap = new Set([]);
  const filterDefinitionSampleRates = Object.keys(cachedFilterDefinitionsBySampleRate).map(key =>
    Number(key)
  );
  uiChannelSegments.forEach(({ channelSegment }) => {
    channelSegment.dataSegments.forEach(dataSegment => {
      // If the sample rate does not exist in the cached filter definition sample rates
      if (
        isDataClaimCheck(dataSegment.data) &&
        filterDefinitionSampleRates.indexOf(dataSegment.data.sampleRate) < 0
      ) {
        sampleRateMap.add(dataSegment.data.sampleRate);
      }
    });
  });

  return Array.from(sampleRateMap);
}

/**
 * For any sample rate in the given ui channel segments, this will design
 * new versions of the filterDefinition given if they do not already exist in the cache.
 *
 * @param filterDefinition the current filter definition
 * @param uiChannelSegments the ui channel segments the filter will eventually apply to
 * @param cachedFilterDefinitions existing list of cached filter definitions
 * @param groupDelaySec the group delay seconds config setting
 * @param sampleRateToleranceHz the sample rate tolerance in hertz config setting
 * @param taper the taper config setting
 * @param removeGroupDelay the remove group delay config setting
 * @returns an object containing the newly created filter definitions as an array, and
 * an updated record of all cached and created filter definitions
 */
async function designFiltersAndGetUpdatedFilterDefinitions(
  filterDefinition: FilterDefinition,
  uiChannelSegments: UiChannelSegment[],
  cachedFilterDefinitions: FilterDefinitionsRecord,
  groupDelaySecs: number,
  sampleRateToleranceHz: number,
  taper: number,
  removeGroupDelay: boolean
): Promise<{
  newFilterDefinitions: FilterDefinition[];
  filterDefinitionRecord: Record<SampleRate, FilterDefinition>;
}> {
  const sampleRatesToDesign = getSampleRatesToDesign(
    uiChannelSegments,
    cachedFilterDefinitions[filterDefinition.name]
  );

  let newFilterDefinitions = [];
  const filterDefinitionRecord = { ...cachedFilterDefinitions[filterDefinition.name] };

  // Avoid running designFilterDefinitions if possible
  if (sampleRatesToDesign.length) {
    newFilterDefinitions = await designFilterDefinitions(
      [filterDefinition],
      sampleRatesToDesign,
      groupDelaySecs,
      sampleRateToleranceHz,
      taper,
      removeGroupDelay
    );

    // Update the record with new filter definitions
    newFilterDefinitions.forEach(fd => {
      filterDefinitionRecord[fd.filterDescription.parameters.sampleRateHz] = fd;
    });
  }

  return Promise.resolve({
    newFilterDefinitions,
    filterDefinitionRecord
  });
}

/**
 * Provides a callback that puts additional bounds around the filter function
 * to revert to unfiltered (or the default filtered) data in case of an error with the
 * ui-filter-processor.
 *
 * @param channelName the current raw channel name
 * @param channelDescriptors an array of objs that contain a fully populated channel
 * and the corresponding UI channel segment
 * @param filterName the name of the filter to apply
 * @param filterDefinitions a record of Filter Definitions by hz
 * @param taper number of samples for cosine taper
 * @param removeGroupDelay optional boolean to determine if group delay should be applied
 */
function useFilterWithFallback() {
  const dispatch = useAppDispatch();
  const defaultFilter: FilterTypes.Filter = useDefaultFilter();

  return React.useCallback(
    async (
      channelName: string,
      channelDescriptors: ChannelDescriptor[],
      filterName: string,
      filterDefinitions: Record<SampleRate, FilterDefinition>,
      taper: number,
      removeGroupDelay: boolean
    ) => {
      if (!channelDescriptors.length) return;

      await Promise.all(
        channelDescriptors.map(async channelDescriptor => {
          Timer.start(`Filtered ${channelName}/${filterName}`);
          // Will filter and store the data
          const result = await filter(
            channelDescriptor,
            filterDefinitions,
            taper,
            removeGroupDelay
          );
          Timer.end(`Filtered ${channelName}/${filterName}`);
          return result.uiChannelSegments;
        })
      )
        .then(uiChannelSegments => {
          dispatch(
            dataSlice.actions.addChannelSegments([
              {
                name: channelName,
                channelSegments: uiChannelSegments.flatMap(uiChannelSegment => uiChannelSegment)
              }
            ])
          );
        })
        .catch(error => {
          logger.error(error?.message);
          // Update filter for channel, to the default filter in case of failure
          dispatch(
            waveformSlice.actions.setFilterForChannel({
              channelOrSdName: channelName,
              filter: defaultFilter
            })
          );
        });
    },
    [dispatch, defaultFilter]
  );
}

/**
 * Produces a list of channel descriptors for use in filtering
 *
 * @param uiChannelSegments an array of UI channel segments
 * @param channels an array of all channels available
 * @returns an array of channel descriptors
 */
function getChannelDescriptors(
  uiChannelSegments: UiChannelSegment[],
  channels: ChannelTypes.Channel[]
): ChannelDescriptor[] {
  // Organize the channels by name
  const channelsByName: Record<string, ChannelTypes.Channel> = uiChannelSegments.reduce(
    (accumulatedChannelsByName, uiChannelSegment) => {
      const channel = channels.find(
        ({ name }) => uiChannelSegment.channelSegmentDescriptor.channel.name === name
      );
      if (!channel) return accumulatedChannelsByName;
      return {
        ...accumulatedChannelsByName,
        [uiChannelSegment.channelSegmentDescriptor.channel.name]: channel
      };
    },
    {}
  );

  // Create a list of channel descriptors
  return Object.entries(channelsByName).map(([name, channel]) => {
    return {
      channel,
      uiChannelSegments: uiChannelSegments.filter(
        ({ channelSegmentDescriptor }) => channelSegmentDescriptor.channel.name === name
      )
    };
  });
}

/**
 * Given an array of channel names, the useDesignAndFilter hook designs necessary filters
 * and applies filters to those channel names. Do not use this directly, use {@link useFilterQueue}
 * to filter instead.
 *
 * @param channelNamesToFilter An array of channel names
 */
function useDesignAndFilter(toFilter: ProcessedItemsCacheRecord) {
  const dispatch = useAppDispatch();

  const defaultFilterName = useDefaultFilterName();
  const channels: ChannelTypes.Channel[] = useChannels();
  const cachedFilterDefinitions: FilterDefinitionsRecord = useAppSelector(selectFilterDefinitions);
  const uiChannelSegmentsRecord: UIChannelSegmentRecord = useAppSelector(selectUiChannelSegments);
  const processingAnalystConfigurationQuery = useGetProcessingAnalystConfigurationQuery();
  const channelFilters: ChannelFilterRecord = useAppSelector(selectChannelFilters);
  const filterWithFallback = useFilterWithFallback();

  useEffect(() => {
    if (!Object.keys(toFilter).length || !processingAnalystConfigurationQuery?.data?.gmsFilters)
      return;

    const {
      defaultTaper,
      defaultRemoveGroupDelay,
      defaultGroupDelaySecs,
      defaultSampleRateToleranceHz
    } = processingAnalystConfigurationQuery.data.gmsFilters;

    // Build list of promises
    const promises = Object.values(toFilter).flatMap(cache => {
      return Object.entries(cache).flatMap(async ([channelName, uiChannelSegmentIdSet]) => {
        const { filterDefinition } = channelFilters[channelName];

        // Get unfiltered uiChannelSegments by channelName
        const uiChannelSegments = uiChannelSegmentsRecord[channelName][
          defaultFilterName
        ].filter(({ channelSegmentDescriptor }) =>
          uiChannelSegmentIdSet.has(createChannelSegmentString(channelSegmentDescriptor))
        );

        // Create a list of channel descriptors
        const channelDescriptors: ChannelDescriptor[] = getChannelDescriptors(
          uiChannelSegments,
          channels
        );

        Timer.start(`Designed filter definitions ${channelName}/${filterDefinition.name}`);

        // ! Might fire more then required
        const {
          newFilterDefinitions,
          filterDefinitionRecord
        } = await designFiltersAndGetUpdatedFilterDefinitions(
          filterDefinition,
          uiChannelSegments,
          cachedFilterDefinitions,
          defaultGroupDelaySecs,
          defaultSampleRateToleranceHz,
          defaultTaper,
          defaultRemoveGroupDelay
        );

        Timer.end(`Designed filter definitions ${channelName}/${filterDefinition.name}`, 1000);

        if (newFilterDefinitions && newFilterDefinitions.length > 0) {
          dispatch(dataSlice.actions.addDesignedFilterDefinitions(newFilterDefinitions));
        }

        return filterWithFallback(
          channelName,
          channelDescriptors,
          filterDefinition.name,
          filterDefinitionRecord,
          defaultTaper,
          defaultRemoveGroupDelay
        );
      });
    });

    // Bail if we dont have any promises
    if (!promises.length) return;

    Promise.all(promises).catch(error => {
      logger.error(error);
    });
  }, [
    cachedFilterDefinitions,
    channelFilters,
    toFilter,
    channels,
    dispatch,
    processingAnalystConfigurationQuery.data.gmsFilters,
    uiChannelSegmentsRecord,
    filterWithFallback,
    defaultFilterName
  ]);
}

/**
 * Provide a list of channel segment descriptors that are able to be processed now.
 *
 * @param uiChannelSegmentsRecord the ui channel segment record
 * @param defaultFilterName the default filter name (typically Unfiltered)
 * @param channelFilters a record of channel filters
 * @param channelsByName a record of channels by name
 * @param processedItemsCache the current processed items cache
 * @param processingAnalystConfigurationQuery the configuration containing required filtering defaults
 * @returns a processed items cache record
 */
function getFilterQueueDelta(
  uiChannelSegmentsRecord: UIChannelSegmentRecord,
  defaultFilterName: string,
  channelFilters: ChannelFilterRecord,
  channelsByName: Record<string, ChannelTypes.Channel>,
  processedItemsCache: ProcessedItemsCacheRecord,
  processingAnalystConfigurationQuery: ProcessingAnalystConfigurationQuery
): ProcessedItemsCacheRecord {
  const delta: ProcessedItemsCacheRecord = {};

  if (!processingAnalystConfigurationQuery?.data || !defaultFilterName) return delta;

  Object.entries(channelFilters).forEach(([channelName, channelFilter]) => {
    if (!uiChannelSegmentsRecord?.[channelName]?.[defaultFilterName]) return;

    const filterName = channelFilter?.filterDefinition?.name || defaultFilterName;

    uiChannelSegmentsRecord[channelName][defaultFilterName].forEach(uiChannelSegment => {
      const id = createChannelSegmentString(uiChannelSegment.channelSegmentDescriptor);
      if (
        processedItemsCache?.[filterName]?.[channelName]?.has(id) ||
        !channelsByName[uiChannelSegment.channelSegmentDescriptor.channel.name]
      )
        return;

      if (!delta[filterName]) delta[filterName] = {};
      if (!delta[filterName][channelName]) delta[filterName][channelName] = new Set();

      delta[filterName][channelName].add(id);
    });
  });

  return delta;
}

/**
 * useFilterQueue watches for changes in channelFilters, uiChannelSegmentsRecord, channels and
 * creates a queue of channel names to filter. Then it calls useDesignAndFilter design and apply
 * filters to those channels.
 */
export function useFilterQueue() {
  const timeRange = useAppSelector(state => state.app.workflow.timeRange);
  const oldTimeRange = usePrevious(timeRange, undefined);

  // TODO: Because we use ref, if two instances are open we could process dupe filter data
  // * Suggestion: Base operation on a unique key, to insure only one instance runs at a given time
  const processedItems = useRef({});

  if (oldTimeRange?.startTimeSecs !== timeRange?.startTimeSecs) {
    logger.info('Filter queue is watching new interval');
    processedItems.current = {};
  }

  const channels: ChannelTypes.Channel[] = useChannels();
  const uiChannelSegmentsRecord: UIChannelSegmentRecord = useAppSelector(selectUiChannelSegments);
  const processingAnalystConfigurationQuery: ProcessingAnalystConfigurationQuery = useGetProcessingAnalystConfigurationQuery();
  const channelFilters: ChannelFilterRecord = useAppSelector(selectChannelFilters);

  const defaultFilterName = useDefaultFilterName();

  const channelsByName: Record<string, ChannelTypes.Channel> = useMemo(
    () =>
      channels.reduce(
        (accumulatedChannelsByName, channel) => ({
          ...accumulatedChannelsByName,
          [channel.name]: channel
        }),
        {}
      ),
    [channels]
  );

  const delta = getFilterQueueDelta(
    uiChannelSegmentsRecord,
    defaultFilterName,
    channelFilters,
    channelsByName,
    processedItems.current,
    processingAnalystConfigurationQuery
  );

  // Merge the delta back into the cache
  Object.entries(delta).forEach(([filterName, cache]) => {
    Object.entries(cache).forEach(([channelName, set]) => {
      if (!processedItems.current[filterName]) processedItems.current[filterName] = {};
      if (!processedItems.current[filterName][channelName])
        processedItems.current[filterName][channelName] = new Set();
      processedItems.current[filterName][channelName] = new Set([
        ...processedItems.current[filterName][channelName],
        ...set
      ]);
    });
  });

  // Get full list of channel names to filter
  useDesignAndFilter(delta);
}

/**
 * A helper hook that returns a callback function that updates the channel filters in redux
 * based on the users' selection. If nothing is selected, it behaves as though every station
 * is selected. If stations are selected, it updates the filters for those default channels,
 * using the station name as the channel name key.
 */
function useUpdateChannelFilters() {
  const dispatch = useAppDispatch();
  const selectedStationsAndChannels = useAppSelector(selectSelectedStationsAndChannelIds);
  const visibleStations = useVisibleStations();
  const channelFilters = useAppSelector(selectChannelFilters);

  return React.useCallback(
    (selected: FilterTypes.Filter) => {
      let updatedChannelFilters: ChannelFilterRecord = {};
      if (selectedStationsAndChannels.length === 0) {
        // select all stations (but not raw channels)
        if (visibleStations) {
          visibleStations.forEach(s => {
            updatedChannelFilters[s.name] = selected;
          });
        }
      } else {
        // modify selected channels and signal detections
        updatedChannelFilters = produce(channelFilters, draft => {
          selectedStationsAndChannels.forEach(s => {
            draft[s] = selected;
          });
        });
      }

      dispatch(waveformActions.setChannelFilters(updatedChannelFilters));
    },
    [channelFilters, dispatch, selectedStationsAndChannels, visibleStations]
  );
}

/**
 * @example
 * const { selectedFilter, setSelectedFilter } = useSelectedFilter();
 *
 * @returns an object containing the selected filer, and a setter function. The setter
 * function takes either a string (the filter name) or a filter, or null to unset the selection.
 *
 * All elements returned should be referentially stable, so they may be checked for
 * shallow equality in dependency arrays and memoization functions.
 */
export const useSelectedFilter = (): {
  selectedFilter: FilterTypes.Filter;
  setSelectedFilter: (selectedFilter: FilterTypes.Filter | null) => void;
} => {
  // initiate the subscription to the query data. selectSelectedFilterList will get the data that this stores.
  useGetFilterListsDefinitionQuery();
  const dispatch = useAppDispatch();
  const selectedFilterList = useAppSelector(selectSelectedFilterList);
  const selectedFilterIndex = useAppSelector(selectSelectedFilterIndex);

  const updateChannelFilters = useUpdateChannelFilters();
  return {
    selectedFilter: selectedFilterList.filters[selectedFilterIndex],
    setSelectedFilter: React.useCallback(
      (selected: FilterTypes.Filter | null) => {
        const indexOfFilter = selectedFilterList.filters.findIndex(fl => fl === selected);
        updateChannelFilters(selected);
        dispatch(analystActions.setSelectedFilterIndex(indexOfFilter));
      },
      [dispatch, selectedFilterList.filters, updateChannelFilters]
    )
  };
};

/**
 * @returns an object containing the HotkeyCycleList (which maps indices to whether a filter
 * is in the hotkey cycle), and a setter to set whether a filter at a given index is within that list.
 */
export const useHotkeyCycle = (): {
  hotkeyCycle: HotkeyCycleList;
  setIsFilterWithinHotkeyCycle: (index: number, isWithinCycle: boolean) => void;
} => {
  const hotkeyCycle = useAppSelector(selectHotkeyCycle);
  const dispatch = useAppDispatch();
  return {
    hotkeyCycle,
    setIsFilterWithinHotkeyCycle: (index, isWithinCycle) =>
      dispatch(analystActions.setIsFilterWithinHotkeyCycle({ index, isWithinCycle }))
  };
};

/**
 * @returns two functions, one to select the next filter, and one to select the previous filter.
 */
export const useFilterCycle = (): {
  selectNextFilter: () => void;
  selectPreviousFilter: () => void;
  selectUnfiltered: () => void;
} => {
  const selectedFilterIndex = useAppSelector(selectSelectedFilterIndex);
  const { hotkeyCycle } = useHotkeyCycle();
  const dispatch = useAppDispatch();
  const filterList = useSelectedFilterList();
  const updateChannelFilters = useUpdateChannelFilters();
  const selectNextFilter = React.useCallback(() => {
    if (selectedFilterIndex == null || !hotkeyCycle?.length) {
      return;
    }
    let i = selectedFilterIndex + 1 < hotkeyCycle.length ? selectedFilterIndex + 1 : 0;
    while (!hotkeyCycle[i] && i !== selectedFilterIndex) {
      i += 1;
      if (i >= hotkeyCycle.length) {
        i = 0;
      }
    }
    updateChannelFilters(filterList.filters[i]);
    dispatch(analystActions.setSelectedFilterIndex(i));
  }, [dispatch, filterList?.filters, hotkeyCycle, selectedFilterIndex, updateChannelFilters]);
  const selectPreviousFilter = React.useCallback(() => {
    if (selectedFilterIndex == null || !hotkeyCycle?.length) {
      return;
    }
    let i = selectedFilterIndex - 1 >= 0 ? selectedFilterIndex - 1 : hotkeyCycle.length - 1;
    while (!hotkeyCycle[i] && i !== selectedFilterIndex) {
      i -= 1;
      if (i < 0) {
        i = hotkeyCycle.length - 1;
      }
    }
    updateChannelFilters(filterList.filters[i]);
    dispatch(analystActions.setSelectedFilterIndex(i));
  }, [dispatch, filterList?.filters, hotkeyCycle, selectedFilterIndex, updateChannelFilters]);
  const selectUnfiltered = React.useCallback(() => {
    if (filterList?.filters == null) {
      return;
    }
    const unfilteredIndex = filterList.filters.findIndex(f => f.unfiltered);
    updateChannelFilters(filterList.filters[unfilteredIndex]);
    dispatch(analystActions.setSelectedFilterIndex(unfilteredIndex));
  }, [dispatch, filterList?.filters, updateChannelFilters]);
  return {
    selectNextFilter,
    selectPreviousFilter,
    selectUnfiltered
  };
};
