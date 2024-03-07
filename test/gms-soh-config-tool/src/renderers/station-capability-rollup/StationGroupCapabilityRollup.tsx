import EditIcon from '@mui/icons-material/Edit';
import ErrorIcon from '@mui/icons-material/Error';
import React from 'react';
import Slide from '@mui/material/Slide';
import makeStyles from '@mui/styles/makeStyles';
import { TransitionProps } from '@mui/material/transitions';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { Rollup } from './Rollup';
import { useAppSelector } from '../../state/react-redux-hooks';
import {
  OperatorType,
  RollupEntry,
  RollupType,
} from '../../state/station-controls-slice';
import { determineSectionContainsErrorState } from '../../util/util';
import remarkGfm from 'remark-gfm';
import Tooltip from '@mui/material/Tooltip';
import ReactMarkdown from 'react-markdown';
import { AppSections } from '../../routes/types';

/**
 * The type of the props for the {@link StationGroupCapabilityRollup} component
 */
export interface StationGroupCapabilityRollupProps {
  groupName: string;
}

const useStyles = makeStyles({
  rollupContainer: {
    display: 'flex',
  },
  spacer: {
    margin: '1em',
  },
  editIcon: {
    cursor: 'pointer',
  },
  errorIcon: {
    color: 'tomato',
  },
});

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction='up' ref={ref} {...props} />;
});

// Uses only these specific options
const rollupTypeOptions = [
  RollupType.ROLLUP_OF_ROLLUPS,
  RollupType.ROLLUP_OF_STATIONS,
];

/**
 * Creates a popover for station group capability rollup.
 */
export const StationGroupCapabilityRollup: React.FC<
  StationGroupCapabilityRollupProps
> = ({ groupName }: StationGroupCapabilityRollupProps) => {
  const classes = useStyles();
  const rollup = useAppSelector(
    (state) => state.stationControls.stationGroupCapabilityRollup[groupName]
  );
  const groupsWithIncludedStations = useAppSelector(
    (store) => store.stationControls.groupsWithIncludedStations
  );

  const [showPopover, setPopOver] = React.useState(false);
  const showStationGroupCapabilityRollup = () => {
    setPopOver(true);
  };
  const errors = useAppSelector((state) => state.stationControls.error);

  // Uses all the operator types
  const operatorTypeOptions = React.useMemo(
    () =>
      Object.keys(OperatorType).filter((item) => {
        return isNaN(Number(item));
      }),
    []
  );

  const determineRollupStatus = (rollupEntry: RollupEntry): string => {
    if (rollupEntry.rollupType === RollupType.ROLLUP_OF_ROLLUPS) {
      return `${rollupEntry.operatorType} ROLLUPS`;
    }
    if (rollupEntry.stations && groupsWithIncludedStations[groupName]) {
      if (
        rollupEntry.stations.length ===
        groupsWithIncludedStations[groupName].length
      ) {
        return `${rollupEntry.operatorType} ALL_STATIONS`;
      }
      return `${rollupEntry.operatorType} SELECTED_STATIONS`;
    }
    return '';
  };

  const hasErrors =
    determineSectionContainsErrorState(
      errors,
      ` ${groupName} ${AppSections.STATION_GROUP_CAPABILITY}`
    ).length > 0;

  return (
    <div className={classes.rollupContainer}>
      <Typography sx={{ ml: 2, flex: 1 }} component='div'>
        {`(${determineRollupStatus(rollup)})`}
      </Typography>
      <EditIcon
        onClick={() => showStationGroupCapabilityRollup()}
        className={classes.editIcon}
      />
      {hasErrors ? (
        <Tooltip
          title={
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {`Capability Error`}
            </ReactMarkdown>
          }
        >
          <ErrorIcon className={classes.errorIcon} />
        </Tooltip>
      ) : undefined}
      <Dialog
        fullScreen
        open={showPopover}
        onClose={() => setPopOver(false)}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <Typography sx={{ ml: 2, flex: 1 }} variant='h6' component='div'>
              {`${groupName}: Station Group Capability Rollup`}
            </Typography>
            <IconButton
              edge='start'
              color='inherit'
              onClick={() => setPopOver(false)}
              aria-label='close'
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        {rollup ? (
          <Rollup
            groupName={groupName}
            isStationGroupCapabilityRollup={true}
            defaultRollup={rollup}
            rollups={rollup.rollups ?? []}
            rollupTypeOptions={rollupTypeOptions}
            operatorTypeOptions={operatorTypeOptions}
          />
        ) : undefined}
        <div className={classes.spacer} />
      </Dialog>
    </div>
  );
};
