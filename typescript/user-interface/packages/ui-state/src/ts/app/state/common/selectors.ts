import type { AppState } from '../../store';

export const isKeyboardShortcutPopupOpen = (state: AppState): boolean =>
  state.app.common.keyboardShortcutsVisibility;

export const isCommandPaletteOpen = (state: AppState): boolean =>
  state.app.common.commandPaletteIsVisible;

/**
 * Redux selector that returns the selected station and channel ids
 */
export const selectSelectedStationsAndChannelIds = (state: AppState): string[] =>
  state.app.common.selectedStationIds;
