import {
  Autocomplete,
  FormControl,
  FormControlLabel,
  FormGroup,
  Switch,
  TextField,
} from '@mui/material';
import React from 'react';
import { getStationNames } from '../../coi-types/get-stations';
import { DialogPrompt } from '../../components/DialogPrompt';
import makeStyles from '@mui/styles/makeStyles';
import { configApi } from '../../state/api-slice';
import { useAppDispatch, useAppSelector } from '../../state/react-redux-hooks';
import { useAppContext } from '../../state/state';
import {
  clearStationErrors,
  resetLoadedData,
  setStationEnvMonitorTypes,
  setStationName,
} from '../../state/station-controls-slice';
import { DataNames } from '../../coi-types/data-names';
import { useToggleAllEnvMonitors } from '../../util/custom-hooks';
import { HelpTextRenderer } from '../../components/HelpTextRenderer';

interface StationNameInputProps {
  className?: string;
  updateStationName: (name: string) => void;
  formData: string;
  label?: string;
  description?: string;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    flexWrap: 'wrap',
  },
  stationDropdown: {
    minWidth: '300px',
    flex: '1 1 300px',
  },
  environmentSwitch: {
    alignItems: 'center',
    minWidth: '80px',
    display: 'flex',
    transform: 'translateY(-12px)',
  },
});

export const StationNameInput: React.FC<StationNameInputProps> = ({
  className,
  label,
  formData,
  description,
}: StationNameInputProps) => {
  const { data: appData } = useAppContext();
  const stationList: string[] =
    getStationNames(appData?.processingStationGroups) ?? [];
  const stationName = useAppSelector(
    (state) => state.stationControls.stationName
  );
  const stationEnvironmentals = useAppSelector(
    (state) => state.stationControls.stationEnvironmental[stationName ?? '']
  );
  const hasEnvMonitorTypesLoaded = useAppSelector(
    (state) =>
      state.stationControls.loadedData[DataNames.STATION_ENV_MONITOR_TYPES]
  );
  const hasChannelCapabilityRollupLoaded = useAppSelector(
    (state) =>
      state.stationControls.loadedData[DataNames.CHANNEL_CAPABILITY_ROLLUP]
  );
  const [confirmToggle, setConfirmToggle] = React.useState({
    open: false,
    stationName: '',
  });
  const [confirmEnvToggle, setConfirmEnvToggle] = React.useState({
    open: false,
    isIncluded: false,
  });
  const dispatch = useAppDispatch();
  const classes = useStyles();
  const toggleAllEnvMonitors = useToggleAllEnvMonitors();

  const updateData = React.useCallback(
    (newStationName: string) => {
      dispatch(setStationName(newStationName));
      dispatch(configApi.util.resetApiState()); // ensures a fresh query and not from cache
      dispatch(clearStationErrors());
      dispatch(resetLoadedData({ reSyncConfig: false }));
    },
    [dispatch]
  );

  const onConfirm = React.useCallback(
    (confirmation: boolean) => {
      if (confirmation) {
        updateData(confirmToggle.stationName);
      }
      setConfirmToggle({ open: false, stationName: '' });
    },
    [confirmToggle.stationName, updateData]
  );

  const updateStationEnvironmentalIncluded = React.useCallback(
    (isIncluded: boolean) => {
      toggleAllEnvMonitors(isIncluded);
      dispatch(
        setStationEnvMonitorTypes({
          stationName: stationName,
          envMonitorTypes: stationEnvironmentals?.envMonitorTypes ?? [],
          included: isIncluded,
        })
      );
    },
    [
      dispatch,
      stationEnvironmentals?.envMonitorTypes,
      stationName,
      toggleAllEnvMonitors,
    ]
  );

  const onEnvConfirm = React.useCallback(
    (confirmation: boolean) => {
      if (confirmation) {
        updateStationEnvironmentalIncluded(confirmEnvToggle.isIncluded);
      }
      setConfirmEnvToggle({ open: false, isIncluded: false });
    },
    [confirmEnvToggle.isIncluded, updateStationEnvironmentalIncluded]
  );
  stationList.sort();
  return (
    <div className={classes.container}>
      <DialogPrompt
        isOpen={confirmToggle.open}
        onConfirm={onConfirm}
        message={
          'Warning: changing stations will cause unsaved changes to be lost'
        }
      />
      <div className={classes.stationDropdown}>
        <FormControl fullWidth>
          <Autocomplete
            autoComplete
            disablePortal
            disabled={stationList.length === 0}
            id='#/properties/station-name'
            className={className ?? 'station-name-input'}
            value={stationName ?? null}
            options={stationList}
            onChange={(_e, value) => {
              if (value) {
                if (stationName) {
                  setConfirmToggle({ open: true, stationName: value });
                } else {
                  updateData(value);
                }
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                aria-describedby='station-name-help-text'
                helperText={description}
              />
            )}
          />
        </FormControl>
      </div>

      <div className={classes.environmentSwitch}>
        <DialogPrompt
          isOpen={confirmEnvToggle.open}
          onConfirm={onEnvConfirm}
          message={
            'Warning: Changing will effect all Monitor Type Rollups/all Channel Capabilities and cannot be undone.'
          }
        />
        <FormGroup>
          <HelpTextRenderer
            helpText={
              'Determines if environmentals are enabled for selected station. Toggle to enable/disable environmentals. Action effects Monitor Type Rollups and All Channel Capabilities.'
            }
            isLoading={false}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={
                    hasEnvMonitorTypesLoaded && stationEnvironmentals.included
                  }
                />
              }
              label='Include Environmentals'
              labelPlacement='start'
              disabled={!hasChannelCapabilityRollupLoaded}
              onChange={(value) => {
                const castedValue =
                  value as unknown as React.ChangeEvent<HTMLInputElement>; // this is the type on MaterialUI Docs to get checked value
                setConfirmEnvToggle({
                  open: true,
                  isIncluded: castedValue.target.checked,
                });
              }}
            />
          </HelpTextRenderer>
        </FormGroup>
      </div>
    </div>
  );
};
