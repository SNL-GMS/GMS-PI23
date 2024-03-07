import { Grid } from '@mui/material';
import React from 'react';
import { RollupEntry, RollupType } from '../../state/station-controls-slice';
import makeStyles from '@mui/styles/makeStyles';
import { indentedContainer, layoutStyles } from '../../styles/layout';
import { CapabilityChannelChecklist } from './CapabilityChannelChecklist';
import { CapabilityMonitorChecklist } from './CapabilityMonitorChecklist';
import { CapabilityStationChecklist } from './CapabilityStationChecklist';

const useStyles = makeStyles({
  ...layoutStyles,
  container: {
    ...indentedContainer,
    paddingLeft: '2rem',
  },
});

/**
 * The type of the props for the {@link CapabilityRollupEntry} component
 */
export interface CapabilityRollupEntryProps {
  rollup: RollupEntry;
  groupName: string;
  isStationGroupCapabilityRollup?: boolean;
  channelName?: string;
}

/**
 * Creates an entry for a capability rollup, which is either a checklist, or nothing
 */
export const CapabilityRollupEntry: React.FC<CapabilityRollupEntryProps> = ({
  rollup,
  groupName,
  channelName,
}: CapabilityRollupEntryProps) => {
  const classes = useStyles();

  // Determines which checklist component to return
  const determineChecklistToUse = () => {
    if (rollup.rollupType === RollupType.ROLLUP_OF_STATIONS) {
      return (
        <CapabilityStationChecklist
          groupName={groupName}
          rollupStations={rollup.stations ?? []}
          rollupId={rollup.id}
        />
      );
    } else if (rollup.rollupType === RollupType.ROLLUP_OF_CHANNELS) {
      return (
        <CapabilityChannelChecklist
          groupName={groupName}
          rollupChannels={rollup.channels ?? []}
          rollupId={rollup.id}
        />
      );
    } else if (rollup.rollupType === RollupType.ROLLUP_OF_MONITORS) {
      return (
        <CapabilityMonitorChecklist
          groupName={groupName}
          rollupMonitorNames={rollup.monitors ?? []}
          rollupId={rollup.id}
          channelName={channelName ?? ''}
        />
      );
    } else {
      return undefined;
    }
  };
  return (
    <>
      <Grid
        container
        justifyContent={'flex-start'}
        direction={'row'}
        spacing={1}
        className={classes.container}
      >
        {determineChecklistToUse()}
      </Grid>
    </>
  );
};
