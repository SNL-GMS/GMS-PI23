import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import produce from 'immer';
import { includes } from 'lodash';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import ErrorIcon from '@mui/icons-material/Error';
import { DataNames } from '../../coi-types/data-names';
import { Checklist } from '../../components/Checklist';
import { windowAPI } from '../../electron-util';
import { AppSections } from '../../routes/types';
import {
  useResolveChannelCapabilityRollup,
  useResolveStationCapability,
  useResolveStationGroups,
} from '../../state/api-slice';
import { useAppDispatch, useAppSelector } from '../../state/react-redux-hooks';
import { ProcessingStationGroupsDefinition } from '../../state/retrieve-station-groups';
import { useAppContext } from '../../state/state';
import {
  setStationGroups,
  StationGroup,
} from '../../state/station-controls-slice';
import {
  useCheckChannelCapabilityForErrors,
  useSelectedMonitors,
  useToggleStationInStationGroupAndUpdateStationGroupCapability,
  useUpdateChannelCapabilityRollup,
  useUpdateDataLoaded,
  useUpdateStationCapability,
} from '../../util/custom-hooks';
import { determineSectionContainsErrorState } from '../../util/util';
import { getChannels } from '../channel-checklist/ChannelChecklist';
import { StationCapabilityRollup } from '../station-capability-rollup/StationCapabilityRollup';
import { ALL_STATION_GROUP_NAME, determineGroupsForStation } from './util';
import remarkGfm from 'remark-gfm';
import { batch } from 'react-redux';
import { StationGroupCapabilityRollup } from '../station-capability-rollup/StationGroupCapabilityRollup';

/**
 * The type of the props for the {@link StationGroupsChecklist} component
 */
export interface StationGroupsChecklistProps {
  formData: any;
  label: string;
  description: string;
}

const useStyles = makeStyles({
  accordionLabel: {
    fontWeight: 'bold',
    color: '#666666',
  },
  hidden: {
    display: 'none',
  },
  stationGroupCapability: {
    display: 'flex',
    margin: '1em',
  },
  errorIcon: {
    color: 'tomato',
  },
  errorBorder: {
    border: 'solid',
    borderWidth: '1px',
    borderColor: 'tomato',
  },
});

/**
 * Creates a checklist of Station Groups that can be selected and deselected.
 */
