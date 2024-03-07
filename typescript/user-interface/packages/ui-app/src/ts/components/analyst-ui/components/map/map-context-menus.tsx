import type { ImperativeContextMenuOpenFunc } from '@gms/ui-core-components';
import { useImperativeContextMenuCallback } from '@gms/ui-core-components';
import React from 'react';

import type { EventContextMenuProps } from '../events/context-menus';
import { EventContextMenu } from '../events/context-menus';
import type { IANEventDetailsProps } from './map-event-details';
import { MapEventDetailsContextMenu } from './map-event-details';
import type { MapSignalDetectionContextMenuProps } from './map-signal-detection-context-menu';
import { MapSignalDetectionContextMenu } from './map-signal-detection-context-menu';
import type { MapSignalDetectionDetailsProps } from './map-signal-detection-details';
import { MapSignalDetectionDetailsContextMenu } from './map-signal-detection-details';
import type { MapStationContextMenuProps } from './map-station-context-menu';
import { MapStationContextMenu } from './map-station-context-menu';
import type { IANStationDetailsProps } from './map-station-details';
import { MapStationDetailsContextMenu } from './map-station-details';

export interface MapContextMenusCallbacks {
  readonly eventContextMenuCb: ImperativeContextMenuOpenFunc<EventContextMenuProps>;
  readonly eventDetailsCb: ImperativeContextMenuOpenFunc<IANEventDetailsProps>;
  readonly signalDetectionContextMenuCb: ImperativeContextMenuOpenFunc<
    MapSignalDetectionContextMenuProps
  >;
  readonly signalDetectionDetailsCb: ImperativeContextMenuOpenFunc<MapSignalDetectionDetailsProps>;
  readonly stationDetailsCb: ImperativeContextMenuOpenFunc<IANStationDetailsProps>;
  readonly stationContextMenuCb: ImperativeContextMenuOpenFunc<MapStationContextMenuProps>;
}

export type MapContextMenusGetOpenCallbackFunc = (callbacks: MapContextMenusCallbacks) => void;

/**
 * Handles the display of the Map Context Menus their callbacks.
 *
 * @params props @see {@link MapContextMenusGetOpenCallbackFunc}
 */
export const MapContextMenus = React.memo(function MapContextMenus(props: {
  getOpenCallback: MapContextMenusGetOpenCallbackFunc;
}): JSX.Element {
  const { getOpenCallback } = props;

  // TODO correct and remove dependency on events table
  const [eventContextMenuCb, setEventContextMenuCb] = useImperativeContextMenuCallback<
    EventContextMenuProps
  >();

  const [eventDetailsCb, setEventDetailsCb] = useImperativeContextMenuCallback<
    IANEventDetailsProps
  >();

  const [signalDetectionDetailsCb, setSignalDetectionDetailsCb] = useImperativeContextMenuCallback<
    MapSignalDetectionDetailsProps
  >();

  const [
    signalDetectionContextMenuCb,
    setSignalDetectionContextMenuCb
  ] = useImperativeContextMenuCallback<MapSignalDetectionContextMenuProps>();

  const [stationDetailsCb, setStationDetailsCb] = useImperativeContextMenuCallback<
    IANStationDetailsProps
  >();

  const [stationContextMenuCb, setStationContextMenuCb] = useImperativeContextMenuCallback<
    MapStationContextMenuProps
  >();

  React.useEffect(() => {
    if (
      eventContextMenuCb &&
      eventDetailsCb &&
      signalDetectionDetailsCb &&
      signalDetectionContextMenuCb &&
      stationDetailsCb &&
      stationContextMenuCb
    ) {
      getOpenCallback({
        eventContextMenuCb,
        eventDetailsCb,
        signalDetectionContextMenuCb,
        signalDetectionDetailsCb,
        stationDetailsCb,
        stationContextMenuCb
      });
    }
  }, [
    getOpenCallback,
    eventContextMenuCb,
    eventDetailsCb,
    signalDetectionDetailsCb,
    signalDetectionContextMenuCb,
    stationDetailsCb,
    stationContextMenuCb
  ]);

  return (
    <>
      <EventContextMenu getOpenCallback={setEventContextMenuCb} />
      <MapEventDetailsContextMenu getOpenCallback={setEventDetailsCb} />
      <MapSignalDetectionContextMenu
        getOpenCallback={setSignalDetectionContextMenuCb}
        mapSignalDetectionDetailsCb={signalDetectionDetailsCb}
      />
      <MapSignalDetectionDetailsContextMenu getOpenCallback={setSignalDetectionDetailsCb} />
      <MapStationDetailsContextMenu getOpenCallback={setStationDetailsCb} />
      <MapStationContextMenu
        getOpenCallback={setStationContextMenuCb}
        mapStationDetailsCb={stationDetailsCb}
      />
    </>
  );
});
