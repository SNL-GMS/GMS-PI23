import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import {
  useResolveStationGroupCapability,
  useResolveStationGroups,
} from '../state/api-slice';
import { getStationNames } from '../coi-types/get-stations';
import { useAppContext } from '../state/state';
import {
  useCreateNewStationGroup,
  useDetermineStationsInStationGroupsAndLoadIntoState,
  useUpdateDataLoaded,
  useUpdateStationGroupCapability,
  useUpdateStationGroups,
} from '../util/custom-hooks';
import { BottomBar } from '../components/BottomBar';
import { HelpTextRenderer } from '../components/HelpTextRenderer';
import SaveIcon from '@mui/icons-material/Save';
import { batch } from 'react-redux';
import { DataNames } from '../coi-types/data-names';
import { useAppSelector } from '../state/react-redux-hooks';
import {
  useSaveProcessingStationGroup,
  useSaveStationGroupCapability,
  useSaveStationGroups,
} from '../util/saving-hooks';
import { determineAppErrorState } from '../util/util';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StationGroupEntry } from '../renderers/station-group/StationGroupEntry';
import { AddIconButton } from '../components/AddIconButton';
import { Checklist } from '../components/Checklist';
import { useInitializeDefaultsAndRefreshUIConfig } from '../services/use-initialize-defaults-and-refresh-ui-config';
import { ALL_STATION_GROUP_NAME } from '../renderers/station-groups-checklist/util';

const MAX_CHAR_LIMIT_FOR_GROUP_NAME = 15;

const useStyles = makeStyles({
  title: {
    textAlign: 'center',
    margin: '1em',
    fontWeight: 'bold',
    width: '100%',
    fontSize: '20px',
  },
  spacer: {
    margin: '3em',
  },
  groupNameInput: {
    marginRight: '1em',
    width: '40',
  },
  mirrorGroupNameInput: {
    width: '50%',
  },
  errorStationSelection: {
    color: 'red',
  },
  addIcon: {
    fontSize: '1em',
    backgroundColor: 'green',
    borderRadius: '1em',
    color: 'white',
    opacity: '.3',
    '&:hover': {
      opacity: '1',
      cursor: 'pointer',
    },
  },
});

/**
 * Creates an accordion for each station group, and a edit button for modifying station group capability
 */
