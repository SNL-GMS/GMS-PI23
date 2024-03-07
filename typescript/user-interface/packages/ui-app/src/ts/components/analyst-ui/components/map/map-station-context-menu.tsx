import { Menu, MenuItem } from '@blueprintjs/core';
import type {
  ImperativeContextMenuGetOpenCallbackFunc,
  ImperativeContextMenuOpenFunc
} from '@gms/ui-core-components';
import { ImperativeContextMenu } from '@gms/ui-core-components';
import * as Cesium from 'cesium';
import React from 'react';

import { HideStationMenuItem } from '~analyst-ui/common/menus';

import { isSiteOrStation } from './ian-map-utils';
import type { IANStationDetailsProps } from './map-station-details';

export interface MapStationContextMenuProps {
  readonly target: Cesium.Entity;
  readonly canShowContextMenu: boolean;
  readonly setStationVisibility: (stationName: string, visible: boolean) => void;
  readonly isStationVisible: (stationName: string) => boolean;
  readonly mapStationDetailsCb: ImperativeContextMenuOpenFunc<IANStationDetailsProps>;
}

/**
 * Component that renders the map station context menu
 */
export const MapStationContextMenuContent = React.memo(function MapStationContextMenuContent(
  props: MapStationContextMenuProps
): JSX.Element {
  const {
    target,
    canShowContextMenu,
    isStationVisible,
    setStationVisibility,
    mapStationDetailsCb
  } = props;

  const entityType = target?.properties?.type?.getValue(Cesium.JulianDate.now());
  if (isSiteOrStation(entityType)) {
    const stationName = target.id;
    const stationProperties = target.properties.getValue(Cesium.JulianDate.now());
    const channelShouldBeVisible = !isStationVisible(stationName);
    const dynamicMenuItemText = entityType === 'Station' ? 'station' : 'site';
    const menuItemText = `Open ${dynamicMenuItemText} details`;
    const showText = `Show ${stationName} on Waveform Display`;
    const hideText = `Hide ${stationName} on Waveform Display`;
    const menuString = channelShouldBeVisible ? showText : hideText;
    const hideMenuItem = (
      <HideStationMenuItem
        disabled={!canShowContextMenu}
        stationName={stationName}
        hideStationCallback={() => {
          setStationVisibility(stationName, channelShouldBeVisible);
        }}
        showHideText={menuString}
      />
    );
    return (
      <Menu>
        <MenuItem
          className="menu-item-station-details"
          text={menuItemText}
          label="(Alt + click)"
          onClick={event =>
            mapStationDetailsCb(event, {
              stationName: stationProperties.name,
              latitude: stationProperties.coordinates.latitude,
              longitude: stationProperties.coordinates.longitude,
              elevation: stationProperties.coordinates.elevation,
              entityType: stationProperties.type,
              detailedType: stationProperties.statype
            })
          }
        />
        {entityType === 'Station' ? hideMenuItem : null}
      </Menu>
    );
  }
  return undefined;
});

/**
 * Displays the Map Station Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const MapStationContextMenu = React.memo(function MapStationContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<MapStationContextMenuProps>;
  mapStationDetailsCb: ImperativeContextMenuOpenFunc<IANStationDetailsProps>;
}): JSX.Element {
  const { getOpenCallback, mapStationDetailsCb } = props;

  const content = React.useCallback(
    (p: MapStationContextMenuProps) => (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <MapStationContextMenuContent {...p} mapStationDetailsCb={mapStationDetailsCb} />
    ),
    [mapStationDetailsCb]
  );

  return (
    <ImperativeContextMenu<MapStationContextMenuProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
