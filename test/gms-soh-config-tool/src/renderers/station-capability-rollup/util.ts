import {
  ErrorRecord,
  OperatorType,
  RollupEntry,
  RollupType,
} from '../../state/station-controls-slice';
import produce from 'immer';
import flatMap from 'lodash/flatMap';
import union from 'lodash/union';
import uniqueId from 'lodash/uniqueId';
import isEqual from 'lodash/isEqual';
import { RollupOperatorOperands } from '../../state/retrieve-station-capability';
import { includes } from 'lodash';
import {
  AppSections,
  ChannelCapabilityErrorTypes,
  StationCapabilityErrorTypes,
  StationGroupCapabilityErrorTypes,
} from '../../routes/types';
import { isMonitorAnEnvironmentalType } from '../monitor-types-rollup/util';

const findRollupLocation = (
  rollup: RollupEntry,
  id: string
): {
  level: number;
  index: number;
  entry: RollupEntry;
  parentRollupEntry: RollupEntry | null;
} => {
  if (id.includes('default')) {
    return { level: 0, index: 0, entry: rollup, parentRollupEntry: null };
  }

  const result = internalFindRollupLocation(rollup.rollups, id, 1, rollup);

  if (!result || result.length < 1) {
    throw new Error(`No rollup location found`);
  }

  if (result.length > 1) {
    throw new Error(`Multiple rollups locations found`);
  }
  return result[0];
};

const internalFindRollupLocation = (
  rollups: RollupEntry[] | undefined,
  id: string,
  level: number,
  parentRollupEntry: RollupEntry
): {
  level: number;
  index: number;
  entry: RollupEntry;
  parentRollupEntry: RollupEntry;
}[] => {
  return flatMap(
    rollups?.map((rollup, index) => {
      if (rollup.id === id) {
        return { level, index, entry: rollup, parentRollupEntry };
      }
      return internalFindRollupLocation(rollup.rollups, id, level + 1, rollup);
    })
  ).filter((entry) => entry !== undefined);
};

export const updateStationGroupCapabilityRollupType = (
  id: string,
  rollup: RollupEntry,
  value: string | null,
  selectedStations: string[]
): RollupEntry => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    result.entry['rollupType'] = value as RollupType;
    if (value === RollupType.ROLLUP_OF_STATIONS) {
      result.entry['rollups'] = undefined;
    }
    if (
      value === RollupType.ROLLUP_OF_ROLLUPS &&
      (!result.entry.rollups || result.entry.rollups.length <= 0)
    ) {
      result.entry.rollups = [
        {
          id: uniqueId(),
          operatorType: OperatorType.BEST_OF,
          rollupType: RollupType.ROLLUP_OF_STATIONS,
          stations: selectedStations,
          rollups: [],
          threshold: {
            goodThreshold: 1,
            marginalThreshold: 0,
          },
        },
      ];
    }
  });
};

export const updateStationCapabilityRollupType = (
  id: string,
  rollup: RollupEntry,
  value: string | null,
  selectedChannels: string[]
): RollupEntry => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    result.entry['rollupType'] = value as RollupType;
    if (value === RollupType.ROLLUP_OF_CHANNELS) {
      result.entry['rollups'] = undefined;
    }
    if (
      value === RollupType.ROLLUP_OF_ROLLUPS &&
      (!result.entry.rollups || result.entry.rollups.length <= 0)
    ) {
      result.entry.rollups = [
        {
          id: uniqueId(),
          operatorType: OperatorType.BEST_OF,
          rollupType: RollupType.ROLLUP_OF_CHANNELS,
          channels: selectedChannels,
          rollups: [],
          threshold: {
            goodThreshold: 1,
            marginalThreshold: 0,
          },
        },
      ];
    }
  });
};

export const updateChannelCapabilityRollupType = (
  id: string,
  rollup: RollupEntry,
  value: string | null,
  selectedMonitors: string[]
): RollupEntry => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    result.entry['rollupType'] = value as RollupType;
    if (value === RollupType.ROLLUP_OF_MONITORS) {
      result.entry['rollups'] = undefined;
    }
    if (
      value === RollupType.ROLLUP_OF_ROLLUPS &&
      (!result.entry.rollups || result.entry.rollups.length <= 0)
    ) {
      result.entry.rollups = [
        {
          id: uniqueId(),
          operatorType: OperatorType.BEST_OF,
          rollupType: RollupType.ROLLUP_OF_MONITORS,
          monitors: selectedMonitors,
          rollups: [],
          threshold: {
            goodThreshold: 1,
            marginalThreshold: 0,
          },
        },
      ];
    }
  });
};

export const updateCapabilityOperatorType = (
  id: string,
  rollup: RollupEntry,
  value: string | null
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    result.entry['operatorType'] = value as OperatorType;
  });
};

export const updateStationGroupCapabilityStations = (
  id: string,
  rollup: RollupEntry,
  value: string[]
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (result.entry['stations']) {
      result.entry['stations'] = value;
    }
  });
};