export const StationGroups: React.FC<{}> = () => {
  const { data: appData } = useAppContext();
  const classes = useStyles();
  const [updateStationGroupCapabilityRollup] =
    useUpdateStationGroupCapability();
  const initializeDefaultsAndRefreshUIConfig =
    useInitializeDefaultsAndRefreshUIConfig();
  const createNewStationGroup = useCreateNewStationGroup();
  const updateAllStationGroupsNames = useUpdateStationGroups();
  const saveStationGroupCapability = useSaveStationGroupCapability();
  const saveProcessingStationGroup = useSaveProcessingStationGroup();
  const saveStationGroups = useSaveStationGroups();
  const userInputErrorsMap = useAppSelector(
    (state) => state.stationControls.error
  );
  const userInputAppErrors = determineAppErrorState(userInputErrorsMap);

  const stationList: string[] = React.useMemo(() => {
    return getStationNames(appData?.processingStationGroups).sort() ?? [];
  }, [appData?.processingStationGroups]);
  const [confirmCreateNewGroup, setConfirmCreateNewGroup] =
    React.useState(false);
  const [groupMirrorSelection, setGroupMirrorSelection] =
    React.useState('None');
  const [newGroupName, setNewGroupName] = React.useState('');
  const [newGroupStations, setNewGroupStations] = React.useState<string[]>([]);
  const resolvedStationGroups = useResolveStationGroups({});
  const [updateDataLoaded] = useUpdateDataLoaded();
  const hasStationGroupCapabilityRollupLoaded = useAppSelector(
    (state) =>
      state.stationControls.loadedData[
        DataNames.STATION_GROUP_CAPABILITY_ROLLUP
      ]
  );
  const allSortedStationGroups = useAppSelector(
    (state) => state.stationControls.allGroupNames
  );

  const hasStationsInGroupsLoaded = useAppSelector(
    (state) => state.stationControls.loadedData[DataNames.STATIONS_IN_GROUPS]
  );

  const hasSyncDeploymentWithProcessing = useAppSelector(
    (state) =>
      state.stationControls.loadedData[
        DataNames.SYNC_DEPLOYMENT_WITH_PROCESSING
      ]
  );

  const groupsWithIncludedStations = useAppSelector(
    (store) => store.stationControls.groupsWithIncludedStations
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
        !resolvedStationGroups.data.stationGroupNames ||
        hasStationGroupCapabilityRollupLoaded,
    }
  );

  const determineStationsInStationGroupsAndLoadIntoState =
    useDetermineStationsInStationGroupsAndLoadIntoState();

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

  const moveGroupEntry = React.useCallback(
    (dragIndex: number, hoverIndex: number) => {
      let newGroupNameOrder = allSortedStationGroups;
      newGroupNameOrder = newGroupNameOrder.filter(
        (name) => name !== allSortedStationGroups[dragIndex]
      );
      newGroupNameOrder.splice(
        hoverIndex,
        0,
        allSortedStationGroups[dragIndex]
      );
      updateAllStationGroupsNames(newGroupNameOrder);
    },
    [allSortedStationGroups, updateAllStationGroupsNames]
  );

  const updateNewGroupStationSelection = React.useCallback(
    (newlySelected: string[]) => {
      setNewGroupStations(newlySelected);
    },
    []
  );

  const handleGroupNameUpdate = React.useCallback(
    (newText: string) => {
      // ! ALL is a special case in the system, always has all stations but only set so can create group
      // ! ALL special case is not saved in processing-station-group-definition but system knows to apply
      // ! every station and other various special cases
      if (newText === ALL_STATION_GROUP_NAME) {
        setNewGroupStations(stationList);
      }
      setNewGroupName(
        newText.replace(/[-&\\/\\#,+()^$~%'":*?<>{}!@§±=;]/g, '')
      );
    },
    [stationList]
  );

  const determineErrorHelpText = (newGroupName: string) => {
    if (newGroupName.length === 0) {
      return 'Name cannot be empty';
    }
    if (newGroupName.length > 15) {
      return 'Name exceeds 15 characters';
    }
    if (allSortedStationGroups.includes(newGroupName)) {
      return 'Group name exists';
    }
    return '';
  };

  React.useEffect(() => {
    if (!hasSyncDeploymentWithProcessing) {
      initializeDefaultsAndRefreshUIConfig();
    }
  }, [hasSyncDeploymentWithProcessing, initializeDefaultsAndRefreshUIConfig]);

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
    resolvedStationGroups?.data?.stationGroupNames,
    stationList,
    updateDataLoaded,
  ]);

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
  const newGroupNameError =
    allSortedStationGroups?.includes(newGroupName) ||
    newGroupName.length === 0 ||
    newGroupName.length > MAX_CHAR_LIMIT_FOR_GROUP_NAME;
  return hasSyncDeploymentWithProcessing &&
    !resolvedStationGroups.isLoading &&
    hasStationGroupCapabilityRollupLoaded ? (
    <>
      <Dialog
        fullWidth
        open={confirmCreateNewGroup}
        onClose={() => setConfirmCreateNewGroup(false)}
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'
      >
        {' '}
        <DialogTitle
          id='alert-dialog-title'
          align='center'
        >{`New Group Creation`}</DialogTitle>
        <DialogContent>
          <TextField
            className={classes.groupNameInput}
            id='group-name-textfield'
            label='Group Name'
            variant='outlined'
            value={newGroupName}
            error={newGroupNameError}
            helperText={determineErrorHelpText(newGroupName)}
            onChange={(event) => handleGroupNameUpdate(event.target.value)}
          />
          <FormControl className={classes.mirrorGroupNameInput}>
            <InputLabel id='group-mirror-label'>Groups</InputLabel>
            <Select
              variant='outlined'
              labelId='group-mirror'
              id='group-mirror'
              value={groupMirrorSelection}
              label='Group'
              onChange={(event) => {
                if (event.target.value === 'None') {
                  setNewGroupStations([]);
                } else {
                  setNewGroupStations(
                    groupsWithIncludedStations[event.target.value]
                  );
                }
                setGroupMirrorSelection(event.target.value);
              }}
            >
              <MenuItem value={'None'}>None</MenuItem>
              {allSortedStationGroups?.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Group to mirror included stations</FormHelperText>
          </FormControl>
          {newGroupName !== ALL_STATION_GROUP_NAME ? (
            <>
              <div>
                Select stations to be in group:{' '}
                <span
                  className={`${
                    newGroupStations.length === 0
                      ? classes.errorStationSelection
                      : ''
                  }`}
                >{`${
                  newGroupStations.length === 0
                    ? '(must have one station selected)'
                    : ''
                }`}</span>
              </div>
              <Checklist
                checkboxes={stationList}
                checkedBoxes={newGroupStations}
                nonIdealState={'No station groups found'}
                handleToggle={updateNewGroupStationSelection}
                helpText={(stationName) =>
                  `Checkbox results in station ${stationName} being added to station group ${newGroupName}`
                }
                renderRightElement={undefined}
              />
            </>
          ) : (
            <div>
              ALL is a special case group name, all station will be selected
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCreateNewGroup(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              newGroupNameError ||
              newGroupName.length === 0 ||
              newGroupStations.length === 0
            }
            onClick={() => {
              createNewStationGroup(newGroupName, newGroupStations);
              setNewGroupName('');
              setNewGroupStations([]);
              setGroupMirrorSelection('None');
              setConfirmCreateNewGroup(false);
            }}
            autoFocus
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
      <div className={classes.title}>Station Groups</div>
      <AddIconButton
        containerId={''}
        className={classes.addIcon}
        helpText={'Add a New Station Group'}
        onIconClick={() => setConfirmCreateNewGroup(true)}
      />
      <DndProvider backend={HTML5Backend}>
        {allSortedStationGroups?.map((groupName: string, index) => {
          return (
            <StationGroupEntry
              key={groupName}
              groupName={groupName}
              index={index}
              moveGroupEntry={moveGroupEntry}
            />
          );
        })}
      </DndProvider>
      <div className={classes.spacer} />
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
            disabled={resolvedStationGroups.isLoading}
            onClick={() => {
              if (userInputAppErrors.length === 0) {
                saveStationGroupCapability();
                saveStationGroups();
                saveProcessingStationGroup();
              }
            }}
          >
            Save
          </Button>
        </HelpTextRenderer>
      </BottomBar>
    </>
  ) : (
    <CircularProgress size={'4rem'} />
  );
};
