import { QcSegmentCategory, QcSegmentType } from '@gms/common-model/lib/qc-segment';
import {
  DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION,
  humanReadable,
  secondsToString
} from '@gms/common-util';
import type { ColumnDefinition } from '@gms/ui-core-components';

import type { QcMaskHistoryRow } from './types';

/**
 * Column definitions for the overlapping mask table.
 */
export const MASK_HISTORY_COLUMN_DEFINITIONS: ColumnDefinition<
  QcMaskHistoryRow,
  unknown,
  unknown,
  unknown,
  unknown
>[] = [
  {
    headerName: 'Category',
    field: 'category',
    cellStyle: { textAlign: 'left' },
    width: 130,
    cellClass: 'monospace',
    valueFormatter: e => QcSegmentCategory[e.data.category]
  },
  {
    headerName: 'Type',
    field: 'type',
    cellStyle: { textAlign: 'left' },
    width: 130,
    cellClass: 'monospace',
    valueFormatter: e => humanReadable(QcSegmentType[e.data.type] ?? 'Unknown')
  },
  {
    headerName: 'Channel name',
    field: 'channelName',
    cellStyle: { textAlign: 'left' },
    width: 130,
    cellClass: 'monospace',
    valueFormatter: e =>
      e.data.channelName.reduce((str, cn, i) => {
        return `${str}${i > 0 ? ', ' : ''}${cn}`;
      }, '')
  },
  {
    headerName: 'Start time',
    field: 'startTime',
    cellStyle: { textAlign: 'left' },
    width: 170,
    cellClass: 'monospace',
    valueFormatter: e =>
      secondsToString(e.data.startTime, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
  },
  {
    headerName: 'End time',
    field: 'endTime',
    cellStyle: { textAlign: 'left' },
    width: 170,
    cellClass: 'monospace',
    valueFormatter: e =>
      secondsToString(e.data.endTime, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
  },
  {
    headerName: 'Stage',
    field: 'stage',
    cellStyle: { textAlign: 'left' },
    width: 130,
    cellClass: 'monospace',
    valueFormatter: e => String(e.data.stage ?? 'Unknown')
  },
  {
    headerName: 'Author',
    field: 'author',
    cellStyle: { textAlign: 'left' },
    width: 130,
    cellClass: 'monospace'
  },
  {
    headerName: 'Effective at',
    field: 'effectiveAt',
    cellStyle: { textAlign: 'left' },
    width: 170,
    cellClass: 'monospace',
    sort: 'asc',
    valueFormatter: e =>
      secondsToString(e.data.effectiveAt, DATE_TIME_FORMAT_WITH_FRACTIONAL_SECOND_PRECISION)
  },
  {
    headerName: 'Rationale',
    field: 'rationale',
    cellStyle: { textAlign: 'left' },
    width: 300,
    cellClass: 'monospace'
  }
];
