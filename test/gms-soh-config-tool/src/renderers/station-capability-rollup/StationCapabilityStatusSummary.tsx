import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DownloadingIcon from '@mui/icons-material/Downloading';
import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import Typography from '@mui/material/Typography';
import { useAppSelector } from '../../state/react-redux-hooks';
import { RollupEntry, RollupType } from '../../state/station-controls-slice';
import { useUpdateStationCapability } from '../../util/custom-hooks';
import { useResolveAllStationCapabilitiesForGroup } from '../../state/api-slice';
import { batch } from 'react-redux';
import { useAppContext } from '../../state/state';
import { HelpTextRenderer } from '../../components/HelpTextRenderer';

/**
 * The type of the props for the {@link StationCapabilityRollup} component
 */
export interface StationCapabilityRollupProps {
  stationName: string;
  groupName: string;
  allChannelNames: string[];
}

const useStyles = makeStyles({
  rollupContainer: {
    display: 'flex',
  },
  editIcon: {
    cursor: 'pointer',
  },
  errorIcon: {
    color: 'tomato',
  },
});

/**
 * Shows a button to load station capability status summary and if loaded shows summary.
 */
export const StationCapabilityStatusSummary: React.FC<
  StationCapabilityRollupProps
> = ({
  stationName,
  groupName,
  allChannelNames,
}: StationCapabilityRollupProps) => {
  const classes = useStyles();
  const { data: appData } = useAppContext();
  const [updateStationCapabilityRollup] = useUpdateStationCapability();
  const [getAllStationCapabilitiesForGroup, { isLoading }] =
    useResolveAllStationCapabilitiesForGroup();
  const rollup = useAppSelector(
    (state) => state.stationControls.stationCapabilityRollup
  );
  const loadStationCapabilitySummary = () => {
    getAllStationCapabilitiesForGroup({
      stationNames: [stationName],
      groupName: groupName,
      processingStationGroups: appData.processingStationGroups,
    }).then((response) => {
      batch(() => {
        response.data?.forEach((rollup) => {
          updateStationCapabilityRollup(
            rollup.stationName,
            rollup.groupName,
            rollup.defaultRollup
          );
        });
      });
    });
  };

  const determineRollupStatus = (rollup: RollupEntry): string => {
    if (rollup.rollupType === RollupType.ROLLUP_OF_ROLLUPS) {
      return `${rollup.operatorType} ROLLUPS`;
    }
    if (rollup.channels) {
      if (rollup.channels.length === allChannelNames.length) {
        return `${rollup.operatorType} ALL_CHANNELS`;
      }
      return `${rollup.operatorType} SELECTED_CHANNELS`;
    }
    return '';
  };

  return (
    <div className={classes.rollupContainer}>
      <Typography sx={{ ml: 2, flex: 1 }} component='div'>
        {rollup[stationName] && rollup[stationName][groupName]
          ? `(${determineRollupStatus(rollup[stationName][groupName])})`
          : ''}
      </Typography>
      {isLoading ? <DownloadingIcon className={classes.editIcon} /> : undefined}
      {!rollup[stationName] || !rollup[stationName][groupName] ? (
        <HelpTextRenderer
          helpText={'Download Station Capability Status Summary'}
          isError={false}
        >
          <CloudDownloadIcon
            onClick={() => loadStationCapabilitySummary()}
            className={classes.editIcon}
          />
        </HelpTextRenderer>
      ) : undefined}
    </div>
  );
};
