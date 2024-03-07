import {
  useAppDispatch,
  useFilterCycle,
  useGetChannelsQuery,
  useGetDefaultFilterDefinitionByUsageForChannelSegments,
  useGetFilterDefinitionsForSignalDetections,
  useGetFilterListsDefinitionQuery,
  useKeyboardShortcutConfig,
  useViewableInterval,
  waveformSlice
} from '@gms/ui-state';
import type React from 'react';
import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

/**
 * Creates a component that fetches the filter lists and listens for the filter hotkeys.
 */
// eslint-disable-next-line react/function-component-definition
export const FilterManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const [viewableInterval] = useViewableInterval();
  useGetFilterListsDefinitionQuery();
  useGetFilterDefinitionsForSignalDetections();
  useGetChannelsQuery();
  useGetDefaultFilterDefinitionByUsageForChannelSegments();

  const { selectNextFilter, selectPreviousFilter, selectUnfiltered } = useFilterCycle();
  const keyboardShortcutConfig = useKeyboardShortcutConfig();
  const selectNextFilterHotkeyConfig = keyboardShortcutConfig?.selectNextFilter;
  const selectPreviousFilterHotkeyConfig = keyboardShortcutConfig?.selectPreviousFilter;
  const selectUnfilteredHotkeyConfig = keyboardShortcutConfig?.selectUnfiltered;

  useEffect(() => {
    // reset channel filters if the viewableInterval changes
    dispatch(waveformSlice.actions.clearChannelFilters());
  }, [dispatch, viewableInterval]);

  // Disable hotkeys if there is no viewable interval
  useHotkeys(
    selectNextFilterHotkeyConfig?.hotkeys ?? 'f',
    selectNextFilter,
    {
      enabled: !!viewableInterval
    },
    [selectNextFilter, selectNextFilterHotkeyConfig?.hotkeys, viewableInterval]
  );
  useHotkeys(
    selectPreviousFilterHotkeyConfig?.hotkeys ?? 'shift+f',
    selectPreviousFilter,
    {
      enabled: !!viewableInterval
    },
    [selectPreviousFilter, selectPreviousFilterHotkeyConfig?.hotkeys, viewableInterval]
  );
  useHotkeys(
    selectUnfilteredHotkeyConfig?.hotkeys ?? 'alt+f, option+f',
    selectUnfiltered,
    {
      enabled: !!viewableInterval
    },
    [selectUnfiltered, selectUnfilteredHotkeyConfig?.hotkeys, viewableInterval]
  );
  return null;
};
