import produce, { Draft } from 'immer';
import React from 'react';
import { LoadingState, useAppContext } from '../state/state';
import { windowAPI } from '../electron-util';
import { useAppDispatch, useAppSelector } from '../state/react-redux-hooks';
import {
  ErrorRecord,
  RollupEntry,
  setAllGroupNames,
  setChannelCapabilityRollup,
  setGroupsWithIncludedStations,
  setHasError,
  setHasStationUpdateCausedStationGroupCapabilityError,
  setLoadedData,
  setMonitorTypeForRollup,
  setStationCapabilityRollup,
  setStationGroupCapabilityRollup,
  setStationGroupCapabilityRollupRecord,
} from '../state/station-controls-slice';
import { getChannels } from '../renderers/channel-checklist/ChannelChecklist';
import {
  checkIfRollupHasConflictedMonitors,
  findAllErrorsForDeletedChannelCapabilityEntries,
  findAllErrorsForDeletedStationCapabilityEntries,
  findAllErrorsForDeletedStationGroupCapabilityEntries,
  updateAllChannelCapabilityMonitor,
  updateAllChannelCapabilityMonitors,
  updateAllStationGroupCapabilityStations,
  updateEnvChannelCapabilityMonitors,
} from '../renderers/station-capability-rollup/util';
import { batch } from 'react-redux';
import { ChannelCapabilityRollup } from '../state/retrieve-channel-capability-rollups';
import { getErrorRecordKeyForChannelCapabilityMonitors } from '../state/error-state-utils';
import {
  isMonitorAnEnvironmentalType,
  updateIsIncludedForMonitorType,
} from '../renderers/monitor-types-rollup/util';
import { MonitorTypeConfig } from '../coi-types/monitor-types';
import { ALL_STATION_GROUP_NAME } from '../renderers/station-groups-checklist/util';
import { AppSections } from '../routes/types';
import {
  convertStationGroupCapabilityQueryDataToRollup,
  StationGroupCapabilityQueryResults,
} from '../state/retrieve-station-group-capability';
import {
  ConfigurationOption,
  stationGroupCapabilityRollupConfigName,
} from '../coi-types';

/**
 * Returns the previous value that was passed in, and stores the current
 * value for future reference. On the next run, returns the previous value,
 * and then stores the passed in value for future reference. Etc...
 * On the first run, it returns initialValue
 *
 * @param value a value to assign for future retrieval.
 * @param initialValue a starting value
 * @returns the previous value, or the initial value on the first run
 */
export function usePrevious<T = unknown>(value: T, initialValue: T): T {
  const ref = React.useRef(initialValue);
  React.useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * Prints out which of the dependencies have changed, helping to debug useEffect code
 *
 * @param effectHook a function that should be executed when useEffect is called
 * @param dependencies an array of dependencies, checked for referential equality
 * @param dependencyNames an optional list of names corresponding to the dependencies with the same indices
 */
export const useEffectDebugger = (
  effectHook: () => void,
  dependencies: unknown[],
  dependencyNames: string[] = []
): void => {
  const previousDeps = usePrevious(dependencies, []);
  const { current: effectHookCallback } = React.useRef(effectHook);
  const changedDeps: any = dependencies.reduce(
    (accum: { [key: string]: unknown }, dependency, index) => {
      if (dependency !== previousDeps[index]) {
        const keyName = dependencyNames[index] || index;
        return {
          ...accum,
          [keyName]: {
            before: previousDeps[index],
            after: dependency,
          },
        };
      }
      return accum;
    },
    {}
  );

  if (Object.keys(changedDeps).length) {
    console.log(changedDeps);
  }

  React.useEffect(effectHookCallback, [effectHookCallback, ...dependencies]);
};

export const useOnce = (callback: () => void) => {
  const isFirstTimeRef = React.useRef(true);
  if (isFirstTimeRef.current) {
    callback();
    isFirstTimeRef.current = false;
  }
};

export const useLoadData = (
  loadData: () => Promise<void>,
  setLoadingState: React.Dispatch<React.SetStateAction<LoadingState>>
) => {
  useOnce(async () => {
    setLoadingState(
      (prev: LoadingState): LoadingState => ({
        numRequested: prev.numRequested + 1,
        numComplete: prev.numComplete,
      })
    );
    await loadData().catch((e) => console.error(e));
    setLoadingState(
      (prev: LoadingState): LoadingState => ({
        numRequested: prev.numRequested,
        numComplete: prev.numComplete + 1,
      })
    );
  });
};

export const useConfigFromDirectory = (
  dirName: string,
  setData: React.Dispatch<any>,
  setLoadingState: React.Dispatch<React.SetStateAction<LoadingState>>
) => {
  const loadConfig = async () => {
    const configName = dirName;
    const result = await windowAPI.electronAPI.loadConfigFromDir(configName);
    setData((data: any) => {
      return produce(data, (draft: Draft<any>) => {
        draft[configName] = result;
      });
    });
  };
  useLoadData(loadConfig, setLoadingState);
};

export function useDebouncedSetState<T>(
  setState: React.Dispatch<React.SetStateAction<T>> | ((val: any) => void),
  delay = 250
): (newState: T) => void {
  const tempStateRef = React.useRef<T>();
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  return React.useCallback(
    (newState: T) => {
      tempStateRef.current = newState;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (!!tempStateRef.current) {
          setState(tempStateRef.current);
          tempStateRef.current = undefined;
        }
      }, delay);
    },
    [delay, setState]
  );
}

