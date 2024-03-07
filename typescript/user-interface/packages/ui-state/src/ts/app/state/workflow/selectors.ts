import type { TimeRange } from '@gms/common-model/lib/common/types';

import type { AppState } from '../../store';

/**
 * A redux selector for returning the open interval name.
 *
 * @example const name = useAppState(selectOpenIntervalName);
 *
 * @param state the redux app state
 * @returns the open interval name
 */
export const selectOpenIntervalName = (state: AppState): string => {
  return state.app.workflow.openIntervalName;
};

/**
 * A redux selector for returning the open activity names.
 *
 * @example const names = useAppState(selectOpenActivityNames);
 *
 * @param state the redux app state
 * @returns the list of open activity names
 */
export const selectOpenActivityNames = (state: AppState): string[] => {
  return state.app.workflow.openActivityNames;
};

/**
 * A redux selector for returning the open time range.
 *
 * @example const timerange = useAppState(selectWorkflowTimerange);
 *
 * @param state the redux app state
 * @returns the open time range
 */
export const selectWorkflowTimeRange = (state: AppState): TimeRange => {
  return state.app.workflow.timeRange;
};
