import { materialCells } from '@jsonforms/material-renderers';
import { JsonForms } from '@jsonforms/react';
import SaveIcon from '@mui/icons-material/Save';
import { Button, CircularProgress, Grid } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';
import { useExportConfiguration } from '../App';
import { DataNames } from '../coi-types/data-names';
import { MonitorTypeConfig } from '../coi-types/monitor-types';
import { BottomBar } from '../components/BottomBar';
import { HelpTextRenderer } from '../components/HelpTextRenderer';
import {
  isLoading,
  LoadingNonIdealState,
} from '../components/LoadingNonIdealState';
import { renderers } from '../renderers';
import stationSchema from '../schema/station-config-control-schema.json';
import stationUiSchema from '../schema/station-config-control-ui-schema.json';
import configSchema from '../schema/station-config-schema.json';
import configUiSchema from '../schema/station-config-ui-schema.json';
import { useInitializeDefaultsAndRefreshUIConfig } from '../services/use-initialize-defaults-and-refresh-ui-config';
import {
  useResolveStationConfig,
  useResolveStationEnvMonitorTypes,
  useResolveStationGroupCapability,
  useResolveStationGroups,
} from '../state/api-slice';
import { useAppDispatch, useAppSelector } from '../state/react-redux-hooks';
import { useAppContext } from '../state/state';
import {
  StationControlsState,
  setStationEnvMonitorTypes,
} from '../state/station-controls-slice';
import { layoutStyles } from '../styles/layout';
import {
  determineAppErrorState,
  determineAppHasLoadedAllData,
} from '../util/util';
import {
  useDetermineStationsInStationGroupsAndLoadIntoState,
  useUpdateDataLoaded,
  useUpdateStationGroupCapability,
} from '../util/custom-hooks';
import { getStationNames } from '../coi-types/get-stations';
import { batch } from 'react-redux';

const useStyles = makeStyles({
  ...layoutStyles,
  form: {
    margin: 'auto',
    padding: '1rem',
  },
});

export type StationsConfig = Record<string, Partial<StationConfig>>;

export interface StationConfig {
  backOffDuration: string;
  calculationInterval: string;
  sohMonitorTypesForRollup: MonitorTypeConfig[];
}

const isValidStationConfig = (sc: StationControlsState) => !!sc.stationName;

export function useLocalVersionOfState<T = unknown>(
  data: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [localState, setLocalState] = React.useState<T>(data);
  React.useEffect(() => {
    setLocalState(data);
  }, [data]);
  return [localState, setLocalState];
}

/**
 * This builds a station configuration interface.
 * It must be wrapped in the App file's context (via the react-router Outlet component)
 */