/**
 * @returns whether a station has been selected
 */
export const useIsStationSelected = (): boolean => {
  return !!useAppSelector((state) => state.stationControls.stationName);
};

/**
 * Hook using error state to determine if error
 * @returns function to determine if monitor has error
 */
export const useMonitorHaveError = () => {
  const userInputErrorsMap = useAppSelector(
    (state) => state.stationControls.error
  );

  const determineMonitorHasError = (monitorName: string): boolean => {
    let isError = false;
    Object.keys(userInputErrorsMap).forEach((entryName) => {
      if (
        userInputErrorsMap[entryName].hasError &&
        entryName.includes(monitorName)
      ) {
        isError = true;
      }
    });
    return isError;
  };
  return [determineMonitorHasError];
};

/**
 * Hook using error state to determine if error
 * @returns function to determine if channel list has error
 */
export const useChannelListHasError = () => {
  const userInputErrorsMap = useAppSelector(
    (state) => state.stationControls.error
  );

  const determineChannelListHasError = (key: string): boolean => {
    let isError = false;
    Object.keys(userInputErrorsMap).forEach((entryName) => {
      if (userInputErrorsMap[entryName].hasError && entryName.includes(key)) {
        isError = true;
      }
    });
    return isError;
  };
  return [determineChannelListHasError];
};

/**
 * Hook to wrap redux update to error state
 * @returns updateErrorState function
 */
export const useUpdateErrorState = (): [
  (
    attributeName: string,
    hasError: boolean,
    reason: string
  ) => {
    payload: any;
    type: string;
  }
] => {
  const dispatch = useAppDispatch();
  const updateErrorState = React.useCallback(
    (attributeName: string, hasError: boolean, reason: string) =>
      dispatch(setHasError({ attributeName, errorInfo: { hasError, reason } })),
    [dispatch]
  );
  return [updateErrorState];
};

/**
 * Hook to wrap redux update to which data has loaded
 * @returns updateErrorState function
 */
export const useUpdateDataLoaded = (): [
  (
    dataName: string,
    hasLoaded: boolean
  ) => {
    payload: any;
    type: string;
  }
] => {
  const dispatch = useAppDispatch();
  const updateDataLoaded = React.useCallback(
    (dataName: string, hasLoaded: boolean) =>
      dispatch(setLoadedData({ dataName, hasLoaded })),
    [dispatch]
  );
  return [updateDataLoaded];
};

/**
 * Hook wrap redux update for station group capability rollup
 * @returns updateStationGroupCapabilityRollup
 */
export const useUpdateStationGroupCapability = (): [
  (
    groupName: string,
    newRollup: RollupEntry
  ) => {
    payload: any;
    type: string;
  }
] => {
  const dispatch = useAppDispatch();
  const updateStationGroupCapabilityRollup = React.useCallback(
    (groupName: string, newRollup: RollupEntry) =>
      dispatch(
        setStationGroupCapabilityRollup({
          groupName,
          rollup: newRollup,
        })
      ),
    [dispatch]
  );
  return [updateStationGroupCapabilityRollup];
};

/**
 * Hook wrap redux update station groups list
 * @returns updateStationGroups
 */
export const useUpdateStationGroups = (): ((stationGroups: string[]) => {
  payload: any;
  type: string;
}) => {
  const dispatch = useAppDispatch();
  return React.useCallback(
    (stationGroups: string[]) =>
      dispatch(setAllGroupNames({ allGroupNames: stationGroups })),
    [dispatch]
  );
};

/**
 * Hook wrap redux update for station capability rollup
 * @returns updateStationCapabilityRollup
 */
