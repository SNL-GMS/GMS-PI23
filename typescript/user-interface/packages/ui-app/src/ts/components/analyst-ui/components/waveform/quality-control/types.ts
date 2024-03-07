import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc,
  Row
} from '@gms/ui-core-components';

export type QcSegmentContextMenuOpenFunc = ImperativeContextMenuOpenFunc<QcSegment>;

export type QcSegmentsContextMenuOpenFunc = ImperativeContextMenuOpenFunc<QcSegment[]>;

export type QcSegmentContextMenuGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  QcSegment
>;

export type QcSegmentsContextMenuGetOpenCallbackFunc = ImperativeContextMenuGetOpenCallbackFunc<
  QcSegment[]
>;

export enum QcMaskDialogBoxType {
  Create = 'Create',
  Modify = 'Modify',
  Reject = 'Reject',
  Rejected = 'Rejected',
  View = 'View'
}

export interface QcMaskTableButtonParams {
  onClick(x: number, y: number, params: any);
}

/**
 * Interface that describes the QC Mask history information.
 */
export interface QcMaskHistoryRow extends Row {
  id: string;
  versionId: string;
  color: number;
  category: string;
  type: string;
  startTime: number;
  endTime: number;
  channelSegmentIds: string;
  rationale: string;
  modify?: QcMaskTableButtonParams;
  reject?: QcMaskTableButtonParams;
  select?: QcMaskTableButtonParams;
}