export const StationGroupsChecklist: React.FC<StationGroupsChecklistProps> = ({
  label,
  description,
}: StationGroupsChecklistProps) => {
  const { data: appData } = useAppContext();
  const dispatch = useAppDispatch();
  const classes = useStyles();
  const [updateDataLoaded] = useUpdateDataLoaded();
  const [checkChannelCapabilityForErrors] =
    useCheckChannelCapabilityForErrors();
  const toggleStationInStationGroupAndUpdateStationGroupCapability =
    useToggleStationInStationGroupAndUpdateStationGroupCapability();
  const selectedMonitors = useSelectedMonitors();
  const [confirmToggle, setConfirmToggle] = React.useState({
    open: false,
    newlySelected: [''],
    checkbox: '',
  });
  const hasStationCapabilityRollupLoaded = useAppSelector(
    (state) =>
      state.stationControls.loadedData[DataNames.STATION_CAPABILITY_ROLLUP]
  );

  const hasStationGroupsLoaded = useAppSelector(
    (state) => state.stationControls.loadedData[DataNames.STATION_GROUPS]
  );

  const hasStationUpdateCausedStationGroupCapabilityError = useAppSelector(
    (state) =>
      state.stationControls.hasStationUpdateCausedStationGroupCapabilityError
  );

  const hasChannelCapabilityRollupLoaded = useAppSelector(
    (state) =>
      state.stationControls.loadedData[DataNames.CHANNEL_CAPABILITY_ROLLUP]
  );

  const hasSelectedMonitorsAndThresholdsLoaded = useAppSelector(
    (state) => state.stationControls.loadedData[DataNames.MONITOR_THRESHOLDS]
  );

  const stationName = useAppSelector(
    (state) => state.stationControls.stationName
  );
  const stationGroupCapabilities = useAppSelector(
    (state) => state.stationControls.stationGroupCapabilityRollup
  );
  const errors = useAppSelector((state) => state.stationControls.error);
  const selectedChannels = useAppSelector(
    (state) => state.stationControls.selectedChannels[stationName ?? '']
  );
  const allChannels = React.useMemo(
    () => getChannels(stationName, appData.processingStationGroups),
    [appData.processingStationGroups, stationName]
  );
  const allChannelNames = allChannels.map((channel) => channel.name);
  const stationGroupsForStation = useAppSelector(
    (state) => state.stationControls.stationGroups[stationName ?? '']
  );

  const hasStationGroupCapabilityRollupLoaded = useAppSelector(
    (state) =>
      state.stationControls.loadedData[
        DataNames.STATION_GROUP_CAPABILITY_ROLLUP
      ]
  );

  const resolvedStationGroups = useResolveStationGroups(
    {},
    { skip: !stationName }
  );

  const stationGroupNames = stationGroupsForStation?.map((group) => group.name);
  const resolvedStationCapability = useResolveStationCapability(
    {
      stationName: stationName ?? '',
      groupNames: stationGroupNames,
      channelNames: selectedChannels,
    },
    {
      skip:
        !stationName ||
        !stationGroupNames ||
        stationGroupNames.length === 0 ||
        resolvedStationGroups.isLoading,
    }
  );

  const resolvedChannelCapabilityRollups = useResolveChannelCapabilityRollup(
    {
      stationName: stationName ?? '',
      groupNames: stationGroupNames,
      channelNames: allChannelNames,
      allMonitorNames: selectedMonitors ?? [],
    },
    {
      skip:
        !stationName ||
        !stationGroupNames ||
        stationGroupNames.length === 0 ||
        resolvedStationGroups.isLoading ||
        !hasStationCapabilityRollupLoaded ||
        !hasSelectedMonitorsAndThresholdsLoaded,
    }
  );

  const [updateStationCapabilityRollup] = useUpdateStationCapability();

  const [updateChannelCapabilityRollup] = useUpdateChannelCapabilityRollup();

  const updateStationGroups = React.useCallback(
    (newStationGroups: StationGroup[]) => {
      dispatch(
        setStationGroups({
          stationName,
          stationGroups: newStationGroups,
        })
      );
    },
    [dispatch, stationName]
  );

  const updateStationGroupsAndStationGroupCapability = React.useCallback(() => {
    const updatedGroups = produce(stationGroupsForStation, (draft) => {
      if (stationGroupsForStation) {
        const group = draft.find((g) => g.name === confirmToggle.checkbox);
        if (group) {
          group.included = !group.included;
        }
      }
    });
    toggleStationInStationGroupAndUpdateStationGroupCapability(
      stationName ?? '',
      confirmToggle.checkbox
    );
    updateStationGroups(updatedGroups);
  }, [
    confirmToggle.checkbox,
    stationGroupsForStation,
    stationName,
    toggleStationInStationGroupAndUpdateStationGroupCapability,
    updateStationGroups,
  ]);

  const handleToggle = React.useCallback(
    (newlySelected: string[], checkbox: string) => {
      setConfirmToggle({ open: true, newlySelected, checkbox });
    },
    []
  );

  const determineGroupsAndLoadIntoState = React.useCallback(async () => {
    const processingStationGroupDefinitionsFromDisk =
      await windowAPI.electronAPI.loadConfigFromDir(
        '../station-reference/definitions'
      );
    updateStationGroups(
      determineGroupsForStation(
        stationName,
        resolvedStationGroups?.data?.stationGroupNames,
        processingStationGroupDefinitionsFromDisk as ProcessingStationGroupsDefinition[]
      )
    );
  }, [
    resolvedStationGroups?.data?.stationGroupNames,
    stationName,
    updateStationGroups,
  ]);

  const addStationCapabilityIntoState = React.useCallback(() => {
    batch(() => {
      resolvedStationCapability.data?.forEach((rollup) => {
        updateStationCapabilityRollup(
          stationName ?? '',
          rollup.groupName,
          rollup.defaultRollup
        );
      });
    });
  }, [
    resolvedStationCapability.data,
    stationName,
    updateStationCapabilityRollup,
  ]);

  const addChannelCapabilityRollupIntoState = React.useCallback(() => {
    batch(() => {
      resolvedChannelCapabilityRollups.data?.forEach((rollup) => {
        updateChannelCapabilityRollup(
          stationName ?? '',
          rollup.groupName,
          rollup.channelName,
          rollup.defaultRollup
        );
      });
    });
    checkChannelCapabilityForErrors(
      resolvedChannelCapabilityRollups.data ?? []
    );
  }, [
    checkChannelCapabilityForErrors,
    resolvedChannelCapabilityRollups.data,
    stationName,
    updateChannelCapabilityRollup,
  ]);

  React.useEffect(() => {
    if (
      resolvedStationGroups.isSuccess &&
      resolvedStationGroups.data &&
      resolvedStationGroups.data.stationGroupNames &&
      !hasStationGroupsLoaded
    ) {
      determineGroupsAndLoadIntoState();
      updateDataLoaded(DataNames.STATION_GROUPS, true);
    }
  }, [
    determineGroupsAndLoadIntoState,
    hasStationGroupsLoaded,
    resolvedStationGroups.data,
    resolvedStationGroups.isSuccess,
    updateDataLoaded,
  ]);

  React.useEffect(() => {
    if (
      resolvedStationCapability.isSuccess &&
      resolvedStationCapability.data &&
      resolvedStationCapability.data.length > 0 &&
      resolvedStationCapability.data[0] &&
      resolvedStationCapability.data[0].stationName === stationName &&
      !hasStationCapabilityRollupLoaded
    ) {
      addStationCapabilityIntoState();
      updateDataLoaded(DataNames.STATION_CAPABILITY_ROLLUP, true);
    }
  }, [
    addStationCapabilityIntoState,
    hasStationCapabilityRollupLoaded,
    resolvedStationCapability.currentData,
    resolvedStationCapability.data,
    resolvedStationCapability.isSuccess,
    stationName,
    updateDataLoaded,
    updateStationCapabilityRollup,
  ]);

  React.useEffect(() => {
    if (
      resolvedChannelCapabilityRollups.isSuccess &&
      resolvedChannelCapabilityRollups.data &&
      resolvedChannelCapabilityRollups.data.length > 0 &&
      resolvedChannelCapabilityRollups.data[0] &&
      resolvedChannelCapabilityRollups.data[0].stationName === stationName &&
      !hasChannelCapabilityRollupLoaded
    ) {
      addChannelCapabilityRollupIntoState();
      updateDataLoaded(DataNames.CHANNEL_CAPABILITY_ROLLUP, true);
    }
  }, [
    addChannelCapabilityRollupIntoState,
    hasChannelCapabilityRollupLoaded,
    resolvedChannelCapabilityRollups.data,
    resolvedChannelCapabilityRollups.isSuccess,
    stationName,
    updateDataLoaded,
  ]);

  const checkedBoxesNames = React.useMemo(
    () =>
      stationGroupsForStation
        ?.filter((group) => group.included)
        ?.map((group) => group.name) ?? [],
    [stationGroupsForStation]
  );

  const hasErrors = React.useMemo(
    () =>
      determineSectionContainsErrorState(errors, AppSections.GROUP).length > 0,
    [errors]
  );
  return (
    <>
      <Dialog
        open={confirmToggle.open}
        onClose={() =>
          setConfirmToggle({ checkbox: '', newlySelected: [''], open: false })
        }
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'
      >
        {' '}
        <DialogTitle id='alert-dialog-title'>
          {`Warning: Toggling group ${confirmToggle.checkbox} will update station group capability. This action cannot be undone.`}
        </DialogTitle>
        <DialogActions>
          <Button
            onClick={() =>
              setConfirmToggle({
                open: false,
                newlySelected: [''],
                checkbox: '',
              })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              updateStationGroupsAndStationGroupCapability();
              setConfirmToggle({
                checkbox: '',
                newlySelected: [''],
                open: false,
              });
            }}
          >
            ok
          </Button>
        </DialogActions>
      </Dialog>
      <Accordion
        className={`${hasErrors ? classes.errorBorder : ''}`}
        disabled={stationName === null || !hasStationGroupsLoaded}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <strong className={classes.accordionLabel}>{label}</strong>
        </AccordionSummary>
        <AccordionDetails>
          {description && (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {description}
            </ReactMarkdown>
          )}
          {resolvedStationGroups.isLoading ? (
            <CircularProgress size={'4rem'} />
          ) : (
            <Checklist
              checkboxes={stationGroupNames ?? []}
              checkedBoxes={checkedBoxesNames}
              disabledCheckboxes={[ALL_STATION_GROUP_NAME]}
              disabledText={(stationGroup) =>
                `${stationGroup} Station Group cannot be unchecked, contains all Stations`
              }
              nonIdealState={'No station groups found'}
              handleToggle={handleToggle}
              helpText={(stationGroup) =>
                `Check box results in station ${stationName} being included/excluded from ${stationGroup}`
              }
              renderRightElement={(checkbox) => (
                <>
                  <div
                    className={`${
                      hasStationUpdateCausedStationGroupCapabilityError[
                        checkbox
                      ]
                        ? classes.stationGroupCapability
                        : classes.hidden
                    }`}
                  >
                    Station Group Capability
                    {hasStationGroupCapabilityRollupLoaded &&
                    stationGroupCapabilities[checkbox] ? (
                      <StationGroupCapabilityRollup groupName={checkbox} />
                    ) : (
                      <div />
                    )}
                  </div>
                  {includes(checkedBoxesNames, checkbox) ? (
                    hasStationCapabilityRollupLoaded === true ? (
                      <StationCapabilityRollup
                        groupName={checkbox}
                        allChannelNames={allChannelNames}
                      />
                    ) : (
                      <CircularProgress size={'1rem'} />
                    )
                  ) : determineSectionContainsErrorState(errors, checkbox)
                      .length > 0 ? (
                    <Tooltip
                      title={
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {`Capability Error, enable ${checkbox} to edit/correct errors`}
                        </ReactMarkdown>
                      }
                    >
                      <>
                        <ErrorIcon className={classes.errorIcon} />
                      </>
                    </Tooltip>
                  ) : (
                    <div />
                  )}
                </>
              )}
            />
          )}
        </AccordionDetails>
      </Accordion>
    </>
  );
};
