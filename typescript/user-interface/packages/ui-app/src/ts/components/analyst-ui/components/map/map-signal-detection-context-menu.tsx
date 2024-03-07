import { Menu, MenuItem } from '@blueprintjs/core';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import React from 'react';

import type { MapSignalDetectionDetailsProps } from './map-signal-detection-details';

export interface MapSignalDetectionContextMenuProps {
  readonly sd: MapSignalDetectionDetailsProps;
  readonly mapSignalDetectionDetailsCb: ImperativeContextMenuOpenFunc<
    MapSignalDetectionDetailsProps
  >;
}

/**
 * Component that renders the map signal detection context menu
 */
export const MapSignalDetectionContextMenuContent = React.memo(
  function MapSignalDetectionContextMenuContent(
    props: MapSignalDetectionContextMenuProps
  ): JSX.Element {
    const { sd, mapSignalDetectionDetailsCb } = props;

    return (
      <Menu>
        <MenuItem
          className="menu-item-sd-details"
          text="Open signal detection details"
          label="(Alt + click)"
          disabled={!sd}
          onClick={event => mapSignalDetectionDetailsCb(event, { sd })}
        />
      </Menu>
    );
  }
);

/**
 * Displays the Map Signal Detection Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const MapSignalDetectionContextMenu = React.memo(
  function MapSignalDetectionContextMenu(props: {
    getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<MapSignalDetectionContextMenuProps>;
    mapSignalDetectionDetailsCb: ImperativeContextMenuOpenFunc<MapSignalDetectionDetailsProps>;
  }): JSX.Element {
    const { getOpenCallback, mapSignalDetectionDetailsCb } = props;

    const content = React.useCallback(
      (p: MapSignalDetectionContextMenuProps) => (
        <MapSignalDetectionContextMenuContent
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...p}
          mapSignalDetectionDetailsCb={mapSignalDetectionDetailsCb}
        />
      ),
      [mapSignalDetectionDetailsCb]
    );

    return (
      <ImperativeContextMenu<MapSignalDetectionContextMenuProps>
        content={content}
        getOpenCallback={getOpenCallback}
      />
    );
  }
);
