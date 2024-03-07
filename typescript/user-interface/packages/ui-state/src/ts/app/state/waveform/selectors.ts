import type { FilterTypes } from '@gms/common-model';

import type { AppState } from '../../../ui-state';

/**
 * Selector for hte channel filters from Redux. Returns a record of station/channel names
 * to the applied filters.
 */
export const selectChannelFilters = (state: AppState): Record<string, FilterTypes.Filter> => {
  return state.app.waveform.channelFilters;
};
