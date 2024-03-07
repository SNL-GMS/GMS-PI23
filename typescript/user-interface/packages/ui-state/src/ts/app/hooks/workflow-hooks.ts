import type { WorkflowTypes } from '@gms/common-model';
import React from 'react';

import { useStageIntervalsByIdAndTimeQuery, useWorkflowQuery } from '../api';
import { selectOpenIntervalName, selectWorkflowTimeRange } from '../state';
import { useOperationalTimePeriodConfiguration } from './operational-time-period-configuration-hooks';
import { useAppSelector } from './react-redux-hooks';

/**
 * Create a unique key based on the selected Workflow Interval
 */
export const useWorkflowIntervalUniqueId = (): string => {
  const currentInterval = useAppSelector(state => state.app.workflow.timeRange);

  const analysisMode = useAppSelector(state => state.app.workflow.analysisMode);

  const openIntervalName = useAppSelector(state => state.app.workflow.openIntervalName);
  return `currentIntervalStartTime ${currentInterval.startTimeSecs} analysisMode ${analysisMode} openIntervalName ${openIntervalName}`;
};

/**
 * @returns the result of the useStageIntervalsByIdAndTimeQuery query with the stages from the workflow query,
 * and the time period from the operational time period configuration from processing config
 */
export const useStageIntervalsQuery = () => {
  const workflowQuery = useWorkflowQuery();

  const stageNames = React.useMemo(
    () =>
      workflowQuery.isSuccess ? workflowQuery.data?.stages?.map(stage => stage.name) ?? [] : [],
    [workflowQuery.isSuccess, workflowQuery.data?.stages]
  );

  const { timeRange } = useOperationalTimePeriodConfiguration();
  return useStageIntervalsByIdAndTimeQuery(stageNames, timeRange);
};

/**
 * Gets the stage id for the currently open interval.
 * Returns undefined if no stage interval is found, or if no interval is open.
 */
export function useStageId(): WorkflowTypes.IntervalId | undefined {
  const { data: workflowIntervals } = useStageIntervalsQuery() ?? {};
  const openIntervalName = useAppSelector(selectOpenIntervalName);
  const openTimeRange = useAppSelector(selectWorkflowTimeRange);
  if (openIntervalName == null || openTimeRange?.startTimeSecs == null) {
    return undefined;
  }
  const stageId = workflowIntervals
    ?.filter(interval => {
      return interval.name === openIntervalName;
    })
    .flatMap(stageInt => stageInt.value)
    .find(
      stageInt =>
        stageInt.name === openIntervalName &&
        stageInt.startTime === openTimeRange.startTimeSecs &&
        stageInt.endTime === openTimeRange.endTimeSecs
    )?.intervalId;

  if (stageId == null) {
    // Handle the Open Anything case by building a stage interval ID
    return {
      startTime: openTimeRange.startTimeSecs,
      definitionId: {
        name: openIntervalName
      }
    };
  }
  return stageId;
}
