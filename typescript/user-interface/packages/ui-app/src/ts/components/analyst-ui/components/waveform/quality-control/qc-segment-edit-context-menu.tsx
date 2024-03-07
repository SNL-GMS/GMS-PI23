import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import { QCSegmentEditingDialog } from './qc-segment-editing-dialog';
import type { QcSegmentContextMenuGetOpenCallbackFunc } from './types';
import { QcMaskDialogBoxType } from './types';

export const QcSegmentEditContextMenuContent = React.memo(
  function QcSegmentEditContextMenuContent(props: { qcSegment: QcSegment }): JSX.Element {
    const { qcSegment } = props;
    if (qcSegment) {
      return <QCSegmentEditingDialog qcSegment={qcSegment} dialogType={QcMaskDialogBoxType.View} />;
    }
    return undefined;
  }
);

/**
 * Displays the QC Segment Edit ContextMenu.
 *
 * @params props @see {@link QcSegmentGetOpenCallbackFunc}
 */
export const QcSegmentEditContextMenu = React.memo(function QcSegmentEditContextMenu(props: {
  getOpenCallback: QcSegmentContextMenuGetOpenCallbackFunc;
}): JSX.Element {
  const { getOpenCallback } = props;

  const content = React.useCallback(
    (qcSegment: QcSegment) => <QcSegmentEditContextMenuContent qcSegment={qcSegment} />,
    []
  );

  return <ImperativeContextMenu<QcSegment> content={content} getOpenCallback={getOpenCallback} />;
});