const updateAllStations = (
  entry: RollupEntry,
  toggledValue: string,
  selectedValues: string[],
  groupName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
): void => {
  if (entry) {
    if (entry.stations !== undefined) {
      if (selectedValues.includes(toggledValue)) {
        entry.stations = [toggledValue, ...entry.stations];
      } else {
        entry.stations = union<string>(toggledValue, entry.stations).filter(
          (v) => toggledValue !== v
        );
      }
    }
    const errors = determineErrorsFromStationGroupCapabilityChange(
      entry,
      groupName
    );
    errorsRef.current.push(...errors);

    if (entry.rollups !== undefined) {
      entry.rollups.forEach((e) => {
        updateAllStations(
          e,
          toggledValue,
          selectedValues,
          groupName,
          errorsRef
        );
      });
    }
  }
};

export const updateAllStationGroupCapabilityStations = (
  defaultRollup: RollupEntry,
  toggledValue: string,
  selectedValues: string[],
  groupName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
) => {
  return produce(defaultRollup, (draft) => {
    updateAllStations(
      draft,
      toggledValue,
      selectedValues,
      groupName,
      errorsRef
    );
  });
};

export const updateStationCapabilityChannels = (
  id: string,
  rollup: RollupEntry,
  value: string[]
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (result.entry['channels']) {
      result.entry['channels'] = value;
    }
  });
};

export const updateChannelCapabilityMonitors = (
  id: string,
  rollup: RollupEntry,
  value: string[]
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (result.entry['monitors']) {
      result.entry['monitors'] = value;
    }
  });
};

const updateAllChannels = (
  entry: RollupEntry,
  toggledValue: string,
  selectedValues: string[],
  groupName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
): void => {
  if (entry) {
    if (entry.channels !== undefined) {
      if (selectedValues.includes(toggledValue)) {
        entry.channels = [toggledValue, ...entry.channels];
      } else {
        entry.channels = union<string>(toggledValue, entry.channels).filter(
          (v) => toggledValue !== v
        );
      }
    }

    const errors = determineErrorsFromStationCapabilityChange(entry, groupName);
    errorsRef.current.push(...errors);

    if (entry.rollups !== undefined) {
      entry.rollups.forEach((e) => {
        updateAllChannels(
          e,
          toggledValue,
          selectedValues,
          groupName,
          errorsRef
        );
      });
    }
  }
};

const determineErrorsForStationGroupCapabilityNoStations = (
  entry: RollupEntry,
  groupName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: StationGroupCapabilityErrorTypes.NO_STATIONS,
  };

  if (
    entry.rollupType === RollupType.ROLLUP_OF_STATIONS &&
    entry.stations &&
    entry.stations.length === 0
  ) {
    error.hasError = true;
    error.reason = `No stations selected for ${AppSections.STATION_GROUP_CAPABILITY} ${groupName} must have one station included, goto station group tab and add a station or reenable it from the stations tab`;
  }

  return error;
};

const determineErrorsForStationCapabilityNoChannels = (
  entry: RollupEntry,
  groupName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: StationCapabilityErrorTypes.NO_CHANNELS,
  };

  if (
    entry.rollupType === RollupType.ROLLUP_OF_CHANNELS &&
    entry.channels &&
    entry.channels.length === 0
  ) {
    error.hasError = true;
    error.reason = `No channels selected for ${AppSections.GROUP} ${groupName} must have one channel included`;
  }

  return error;
};

const determineErrorsForChannelCapabilityNoMonitors = (
  entry: RollupEntry,
  groupName: string,
  channelName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: ChannelCapabilityErrorTypes.NO_MONITORS,
  };

  if (
    entry.rollupType === RollupType.ROLLUP_OF_MONITORS &&
    entry.monitors &&
    entry.monitors.length === 0
  ) {
    error.hasError = true;
    error.reason = `No monitors selected for ${AppSections.GROUP} ${groupName} ${AppSections.CHANNEL_CAPABILITY} ${channelName} must have one monitor included`;
  }

  return error;
};

const determineErrorsForChannelCapabilityNoRollups = (
  entry: RollupEntry,
  groupName: string,
  channelName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: ChannelCapabilityErrorTypes.NO_ROLLUPS,
  };

  if (
    entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS &&
    entry.rollups &&
    entry.rollups.length === 0
  ) {
    error.hasError = true;
    error.reason = `No rollup entries for ${AppSections.GROUP} ${groupName} ${AppSections.CHANNEL_CAPABILITY} ${channelName} must have one rollup entry`;
  }

  return error;
};

const determineErrorsForStationGroupCapabilityNoRollups = (
  entry: RollupEntry,
  groupName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: StationGroupCapabilityErrorTypes.NO_ROLLUPS,
  };

  if (
    entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS &&
    entry.rollups &&
    entry.rollups.length === 0
  ) {
    error.hasError = true;
    error.reason = `No rollup entries for ${AppSections.STATION_GROUP_CAPABILITY} ${groupName} must have one rollup entry`;
  }

  return error;
};

const determineErrorsForStationCapabilityNoRollups = (
  entry: RollupEntry,
  groupName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: StationCapabilityErrorTypes.NO_ROLLUPS,
  };

  if (
    entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS &&
    entry.rollups &&
    entry.rollups.length === 0
  ) {
    error.hasError = true;
    error.reason = `No rollup entries for ${AppSections.GROUP} ${groupName} must have one rollup entry`;
  }

  return error;
};

