import type { WorkflowTypes } from '@gms/common-model';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';

import { useStageId } from '../../../src/ts/app/hooks/workflow-hooks';
import { workflowActions } from '../../../src/ts/app/state/workflow/workflow-slice';
import { getStore } from '../../../src/ts/app/store';

const store = getStore();
describe('Workflow Hooks', () => {
  describe('useStageId', () => {
    beforeEach(() => {
      store.dispatch(workflowActions.setOpenActivityNames(['AL1 Event Review']));
      store.dispatch(workflowActions.setOpenIntervalName('AL1'));
      store.dispatch(
        workflowActions.setTimeRange({ startTimeSecs: 1669150800, endTimeSecs: 1669154400 })
      );
    });
    it('returns the stage id if one is found', () => {
      const renderedStageIdResult = renderHook<{ children }, WorkflowTypes.IntervalId>(useStageId, {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
      });
      const renderedStageId = renderedStageIdResult.result.current;
      expect(renderedStageId).toMatchObject<WorkflowTypes.IntervalId>({
        startTime: 1669150800,
        definitionId: {
          name: 'AL1'
        }
      });
    });
    it('returns a newly created stage interval if no interval of the open type is found', () => {
      store.dispatch(workflowActions.setOpenIntervalName('OPENED_WITH_OPEN_ANYTHING')); // there is no OPENED_WITH_OPEN_ANYTHING interval in the mock data
      const renderedStageIdResult = renderHook<{ children }, WorkflowTypes.IntervalId>(useStageId, {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
      });
      const renderedStageId = renderedStageIdResult.result.current;
      expect(renderedStageId).toMatchObject<WorkflowTypes.IntervalId>({
        startTime: 1669150800,
        definitionId: {
          name: 'OPENED_WITH_OPEN_ANYTHING'
        }
      });
    });
    it('returns a newly created stage interval id if no interval with the expected timeRange is found', () => {
      store.dispatch(workflowActions.setOpenIntervalName('AL1'));
      store.dispatch(
        workflowActions.setTimeRange({ startTimeSecs: 1669150801, endTimeSecs: 1669154401 }) // time range does not match
      );
      const renderedStageIdResult = renderHook<{ children }, WorkflowTypes.IntervalId>(useStageId, {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
      });
      const renderedStageId = renderedStageIdResult.result.current;
      expect(renderedStageId).toMatchObject<WorkflowTypes.IntervalId>({
        startTime: 1669150801,
        definitionId: {
          name: 'AL1'
        }
      });
    });
    it('returns undefined if no open interval name is set', () => {
      store.dispatch(workflowActions.setOpenIntervalName(undefined));
      store.dispatch(
        workflowActions.setTimeRange({ startTimeSecs: 1669150800, endTimeSecs: 1669154400 })
      );
      const renderedStageIdResult = renderHook<{ children }, WorkflowTypes.IntervalId>(useStageId, {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
      });
      const renderedStageId = renderedStageIdResult.result.current;
      expect(renderedStageId).toBeUndefined();
    });
    it('returns undefined if no open time range is set', () => {
      store.dispatch(workflowActions.setOpenIntervalName('AL1'));
      store.dispatch(
        workflowActions.setTimeRange({
          startTimeSecs: null,
          endTimeSecs: null
        })
      );
      const renderedStageIdResult = renderHook<{ children }, WorkflowTypes.IntervalId>(useStageId, {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
      });
      const renderedStageId = renderedStageIdResult.result.current;
      expect(renderedStageId).toBeUndefined();
    });
  });
});