export const useUpdateStationCapability = (): [
  (
    stationName: string,
    groupName: string,
    newRollup: RollupEntry
  ) => {
    payload: any;
    type: string;
  }
] => {
  const dispatch = useAppDispatch();
  const updateStationCapabilityRollup = React.useCallback(
    (stationName: string, groupName: string, newRollup: RollupEntry) =>
      dispatch(
        setStationCapabilityRollup({
          stationName,
          groupName,
          rollup: newRollup,
        })
      ),
    [dispatch]
  );
  return [updateStationCapabilityRollup];
};

/**
 * Hook wrap redux update for channel capability rollup
 * @returns updateChannelCapabilityRollup
 */
export const useUpdateChannelCapabilityRollup = (): [
  (
    stationName: string,
    groupName: string,
    channelName: string,
    newRollup: RollupEntry
  ) => {
    payload: any;
    type: string;
  }
] => {
  const dispatch = useAppDispatch();
  const updateChannelCapabilityRollup = React.useCallback(
    (
      stationName: string,
      groupName: string,
      channelName: string,
      newRollup: RollupEntry
    ) =>
      dispatch(
        setChannelCapabilityRollup({
          stationName,
          groupName,
          channelName,
          rollup: newRollup,
        })
      ),
    [dispatch]
  );
  return [updateChannelCapabilityRollup];
};

/**
 * Loops through MonitorTypesRollups to determine selected monitors
 * @returns array of selected monitor names
 */
export const useSelectedMonitors = (): string[] => {
  const stationName = useAppSelector(
    (state) => state.stationControls.stationName
  );

  const monitorTypesForRollup = useAppSelector(
    (state) => state.stationControls.monitorTypesForRollup
  );

  const selectedMonitors = React.useMemo(
    () =>
      monitorTypesForRollup[stationName ?? '']
        ?.filter((mt) => mt.isIncluded)
        .map((monitorType) => monitorType.name),
    [stationName, monitorTypesForRollup]
  );
  return selectedMonitors;
};

/**
 * Hook wrap redux update for monitors for all groups for all capability rollups
 * @returns updateAllMonitorsForAllCapabilityRollups
 */
export const useUpdateAllMonitorsForAllCapabilityRollups = (): [
  (
    monitorName: string,
    selectedMonitors: string[],
    stationGroupsToUpdate: string[]
  ) => void
] => {
  const { data: appData } = useAppContext();
  const dispatch = useAppDispatch();
  const [updateErrorState] = useUpdateErrorState();
  const errors: ErrorRecord[] = [];
  // Ref of errors passed down to recursive update which checks for errors and updates ref as needed
  const errorsRef = React.useRef(errors);
  const stationName = useAppSelector(
    (state) => state.stationControls.stationName
  );

  const allChannelsNames = React.useMemo(
    () => getChannels(stationName, appData.processingStationGroups),
    [appData.processingStationGroups, stationName]
  ).map((channel) => channel.name);

  const channelCapabilityRollupRecord = useAppSelector(
    (store) => store.stationControls.channelCapabilityRollup[stationName ?? '']
  );
  const updateAllMonitorsForAllCapabilityRollups = React.useCallback(
    (
      monitorName: string,
      selectedMonitors: string[],
      stationGroupsToUpdate: string[]
    ) =>
      batch(() => {
        stationGroupsToUpdate.forEach((groupName) => {
          let doesGroupHaveConflicts = false;
          allChannelsNames.forEach((channelName) => {
            const channelCapabilityGroup =
              channelCapabilityRollupRecord[groupName];
            if (channelCapabilityGroup) {
              const defaultChannelCapabilityRollup =
                channelCapabilityGroup[channelName];
              if (defaultChannelCapabilityRollup) {
                dispatch(
                  setChannelCapabilityRollup({
                    stationName,
                    groupName,
                    channelName,
                    rollup: updateAllChannelCapabilityMonitors(
                      defaultChannelCapabilityRollup,
                      monitorName,
                      selectedMonitors,
                      groupName,
                      channelName,
                      errorsRef
                    ),
                  })
                );

                errorsRef.current.forEach((error) => {
                  dispatch(
                    setHasError({
                      attributeName: `${error.id} ${error.type}`,
                      errorInfo: {
                        hasError: error.hasError,
                        reason: error.reason,
                      },
                    })
                  );
                });

                const monitorConflicts = checkIfRollupHasConflictedMonitors(
                  defaultChannelCapabilityRollup,
                  selectedMonitors
                );
                if (monitorConflicts.hasConflicts) {
                  doesGroupHaveConflicts = true;
                }
              }
            }
            errorsRef.current = [];
          });
          // When data is initially query it is possible for there to be an preexisting issue in config
          // Where the monitors for rollup station conflict with channel capability rollup monitors
          // Once a user resolved that conflict by toggling the monitor on, this will resolve the error state
          // A user cannot create a conflict, thus only have to remove and not create an error state for this case
          if (!doesGroupHaveConflicts) {
            updateErrorState(
              getErrorRecordKeyForChannelCapabilityMonitors(groupName),
              false,
              ''
            );
          }
        });
      }),
    [
      allChannelsNames,
      channelCapabilityRollupRecord,
      dispatch,
      stationName,
      updateErrorState,
    ]
  );
  return [updateAllMonitorsForAllCapabilityRollups];
};