export const determineErrorsForStationGroupCapabilityThresholdsExceedsMax = (
  entry: RollupEntry,
  groupName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: StationGroupCapabilityErrorTypes.THRESHOLD_EXCEEDS_MAX,
  };

  let errorReason = `Threshold input is invalid for ${groupName} ${AppSections.STATION_GROUP_CAPABILITY} `;

  if (entry.operatorType === OperatorType.MIN_GOOD_OF && entry.threshold) {
    if (entry.stations && entry.rollupType === RollupType.ROLLUP_OF_STATIONS) {
      if (entry.stations.length < entry.threshold.goodThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-good threshold exceeds selected stations`
        );
      }
      if (entry.stations.length < entry.threshold.marginalThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-marginal threshold exceeds selected stations`
        );
      }
    }
    if (entry.rollups && entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS) {
      if (entry.rollups.length < entry.threshold.goodThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-good threshold exceeds rollups entries`
        );
      }
      if (entry.rollups.length < entry.threshold.marginalThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-marginal threshold exceeds rollup entries`
        );
      }
    }
  }

  if (error.hasError) {
    error.reason = errorReason;
  }

  return error;
};

export const determineErrorsForStationCapabilityThresholdsExceedsMax = (
  entry: RollupEntry,
  groupName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: StationCapabilityErrorTypes.THRESHOLD_EXCEEDS_MAX,
  };

  let errorReason = `Threshold input is invalid for ${AppSections.GROUP} ${groupName}`;

  if (entry.operatorType === OperatorType.MIN_GOOD_OF && entry.threshold) {
    if (entry.channels && entry.rollupType === RollupType.ROLLUP_OF_CHANNELS) {
      if (entry.channels.length < entry.threshold.goodThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-good threshold exceeds selected channels`
        );
      }
      if (entry.channels.length < entry.threshold.marginalThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-marginal threshold exceeds selected channels`
        );
      }
    }
    if (entry.rollups && entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS) {
      if (entry.rollups.length < entry.threshold.goodThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-good threshold exceeds rollups entries`
        );
      }
      if (entry.rollups.length < entry.threshold.marginalThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-marginal threshold exceeds rollup entries`
        );
      }
    }
  }

  if (error.hasError) {
    error.reason = errorReason;
  }

  return error;
};

