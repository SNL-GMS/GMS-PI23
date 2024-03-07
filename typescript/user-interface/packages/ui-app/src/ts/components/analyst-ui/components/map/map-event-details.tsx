import { humanReadable, secondsToString, toSentenceCase } from '@gms/common-util';
import type { ImperativeContextMenuGetOpenCallbackFunc } from '@gms/ui-core-components';
import {
  closeImperativeContextMenu,
  Form,
  FormTypes,
  ImperativeContextMenu
} from '@gms/ui-core-components';
import React from 'react';

import { formatNumberForDisplayFixedThreeDecimalPlaces } from '~common-ui/common/table-utils';

export interface IANEventDetailsProps {
  readonly time: number;
  readonly latitudeDegrees: number;
  readonly longitudeDegrees: number;
  readonly depthKm: number;
  readonly workflowStatus: string;
}

/**
 * Returns a form item object given location data
 *
 * @param key item and label text
 * @param value data to be displayed
 * @returns a {@link FormTypes.FormItem} object
 */
function getLocationFormItem(key: string, value: number) {
  return {
    itemKey: key,
    labelText: key,
    itemType: FormTypes.ItemType.Display,
    displayText: `${formatNumberForDisplayFixedThreeDecimalPlaces(value)}`,
    displayTextFormat: FormTypes.TextFormats.Time
  };
}

/**
 * MapEventDetails Component
 */
export function MapEventDetails(props: IANEventDetailsProps) {
  const { time, latitudeDegrees, longitudeDegrees, depthKm: depth, workflowStatus } = props;

  // FormTypes.TextFormats.Time allows us to apply monospace typeface per UX
  const formItems: FormTypes.FormItem[] = [];
  formItems.push({
    itemKey: 'Event Time',
    labelText: 'Event Time',
    itemType: FormTypes.ItemType.Display,
    displayText: `${secondsToString(time)}`,
    displayTextFormat: FormTypes.TextFormats.Time
  });
  formItems.push(getLocationFormItem('Lat (°)', latitudeDegrees));
  formItems.push(getLocationFormItem('Lon (°)', longitudeDegrees));
  formItems.push(getLocationFormItem('Depth (km)', depth));
  formItems.push({
    itemKey: 'Workflow Status',
    labelText: 'Workflow Status',
    itemType: FormTypes.ItemType.Display,
    displayText: `${toSentenceCase(humanReadable(workflowStatus ?? 'Not started'))}`
  });

  const defaultPanel: FormTypes.FormPanel = {
    formItems,
    name: 'Additional Details'
  };

  return (
    <div className="map-station-details__container">
      <Form
        header="Event Details"
        defaultPanel={defaultPanel}
        disableSubmit
        onCancel={() => {
          closeImperativeContextMenu();
        }}
      />
    </div>
  );
}

/**
 * Displays the Map Event Details Context Menu.
 *
 * @params props @see {@link ImperativeContextMenuGetOpenCallbackFunc}
 */
export const MapEventDetailsContextMenu = React.memo(function MapEventDetailsContextMenu(props: {
  getOpenCallback: ImperativeContextMenuGetOpenCallbackFunc<IANEventDetailsProps>;
}): JSX.Element {
  const { getOpenCallback } = props;

  // eslint-disable-next-line react/jsx-props-no-spreading
  const content = React.useCallback((p: IANEventDetailsProps) => <MapEventDetails {...p} />, []);

  return (
    <ImperativeContextMenu<IANEventDetailsProps>
      content={content}
      getOpenCallback={getOpenCallback}
    />
  );
});
