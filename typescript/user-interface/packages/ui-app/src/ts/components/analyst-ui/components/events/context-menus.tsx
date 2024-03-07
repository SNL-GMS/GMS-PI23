import { Menu, MenuItem } from '@blueprintjs/core';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import type { IANEventDetailsProps } from '../map/map-event-details';

export interface EventContextMenuProps {
  readonly selectedEventId: string;
  readonly isOpen: boolean;
  readonly includeEventDetailsMenuItem: boolean;
  readonly entityProperties?: {
    readonly time: number;
    readonly latitudeDegrees: number;
    readonly longitudeDegrees: number;
    readonly depthKm: number;
    readonly workflowStatus: string;
  };
  readonly mousePosition?: { x: number; y: number };
  readonly openCallback: (eventId: string) => void;
  readonly closeCallback: (eventId: string) => void;
  readonly updateVisibleStationsForCloseEvent?: () => void;
  readonly setEventIdCallback?: (eventId: string) => void;
  // TODO: correct and remove dependency on map component
  readonly eventDetailsCb?: ImperativeContextMenuOpenFunc<IANEventDetailsProps>;
}

/**
 * Component that renders the interval context menu.
 */
export function EventContextMenuContent(props: EventContextMenuProps) {
  const {
    selectedEventId,
    isOpen,
    includeEventDetailsMenuItem,
    entityProperties,
    mousePosition,
    openCallback,
    closeCallback,
    setEventIdCallback,
    updateVisibleStationsForCloseEvent,
    eventDetailsCb
  } = props;

  return (
    <Menu>
      <MenuItem
        className="menu-item-open-event"
        data-cy="menu-item-open-event"
        text="Open event"
        disabled={isOpen}
        onClick={() => openCallback(selectedEventId)}
      />
      <MenuItem
        className="menu-item-close-event"
        data-cy="menu-item-close-event"
        text="Close event"
        disabled={!isOpen}
        onClick={() => {
          if (setEventIdCallback) setEventIdCallback(undefined);
          if (updateVisibleStationsForCloseEvent) updateVisibleStationsForCloseEvent();
          closeCallback(selectedEventId);
        }}
      />
      {includeEventDetailsMenuItem ? (
        <MenuItem
          className="menu-item-event-details"
          text="Open event details"
          label="(Alt + click)"
          onClick={() => {
            eventDetailsCb(
              new MouseEvent('contextmenu', {
                clientX: mousePosition.x,
                clientY: mousePosition.y
              }),
              entityProperties
            );
          }}
        />
      ) : undefined}
    </Menu>
  );
}

/**
 * Displays the Event Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const EventContextMenu = React.memo(function EventContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<EventContextMenuProps>;
}): JSX.Element {
  const { getOpenCallback } = props;

  const content = React.useCallback(
    // eslint-disable-next-line react/jsx-props-no-spreading
    (p: EventContextMenuProps) => <EventContextMenuContent {...p} />,
    []
  );

  return (
    <ImperativeContextMenu<EventContextMenuProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