/**
 * Hook to toggle all env monitors to checked or unchecked
 * Effects channel capability for all groups
 * @returns toggleAllEnvMonitors function
 */
export const useToggleAllEnvMonitors = (): ((isIncluded: boolean) => void) => {
  const stationName = useAppSelector(
    (state) => state.stationControls.stationName
  );
  const monitorsTypesForRollup = useAppSelector(
    (state) => state.stationControls.monitorTypesForRollup[stationName ?? '']
  );
  const { data: appData } = useAppContext();
  const dispatch = useAppDispatch();
  const errors: ErrorRecord[] = [];
  // Ref of errors passed down to recursive update which checks for errors and updates ref as needed
  const errorsRef = React.useRef(errors);
  const stationGroupsForStation = useAppSelector(
    (state) => state.stationControls.stationGroups[stationName ?? '']
  );
  const stationGroupNames = stationGroupsForStation?.map((group) => group.name);

  const allChannelsNames = React.useMemo(
    () => getChannels(stationName, appData.processingStationGroups),
    [appData.processingStationGroups, stationName]
  ).map((channel) => channel.name);

  const channelCapabilityRollupRecord = useAppSelector(
    (store) => store.stationControls.channelCapabilityRollup[stationName ?? '']
  );

  const allEnvMonitorTypeNames = monitorsTypesForRollup
    ?.map((rollup) => rollup.name)
    ?.filter((name) => isMonitorAnEnvironmentalType(name));

  const toggleAllEnvMonitors = React.useCallback(
    (isIncluded: boolean) =>
      batch(() => {
        const updatedMonitorTypeConfigs: MonitorTypeConfig[] = [];
        monitorsTypesForRollup.forEach((rollup) => {
          if (isMonitorAnEnvironmentalType(rollup.name)) {
            updatedMonitorTypeConfigs.push(
              updateIsIncludedForMonitorType(rollup, isIncluded)
            );
          } else {
            updatedMonitorTypeConfigs.push(rollup);
          }
        });
        dispatch(
          setMonitorTypeForRollup({
            stationName,
            monitorTypesForRollup: updatedMonitorTypeConfigs,
          })
        );
        stationGroupNames.forEach((groupName) => {
          allChannelsNames.forEach((channelName) => {
            const channelCapabilityGroup =
              channelCapabilityRollupRecord[groupName];
            if (channelCapabilityGroup) {
              const defaultChannelCapabilityRollup =
                channelCapabilityGroup[channelName];
              if (defaultChannelCapabilityRollup) {
                dispatch(
                  setChannelCapabilityRollup({
                    stationName,
                    groupName,
                    channelName,
                    rollup: updateEnvChannelCapabilityMonitors(
                      defaultChannelCapabilityRollup,
                      isIncluded,
                      allEnvMonitorTypeNames,
                      groupName,
                      channelName,
                      errorsRef
                    ),
                  })
                );

                errorsRef.current.forEach((error) => {
                  dispatch(
                    setHasError({
                      attributeName: `${error.id} ${error.type}`,
                      errorInfo: {
                        hasError: error.hasError,
                        reason: error.reason,
                      },
                    })
                  );
                });
              }
            }
            errorsRef.current = [];
          });
        });
      }),
    [
      allChannelsNames,
      allEnvMonitorTypeNames,
      channelCapabilityRollupRecord,
      dispatch,
      monitorsTypesForRollup,
      stationGroupNames,
      stationName,
    ]
  );
  return toggleAllEnvMonitors;
};

/**
 * Hook wrap redux update for monitors for all groups for all capability rollups
 * @returns updateAllMonitorsForAllCapabilityRollups
 */
