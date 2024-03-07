import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import { AnalystWorkspaceTypes } from '@gms/ui-state/lib/app';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

import type { SignalDetectionContextMenuContentProps } from '~analyst-ui/common/menus/signal-detection-context-menu';
import type { SignalDetectionContextMenusCallbacks } from '~analyst-ui/common/menus/signal-detection-context-menus';
import { SignalDetectionContextMenus } from '~analyst-ui/common/menus/signal-detection-context-menus';

describe('Signal Detection Context Menus', () => {
  it('exists', () => {
    expect(SignalDetectionContextMenus).toBeDefined();
  });

  it('renders Signal Detection menus', async () => {
    let callbacks: SignalDetectionContextMenusCallbacks;

    const Display = function Display() {
      return (
        <div>
          <SignalDetectionContextMenus
            getOpenCallback={callback => {
              callbacks = callback;
            }}
          />
        </div>
      );
    };

    const container = await waitFor(() => render(<Display />));
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

    const props: SignalDetectionContextMenuContentProps = {
      signalDetectionDetailsCb: jest.fn(),
      signalDetections: signalDetectionsData,
      selectedSds: [signalDetectionsData[0]],
      sdIdsToShowFk: [],
      currentOpenEventId: undefined,
      changeAssociation: jest.fn(),
      associateToNewEvent: jest.fn(),
      rejectDetections: jest.fn(),
      updateDetections: jest.fn(),
      measurementMode: {
        mode: AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT,
        entries: {
          [signalDetectionsData[0].id]: true
        }
      },
      setSdIdsToShowFk: jest.fn(),
      setMeasurementModeEntries: jest.fn()
    };

    await waitFor(() => {
      callbacks.signalDetectionContextMenuCb(mouseEvent, { ...props });
      callbacks.signalDetectionDetailsCb(mouseEvent, {
        signalDetection: signalDetectionsData[0],
        color: '#FF0000',
        assocStatus: 'Open'
      });
      container.rerender(<Display />);
    });
    await waitFor(() => {
      expect(container.baseElement).toMatchSnapshot();
    });
  });
});
