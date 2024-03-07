import produce from 'immer';
import includes from 'lodash/includes';
import React from 'react';
import { batch } from 'react-redux';
import { Checklist } from '../../components/Checklist';
import {
  AppSections,
  StationGroupCapabilityErrorTypes,
} from '../../routes/types';
import { useAppDispatch, useAppSelector } from '../../state/react-redux-hooks';
import { useAppContext } from '../../state/state';
import { setStationGroupCapabilityRollup } from '../../state/station-controls-slice';
import { useUpdateErrorState } from '../../util/custom-hooks';
import { getChannels } from '../channel-checklist/ChannelChecklist';
import { StationCapabilityStatusSummary } from './StationCapabilityStatusSummary';
import {
  determineErrorsForStationGroupCapabilityThresholdsExceedsMax,
  getRollupByDefaultAndId,
  updateStationGroupCapabilityStations,
} from './util';

/**
 * The type of the props for the {@link CapabilityStationChecklist} component
 */
export interface StationChecklistProps {
  groupName: string;
  rollupId: string;
  rollupStations: string[];
}

export const CapabilityStationChecklist: React.FC<StationChecklistProps> = ({
  groupName,
  rollupId,
  rollupStations,
}) => {
  const { data: appData } = useAppContext();
  const dispatch = useAppDispatch();
  const [updateErrorState] = useUpdateErrorState();
  const defaultRollup = useAppSelector(
    (store) => store.stationControls.stationGroupCapabilityRollup[groupName]
  );
  const groupsWithIncludedStations = useAppSelector(
    (store) => store.stationControls.groupsWithIncludedStations
  );

  const handleToggle = React.useCallback(
    (newlySelected: string[], checkbox: string) => {
      dispatch(
        setStationGroupCapabilityRollup({
          groupName,
          rollup: updateStationGroupCapabilityStations(
            rollupId,
            defaultRollup,
            newlySelected
          ),
        })
      );
    },
    [defaultRollup, dispatch, groupName, rollupId]
  );
  const checkedStations = React.useMemo(
    () => rollupStations.filter((c) => includes(defaultRollup.stations, c)),
    [defaultRollup.stations, rollupStations]
  );

  const updateErrorStatus = React.useCallback(() => {
    batch(() => {
      if (checkedStations.length === 0) {
        updateErrorState(
          `${rollupId} ${StationGroupCapabilityErrorTypes.NO_STATIONS}`,
          true,
          `Must have one station included, go to ${AppSections.GROUP} ${groupName} ${AppSections.STATION_GROUP_CAPABILITY} and enable a station`
        );
      } else {
        updateErrorState(
          `${rollupId} ${StationGroupCapabilityErrorTypes.NO_STATIONS}`,
          false,
          ''
        );
      }
      const error =
        determineErrorsForStationGroupCapabilityThresholdsExceedsMax(
          getRollupByDefaultAndId(defaultRollup, rollupId),
          groupName
        );
      if (error.hasError) {
        updateErrorState(`${rollupId} ${error.type}`, true, error.reason);
      } else {
        updateErrorState(`${rollupId} ${error.type}`, false, '');
      }
    });
  }, [
    checkedStations.length,
    defaultRollup,
    groupName,
    rollupId,
    updateErrorState,
  ]);

  React.useEffect(() => {
    updateErrorStatus();
  }, [updateErrorStatus]);

  const sortedStations: string[] = produce(
    groupsWithIncludedStations[groupName],
    (draft) => {
      draft.sort();
    }
  );
  return (
    <Checklist
      checkboxes={sortedStations ?? []}
      checkedBoxes={checkedStations}
      disabledCheckboxes={[]}
      nonIdealState={'No stations found'}
      handleToggle={handleToggle}
      helpText={(stationName) =>
        `Check box results in station ${stationName} being included in nested capability`
      }
      disabledText={(channelName) =>
        `${channelName} is disabled due to being unchecked at 'Enable/Disable channel section, enable it there to include it`
      }
      renderRightElement={(checkbox) => {
        const allChannelNames = getChannels(
          checkbox,
          appData.processingStationGroups
        ).map((channel) => channel.name);

        return includes(checkedStations, checkbox) ? (
          <StationCapabilityStatusSummary
            stationName={checkbox}
            groupName={groupName}
            allChannelNames={allChannelNames}
          />
        ) : (
          <div />
        );
      }}
    />
  );
};
