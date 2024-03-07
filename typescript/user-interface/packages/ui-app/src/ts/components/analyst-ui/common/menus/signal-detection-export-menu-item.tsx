import { MenuItem } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { SignalDetectionTypes } from '@gms/common-model';
import {
  AnalystWaveformSelectors,
  selectFilterDefinitions,
  useAppSelector,
  useGetChannelSegments,
  useViewableInterval
} from '@gms/ui-state';
import React from 'react';

import { exportChannelSegmentsBySelectedSignalDetections } from '../utils/signal-detection-util';

/**
 * The type of the props for the {@link SignalDetectionExportMenuItem} component
 */
export interface SignalDetectionExportMenuItemProps {
  selectedSds: SignalDetectionTypes.SignalDetection[];
}

/**
 * Creates an export menu option bound to redux for access to signal detection UiChannelSegments
 */
export function SignalDetectionExportMenuItem({ selectedSds }: SignalDetectionExportMenuItemProps) {
  const [viewableInterval] = useViewableInterval();
  const channelSegmentResults = useGetChannelSegments(viewableInterval);
  const uiChannelSegments = channelSegmentResults.data;
  const channelFilters = useAppSelector(AnalystWaveformSelectors.selectChannelFilters);
  const filterDefinitions = useAppSelector(selectFilterDefinitions);
  return (
    <MenuItem
      text="Export"
      icon={IconNames.EXPORT}
      onClick={async () => {
        await exportChannelSegmentsBySelectedSignalDetections(
          selectedSds,
          uiChannelSegments,
          channelFilters,
          filterDefinitions
        );
      }}
      data-cy="menu-item-export"
    />
  );
}
