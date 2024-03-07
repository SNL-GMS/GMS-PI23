import { chunkRanges, determineExcludedRanges } from '@gms/common-util/lib/common-util';
import React from 'react';
import type { QcSegmentRecord } from 'src/ts/types';

import type {
  FindQCSegmentsByChannelAndTimeRangeHistory,
  FindQCSegmentsByChannelAndTimeRangeQueryArgs
} from '../api';
import { useGetProcessingAnalystConfigurationQuery } from '../api';
import {
  findQCSegmentsByChannelAndTimeRange,
  shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery
} from '../api/data/waveform/find-qc-segments-by-channel-and-time-range';
import { UIStateError } from '../error-handling/ui-state-error';
import type { AsyncFetchResult } from '../query';
import { useFetchHistoryStatus } from './fetch-history-hooks';
import { useAppDispatch, useAppSelector } from './react-redux-hooks';

const DEFAULT_MAX_TIME_REQUEST = 5400;

/**
 * Defines async fetch result for the qc segments by channel history.
 *
 * @see {@link AsyncFetchResult}
 */
export type FindQCSegmentsByChannelAndTimeRangeHistoryFetchResult = AsyncFetchResult<
  FindQCSegmentsByChannelAndTimeRangeHistory
>;

/**
 * Defines async fetch result for the qc segments. It contains flags indicating
 * the status of the request.
 *
 * @see {@link AsyncFetchResult}
 */
export type QcSegmentFetchResult = AsyncFetchResult<QcSegmentRecord>;

/**
 * A hook that can be used to return the current history of the qc segments by channel query.
 * This includes the following information:
 *  - the async fetch status of all the async requests
 *  - the `data`: the history of the `getChannelSegmentsByChannel` queries
 *
 * @see {@link ChannelSegmentsByChannelHistoryFetchResult}
 *
 * @returns the current history of the qc segments by channel query.
 */
export const useFindQCSegmentsByChannelAndTimeRangeHistory = (): FindQCSegmentsByChannelAndTimeRangeHistoryFetchResult => {
  const history = useAppSelector(state => state.data.queries.findQCSegmentsByChannelAndTimeRange);
  return useFetchHistoryStatus<FindQCSegmentsByChannelAndTimeRangeQueryArgs>(history);
};

/**
 * @returns the skipped result for the get qc segments by channels query
 */
const useFindQcSegmentsByChannelsSkippedResult = (): QcSegmentFetchResult => {
  const result = React.useRef({
    data: {},
    pending: 0,
    fulfilled: 0,
    rejected: 0,
    isLoading: false,
    isError: false
  });
  return result.current;
};

/**
 * A hook that issues the requests for the qc segments by channels query.
 *
 * @param args the qc segments by channels query arguments
 */
const useFetchQcSegmentsByChannelsAndTimeRangeQuery = (
  args: FindQCSegmentsByChannelAndTimeRangeQueryArgs
): void => {
  const dispatch = useAppDispatch();
  const history = useFindQCSegmentsByChannelAndTimeRangeHistory();
  // TODO: Adjust config value once the canned end point is no longer in use.
  // The canned end point returns far too many segments to work on 5 minute request size

  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const maxTimeRangeRequestInSeconds =
    processingAnalystConfiguration.data?.endpointConfigurations?.fetchQcSegmentsByChannelsAndTime
      ?.maxTimeRangeRequestInSeconds || DEFAULT_MAX_TIME_REQUEST;

  React.useEffect(() => {
    const ranges = determineExcludedRanges(
      Object.values(history.data[args.startTime] ?? []).map(v => ({
        start: v.arg.startTime,
        end: v.arg.endTime
      })),
      { start: args.startTime, end: args.endTime }
    );

    // chunk up the data requests based on the `maxTimeRangeRequestInSeconds`
    const chunkedRanges = chunkRanges(ranges, maxTimeRangeRequestInSeconds);

    chunkedRanges?.forEach(r => {
      const dispatchParam = findQCSegmentsByChannelAndTimeRange({
        channels: args.channels,
        startTime: r.start,
        endTime: r.end
      });

      dispatch(dispatchParam).catch(error => {
        throw new UIStateError(error);
      });
    });
  }, [dispatch, args, history.data, maxTimeRangeRequestInSeconds]);
};

/**
 * Helper function that filters a QcSegmentRecord for the provided unique names.
 *
 *
 * @returns a filtered QcSegmentRecord
 */
const filterQcSegmentsByChannelNames = (
  qcSegments: QcSegmentRecord,
  names: string[]
): QcSegmentRecord => {
  const filteredQcSegments: QcSegmentRecord = {};
  if (names) {
    names.forEach(name => {
      if (qcSegments[name]) {
        filteredQcSegments[name] = qcSegments[name];
      }
    });
  }
  return filteredQcSegments;
};

/**
 * Helper function that filters a QcSegmentRecord for the provided start and end times.
 * channels segments that partially fall within the time range are returned
 *
 *
 * @returns a filtered QcSegmentRecord
 */
const filterQcSegmentsByTime = (
  qcSegments: QcSegmentRecord,
  startTime: number,
  endTime: number
): QcSegmentRecord => {
  if (!startTime || !endTime) {
    return qcSegments;
  }
  const filteredQcSegments: QcSegmentRecord = {};
  Object.entries(qcSegments).forEach(channelEntry => {
    const filteredRecord = {};
    Object.entries(channelEntry[1]).forEach(segmentEntry => {
      const [id, qcSegment] = segmentEntry;
      if (
        (qcSegment.versionHistory[qcSegment.versionHistory.length - 1].startTime <= endTime &&
          qcSegment.versionHistory[qcSegment.versionHistory.length - 1].startTime >= startTime) ||
        (qcSegment.versionHistory[qcSegment.versionHistory.length - 1].endTime >= startTime &&
          qcSegment.versionHistory[qcSegment.versionHistory.length - 1].endTime <= endTime)
      ) {
        filteredRecord[id] = qcSegment;
      }
    });
    filteredQcSegments[channelEntry[0]] = filteredRecord;
  });
  return filteredQcSegments;
};

/**
 * A hook that can be used to retrieve qc segments for the current interval and visible channels/stations.
 *
 * @returns the qc segments result.
 */
export const useQcSegments = (
  args: FindQCSegmentsByChannelAndTimeRangeQueryArgs
): QcSegmentFetchResult => {
  const history = useFindQCSegmentsByChannelAndTimeRangeHistory();

  // issue any new fetch requests
  useFetchQcSegmentsByChannelsAndTimeRangeQuery(args);

  // retrieve all qc segments from the state
  const qcSegments = useAppSelector(state => state.data.qcSegments);
  const skippedReturnValue = useFindQcSegmentsByChannelsSkippedResult();

  const data = React.useMemo(
    () =>
      // filter out the qc segments based on the query parameters
      filterQcSegmentsByTime(
        filterQcSegmentsByChannelNames(
          qcSegments,
          args.channels.map(c => c.name)
        ),
        args.startTime,
        args.endTime
      ),
    [args, qcSegments]
  );

  return React.useMemo(() => {
    if (shouldSkipFindQCSegmentsByChannelAndTimeRangeQuery(args)) {
      return skippedReturnValue;
    }

    return { ...history, data };
  }, [args, data, history, skippedReturnValue]);
};