export const Station: React.FC = () => {
  const { data: appData } = useAppContext();
  const classes = useStyles();
  const stationControls = useAppSelector((state) => state.stationControls);
  const [updateDataLoaded] = useUpdateDataLoaded();
  const userInputErrorsMap = useAppSelector(
    (state) => state.stationControls.error
  );
  const dataLoadedRecord = useAppSelector(
    (state) => state.stationControls.loadedData
  );
  const hasStationEnvMonitorTypesLoaded = useAppSelector(
    (state) =>
      state.stationControls.loadedData[DataNames.STATION_ENV_MONITOR_TYPES]
  );

  const hasStationsInGroupsLoaded = useAppSelector(
    (state) => state.stationControls.loadedData[DataNames.STATIONS_IN_GROUPS]
  );

  const initializeDefaultsAndRefreshUIConfig =
    useInitializeDefaultsAndRefreshUIConfig();
  const userInputAppErrors = determineAppErrorState(userInputErrorsMap);
  const hasAllDataLoaded = determineAppHasLoadedAllData(dataLoadedRecord);
  const { loadingState } = useAppContext();
  const [exportConfiguration] = useExportConfiguration();
  const [updateStationGroupCapabilityRollup] =
    useUpdateStationGroupCapability();

  const determineStationsInStationGroupsAndLoadIntoState =
    useDetermineStationsInStationGroupsAndLoadIntoState();

  const stationList: string[] = React.useMemo(() => {
    return getStationNames(appData?.processingStationGroups).sort() ?? [];
  }, [appData?.processingStationGroups]);

  const dispatch = useAppDispatch();

  const updateStationEnvMonitorTypes = React.useCallback(
    (monitors: string[]) => {
      dispatch(
        setStationEnvMonitorTypes({
          stationName: stationControls.stationName,
          envMonitorTypes: monitors,
          included: monitors.length !== 0,
        })
      );
    },
    [dispatch, stationControls.stationName]
  );

  const resolvedStationGroups = useResolveStationGroups(
    {},
    { skip: !stationControls.stationName }
  );

  const resolvedMonitorTimewindowsConfig = useResolveStationConfig(
    {
      configName: 'soh-control.soh-monitor-timewindows',
      stationName: stationControls.stationName ?? '',
    },
    { skip: !stationControls.stationName }
  );

  const resolvedStationEnvMonitorTypes = useResolveStationEnvMonitorTypes(
    {
      stationName: stationControls.stationName ?? '',
    },
    { skip: !stationControls.stationName }
  );

  const hasStationGroupCapabilityRollupLoaded = useAppSelector(
    (state) =>
      state.stationControls.loadedData[
        DataNames.STATION_GROUP_CAPABILITY_ROLLUP
      ]
  );
  const resolvedStationGroupCapability = useResolveStationGroupCapability(
    {
      groupNames: resolvedStationGroups.data?.stationGroupNames ?? [],
      allStationNames: stationList,
    },
    {
      skip:
        !stationList ||
        !resolvedStationGroups ||
        resolvedStationGroups.isLoading ||
        !resolvedStationGroups.data ||
        !resolvedStationGroups.data.stationGroupNames,
    }
  );

  React.useEffect(() => {
    if (!hasStationsInGroupsLoaded && hasStationGroupCapabilityRollupLoaded) {
      determineStationsInStationGroupsAndLoadIntoState(
        resolvedStationGroups.data?.stationGroupNames ?? [],
        stationList ?? []
      );
      updateDataLoaded(DataNames.STATIONS_IN_GROUPS, true);
    }
  }, [
    determineStationsInStationGroupsAndLoadIntoState,
    hasStationGroupCapabilityRollupLoaded,
    hasStationsInGroupsLoaded,
    resolvedStationGroups,
    resolvedStationGroups.data?.stationGroupNames,
    stationList,
    updateDataLoaded,
  ]);

  const addStationGroupCapabilityIntoState = React.useCallback(() => {
    batch(() => {
      resolvedStationGroupCapability.data?.forEach((rollup) => {
        updateStationGroupCapabilityRollup(
          rollup.groupName,
          rollup.defaultRollup
        );
      });
    });
  }, [resolvedStationGroupCapability.data, updateStationGroupCapabilityRollup]);

  React.useEffect(() => {
    if (
      resolvedStationGroupCapability.isSuccess &&
      resolvedStationGroupCapability.data &&
      resolvedStationGroupCapability.data.length > 0 &&
      resolvedStationGroupCapability.data[0] &&
      !hasStationGroupCapabilityRollupLoaded
    ) {
      addStationGroupCapabilityIntoState();
      updateDataLoaded(DataNames.STATION_GROUP_CAPABILITY_ROLLUP, true);
    }
  }, [
    addStationGroupCapabilityIntoState,
    hasStationGroupCapabilityRollupLoaded,
    resolvedStationGroupCapability.data,
    resolvedStationGroupCapability.isSuccess,
    updateDataLoaded,
  ]);

  React.useEffect(() => {
    if (!dataLoadedRecord[DataNames.SYNC_DEPLOYMENT_WITH_PROCESSING]) {
      initializeDefaultsAndRefreshUIConfig();
    }
  }, [dataLoadedRecord, initializeDefaultsAndRefreshUIConfig]);

  React.useEffect(() => {
    if (
      resolvedStationEnvMonitorTypes.isSuccess &&
      resolvedStationEnvMonitorTypes.data &&
      resolvedStationEnvMonitorTypes.data.stationName ===
        stationControls.stationName &&
      !hasStationEnvMonitorTypesLoaded
    ) {
      updateStationEnvMonitorTypes(
        resolvedStationEnvMonitorTypes.data.envMonitorTypes
      );
      updateDataLoaded(DataNames.STATION_ENV_MONITOR_TYPES, true);
    }
  }, [
    hasStationEnvMonitorTypesLoaded,
    resolvedStationEnvMonitorTypes.data,
    resolvedStationEnvMonitorTypes.isSuccess,
    stationControls.stationName,
    updateDataLoaded,
    updateStationEnvMonitorTypes,
  ]);

  if (isLoading(loadingState)) {
    return <LoadingNonIdealState loadingState={loadingState} />;
  }

  return (
    <>
      <Grid
        container
        justifyContent={'center'}
        spacing={1}
        className={classes.container}
      >
        <Grid item sm={12} md={12} lg={8}>
          <div className={classes.form}>
            <Grid
              container
              justifyContent={'center'}
              spacing={1}
              className={classes.container}
            >
              <JsonForms // Station selection and enable/disable channel
                schema={stationSchema}
                uischema={stationUiSchema}
                data={{}}
                renderers={renderers}
                cells={materialCells}
              />
            </Grid>
            <Grid
              container
              justifyContent={'center'}
              alignItems={'center'}
              flexDirection={'column'}
              spacing={1}
              className={classes.container}
            >
              {' '}
              {resolvedMonitorTimewindowsConfig.isFetching ? (
                <CircularProgress size={'4rem'} />
              ) : (
                <>
                  <JsonForms // Timewindows, MonitorTypes and their internal data
                    key={stationControls.stationName}
                    schema={configSchema}
                    uischema={configUiSchema}
                    data={{}}
                    renderers={renderers}
                    cells={materialCells}
                  />
                </>
              )}
            </Grid>
          </div>
        </Grid>
      </Grid>
      <BottomBar>
        <HelpTextRenderer
          helpText={'Saves changes to disk and config service'}
          isError={userInputAppErrors.length !== 0}
        >
          <Button
            variant='contained'
            component='span'
            startIcon={<SaveIcon />}
            color={userInputAppErrors.length === 0 ? 'info' : 'error'}
            disabled={
              !hasAllDataLoaded || !isValidStationConfig(stationControls)
            }
            onClick={() => {
              if (userInputAppErrors.length === 0) {
                exportConfiguration();
              }
            }}
          >
            Save {stationControls.stationName}
          </Button>
        </HelpTextRenderer>
      </BottomBar>
    </>
  );
};
