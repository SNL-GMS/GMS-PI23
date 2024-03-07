import { useRefreshUiConfig, useUpdateConfig } from '../state/api-slice';
import { useAppSelector } from '../state/react-redux-hooks';
import { useUpdateDataLoaded } from '../util/custom-hooks';
import * as React from 'react';
import { DataNames } from '../coi-types/data-names';
import { windowAPI } from '../electron-util';
import {
  stationGroupNamesConfigName,
  channelCapabilityRollupConfigName,
  stationCapabilityRollupConfigName,
  stationEnvMonitorTypesConfigName,
  stationGroupCapabilityRollupConfigName,
} from '../coi-types';

/**
 * Syncs all the files in directories in processing to ui config service then updates its
 * cache to return the latest
 * @returns a function to sync defaults and update state so only happens once
 */
export const useInitializeDefaultsAndRefreshUIConfig = () => {
  const [updateConfig] = useUpdateConfig();
  const [refreshUiConfig] = useRefreshUiConfig();
  const [updateDataLoaded] = useUpdateDataLoaded();
  const dataLoadedRecord = useAppSelector(
    (state) => state.stationControls.loadedData
  );
  return React.useCallback(async () => {
    if (!dataLoadedRecord[DataNames.SYNC_DEPLOYMENT_WITH_PROCESSING]) {
      updateDataLoaded(DataNames.SYNC_DEPLOYMENT_WITH_PROCESSING, true);
      const timeWindowConfigsFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          'soh-control.soh-monitor-timewindows'
        );

      const timewindowsConfigData = {
        name: 'soh-control.soh-monitor-timewindows',
        configurationOptions: timeWindowConfigsFromDisk,
        changeTime: new Date().toISOString(),
      };

      const monitorTypesForRollupStationFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          'soh-control.soh-monitor-types-for-rollup-station'
        );

      const monitorTypesForRollupStationConfigData = {
        name: 'soh-control.soh-monitor-types-for-rollup-station',
        configurationOptions: monitorTypesForRollupStationFromDisk,
        changeTime: new Date().toISOString(),
      };

      const monitorTypesForRollupChannelFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          'soh-control.soh-monitor-types-for-rollup-channel'
        );

      const monitorTypesForRollupChannelConfigData = {
        name: 'soh-control.soh-monitor-types-for-rollup-channel',
        configurationOptions: monitorTypesForRollupChannelFromDisk,
        changeTime: new Date().toISOString(),
      };

      const sohMonitorThresholdsConfigsFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          'soh-control.soh-monitor-thresholds'
        );

      const sohMonitorThresholdsConfigData = {
        name: 'soh-control.soh-monitor-thresholds',
        configurationOptions: sohMonitorThresholdsConfigsFromDisk,
        changeTime: new Date().toISOString(),
      };

      const stationCapabilitiesFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          stationCapabilityRollupConfigName
        );

      const stationCapabilityConfigData = {
        name: stationCapabilityRollupConfigName,
        configurationOptions: stationCapabilitiesFromDisk,
        changeTime: new Date().toISOString(),
      };

      const channelCapabilitiesFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          channelCapabilityRollupConfigName
        );

      const channelCapabilityConfigData = {
        name: channelCapabilityRollupConfigName,
        configurationOptions: channelCapabilitiesFromDisk,
        changeTime: new Date().toISOString(),
      };

      const channelsPerMonitorFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          'soh-control.channels-by-monitor-type'
        );

      const channelsPerMonitorConfigData = {
        name: 'soh-control.channels-by-monitor-type',
        configurationOptions: channelsPerMonitorFromDisk,
        changeTime: new Date().toISOString(),
      };

      const stationGroupsFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          stationGroupNamesConfigName
        );

      const stationEnvMonitorTypesFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          stationEnvMonitorTypesConfigName
        );

      const stationGroupNames = {
        name: stationGroupNamesConfigName,
        configurationOptions: stationGroupsFromDisk,
        changeTime: new Date().toISOString(),
      };

      const stationEnvMonitorTypes = {
        name: stationEnvMonitorTypesConfigName,
        configurationOptions: stationEnvMonitorTypesFromDisk,
        changeTime: new Date().toISOString(),
      };

      const stationGroupCapabilityFromDisk =
        await windowAPI.electronAPI.loadConfigFromDir(
          stationGroupCapabilityRollupConfigName
        );

      const stationGroupCapabilityConfigData = {
        name: stationGroupCapabilityRollupConfigName,
        configurationOptions: stationGroupCapabilityFromDisk,
        changeTime: new Date().toISOString(),
      };

      await updateConfig(timewindowsConfigData);
      await updateConfig(monitorTypesForRollupStationConfigData);
      await updateConfig(monitorTypesForRollupChannelConfigData);
      await updateConfig(sohMonitorThresholdsConfigData);
      await updateConfig(stationGroupCapabilityConfigData);
      await updateConfig(stationCapabilityConfigData);
      await updateConfig(channelCapabilityConfigData);
      await updateConfig(channelsPerMonitorConfigData);
      await updateConfig(stationGroupNames);
      await updateConfig(stationEnvMonitorTypes);

      await refreshUiConfig();
    }
  }, [dataLoadedRecord, refreshUiConfig, updateConfig, updateDataLoaded]);
};