export const useUpdateAllMonitorsForChannelForAllCapabilityRollups = (): [
  (monitorName: string, channelName: string, isChannelSelected: boolean) => void
] => {
  const dispatch = useAppDispatch();
  const stationName = useAppSelector(
    (state) => state.stationControls.stationName
  );
  const stationGroupsForStation = useAppSelector(
    (state) => state.stationControls.stationGroups[stationName ?? '']
  );
  const stationGroupNames = stationGroupsForStation?.map((group) => group.name);

  const channelCapabilityRollupRecord = useAppSelector(
    (store) => store.stationControls.channelCapabilityRollup
  );

  const errors: ErrorRecord[] = [];
  // Ref of errors passed down to recursive update which checks for errors and updates ref as needed
  const errorsRef = React.useRef(errors);

  const updateAllMonitorsForChannelForAllCapabilityRollups = React.useCallback(
    (monitorName: string, channelName: string, isChannelSelected: boolean) =>
      batch(() => {
        stationGroupNames.forEach((groupName) => {
          const channelCapabilityGroup =
            channelCapabilityRollupRecord[stationName ?? ''][groupName];
          if (channelCapabilityGroup) {
            const defaultChannelCapabilityRollup =
              channelCapabilityGroup[channelName];
            if (defaultChannelCapabilityRollup) {
              dispatch(
                setChannelCapabilityRollup({
                  stationName,
                  groupName,
                  channelName,
                  rollup: updateAllChannelCapabilityMonitor(
                    defaultChannelCapabilityRollup,
                    monitorName,
                    isChannelSelected,
                    groupName,
                    channelName,
                    errorsRef
                  ),
                })
              );
              errorsRef.current.forEach((error) => {
                dispatch(
                  setHasError({
                    attributeName: `${error.id} ${error.type}`,
                    errorInfo: {
                      hasError: error.hasError,
                      reason: error.reason,
                    },
                  })
                );
              });
            }
          }
          errorsRef.current = [];
        });
      }),
    [channelCapabilityRollupRecord, dispatch, stationGroupNames, stationName]
  );
  return [updateAllMonitorsForChannelForAllCapabilityRollups];
};

/**
 * Hook wrap redux that checks the returned query data for conflicts and updates error status
 * @returns checkChannelCapabilityForErrors function which returns a boolean
 */
export const useCheckChannelCapabilityForErrors = (): [
  (channelCapabilityRollups: ChannelCapabilityRollup[]) => boolean
] => {
  const [updateErrorState] = useUpdateErrorState();
  const selectedMonitors = useSelectedMonitors();
  const checkChannelCapabilityForErrors = React.useCallback(
    (channelCapabilityRollups: ChannelCapabilityRollup[]) => {
      let conflictedMonitors: { groupName: string; monitors: string[] }[] = [];
      channelCapabilityRollups.forEach((rollup) => {
        const result = checkIfRollupHasConflictedMonitors(
          rollup.defaultRollup,
          selectedMonitors
        );
        if (result.hasConflicts) {
          conflictedMonitors.push({
            groupName: rollup.groupName,
            monitors: result.conflictedMonitors,
          });
        }
      });
      if (conflictedMonitors.length > 0) {
        batch(() => {
          conflictedMonitors.forEach((conflict) => {
            updateErrorState(
              getErrorRecordKeyForChannelCapabilityMonitors(conflict.groupName),
              true,
              `Monitor(s): ${conflict.monitors.join(
                ', '
              )} are included and should not be for group ${
                conflict.groupName
              } channel capability, toggle monitor to be selected to resolve`
            );
          });
        });
        return true;
      }
      return false;
    },
    [selectedMonitors, updateErrorState]
  );
  return [checkChannelCapabilityForErrors];
};

/**
 * Uses processing station definition from disk to determine what stations are in each group
 * And loads it into redux state
 */
export const useDetermineStationsInStationGroupsAndLoadIntoState = () => {
  const dispatch = useAppDispatch();
  return React.useCallback(
    async (groupNames: string[], allStationNames: string[]) => {
      const processingStationGroupDefinitionFromDisk =
        (await windowAPI.electronAPI.loadFile(
          `${windowAPI.electronAPI.defaultPaths.processingStationGroupDefinitionFilePath}`
        )) as [{ name: string; stationNames: string[] }];

      const groupsWithStations: Record<string, string[]> = {};
      groupNames.forEach((groupName) => {
        const group = processingStationGroupDefinitionFromDisk.find(
          (group) => group.name === groupName
        );
        if (group && group.stationNames) {
          groupsWithStations[groupName] = group.stationNames;
        }
      });
      // ALL is a special case and is not in processingStationGroupDefinition
      // So adding manually
      groupsWithStations[ALL_STATION_GROUP_NAME] = allStationNames;
      dispatch(
        setGroupsWithIncludedStations({
          groupsWithIncludedStationsRecord: groupsWithStations,
        })
      );
      dispatch(setAllGroupNames({ allGroupNames: groupNames }));
    },
    [dispatch]
  );
};

