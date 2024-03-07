import type { RowClickedEvent } from '@gms/ui-core-components';
import { Table, useImperativeContextMenuCallback } from '@gms/ui-core-components';
import type { AppDispatch } from '@gms/ui-state';
import {
  analystActions,
  EventsColumn,
  useAppDispatch,
  useAppSelector,
  useUpdateVisibleStationsForCloseEvent,
  useUpdateVisibleStationsForOpenEvent
} from '@gms/ui-state';
import classNames from 'classnames';
import type Immutable from 'immutable';
import isEqual from 'lodash/isEqual';
import * as React from 'react';

import { defaultColumnDefinition } from '~common-ui/common/table-types';
import { getMultiLineHeaderHeight, getRowHeightWithBorder } from '~common-ui/common/table-utils';

import { getColumnDefs } from './column-definitions';
import type { EventContextMenuProps } from './context-menus';
import { EventContextMenu } from './context-menus';
import { updateRowSelection, useSetCloseEvent, useSetOpenEvent } from './events-util';
import type { EventRow } from './types';
import { EdgeTypes } from './types';

export interface EventsTableProps {
  readonly columnsToDisplay: Immutable.Map<EventsColumn, boolean>;
  readonly data: EventRow[];
  readonly setEventId: (eventId: string) => void;
}

// parameter object to clean up onRowDoubleClicked code smell
export interface RowDblClickEventActions {
  openEvent: (id: string) => Promise<void>;
  closeEvent: (id: string) => Promise<void>;
  setEventId: (eventId: string) => void;
  updateVisibleStationsForOpenEvent: (id: string) => void;
  updateVisibleStationsForCloseEvent: () => void;
}

/**
 * Opens the selected event
 *
 * @param eventId The event id for the clicked event
 */
export const onOpenEvent = async (
  eventId: string,
  openEvent: (id: string) => Promise<void>
): Promise<void> => {
  await openEvent(eventId);
};

/**
 * Closes the selected event
 *
 * @param eventId The event id for the clicked event
 */
export const onCloseEvent = async (
  eventId: string,
  closeEvent: (id: string) => Promise<void>
): Promise<void> => {
  await closeEvent(eventId);
};

/**
 * Set open event triggered from events list and call the setEventId callback
 *
 * @param eventId event id
 * @param dispatch AppDispatch
 * @param setEventId set event id callback from parent component
 */
export const dispatchSetEventId = (
  eventId: string,
  dispatch: AppDispatch,
  setEventId: (eventId: string) => void,
  updateVisibleStationsForOpenEvent: (eventId: string) => void
): void => {
  dispatch(analystActions.setEventListOpenTriggered(true));
  setEventId(eventId);
  updateVisibleStationsForOpenEvent(eventId);
};

/**
 * Opens or closes the event associated with the selected row depending on open/closed event
 *
 * @param event The click event for the row
 */
export const onRowDoubleClicked = async (
  dispatch: AppDispatch,
  event: RowClickedEvent<EventRow, unknown, unknown>,
  eventActions: RowDblClickEventActions,
  userName: string
): Promise<void> => {
  const {
    openEvent,
    closeEvent,
    setEventId,
    updateVisibleStationsForOpenEvent,
    updateVisibleStationsForCloseEvent
  } = eventActions;
  if (event.data.isOpen) {
    // current user already has the event open so co close it
    await closeEvent(event.data.id);
    setEventId(undefined);
    updateVisibleStationsForCloseEvent();
  } else if (
    // no other analysts currently have the event open
    event.data.activeAnalysts.length === 0 ||
    (event.data.activeAnalysts.length === 1 && event.data.activeAnalysts?.includes(userName))
  ) {
    await openEvent(event.data.id);
    updateVisibleStationsForOpenEvent(event.data.id);
  } else {
    // at least one other analyst has the event open, so show the popup
    dispatch(analystActions.setEventListOpenTriggered(true));
    setEventId(event.data.id);
    updateVisibleStationsForOpenEvent(event.data.id);
  }
};

/**
 * Determines the color of the event table row.  Exported for testing purposes
 *
 * @param params RowClassParams to determine row styling for open and edge events
 * @returns string class name
 */
export const rowClassRules: {
  'open-event-row': (params: { data: EventRow }) => boolean;
  'edge-event-row': (params: { data: EventRow }) => boolean;
} = {
  'open-event-row': (params: { data: EventRow }) => params.data.isOpen,
  'edge-event-row': (params: { data: EventRow }) => params.data.edgeEventType !== EdgeTypes.INTERVAL
};

