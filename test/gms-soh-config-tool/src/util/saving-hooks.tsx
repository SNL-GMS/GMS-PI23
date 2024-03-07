import isEqual from 'lodash/isEqual';
import * as React from 'react';
import { batch } from 'react-redux';
import {
  ConfigurationOption,
  stationGroupCapabilityRollupConfigName,
  stationGroupNamesConfigName,
} from '../coi-types';
import { windowAPI } from '../electron-util';
import {
  buildProcessingStationGroupDefinitionForAllGroups,
  buildStationGroupCapabilityRollupConfig,
  buildStationGroupsDefinition,
} from '../output/build-configuration-option';
import {
  configApi,
  useRefreshUiConfig,
  useUpdateConfig,
} from '../state/api-slice';
import { useAppDispatch, useAppSelector } from '../state/react-redux-hooks';
import { StationGroupCapabilityQueryResults } from '../state/retrieve-station-group-capability';
import {
  ProcessingStationGroupsDefinition,
  StationGroups,
} from '../state/retrieve-station-groups';
import {
  clearStationErrors,
  resetLoadedData,
  setHasStationUpdateCausedStationGroupCapabilityError,
  setStationName,
} from '../state/station-controls-slice';
import { determineDefaultStationGroupCapabilities } from './util';

/**
 * Saves station group capability changes to disk and updates config service
 * @returns function that saves and updates service
 */
export const useSaveStationGroupCapability = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.stationControls);
  const [updateConfig] = useUpdateConfig();
  const [refreshUiConfig] = useRefreshUiConfig();

  return React.useCallback(async () => {
    let hasChangesToUpdateService = false;
    const stationGroupCapabilitiesFromDisk =
      (await windowAPI.electronAPI.loadConfigFromDir(
        stationGroupCapabilityRollupConfigName
      )) as ConfigurationOption<Partial<StationGroupCapabilityQueryResults>>[];

    const defaultStationGroupCapabilityConfig =
      stationGroupCapabilitiesFromDisk.find(
        (config) => config.name === 'default-station-group-capability-rollup'
      );

    const defaultStationGroupCapabilities =
      determineDefaultStationGroupCapabilities(
        stationGroupCapabilitiesFromDisk,
        defaultStationGroupCapabilityConfig,
        state.allGroupNames
      );

    const stationGroupCapabilityRollupConfig =
      buildStationGroupCapabilityRollupConfig(
        state.groupsWithIncludedStations,
        defaultStationGroupCapabilities,
        state.stationGroupCapabilityRollup
      );

    if (stationGroupCapabilityRollupConfig !== undefined) {
      if (stationGroupCapabilityRollupConfig != null) {
        Object.keys(stationGroupCapabilityRollupConfig).forEach(
          async (groupName) => {
            batch(() => {
              if (
                state.hasStationUpdateCausedStationGroupCapabilityError[
                  groupName
                ]
              ) {
                dispatch(
                  setHasStationUpdateCausedStationGroupCapabilityError({
                    groupName,
                    hasError: false,
                  })
                );
              }
            });

            if (stationGroupCapabilityRollupConfig[groupName] == null) {
              if (
                stationGroupCapabilitiesFromDisk.find(
                  (stationGroupCapabilityConfig) =>
                    stationGroupCapabilityConfig.name.includes(`${groupName}_`)
                )
              ) {
                hasChangesToUpdateService = true;
                await windowAPI.electronAPI.deleteFile(
                  stationGroupCapabilityRollupConfigName,
                  `${groupName}.json`
                );
              }
            } else {
              hasChangesToUpdateService = true;
              // removes all . from the groupName
              const formattedGroupName = groupName.replace(/[,.-]/g, '');
              await windowAPI.electronAPI.saveDataAsFile(
                stationGroupCapabilityRollupConfig[groupName],
                `${stationGroupCapabilityRollupConfigName}/${formattedGroupName}.json`
              );
            }
          }
        );

        if (hasChangesToUpdateService) {
          const stationGroupCapabilityConfigsFromDisk =
            await windowAPI.electronAPI.loadConfigFromDir(
              stationGroupCapabilityRollupConfigName
            );

          const stationGroupCapabilityConfigData = {
            name: stationGroupCapabilityRollupConfigName,
            configurationOptions: stationGroupCapabilityConfigsFromDisk,
            changeTime: new Date().toISOString(),
          };

          await updateConfig(stationGroupCapabilityConfigData);
          await refreshUiConfig();
        }
      }
    }
  }, [
    dispatch,
    refreshUiConfig,
    state.allGroupNames,
    state.groupsWithIncludedStations,
    state.hasStationUpdateCausedStationGroupCapabilityError,
    state.stationGroupCapabilityRollup,
    updateConfig,
  ]);
};

/**
 * Saves station group changes to disk and updates service
 * @returns function that saves
 */
export const useSaveStationGroups = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.stationControls);
  const [updateConfig] = useUpdateConfig();
  const [refreshUiConfig] = useRefreshUiConfig();

  return React.useCallback(async () => {
    const stationGroupsDefinitionFromDisk =
      (await windowAPI.electronAPI.loadConfigFromDir(
        stationGroupNamesConfigName
      )) as ConfigurationOption<Partial<StationGroups>>[];
    const defaultStationGroupsDefinitionFromDisk =
      stationGroupsDefinitionFromDisk.find(
        (config) => config.name === 'default-station-group-names'
      );
    const stationGroupDefinition = buildStationGroupsDefinition(
      defaultStationGroupsDefinitionFromDisk,
      state.allGroupNames
    );

    if (
      defaultStationGroupsDefinitionFromDisk &&
      !isEqual(
        state.allGroupNames,
        defaultStationGroupsDefinitionFromDisk.parameters.stationGroupNames
      )
    ) {
      await windowAPI.electronAPI.saveDataAsFile(
        stationGroupDefinition,
        `${stationGroupNamesConfigName}/default.json`
      );
      const updatedStationGroupConfigsFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          stationGroupNamesConfigName
        );
      const stationGroupsConfigData = {
        name: stationGroupNamesConfigName,
        configurationOptions: updatedStationGroupConfigsFromDisk,
        changeTime: new Date().toISOString(),
      };

      await updateConfig(stationGroupsConfigData);
      await refreshUiConfig();
      // Reset station tab queries to trigger to get updated info
      dispatch(setStationName(null));
      dispatch(configApi.util.resetApiState()); // ensures a fresh query and not from cache
      dispatch(clearStationErrors());
      dispatch(resetLoadedData({ reSyncConfig: true }));
    }
  }, [dispatch, refreshUiConfig, state.allGroupNames, updateConfig]);
};

/**
 * Saves Processing station group changes to disk
 * @returns function that saves
 */
export const useSaveProcessingStationGroup = () => {
  const state = useAppSelector((s) => s.stationControls);
  return React.useCallback(async () => {
    const processingStationGroupDefinitionsFromDisk =
      await windowAPI.electronAPI.loadConfigFromDir(
        '../station-reference/definitions'
      );

    const stationGroupDefinition =
      buildProcessingStationGroupDefinitionForAllGroups(
        state.allGroupNames,
        state.groupsWithIncludedStations,
        processingStationGroupDefinitionsFromDisk as ProcessingStationGroupsDefinition[]
      );

    // This file is not put into the config service, changes only written to disk
    await windowAPI.electronAPI.saveDataAsFile(
      stationGroupDefinition,
      `../station-reference/definitions/processing-station-group-definition.json`
    );
  }, [state.allGroupNames, state.groupsWithIncludedStations]);
};