/**
 * Updates redux state for which stations are in a group
 * @param stationNames new station names selection
 * @param toggledStationName station be toggled
 * @param groupName group to update
 * @returns function to update redux state for stations in a group and station group capability
 */
export const useUpdateStationsInStationGroup = () => {
  const dispatch = useAppDispatch();
  const [updateErrorState] = useUpdateErrorState();
  const groupsWithIncludedStations = useAppSelector(
    (store) => store.stationControls.groupsWithIncludedStations
  );
  const rollup = useAppSelector(
    (state) => state.stationControls.stationGroupCapabilityRollup
  );
  const errors: ErrorRecord[] = [];
  // Ref of errors passed down to recursive update which checks for errors and updates ref as needed
  const errorsRef = React.useRef(errors);
  return React.useCallback(
    (stationNames: string[], toggledStationName: string, groupName: string) => {
      if (stationNames.length === 0) {
        updateErrorState(
          `${groupName}-${AppSections.STATION_GROUPS}`,
          true,
          `${AppSections.STATION_GROUPS} ${groupName} must have at one station selected`
        );
      } else {
        updateErrorState(
          `${groupName}-${AppSections.STATION_GROUPS}`,
          false,
          ''
        );
      }
      const groupsWithStations: Record<string, string[]> = produce(
        groupsWithIncludedStations,
        (draft) => {
          draft[groupName] = stationNames;
        }
      );
      const updatedStationCapabilityRollup =
        updateAllStationGroupCapabilityStations(
          rollup[groupName],
          toggledStationName,
          stationNames,
          groupName,
          errorsRef
        );
      errorsRef.current.forEach((error) => {
        updateErrorState(
          `${error.id} ${error.type}`,
          error.hasError,
          error.reason
        );
      });
      errorsRef.current = [];

      batch(() => {
        dispatch(
          setStationGroupCapabilityRollup({
            groupName,
            rollup: updatedStationCapabilityRollup,
          })
        );
        dispatch(
          setGroupsWithIncludedStations({
            groupsWithIncludedStationsRecord: groupsWithStations,
          })
        );
      });
    },
    [dispatch, groupsWithIncludedStations, rollup, updateErrorState]
  );
};

/**
 * Updates redux state for stationGroupCapability based on group toggle
 * @param toggledStationName station the group is being toggled for
 * @param groupName the group being toggled
 * @returns function to update redux state for stationGroupCapability
 */
export const useToggleStationInStationGroupAndUpdateStationGroupCapability =
  () => {
    const dispatch = useAppDispatch();
    const [updateErrorState] = useUpdateErrorState();
    const rollup = useAppSelector(
      (state) => state.stationControls.stationGroupCapabilityRollup
    );
    const groupsWithIncludedStations = useAppSelector(
      (store) => store.stationControls.groupsWithIncludedStations
    );
    const errors: ErrorRecord[] = [];
    // Ref of errors passed down to recursive update which checks for errors and updates ref as needed
    const errorsRef = React.useRef(errors);
    return React.useCallback(
      (toggledStationName: string, groupName: string) => {
        // If the station is in the stationGroupCapability and it's being toggled need to remove it from list
        // Other wise need to add it to the list. The list represents the current selected stations in the group
        let stationsInStationGroupCapabilityRollup: string[] =
          rollup[groupName].stations ?? [];
        if (
          stationsInStationGroupCapabilityRollup.find(
            (station) => station === toggledStationName
          )
        ) {
          stationsInStationGroupCapabilityRollup =
            stationsInStationGroupCapabilityRollup.filter(
              (station) => station !== toggledStationName
            );
        } else {
          stationsInStationGroupCapabilityRollup = [
            ...stationsInStationGroupCapabilityRollup,
            toggledStationName,
          ];
        }
        stationsInStationGroupCapabilityRollup.sort();
        const groupsWithStations: Record<string, string[]> = produce(
          groupsWithIncludedStations,
          (draft) => {
            draft[groupName] = stationsInStationGroupCapabilityRollup;
          }
        );
        const updatedStationCapabilityRollup =
          updateAllStationGroupCapabilityStations(
            rollup[groupName],
            toggledStationName,
            stationsInStationGroupCapabilityRollup ?? [],
            groupName,
            errorsRef
          );
        let hasUpdateCausedStationGroupCapabilityError = false;
        errorsRef.current.forEach((error) => {
          if (error.hasError) {
            hasUpdateCausedStationGroupCapabilityError = true;
          }
          updateErrorState(
            `${error.id} ${error.type}`,
            error.hasError,
            error.reason
          );
        });
        errorsRef.current = [];

        batch(() => {
          if (hasUpdateCausedStationGroupCapabilityError) {
            dispatch(
              setHasStationUpdateCausedStationGroupCapabilityError({
                groupName: groupName,
                hasError: true,
              })
            );
          }
          if (groupsWithStations[groupName].length === 0) {
            updateErrorState(
              `${groupName}-${AppSections.STATION_GROUPS}`,
              true,
              `${AppSections.STATION_GROUPS} ${groupName} must have at one station selected`
            );
          } else {
            updateErrorState(
              `${groupName}-${AppSections.STATION_GROUPS}`,
              false,
              ''
            );
          }
          dispatch(
            setGroupsWithIncludedStations({
              groupsWithIncludedStationsRecord: groupsWithStations,
            })
          );
          dispatch(
            setStationGroupCapabilityRollup({
              groupName,
              rollup: updatedStationCapabilityRollup,
            })
          );
        });
      },
      [dispatch, groupsWithIncludedStations, rollup, updateErrorState]
    );
  };