// eslint-disable-next-line react/function-component-definition
export const EventsTable: React.FunctionComponent<EventsTableProps> = (props: EventsTableProps) => {
  const { columnsToDisplay, data, setEventId } = props;

  const tableRef = React.useRef<Table<EventRow, unknown>>(null);

  React.useEffect(() => {
    if (tableRef && tableRef.current) {
      tableRef.current.updateVisibleColumns<EventsColumn>(columnsToDisplay);
    }
  }, [columnsToDisplay]);

  const openEvent = useSetOpenEvent();
  const closeEvent = useSetCloseEvent();

  const dispatch = useAppDispatch();

  const selectedEvents = useAppSelector(state => state.app.analyst.selectedEventIds);
  const userName = useAppSelector(state => state.app.userSession.authenticationStatus.userName);

  const defaultColDefRef = React.useRef(defaultColumnDefinition<EventRow>());

  const columnDefsRef = React.useRef(getColumnDefs(columnsToDisplay));

  const updateVisibleStationsForOpenEvent = useUpdateVisibleStationsForOpenEvent();
  const updateVisibleStationsForCloseEvent = useUpdateVisibleStationsForCloseEvent();

  const [contextMenuCb, setGetOpenCallback] = useImperativeContextMenuCallback<
    EventContextMenuProps
  >();

  const [contextMenuRow, setContextMenuRow] = React.useState<EventRow>();

  const onCellContextMenuCallback = React.useCallback(
    event => {
      setContextMenuRow(event.data);
      contextMenuCb(event.event, {
        selectedEventId: contextMenuRow?.id,
        isOpen: contextMenuRow?.isOpen,
        openCallback: eventId => {
          dispatchSetEventId(eventId, dispatch, setEventId, updateVisibleStationsForOpenEvent);
        },
        closeCallback: async eventId => onCloseEvent(eventId, closeEvent),
        setEventIdCallback: setEventId,
        updateVisibleStationsForCloseEvent,
        includeEventDetailsMenuItem: false
      });
    },
    [
      closeEvent,
      contextMenuCb,
      contextMenuRow?.id,
      contextMenuRow?.isOpen,
      dispatch,
      setEventId,
      updateVisibleStationsForCloseEvent,
      updateVisibleStationsForOpenEvent
    ]
  );

  const onColumnResizedCallback = React.useCallback(event => {
    if (event.column?.getId() === EventsColumn.activeAnalysts) {
      // refresh the single column
      event.api.refreshCells({ columns: [EventsColumn.activeAnalysts], force: true });
    }
  }, []);

  const onRowDoubleClickedCallback = React.useCallback(
    async event =>
      onRowDoubleClicked(
        dispatch,
        event,
        {
          openEvent,
          closeEvent,
          setEventId,
          updateVisibleStationsForOpenEvent,
          updateVisibleStationsForCloseEvent
        },
        userName
      ),
    [
      dispatch,
      openEvent,
      closeEvent,
      setEventId,
      updateVisibleStationsForOpenEvent,
      updateVisibleStationsForCloseEvent,
      userName
    ]
  );

  const onRowClickedCallback = React.useCallback(
    event => {
      // deselects row if already selected
      if (event.node.isSelected()) {
        dispatch(
          analystActions.setSelectedEventIds(selectedEvents.filter(item => item === event.id))
        );
      }
    },
    [dispatch, selectedEvents]
  );

  const onSelectionChanged = React.useCallback(() => {
    const selectedRows = tableRef?.current?.getTableApi().getSelectedRows();
    const updatedSelectedEvents = selectedRows.map(event => event.id);
    if (!isEqual(updatedSelectedEvents, selectedEvents)) {
      dispatch(analystActions.setSelectedEventIds(updatedSelectedEvents));
    }
  }, [dispatch, selectedEvents]);

  React.useEffect(() => {
    let timer;
    if (tableRef?.current) {
      timer = setTimeout(() => {
        updateRowSelection(tableRef, selectedEvents);
      });
    }
    return () => {
      clearTimeout(timer);
    };
  }, [selectedEvents]);

  return (
    <div className={classNames(['event-table', 'ag-theme-dark', 'with-separated-rows-color'])}>
      <EventContextMenu getOpenCallback={setGetOpenCallback} />
      <Table<EventRow, unknown>
        ref={ref => {
          tableRef.current = ref;
        }}
        context={{}}
        defaultColDef={defaultColDefRef.current}
        columnDefs={columnDefsRef.current}
        rowData={data}
        rowHeight={getRowHeightWithBorder()}
        headerHeight={getMultiLineHeaderHeight(2)}
        onRowClicked={onRowClickedCallback}
        onRowDoubleClicked={onRowDoubleClickedCallback}
        rowSelection="multiple"
        onSelectionChanged={onSelectionChanged}
        suppressCellFocus
        suppressDragLeaveHidesColumns
        overlayNoRowsTemplate="No Events to display"
        onCellContextMenu={onCellContextMenuCallback}
        rowClassRules={rowClassRules}
        onColumnResized={onColumnResizedCallback}
      />
    </div>
  );
};
