import { UNFILTERED } from '@gms/common-model/lib/filter/types';
import { useEffect, useMemo } from 'react';

import { selectDerivedChannels, selectRawChannels, selectUiChannelSegments } from '../api';
import { getChannelsByNamesTimeRange } from '../api/data/channel/get-channels-by-names-timerange';
import { UIStateError } from '../error-handling/ui-state-error';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';
import { useGetSignalDetections } from './signal-detection-hooks';
import { useAllStations } from './station-definition-hooks';
import { useViewableInterval } from './waveform-hooks';

/**
 * Uses a selector to return an array of channels
 *
 * @returns returns an array of channels
 */
export const useChannels = () => {
  const rawChannels = useAppSelector(selectRawChannels);
  const derivedChannels = useAppSelector(selectDerivedChannels);
  return useMemo(() => {
    return [...Object.values(rawChannels), ...Object.values(derivedChannels)];
  }, [rawChannels, derivedChannels]);
};

/**
 * Uses a selector to return an array of raw channels
 *
 * @returns returns an array of channels
 */
export const useRawChannels = () => {
  const rawChannels = useAppSelector(selectRawChannels);
  return useMemo(() => {
    return Object.values(rawChannels);
  }, [rawChannels]);
};

/**
 * Uses a selector to return an array of derived channels
 *
 * @returns returns an array of channels
 */
export const useDerivedChannels = () => {
  const derivedChannels = useAppSelector(selectDerivedChannels);
  return useMemo(() => {
    return Object.values(derivedChannels);
  }, [derivedChannels]);
};

/**
 * Uses a selector to return the channel record
 *
 * @returns returns a channel record
 */
export const useChannelsRecord = () => {
  const rawChannels = useAppSelector(selectRawChannels);
  const derivedChannels = useAppSelector(selectDerivedChannels);
  return useMemo(() => {
    return { ...rawChannels, ...derivedChannels };
  }, [rawChannels, derivedChannels]);
};

/**
 * Gets the history of the channels requested by the getChannelsByNamesTimeRange fetch
 * requests
 *
 * @returns returns an array of channels
 */
export const useGetChannelsByNamesHistory = () => {
  const timeRange = useAppSelector(state => state.app.workflow.timeRange);
  const history = useAppSelector(state => state.data.queries.getChannelsByNamesTimeRange);

  return useMemo(() => {
    // Nothing has been requested yet
    if (
      !timeRange ||
      !history ||
      typeof history[timeRange.startTimeSecs] === 'undefined' ||
      history[timeRange.startTimeSecs] === null
    ) {
      return [];
    }

    return Object.values(history[timeRange.startTimeSecs]).flatMap(hist => hist.arg.channelNames);
  }, [history, timeRange]);
};

/**
 * Queries for all channels, without consideration for their visibility
 *
 * Uses the `useGetSignalDetections` hook to get derived channels.
 */
export const useGetChannelsQuery = () => {
  const dispatch = useAppDispatch();
  const timeRange = useAppSelector(state => state.app.workflow.timeRange);
  const [viewableInterval] = useViewableInterval();

  // useGetSignalDetections will populate uiChannelSegments with derived channels
  // so it must be called here to get ALL channels, not just raw
  useGetSignalDetections(viewableInterval);

  const allStations = useAllStations();
  const uiChannelSegments = useAppSelector(selectUiChannelSegments);
  const cachedChannelNames = useGetChannelsByNamesHistory();

  const newRawChannelNames = useMemo(() => {
    if (!allStations) return [];
    const allRawChannelNames = allStations.flatMap(station =>
      station.allRawChannels.map(channel => channel.name)
    );
    return allRawChannelNames.filter(name => cachedChannelNames.indexOf(name) < 0);
  }, [allStations, cachedChannelNames]);

  const newDerivedChannelNames = useMemo(() => {
    const allChannelsSet = new Set(
      Object.values(uiChannelSegments).flatMap(value => {
        return value[UNFILTERED].map(
          uiChannelSegment => uiChannelSegment.channelSegment.channelName
        );
      })
    );
    // Unique list of all channel names
    return Array.from(allChannelsSet).filter(name => cachedChannelNames.indexOf(name) < 0);
  }, [uiChannelSegments, cachedChannelNames]);

  const newChannelNames = useMemo(() => {
    return [...newRawChannelNames, ...newDerivedChannelNames];
  }, [newRawChannelNames, newDerivedChannelNames]);

  useEffect(() => {
    dispatch(
      getChannelsByNamesTimeRange({
        channelNames: newChannelNames,
        startTime: timeRange?.startTimeSecs,
        endTime: timeRange?.endTimeSecs
      })
    ).catch(error => {
      throw new UIStateError(error);
    });
  }, [newChannelNames, timeRange, dispatch]);
};