/**
 * Removes all errors from all rollup entries that are internal to the parent id
 * Used when a user does an action that causes rollups to be removed, but have errors so clears them from state
 * @returns function that removes all errors from deleted rollup entries
 * @param defaultRollup top level rollup entry
 * @param rollupId of entry which are getting all it's rollups removed
 */
export const useRemoveAllErrorsFromStationGroupCapabilityDeletedRollupEntries =
  () => {
    const dispatch = useAppDispatch();
    const errors: ErrorRecord[] = [];
    // Ref of errors passed down to recursive update which checks for errors and updates ref as needed
    const errorsRef = React.useRef(errors);
    return React.useCallback(
      (defaultRollup: RollupEntry, rollupId: string) => {
        findAllErrorsForDeletedStationGroupCapabilityEntries(
          defaultRollup,
          rollupId,
          errorsRef
        );
        errorsRef.current.forEach((error) => {
          if (error.hasError) {
            dispatch(
              setHasError({
                attributeName: `${error.id} ${error.type}`,
                errorInfo: {
                  hasError: false,
                  reason: '',
                },
              })
            );
          }
        });
      },
      [dispatch]
    );
  };

/**
 * Removes all errors from all rollup entries that are internal to the parent id
 * Used when a user does an action that causes rollups to be removed, but have errors so clears them from state
 * @returns function that removes all errors from deleted rollup entries
 * @param defaultRollup top level rollup entry
 * @param rollupId of entry which are getting all it's rollups removed
 */
export const useRemoveAllErrorsFromStationCapabilityDeletedRollupEntries =
  () => {
    const dispatch = useAppDispatch();
    const errors: ErrorRecord[] = [];
    // Ref of errors passed down to recursive update which checks for errors and updates ref as needed
    const errorsRef = React.useRef(errors);
    return React.useCallback(
      (defaultRollup: RollupEntry, rollupId: string) => {
        findAllErrorsForDeletedStationCapabilityEntries(
          defaultRollup,
          rollupId,
          errorsRef
        );
        errorsRef.current.forEach((error) => {
          if (error.hasError) {
            dispatch(
              setHasError({
                attributeName: `${error.id} ${error.type}`,
                errorInfo: {
                  hasError: false,
                  reason: '',
                },
              })
            );
          }
        });
      },
      [dispatch]
    );
  };

/**
 * Removes all errors from all rollup entries that are internal to the parent id
 * Used when a user does an action that causes rollups to be removed, but have errors so clears them from state
 * @returns function that removes all errors from deleted rollup entries
 * @param defaultRollup top level rollup entry
 * @param rollupId of entry which are getting all it's rollups removed
 */
export const useRemoveAllErrorsFromChannelCapabilityDeletedRollupEntries =
  () => {
    const dispatch = useAppDispatch();
    const errors: ErrorRecord[] = [];
    // Ref of errors passed down to recursive update which checks for errors and updates ref as needed
    const errorsRef = React.useRef(errors);
    return React.useCallback(
      (defaultRollup: RollupEntry, rollupId: string) => {
        findAllErrorsForDeletedChannelCapabilityEntries(
          defaultRollup,
          rollupId,
          errorsRef
        );
        errorsRef.current.forEach((error) => {
          if (error.hasError) {
            dispatch(
              setHasError({
                attributeName: `${error.id} ${error.type}`,
                errorInfo: {
                  hasError: false,
                  reason: '',
                },
              })
            );
          }
        });
      },
      [dispatch]
    );
  };

