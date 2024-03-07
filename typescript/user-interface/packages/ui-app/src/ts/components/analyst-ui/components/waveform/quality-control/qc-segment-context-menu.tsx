import { Menu, MenuItem } from '@blueprintjs/core';
import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import { useGetProcessingAnalystConfigurationQuery } from '@gms/ui-state';
import React from 'react';

import {
  formatHotkeyString,
  getHotkeysForOS
} from '~common-ui/components/keyboard-shortcuts/keyboard-shortcuts-util';

import type {
  QcSegmentContextMenuOpenFunc,
  QcSegmentsContextMenuGetOpenCallbackFunc,
  QcSegmentsContextMenuOpenFunc
} from './types';

export const QcSegmentContextMenuContent = React.memo(function QcSegmentContextMenuContent(props: {
  qcSegments: QcSegment[];
  qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
  qcSegmentSelectionContextMenuCb: QcSegmentsContextMenuOpenFunc;
}): JSX.Element {
  const { qcSegments, qcSegmentEditContextMenuCb, qcSegmentSelectionContextMenuCb } = props;

  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const hotkey = processingAnalystConfiguration.data.keyboardShortcuts.viewQcSegmentDetails.hotkeys;

  if (qcSegments?.length > 0) {
    const text = qcSegments.length === 1 ? 'Open QC segment details' : 'Select QC segment';
    const labelElement = formatHotkeyString(getHotkeysForOS(hotkey)[0]);

    const onClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      if (qcSegments.length === 1) {
        qcSegmentEditContextMenuCb(event, qcSegments[0]);
      } else {
        qcSegmentSelectionContextMenuCb(event, qcSegments);
      }
    };
    return (
      <Menu>
        <MenuItem title={text} text={text} labelElement={labelElement} onClick={onClick} />
      </Menu>
    );
  }
  return undefined;
});

/**
 * Displays the QC Segment Context Menu.
 *
 * @params props @see {@link QcSegmentOpenFunc}
 */
export const QcSegmentContextMenu = React.memo(function QcSegmentContextMenu(props: {
  getOpenCallback: QcSegmentsContextMenuGetOpenCallbackFunc;
  qcSegmentEditContextMenuCb: QcSegmentContextMenuOpenFunc;
  qcSegmentSelectionContextMenuCb: QcSegmentsContextMenuOpenFunc;
}): JSX.Element {
  const { getOpenCallback, qcSegmentEditContextMenuCb, qcSegmentSelectionContextMenuCb } = props;

  const content = React.useCallback(
    (qcSegments: QcSegment[]) => (
      <QcSegmentContextMenuContent
        qcSegments={qcSegments}
        qcSegmentEditContextMenuCb={qcSegmentEditContextMenuCb}
        qcSegmentSelectionContextMenuCb={qcSegmentSelectionContextMenuCb}
      />
    ),
    [qcSegmentEditContextMenuCb, qcSegmentSelectionContextMenuCb]
  );

  return <ImperativeContextMenu<QcSegment[]> content={content} getOpenCallback={getOpenCallback} />;
});
