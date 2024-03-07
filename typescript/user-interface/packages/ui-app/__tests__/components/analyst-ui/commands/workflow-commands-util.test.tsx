import { WorkflowTypes } from '@gms/common-model';

import {
  getActiveAnalystsRollup,
  getBestInterval,
  getEarliestInterval,
  getLatestInterval
} from '../../../../src/ts/components/analyst-ui/commands/workflow-commands-util';
import { stageIntervals } from '../../../__data__/workflow-data';

describe('Workflow Commands Utils', () => {
  describe('getLatestInterval', () => {
    it('gets the latest interval', () => {
      expect(getLatestInterval(stageIntervals[0].value)).toBe(stageIntervals[0].value[0]);
    });
  });
  describe('getEarliestInterval', () => {
    it('gets the latest interval', () => {
      expect(getEarliestInterval(stageIntervals[0].value)).toBe(stageIntervals[0].value[1]);
    });
  });
  describe('getActiveAnalystsRollup', () => {
    it('returns a list of the active analysts', () => {
      expect(getActiveAnalystsRollup(stageIntervals[0].value[0])).toMatchObject([
        'TestUser',
        'TestUser2'
      ]);
    });
    it('returns undefined if given something other than an interactiveAnalysisStageInterval', () => {
      expect(getActiveAnalystsRollup(stageIntervals[0] as any)).toBeUndefined();
    });
  });
  describe('getBestInterval', () => {
    it('returns undefined if there are no stage intervals', () => {
      expect(getBestInterval([], 'TestUser')).toBeUndefined();
    });
    it('gets the earliest interval that the user currently has open', () => {
      const earliest = {
        ...stageIntervals[0].value[0],
        startTime: stageIntervals[0].value[0].startTime - 1000
      };
      expect(
        getBestInterval(
          [...stageIntervals[0].value, earliest] as WorkflowTypes.StageInterval[],
          'TestUser'
        )
      ).toBe(earliest);
    });
    it('returns the earliest not completed interval if there is nothing that the user has open', () => {
      const earliestNotStarted = {
        ...stageIntervals[0].value[0],
        startTime: stageIntervals[0].value[0].startTime - 1000,
        status: WorkflowTypes.IntervalStatus.NOT_STARTED
      };
      const earliest = {
        ...stageIntervals[0].value[0],
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        startTime: stageIntervals[0].value[0].startTime - 100000,
        status: WorkflowTypes.IntervalStatus.COMPLETE
      };
      expect(
        getBestInterval(
          [
            ...stageIntervals[0].value,
            earliestNotStarted,
            earliest
          ] as WorkflowTypes.StageInterval[],
          'NewUser'
        )
      ).toBe(earliestNotStarted);
    });
  });
});