/**
 * Creates a new station group
 * @returns function that Adds a new station group, along with a default station group capability
 * @param groupName name of the new group
 * @param stations stations in the new group
 */
export const useCreateNewStationGroup = () => {
  const dispatch = useAppDispatch();
  const groupsWithIncludedStations = useAppSelector(
    (store) => store.stationControls.groupsWithIncludedStations
  );
  const allSortedStationGroups = useAppSelector(
    (state) => state.stationControls.allGroupNames
  );

  return React.useCallback(
    async (groupName: string, stations: string[]) => {
      const stationGroupCapabilitiesFromDisk =
        (await windowAPI.electronAPI.loadConfigFromDir(
          stationGroupCapabilityRollupConfigName
        )) as ConfigurationOption<
          Partial<StationGroupCapabilityQueryResults>
        >[];

      const defaultStationGroupCapabilityConfig =
        stationGroupCapabilitiesFromDisk.find(
          (config) => config.name === 'default-station-group-capability-rollup'
        );
      if (
        defaultStationGroupCapabilityConfig &&
        defaultStationGroupCapabilityConfig.parameters
      ) {
        const groupsWithStations: Record<string, string[]> = produce(
          groupsWithIncludedStations,
          (draft) => {
            draft[groupName] = stations;
          }
        );
        const newStationGroupsWithAppendedNewGroup = produce(
          allSortedStationGroups,
          (draft) => {
            draft.push(groupName);
          }
        );
        const defaultRollup = convertStationGroupCapabilityQueryDataToRollup(
          defaultStationGroupCapabilityConfig.parameters as StationGroupCapabilityQueryResults,
          stations
        );
        batch(() => {
          dispatch(
            setAllGroupNames({
              allGroupNames: newStationGroupsWithAppendedNewGroup,
            })
          );
          dispatch(
            setGroupsWithIncludedStations({
              groupsWithIncludedStationsRecord: groupsWithStations,
            })
          );
          dispatch(
            setStationGroupCapabilityRollup({
              groupName,
              rollup: defaultRollup,
            })
          );
        });
      } else {
        throw new Error(
          'default with name default-station-group-capability-rollup must exist in station-group-capability-rollup'
        );
      }
    },
    [allSortedStationGroups, dispatch, groupsWithIncludedStations]
  );
};

/**
 * Deletes a station group
 * @returns function that deletes a station group, along with its station group capability
 * @param groupName name of the group to delete
 */
export const useDeleteStationGroup = () => {
  const dispatch = useAppDispatch();
  const groupsWithIncludedStations = useAppSelector(
    (store) => store.stationControls.groupsWithIncludedStations
  );
  const allSortedStationGroups = useAppSelector(
    (state) => state.stationControls.allGroupNames
  );
  const stationGroupCapabilities = useAppSelector(
    (store) => store.stationControls.stationGroupCapabilityRollup
  );

  return React.useCallback(
    async (groupName: string) => {
      const stationGroupCapabilitiesFromDisk =
        (await windowAPI.electronAPI.loadConfigFromDir(
          stationGroupCapabilityRollupConfigName
        )) as ConfigurationOption<
          Partial<StationGroupCapabilityQueryResults>
        >[];

      if (
        stationGroupCapabilitiesFromDisk.find((stationGroupCapabilityConfig) =>
          stationGroupCapabilityConfig.name.includes(`${groupName}_`)
        )
      ) {
        await windowAPI.electronAPI.deleteFile(
          stationGroupCapabilityRollupConfigName,
          `${groupName}.json`
        );
      }

      const updatedStationGroups = produce(allSortedStationGroups, (draft) =>
        draft.filter((name) => name !== groupName)
      );

      const updatedGroupsWithStations: Record<string, string[]> = produce(
        groupsWithIncludedStations,
        (draft) => {
          delete draft[groupName];
        }
      );

      const updatedStationGroupCapabilities: Record<string, RollupEntry> =
        produce(stationGroupCapabilities, (draft) => {
          delete draft[groupName];
        });

      batch(() => {
        dispatch(
          setAllGroupNames({
            allGroupNames: updatedStationGroups,
          })
        );
        dispatch(
          setGroupsWithIncludedStations({
            groupsWithIncludedStationsRecord: updatedGroupsWithStations,
          })
        );
        dispatch(
          setStationGroupCapabilityRollupRecord({
            updatedStationGroupCapabilityRollup:
              updatedStationGroupCapabilities,
          })
        );
      });
    },
    [
      allSortedStationGroups,
      dispatch,
      groupsWithIncludedStations,
      stationGroupCapabilities,
    ]
  );
};
