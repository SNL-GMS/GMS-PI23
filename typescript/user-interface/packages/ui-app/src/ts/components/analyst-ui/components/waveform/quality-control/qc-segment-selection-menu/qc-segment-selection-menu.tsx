import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import type {
  QcSegmentContextMenuOpenFunc,
  QcSegmentsContextMenuGetOpenCallbackFunc
} from '../types';
import { QcSegmentSelectionMenuTable } from './qc-segment-selection-menu-table';

/**
 * Component props for {@link QcSegmentSelectionMenu}
 */
interface QcSegmentSelectionMenuProps {
  readonly getOpenCallback: QcSegmentsContextMenuGetOpenCallbackFunc;
  readonly qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
}

/**
 * Displays a table which provides details for a given array {@link QcSegment}s.
 */
export const QcSegmentSelectionMenu = React.memo(function QcSegmentSelectionMenu({
  getOpenCallback,
  qcSegmentEditContextMenuCb
}: QcSegmentSelectionMenuProps): JSX.Element {
  const content = React.useCallback(
    (qcSegments: QcSegment[]) => {
      return (
        <QcSegmentSelectionMenuTable
          qcSegments={qcSegments}
          qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
        />
      );
    },
    [qcSegmentEditContextMenuCb]
  );

  return (
    <ImperativeContextMenu<QcSegment[]>
      key="qcSegmentSelectionMenu"
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
