import { qcSegment } from '@gms/common-model/__tests__/__data__';
import { getStore } from '@gms/ui-state';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import {
  QcSegmentContextMenu,
  QcSegmentContextMenuContent
} from '~analyst-ui/components/waveform/quality-control/qc-segment-context-menu';
import type { QcSegmentsContextMenuOpenFunc } from '~analyst-ui/components/waveform/quality-control/types';

jest.mock('@gms/ui-state', () => {
  const actual = jest.requireActual('@gms/ui-state');
  return {
    ...actual,
    useGetProcessingAnalystConfigurationQuery: jest.fn(() => ({
      data: {
        keyboardShortcuts: {
          viewQcSegmentDetails: {
            description: 'View QC Segment Details',
            helpText: 'View details about existing QC segments.',
            hotkeys: 'alt+click, option+click',
            tags: ['qc', 'qc mask', 'details', 'segment'],
            category: 'Waveform Display'
          }
        }
      }
    }))
  };
});

describe('QC Segment Context Menu', () => {
  it('exists', () => {
    expect(QcSegmentContextMenu).toBeDefined();
    expect(QcSegmentContextMenuContent).toBeDefined();
  });

  it('renders QcSegmentContextMenuContent', () => {
    // Empty array
    let container = render(
      <Provider store={getStore()}>
        <QcSegmentContextMenuContent
          qcSegments={undefined}
          qcSegmentEditContextMenuCb={jest.fn()}
          qcSegmentSelectionContextMenuCb={jest.fn()}
        />
      </Provider>
    );
    expect(container.container).toMatchSnapshot();

    // One QC Segment
    container = render(
      <Provider store={getStore()}>
        <QcSegmentContextMenuContent
          qcSegments={[qcSegment]}
          qcSegmentEditContextMenuCb={jest.fn()}
          qcSegmentSelectionContextMenuCb={jest.fn()}
        />
      </Provider>
    );
    expect(container.container).toMatchSnapshot();

    // More than one QC Segment
    container = render(
      <Provider store={getStore()}>
        <QcSegmentContextMenuContent
          qcSegments={[qcSegment, qcSegment]}
          qcSegmentEditContextMenuCb={jest.fn()}
          qcSegmentSelectionContextMenuCb={jest.fn()}
        />
      </Provider>
    );
    expect(container.container).toMatchSnapshot();
  });

  it('renders QcSegmentContextMenu', async () => {
    let qcContextMenu: QcSegmentsContextMenuOpenFunc;

    const Display = function Display() {
      return (
        <QcSegmentContextMenu
          getOpenCallback={callback => {
            qcContextMenu = callback;
          }}
          qcSegmentEditContextMenuCb={jest.fn()}
          qcSegmentSelectionContextMenuCb={jest.fn()}
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

    // render with empty array
    await waitFor(() => {
      qcContextMenu(mouseEvent, []);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });

    // render with one QC Segment
    await waitFor(() => {
      qcContextMenu(mouseEvent, [qcSegment]);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });

    // render with multiple QC Segments
    await waitFor(() => {
      qcContextMenu(mouseEvent, [qcSegment, qcSegment]);
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });
  });
});
