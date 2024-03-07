import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { useImperativeContextMenuCallback } from '@gms/ui-core-components';
import React from 'react';

import { QcSegmentContextMenu } from './qc-segment-context-menu';
import { QcSegmentEditContextMenu } from './qc-segment-edit-context-menu';
import { QcSegmentSelectionMenu } from './qc-segment-selection-menu';
import type { QcSegmentContextMenuOpenFunc, QcSegmentsContextMenuOpenFunc } from './types';

export interface QcContextMenuCallbacks {
  qcSegmentsContextMenuCb: QcSegmentsContextMenuOpenFunc;
  qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
  qcSegmentSelectionContextMenuCb: QcSegmentsContextMenuOpenFunc;
}

export type QcContextMenuGetOpenCallbackFunc = (callbacks: QcContextMenuCallbacks) => void;

/**
 * Handles the display of the QC Context Menus their callbacks.
 *
 * @params props @see {@link QcSegmentOpenFunc}
 */
export const QcContextMenus = React.memo(function QcContextMenus(props: {
  getOpenCallback: QcContextMenuGetOpenCallbackFunc;
}): JSX.Element {
  const { getOpenCallback } = props;

  const [qcSegmentsContextMenuCb, setQcSegmentsContextMenuCb] = useImperativeContextMenuCallback<
    QcSegment[]
  >();

  const [
    qcSegmentEditContextMenuCb,
    setQcSegmentEditContextMenuCb
  ] = useImperativeContextMenuCallback<QcSegment>();

  const [
    qcSegmentSelectionContextMenuCb,
    setQcSegmentSelectionContextMenuCb
  ] = useImperativeContextMenuCallback<QcSegment[]>();

  React.useEffect(() => {
    if (qcSegmentsContextMenuCb && qcSegmentEditContextMenuCb && qcSegmentSelectionContextMenuCb) {
      getOpenCallback({
        qcSegmentsContextMenuCb,
        qcSegmentEditContextMenuCb,
        qcSegmentSelectionContextMenuCb
      });
    }
  }, [
    getOpenCallback,
    qcSegmentEditContextMenuCb,
    qcSegmentSelectionContextMenuCb,
    qcSegmentsContextMenuCb
  ]);

  return (
    <>
      <QcSegmentContextMenu
        getOpenCallback={setQcSegmentsContextMenuCb}
        qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
        qcSegmentSelectionContextMenuCb={qcSegmentSelectionContextMenuCb}
      />
      <QcSegmentEditContextMenu getOpenCallback={setQcSegmentEditContextMenuCb} />
      <QcSegmentSelectionMenu
        getOpenCallback={setQcSegmentSelectionContextMenuCb}
        qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
      />
    </>
  );
});
