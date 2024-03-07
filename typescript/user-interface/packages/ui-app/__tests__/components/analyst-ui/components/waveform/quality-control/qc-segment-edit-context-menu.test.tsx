import { qcSegment } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import {
  QcSegmentEditContextMenu,
  QcSegmentEditContextMenuContent
} from '~analyst-ui/components/waveform/quality-control/qc-segment-edit-context-menu';
import type { QcSegmentContextMenuOpenFunc } from '~analyst-ui/components/waveform/quality-control/types';

describe('QC Segment Edit Context Menu', () => {
  it('exists', () => {
    expect(QcSegmentEditContextMenu).toBeDefined();
    expect(QcSegmentEditContextMenuContent).toBeDefined();
  });

  it('renders QcSegmentEditContextMenuContent', () => {
    // Empty content
    let container = render(<QcSegmentEditContextMenuContent qcSegment={undefined} />);
    expect(container.container).toMatchSnapshot();

    // One QC Segment
    container = render(
      <Provider store={getStore()}>
        <QcSegmentEditContextMenuContent qcSegment={qcSegment} />
      </Provider>
    );
    expect(container.container).toMatchSnapshot();
  });

  it('renders QcSegmentContextMenu', async () => {
    let qcContextMenu: QcSegmentContextMenuOpenFunc;

    const Display = function Display() {
      return (
        <QcSegmentEditContextMenu
          getOpenCallback={callback => {
            qcContextMenu = callback;
          }}
        />
      );
    };

    const container = render(<Display />);
    expect(container.container).toMatchSnapshot();

    const mouseEvent = ({
      nativeEvent: new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 100
      }),
      preventDefault: jest.fn(),
      shiftKey: true,
      stopPropagation: jest.fn()
    } as unknown) as React.MouseEvent;

    // render with undefined
    await waitFor(() => {
      qcContextMenu(mouseEvent, undefined);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });

    // render with empty content
    await waitFor(() => {
      qcContextMenu(mouseEvent, undefined);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });

    // render with one QC Segment
    await waitFor(() => {
      qcContextMenu(mouseEvent, qcSegment);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });
  });
});