export const determineErrorsForChannelCapabilityThresholdsExceedsMax = (
  entry: RollupEntry,
  groupName: string,
  channelName: string
): ErrorRecord => {
  let error: ErrorRecord = {
    id: entry.id,
    hasError: false,
    reason: '',
    type: ChannelCapabilityErrorTypes.THRESHOLD_EXCEEDS_MAX,
  };

  let errorReason = `Threshold input is invalid for ${AppSections.GROUP} ${groupName} ${AppSections.CHANNEL_CAPABILITY} ${channelName}`;

  if (entry.operatorType === OperatorType.MIN_GOOD_OF && entry.threshold) {
    if (entry.monitors && entry.rollupType === RollupType.ROLLUP_OF_MONITORS) {
      if (entry.monitors.length < entry.threshold.goodThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-good threshold exceeds selected monitors`
        );
      }
      if (entry.monitors.length < entry.threshold.marginalThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-marginal threshold exceeds selected monitors`
        );
      }
    }
    if (entry.rollups && entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS) {
      if (entry.rollups.length < entry.threshold.goodThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-good threshold exceeds rollups entries`
        );
      }
      if (entry.rollups.length < entry.threshold.marginalThreshold) {
        error.hasError = true;
        errorReason = errorReason.concat(
          `-marginal threshold exceeds rollup entries`
        );
      }
    }
  }

  if (error.hasError) {
    error.reason = errorReason;
  }

  return error;
};

const determineErrorsFromStationGroupCapabilityChange = (
  entry: RollupEntry,
  groupName: string
): ErrorRecord[] => {
  let errors: ErrorRecord[] = [];

  errors.push(
    determineErrorsForStationGroupCapabilityNoRollups(entry, groupName)
  );
  errors.push(
    determineErrorsForStationGroupCapabilityNoStations(entry, groupName)
  );
  errors.push(
    determineErrorsForStationGroupCapabilityThresholdsExceedsMax(
      entry,
      groupName
    )
  );

  return errors;
};

const determineErrorsFromStationCapabilityChange = (
  entry: RollupEntry,
  groupName: string
): ErrorRecord[] => {
  let errors: ErrorRecord[] = [];

  errors.push(determineErrorsForStationCapabilityNoRollups(entry, groupName));
  errors.push(determineErrorsForStationCapabilityNoChannels(entry, groupName));
  errors.push(
    determineErrorsForStationCapabilityThresholdsExceedsMax(entry, groupName)
  );

  return errors;
};

const determineErrorsFromChannelCapabilityChange = (
  entry: RollupEntry,
  groupName: string,
  channelName: string
): ErrorRecord[] => {
  let errors: ErrorRecord[] = [];

  errors.push(
    determineErrorsForChannelCapabilityNoRollups(entry, groupName, channelName)
  );
  errors.push(
    determineErrorsForChannelCapabilityNoMonitors(entry, groupName, channelName)
  );
  errors.push(
    determineErrorsForChannelCapabilityThresholdsExceedsMax(
      entry,
      groupName,
      channelName
    )
  );

  return errors;
};

const updateAllMonitors = (
  entry: RollupEntry,
  toggledValue: string,
  selectedValues: string[],
  groupName: string,
  channelName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
): void => {
  if (entry) {
    if (entry.monitors !== undefined && selectedValues !== undefined) {
      if (selectedValues.includes(toggledValue)) {
        entry.monitors = [toggledValue, ...entry.monitors];
      } else {
        entry.monitors = union<string>(toggledValue, entry.monitors).filter(
          (v) => toggledValue !== v
        );
      }
    }
    const errors = determineErrorsFromChannelCapabilityChange(
      entry,
      groupName,
      channelName
    );
    errorsRef.current.push(...errors);

    if (entry.rollups !== undefined) {
      entry.rollups.forEach((e) => {
        updateAllMonitors(
          e,
          toggledValue,
          selectedValues,
          groupName,
          channelName,
          errorsRef
        );
      });
    }
  }
};

/** Used to remove or add all env monitors to a rollup */
const updateEnvMonitors = (
  entry: RollupEntry,
  isIncluded: boolean,
  envMonitors: string[],
  groupName: string,
  channelName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
): void => {
  if (entry) {
    if (entry.monitors !== undefined) {
      const selectedNonEnvMonitors = entry.monitors.filter(
        (monitor) => !isMonitorAnEnvironmentalType(monitor)
      );
      if (isIncluded) {
        entry.monitors = [...selectedNonEnvMonitors, ...envMonitors];
      } else {
        entry.monitors = [...selectedNonEnvMonitors];
      }
    }
    const errors = determineErrorsFromChannelCapabilityChange(
      entry,
      groupName,
      channelName
    );
    errorsRef.current.push(...errors);

    if (entry.rollups !== undefined) {
      entry.rollups.forEach((e) => {
        updateEnvMonitors(
          e,
          isIncluded,
          envMonitors,
          groupName,
          channelName,
          errorsRef
        );
      });
    }
  }
};

const updateAllMonitorsForChannel = (
  entry: RollupEntry,
  toggledValue: string,
  isChannelSelected: boolean,
  groupName: string,
  channelName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
): void => {
  if (entry && entry.monitors !== undefined) {
    if (isChannelSelected && !includes(entry.monitors, toggledValue)) {
      entry.monitors = [toggledValue, ...entry.monitors];
    }

    if (!isChannelSelected) {
      entry.monitors = entry.monitors.filter(
        (monitor) => monitor !== toggledValue
      );
    }

    const errors = determineErrorsFromChannelCapabilityChange(
      entry,
      groupName,
      channelName
    );
    errorsRef.current.push(...errors);

    if (entry.rollups !== undefined) {
      entry.rollups.forEach((e) => {
        updateAllMonitorsForChannel(
          e,
          toggledValue,
          isChannelSelected,
          groupName,
          channelName,
          errorsRef
        );
      });
    }
  }
};

export const determineMaxThresholdForChannelCapabilityEntry = (
  entry: RollupEntry
) => {
  if (entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS && entry.rollups) {
    return entry.rollups.length;
  }

  if (entry.rollupType === RollupType.ROLLUP_OF_MONITORS && entry.monitors) {
    return entry.monitors.length;
  }

  // error case
  return -1;
};

export const findAndDetermineMaxThresholdValueForChannelCapabilityEntry = (
  defaultRollup: RollupEntry,
  rollupId: string
): number => {
  const rollup = findRollupLocation(defaultRollup, rollupId);
  return determineMaxThresholdForChannelCapabilityEntry(rollup.entry);
};

export const determineMaxThresholdForStationGroupCapabilityEntry = (
  entry: RollupEntry
) => {
  if (entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS && entry.rollups) {
    return entry.rollups.length;
  }

  if (entry.rollupType === RollupType.ROLLUP_OF_STATIONS && entry.stations) {
    return entry.stations.length;
  }

  // error case
  return -1;
};

export const findAndDetermineMaxThresholdValueForStationGroupCapabilityEntry = (
  defaultRollup: RollupEntry,
  rollupId: string
): number => {
  const rollup = findRollupLocation(defaultRollup, rollupId);
  return determineMaxThresholdForStationGroupCapabilityEntry(rollup.entry);
};

export const determineMaxThresholdForStationCapabilityEntry = (
  entry: RollupEntry
) => {
  if (entry.rollupType === RollupType.ROLLUP_OF_ROLLUPS && entry.rollups) {
    return entry.rollups.length;
  }

  if (entry.rollupType === RollupType.ROLLUP_OF_CHANNELS && entry.channels) {
    return entry.channels.length;
  }

  // this indicated an error
  return -1;
};

export const findAndDetermineMaxThresholdValueForStationCapabilityEntry = (
  defaultRollup: RollupEntry,
  rollupId: string
) => {
  const rollup = findRollupLocation(defaultRollup, rollupId);
  return determineMaxThresholdForStationCapabilityEntry(rollup.entry);
};

export const updateAllStationCapabilityChannels = (
  defaultRollup: RollupEntry,
  toggledValue: string,
  selectedValues: string[],
  groupName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
) => {
  return produce(defaultRollup, (draft) => {
    updateAllChannels(
      draft,
      toggledValue,
      selectedValues,
      groupName,
      errorsRef
    );
  });
};

/**
 * Updates all env monitors for default and each to be included or not based on param
 *
 * @param defaultRollup
 * @param isIncluded
 * @param envMonitors
 * @param groupName
 * @param channelName
 * @param errorsRef
 * @returns new rollup
 */
export const updateEnvChannelCapabilityMonitors = (
  defaultRollup: RollupEntry,
  isIncluded: boolean,
  envMonitors: string[],
  groupName: string,
  channelName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
) => {
  return produce(defaultRollup, (draft) => {
    updateEnvMonitors(
      draft,
      isIncluded,
      envMonitors,
      groupName,
      channelName,
      errorsRef
    );
  });
};

/**
 * Updates all monitors for default and each of its nested entries based on a monitor toggle
 *
 * @param defaultRollup
 * @param toggledValue
 * @param selectedValues
 * @param groupName
 * @param channelName
 * @param errorsRef
 * @returns new rollup
 */
export const updateAllChannelCapabilityMonitors = (
  defaultRollup: RollupEntry,
  toggledValue: string,
  selectedValues: string[],
  groupName: string,
  channelName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
) => {
  return produce(defaultRollup, (draft) => {
    updateAllMonitors(
      draft,
      toggledValue,
      selectedValues,
      groupName,
      channelName,
      errorsRef
    );
  });
};

/**
 * Updates a monitor based on a channel monitor toggle for a channel
 *
 * @param defaultRollup
 * @param toggledValue
 * @param isChannelSelected
 * @param groupName
 * @param channelName
 * @param errorsRef
 * @returns
 */
export const updateAllChannelCapabilityMonitor = (
  defaultRollup: RollupEntry,
  toggledValue: string,
  isChannelSelected: boolean,
  groupName: string,
  channelName: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
) => {
  return produce(defaultRollup, (draft) => {
    updateAllMonitorsForChannel(
      draft,
      toggledValue,
      isChannelSelected,
      groupName,
      channelName,
      errorsRef
    );
  });
};

export const updateCapabilityMarginalThreshold = (
  id: string,
  rollup: RollupEntry,
  value: string | number
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (result.entry['threshold']) {
      result.entry['threshold'].marginalThreshold = value;
    }
  });
};

export const updateCapabilityGoodThreshold = (
  id: string,
  rollup: RollupEntry,
  value: string | number
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (result.entry['threshold']) {
      result.entry['threshold'].goodThreshold = value;
    }
  });
};

export const addStationGroupCapabilityRollupEntry = (
  id: string,
  rollup: RollupEntry,
  includedStations: string[],
  errorsRef: React.MutableRefObject<ErrorRecord[]>,
  groupName: string
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (result.entry['rollups']) {
      result.entry['rollups'] = [
        {
          id: uniqueId(),
          operatorType: OperatorType.BEST_OF,
          rollupType: RollupType.ROLLUP_OF_STATIONS,
          stations: includedStations,
          rollups: [],
          threshold: {
            goodThreshold: 1,
            marginalThreshold: 0,
          },
        },
        ...result.entry.rollups,
      ];
    }
    errorsRef.current = determineErrorsFromStationGroupCapabilityChange(
      result.entry,
      groupName
    );
  });
};

export const addStationCapabilityRollupEntry = (
  id: string,
  rollup: RollupEntry,
  selectedChannels: string[],
  errorsRef: React.MutableRefObject<ErrorRecord[]>,
  groupName: string
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (result.entry['rollups']) {
      result.entry['rollups'] = [
        {
          id: uniqueId(),
          operatorType: OperatorType.BEST_OF,
          rollupType: RollupType.ROLLUP_OF_CHANNELS,
          channels: selectedChannels,
          rollups: [],
          threshold: {
            goodThreshold: 1,
            marginalThreshold: 0,
          },
        },
        ...result.entry.rollups,
      ];
    }
    errorsRef.current = determineErrorsFromStationCapabilityChange(
      result.entry,
      groupName
    );
  });
};

export const addChannelCapabilityRollupEntry = (
  id: string,
  rollup: RollupEntry,
  selectedMonitors: string[],
  errorsRef: React.MutableRefObject<ErrorRecord[]>,
  groupName: string,
  channelName: string
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (result.entry['rollups']) {
      result.entry['rollups'] = [
        {
          id: uniqueId(),
          operatorType: OperatorType.BEST_OF,
          rollupType: RollupType.ROLLUP_OF_MONITORS,
          monitors: selectedMonitors,
          rollups: [],
          threshold: {
            goodThreshold: 1,
            marginalThreshold: 0,
          },
        },
        ...result.entry.rollups,
      ];
    }
    errorsRef.current = determineErrorsFromChannelCapabilityChange(
      result.entry,
      groupName,
      channelName
    );
  });
};

export const deleteStationGroupCapabilityRollupEntry = (
  id: string,
  rollup: RollupEntry,
  errorsRef: React.MutableRefObject<ErrorRecord[]>,
  groupName: string
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (
      result.parentRollupEntry != null &&
      result.parentRollupEntry['rollups']
    ) {
      result.parentRollupEntry['rollups'] = result.parentRollupEntry[
        'rollups'
      ].filter((innerRollup) => innerRollup.id !== id);
    }
    if (result.parentRollupEntry) {
      errorsRef.current = determineErrorsFromStationGroupCapabilityChange(
        result.parentRollupEntry,
        groupName
      );
    }
  });
};

export const deleteCapabilityRollupEntry = (
  id: string,
  rollup: RollupEntry,
  errorsRef: React.MutableRefObject<ErrorRecord[]>,
  groupName: string,
  channelName?: string
) => {
  return produce(rollup, (draft) => {
    const result = findRollupLocation(draft, id);
    if (
      result.parentRollupEntry != null &&
      result.parentRollupEntry['rollups']
    ) {
      result.parentRollupEntry['rollups'] = result.parentRollupEntry[
        'rollups'
      ].filter((innerRollup) => innerRollup.id !== id);
    }
    if (result.parentRollupEntry) {
      if (channelName) {
        errorsRef.current = determineErrorsFromChannelCapabilityChange(
          result.parentRollupEntry,
          groupName,
          channelName
        );
      } else {
        errorsRef.current = determineErrorsFromStationCapabilityChange(
          result.parentRollupEntry,
          groupName
        );
      }
    }
  });
};

const removeStationsIfApplicable = (
  entry: RollupOperatorOperands,
  entryStationNames: string[] | undefined,
  allStationNames: string[]
): RollupOperatorOperands => {
  const sortedAllStationNames = produce(allStationNames, (draft) => {
    draft?.sort();
  });
  let sortedRollupEntryStations: string[] = [];
  if (entryStationNames) {
    sortedRollupEntryStations = produce(entryStationNames, (draft) => {
      draft.sort();
    });
  }
  if (
    entry.rollupOperatorOperands ||
    isEqual(sortedAllStationNames, sortedRollupEntryStations)
  ) {
    delete entry.stationOperands;
  }
  return entry;
};

const removeChannelsIfApplicable = (
  entry: RollupOperatorOperands,
  entryChannelNames: string[] | undefined,
  allChannelNames: string[]
): RollupOperatorOperands => {
  allChannelNames.sort();
  let sortedRollupEntryChannels: string[] = [];
  if (entryChannelNames) {
    sortedRollupEntryChannels = produce(entryChannelNames, (draft) => {
      draft.sort();
    });
  }
  if (
    entry.rollupOperatorOperands ||
    isEqual(allChannelNames, sortedRollupEntryChannels)
  ) {
    delete entry.channelOperands;
  }
  return entry;
};

const removeMonitorsIfApplicable = (
  entry: RollupOperatorOperands,
  entryMonitorNames: string[] | undefined,
  supportedMonitorNames: string[]
): RollupOperatorOperands => {
  const sortedSupportedMonitorNames = produce(
    supportedMonitorNames,
    (draft) => {
      draft.sort();
    }
  );
  let sortedRollupEntryMonitors: string[] = [];
  if (entryMonitorNames) {
    sortedRollupEntryMonitors = produce(entryMonitorNames, (draft) => {
      draft.sort();
    });
  }
  if (
    entry.rollupOperatorOperands ||
    isEqual(sortedSupportedMonitorNames, sortedRollupEntryMonitors)
  ) {
    delete entry.sohMonitorTypeOperands;
  }
  return entry;
};

const removeThresholdsIfApplicable = (
  entry: RollupOperatorOperands
): RollupOperatorOperands => {
  if (entry.operatorType !== OperatorType.MIN_GOOD_OF) {
    delete entry.goodThreshold;
    delete entry.marginalThreshold;
  }
  return entry;
};

const removeRollupOperatorOperandsIfApplicable = (
  entry: RollupOperatorOperands
): RollupOperatorOperands => {
  if (
    !entry.rollupOperatorOperands ||
    entry.rollupOperatorOperands.length === 0
  ) {
    delete entry.rollupOperatorOperands;
  }
  return entry;
};

const removeAllNonApplicableFieldsFromStationGroupCapabilityRollupOperatorOperand =
  (
    entry: RollupOperatorOperands,
    entryStationNames: string[] | undefined,
    allStationNames: string[]
  ) => {
    // ! to simplify the other checks, must remove rollupOperatorOperands first
    entry = removeRollupOperatorOperandsIfApplicable(entry);
    entry = removeStationsIfApplicable(
      entry,
      entryStationNames,
      allStationNames
    );
    entry = removeThresholdsIfApplicable(entry);
    return entry;
  };

const removeAllNonApplicableFieldsFromStationCapabilityRollupOperatorOperand = (
  entry: RollupOperatorOperands,
  entryChannelNames: string[] | undefined,
  allChannelNames: string[]
) => {
  // ! to simplify the other checks, must remove rollupOperatorOperands first
  entry = removeRollupOperatorOperandsIfApplicable(entry);
  entry = removeChannelsIfApplicable(entry, entryChannelNames, allChannelNames);
  entry = removeThresholdsIfApplicable(entry);
  return entry;
};

const removeAllNonApplicableFieldsFromChannelCapabilityRollupOperatorOperand = (
  entry: RollupOperatorOperands,
  entryMonitorNames: string[] | undefined,
  supportedMonitorNames: string[]
) => {
  // ! to simplify the other checks, must remove rollupOperatorOperands first
  entry = removeRollupOperatorOperandsIfApplicable(entry);
  entry = removeMonitorsIfApplicable(
    entry,
    entryMonitorNames,
    supportedMonitorNames
  );
  entry = removeThresholdsIfApplicable(entry);
  return entry;
};

const convertRollupEntryToChannelsToStationRollupOperator = (
  rollupEntry: RollupEntry,
  allChannelNames: string[]
): RollupOperatorOperands => {
  let convertedEntry: RollupOperatorOperands = {
    operatorType: rollupEntry.operatorType,
    channelOperands: rollupEntry.channels ?? [],
    rollupOperatorOperands: rollupEntry.rollups
      ? rollupEntry.rollups.map((entry) =>
          convertRollupEntryToChannelsToStationRollupOperator(
            entry,
            allChannelNames
          )
        )
      : undefined,
    goodThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.goodThreshold.toString())
      : undefined,
    marginalThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.marginalThreshold.toString())
      : undefined,
  };
  convertedEntry =
    removeAllNonApplicableFieldsFromStationCapabilityRollupOperatorOperand(
      convertedEntry,
      rollupEntry.channels,
      allChannelNames
    );
  return convertedEntry;
};

export const convertRollupsToStationsToGroupRollupOperator = (
  rollupEntry: RollupEntry,
  allStationNames: string[]
): RollupOperatorOperands => {
  let stationsToGroupRollupOperator: RollupOperatorOperands = {
    operatorType: rollupEntry.operatorType,
    stationOperands: rollupEntry.stations ?? [],
    rollupOperatorOperands: rollupEntry.rollups
      ? rollupEntry.rollups.map((entry) =>
          convertRollupsToStationsToGroupRollupOperator(entry, allStationNames)
        )
      : undefined,
    goodThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.goodThreshold.toString())
      : undefined,
    marginalThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.marginalThreshold.toString())
      : undefined,
  };

  stationsToGroupRollupOperator =
    removeAllNonApplicableFieldsFromStationGroupCapabilityRollupOperatorOperand(
      stationsToGroupRollupOperator,
      rollupEntry.stations,
      allStationNames
    );
  return stationsToGroupRollupOperator;
};

export const convertRollupsToChannelsToStationRollupOperator = (
  rollupEntry: RollupEntry,
  allChannelNames: string[]
): RollupOperatorOperands => {
  let channelsToStationRollupOperator: RollupOperatorOperands = {
    operatorType: rollupEntry.operatorType,
    channelOperands: rollupEntry.channels ?? [],
    rollupOperatorOperands: rollupEntry.rollups
      ? rollupEntry.rollups.map((entry) =>
          convertRollupEntryToChannelsToStationRollupOperator(
            entry,
            allChannelNames
          )
        )
      : undefined,
    goodThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.goodThreshold.toString())
      : undefined,
    marginalThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.marginalThreshold.toString())
      : undefined,
  };

  channelsToStationRollupOperator =
    removeAllNonApplicableFieldsFromStationCapabilityRollupOperatorOperand(
      channelsToStationRollupOperator,
      rollupEntry.channels,
      allChannelNames
    );
  return channelsToStationRollupOperator;
};

const convertRollupEntryToSohMonitorsToChannelRollupOperator = (
  rollupEntry: RollupEntry,
  supportedMonitorNames: string[]
): RollupOperatorOperands => {
  let convertedEntry: RollupOperatorOperands = {
    operatorType: rollupEntry.operatorType,
    sohMonitorTypeOperands: rollupEntry.monitors ?? [],
    rollupOperatorOperands: rollupEntry.rollups
      ? rollupEntry.rollups.map((entry) =>
          convertRollupEntryToSohMonitorsToChannelRollupOperator(
            entry,
            supportedMonitorNames
          )
        )
      : undefined,
    goodThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.goodThreshold.toString())
      : undefined,
    marginalThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.marginalThreshold.toString())
      : undefined,
  };
  convertedEntry =
    removeAllNonApplicableFieldsFromChannelCapabilityRollupOperatorOperand(
      convertedEntry,
      rollupEntry.monitors,
      supportedMonitorNames
    );
  return convertedEntry;
};

export const convertRollupsToSohMonitorsToChannelRollupOperator = (
  rollupEntry: RollupEntry,
  supportedMonitorNames: string[]
): RollupOperatorOperands => {
  let sohMonitorsToChannelRollupOperator: RollupOperatorOperands = {
    operatorType: rollupEntry.operatorType,
    sohMonitorTypeOperands: rollupEntry.monitors ?? [],
    rollupOperatorOperands: rollupEntry.rollups
      ? rollupEntry.rollups.map((entry) =>
          convertRollupEntryToSohMonitorsToChannelRollupOperator(
            entry,
            supportedMonitorNames
          )
        )
      : undefined,
    goodThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.goodThreshold.toString())
      : undefined,
    marginalThreshold: rollupEntry.threshold
      ? parseInt(rollupEntry.threshold?.marginalThreshold.toString())
      : undefined,
  };

  sohMonitorsToChannelRollupOperator =
    removeAllNonApplicableFieldsFromChannelCapabilityRollupOperatorOperand(
      sohMonitorsToChannelRollupOperator,
      rollupEntry.monitors,
      supportedMonitorNames
    );
  return sohMonitorsToChannelRollupOperator;
};

const checkInternalRollupsForConflictedMonitors = (
  rollups: RollupEntry[] | undefined,
  selectedMonitors: string[]
): { hasConflicts: boolean; conflictedMonitors: string[] }[] => {
  return flatMap(
    rollups?.map((rollup) => {
      if (
        rollup.rollupType === RollupType.ROLLUP_OF_MONITORS &&
        rollup.monitors
      ) {
        let conflictedMonitors: string[] = [];
        rollup.monitors.forEach((monitor) => {
          if (!includes(selectedMonitors, monitor)) {
            conflictedMonitors.push(monitor);
          }
        });
        if (conflictedMonitors.length > 0) {
          return { hasConflicts: true, conflictedMonitors };
        }
      }
      return checkInternalRollupsForConflictedMonitors(
        rollup.rollups,
        selectedMonitors
      );
    })
  ).filter((entry) => entry !== undefined);
};

export const checkIfRollupHasConflictedMonitors = (
  rollup: RollupEntry,
  selectedMonitors: string[]
): { hasConflicts: boolean; conflictedMonitors: string[] } => {
  let result: { hasConflicts: boolean; conflictedMonitors: string[] } = {
    hasConflicts: false,
    conflictedMonitors: [],
  };
  if (rollup.rollupType === RollupType.ROLLUP_OF_MONITORS && rollup.monitors) {
    rollup.monitors.forEach((monitor) => {
      if (!includes(selectedMonitors, monitor)) {
        result.conflictedMonitors.push(monitor);
        result.hasConflicts = true;
      }
    });
    return result;
  }
  const internalResult = checkInternalRollupsForConflictedMonitors(
    rollup.rollups,
    selectedMonitors
  );
  if (!internalResult || internalResult.length < 1) {
    return { hasConflicts: false, conflictedMonitors: [] };
  }

  return internalResult[0];
};

/**
 * Goes through Rollup to find entry by id
 *
 * @param defaultRollup top level of rollup entry
 * @param rollupId entry id to return
 * @returns RollupEntry
 */
export const getRollupByDefaultAndId = (
  defaultRollup: RollupEntry,
  rollupId: string
) => {
  return findRollupLocation(defaultRollup, rollupId).entry;
};

/**
 * Finds all errors for rollups for station group capability internal to parent
 * @param defaultRollup highest level of rollup entry
 * @param parentRollupId id of parent which rollups below are being removed
 * @param errorsRef Error ref to keep track of errors
 */
export const findAllErrorsForDeletedStationGroupCapabilityEntries = (
  defaultRollup: RollupEntry,
  parentRollupId: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
) => {
  const parentRollupEntry = findRollupLocation(defaultRollup, parentRollupId);
  errorsRef.current.push(
    ...determineErrorsFromStationGroupCapabilityChange(
      parentRollupEntry.entry,
      ''
    )
  );
  if (parentRollupEntry.entry.rollups) {
    parentRollupEntry.entry.rollups.forEach((rollup) => {
      findAllErrorsForDeletedStationGroupCapabilityEntries(
        defaultRollup,
        rollup.id,
        errorsRef
      );
    });
  }
};

/**
 * Finds all errors for rollups for station capability internal to parent
 * @param defaultRollup highest level of rollup entry
 * @param parentRollupId id of parent which rollups below are being removed
 * @param errorsRef Error ref to keep track of errors
 */
export const findAllErrorsForDeletedStationCapabilityEntries = (
  defaultRollup: RollupEntry,
  parentRollupId: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
) => {
  const parentRollupEntry = findRollupLocation(defaultRollup, parentRollupId);
  errorsRef.current.push(
    ...determineErrorsFromStationCapabilityChange(parentRollupEntry.entry, '')
  );
  if (parentRollupEntry.entry.rollups) {
    parentRollupEntry.entry.rollups.forEach((rollup) => {
      findAllErrorsForDeletedStationCapabilityEntries(
        defaultRollup,
        rollup.id,
        errorsRef
      );
    });
  }
};

/**
 * Finds all errors for rollups for station capability internal to parent
 * @param defaultRollup highest level of rollup entry
 * @param parentRollupId id of parent which rollups below are being removed
 * @param errorsRef Error ref to keep track of errors
 */
export const findAllErrorsForDeletedChannelCapabilityEntries = (
  defaultRollup: RollupEntry,
  parentRollupId: string,
  errorsRef: React.MutableRefObject<ErrorRecord[]>
) => {
  const parentRollupEntry = findRollupLocation(defaultRollup, parentRollupId);
  errorsRef.current.push(
    ...determineErrorsFromChannelCapabilityChange(
      parentRollupEntry.entry,
      '',
      ''
    )
  );
  if (parentRollupEntry.entry.rollups) {
    parentRollupEntry.entry.rollups.forEach((rollup) => {
      findAllErrorsForDeletedChannelCapabilityEntries(
        defaultRollup,
        rollup.id,
        errorsRef
      );
    });
  }
};
