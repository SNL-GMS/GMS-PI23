import { FormControl, Autocomplete, TextField } from '@mui/material';
import React from 'react';
import {
  OperatorType,
  RollupEntry,
  RollupType,
} from '../../state/station-controls-slice';
import { layoutStyles } from '../../styles/layout';
import {
  findAndDetermineMaxThresholdValueForChannelCapabilityEntry,
  findAndDetermineMaxThresholdValueForStationCapabilityEntry,
  findAndDetermineMaxThresholdValueForStationGroupCapabilityEntry,
  getRollupByDefaultAndId,
  updateCapabilityGoodThreshold,
  updateCapabilityMarginalThreshold,
  updateCapabilityOperatorType,
  updateChannelCapabilityRollupType,
  updateStationCapabilityRollupType,
  updateStationGroupCapabilityRollupType,
} from './util';
import makeStyles from '@mui/styles/makeStyles';
import { useAppSelector } from '../../state/react-redux-hooks';
import {
  useRemoveAllErrorsFromChannelCapabilityDeletedRollupEntries,
  useRemoveAllErrorsFromStationCapabilityDeletedRollupEntries,
  useRemoveAllErrorsFromStationGroupCapabilityDeletedRollupEntries,
  useSelectedMonitors,
  useUpdateChannelCapabilityRollup,
  useUpdateErrorState,
  useUpdateStationCapability,
  useUpdateStationGroupCapability,
} from '../../util/custom-hooks';
import {
  AppSections,
  ChannelCapabilityErrorTypes,
  SharedCapabilityErrorTypes,
  StationCapabilityErrorTypes,
  StationGroupCapabilityErrorTypes,
} from '../../routes/types';
import { isGoodGreaterThanOrEqualToMarginal } from '../../util/util';
import { batch } from 'react-redux';

const useStyles = makeStyles({
  ...layoutStyles,
  formControl: {
    margin: 0,
  },
  formEntry: {
    width: '300px',
  },
  threshold: {},
  header: {
    width: '100%',
    '& > *': {
      paddingRight: '1em',
    },
    '& > *:last-child': {
      paddingRight: '0',
    },
  },
  errorBorder: {
    border: 'solid',
    borderWidth: '1px',
    borderColor: 'tomato',
  },
});

/**
 * The type of the props for the {@link CapabilityHeaderEntry} component
 */
export interface CapabilityHeaderEntryProps {
  groupName: string;
  isStationGroupCapabilityRollup?: boolean;
  channelName?: string;
  rollupType: RollupType;
  rollupTypeOptions: string[];
  rollupId: string;
  operatorType: OperatorType;
  operatorTypeOptions: string[];
  goodThreshold?: string | number;
  marginalThreshold?: string | number;
}

/**
 * Creates a capability header, including the form inputs
 */
export const CapabilityHeaderEntry: React.FC<CapabilityHeaderEntryProps> = ({
  groupName,
  isStationGroupCapabilityRollup,
  channelName,
  rollupType,
  rollupTypeOptions,
  rollupId,
  operatorType,
  operatorTypeOptions,
  goodThreshold,
  marginalThreshold,
}: CapabilityHeaderEntryProps) => {
  const classes = useStyles();
  const [updateStationGroupCapabilityRollup] =
    useUpdateStationGroupCapability();
  const [updateStationCapabilityRollup] = useUpdateStationCapability();
  const [updateChannelCapabilityRollup] = useUpdateChannelCapabilityRollup();
  const removeAllErrorsFromStationGroupCapabilityDeletedRollupEntries =
    useRemoveAllErrorsFromStationGroupCapabilityDeletedRollupEntries();

  const removeAllErrorsFromStationCapabilityDeletedRollupEntries =
    useRemoveAllErrorsFromStationCapabilityDeletedRollupEntries();

  const removeAllErrorsFromChannelCapabilityDeletedRollupEntries =
    useRemoveAllErrorsFromChannelCapabilityDeletedRollupEntries();

  const [updateErrorState] = useUpdateErrorState();
  const stationName = useAppSelector(
    (state) => state.stationControls.stationName
  );

  const defaultStationGroupCapabilityRollup = useAppSelector(
    (store) => store.stationControls.stationGroupCapabilityRollup[groupName]
  );

  const defaultStationCapabilityRollup = useAppSelector(
    (store) => store.stationControls.stationCapabilityRollup[stationName ?? '']
  );

  const defaultChannelCapabilityRollup = useAppSelector(
    (store) => store.stationControls.channelCapabilityRollup[stationName ?? '']
  );

  const configErrors = useAppSelector((state) => state.stationControls.error);

  const selectedMonitors = useSelectedMonitors();

  const selectedChannels = useAppSelector(
    (store) => store.stationControls.selectedChannels[stationName ?? '']
  );

  const groupsWithIncludedStations = useAppSelector(
    (store) => store.stationControls.groupsWithIncludedStations
  );

  const isChannelCapability = channelName !== undefined;

  const updateCapability = React.useCallback(
    (rollup: RollupEntry) => {
      if (isStationGroupCapabilityRollup) {
        updateStationGroupCapabilityRollup(groupName, rollup);
      } else if (isChannelCapability) {
        updateChannelCapabilityRollup(
          stationName ?? '',
          groupName,
          channelName,
          rollup
        );
      } else {
        updateStationCapabilityRollup(stationName ?? '', groupName, rollup);
      }
    },
    [
      channelName,
      groupName,
      isChannelCapability,
      isStationGroupCapabilityRollup,
      stationName,
      updateChannelCapabilityRollup,
      updateStationCapabilityRollup,
      updateStationGroupCapabilityRollup,
    ]
  );

  let hasErrors = false;
  Object.keys(configErrors).forEach((errorId) => {
    if (errorId.includes(rollupId) && configErrors[errorId].hasError) {
      hasErrors = true;
    }
  });

  const determineErrorReasonTextForThresholds = React.useCallback(
    (
      doesGoodExceedMaxValue: boolean,
      doesMarginalExceedMaxValue: boolean,
      isMarginalGreaterError: boolean
    ): string => {
      let startOfError = '';
      if (isChannelCapability) {
        startOfError = `Threshold input is invalid for ${AppSections.GROUP} ${groupName} ${AppSections.CHANNEL_CAPABILITY} ${channelName}`;
      } else {
        startOfError = `Threshold input is invalid for ${AppSections.GROUP} ${groupName} ${AppSections.STATION_CAPABILITY}`;
      }
      return `${startOfError} ${
        isMarginalGreaterError
          ? ' - good must be greater than or equal to marginal'
          : ''
      } ${
        doesGoodExceedMaxValue
          ? ` - good input cannot exceed number of ${
              rollupType === RollupType.ROLLUP_OF_ROLLUPS
                ? 'rollups'
                : isChannelCapability
                ? 'monitors'
                : 'channels'
            }`
          : ''
      } ${
        doesMarginalExceedMaxValue
          ? ` - marginal input cannot exceed number of ${
              rollupType === RollupType.ROLLUP_OF_ROLLUPS
                ? 'rollups'
                : isChannelCapability
                ? 'monitors'
                : 'channels'
            }`
          : ''
      }`;
    },
    [channelName, groupName, isChannelCapability, rollupType]
  );

  // Determines which default rollup to use
  const determineRollupToUse = (): RollupEntry => {
    if (isStationGroupCapabilityRollup) {
      return defaultStationGroupCapabilityRollup;
    } else if (isChannelCapability) {
      return defaultChannelCapabilityRollup[groupName][channelName];
    } else {
      return defaultStationCapabilityRollup[groupName];
    }
  };

  const determineThresholdsInputErrors = React.useCallback(
    (
      goodThreshold: string,
      marginalThreshold: string
    ): {
      doesGoodExceedMaxValue: boolean;
      doesMarginalExceedMaxValue: boolean;
      isMarginalGreaterError: boolean;
    } => {
      let maxThreshold = -1;
      if (isStationGroupCapabilityRollup) {
        maxThreshold =
          findAndDetermineMaxThresholdValueForStationGroupCapabilityEntry(
            defaultStationGroupCapabilityRollup,
            rollupId
          );
      } else if (isChannelCapability) {
        maxThreshold =
          findAndDetermineMaxThresholdValueForChannelCapabilityEntry(
            defaultChannelCapabilityRollup[groupName][channelName],
            rollupId
          );
      } else {
        maxThreshold =
          findAndDetermineMaxThresholdValueForStationCapabilityEntry(
            defaultStationCapabilityRollup[groupName],
            rollupId
          );
      }
      const doesGoodExceedMaxValue = parseInt(goodThreshold) > maxThreshold;
      const doesMarginalExceedMaxValue =
        parseInt(marginalThreshold) > maxThreshold;
      const isMarginalGreaterError = !isGoodGreaterThanOrEqualToMarginal(
        false,
        goodThreshold,
        marginalThreshold
      );
      return {
        doesGoodExceedMaxValue,
        doesMarginalExceedMaxValue,
        isMarginalGreaterError,
      };
    },
    [
      channelName,
      defaultChannelCapabilityRollup,
      defaultStationCapabilityRollup,
      defaultStationGroupCapabilityRollup,
      groupName,
      isChannelCapability,
      isStationGroupCapabilityRollup,
      rollupId,
    ]
  );

  let thresholdInputErrors = {
    doesGoodExceedMaxValue: false,
    doesMarginalExceedMaxValue: false,
    isMarginalGreaterError: false,
  };

  if (
    operatorType === OperatorType.MIN_GOOD_OF &&
    goodThreshold &&
    marginalThreshold
  ) {
    thresholdInputErrors = determineThresholdsInputErrors(
      goodThreshold.toString(),
      marginalThreshold.toString()
    );
  }

  /**
   * Determines which type of capability and updates accordingly
   * @param value of rollup status to update
   */
  const updateRollupStatus = React.useCallback(
    (value: string) => {
      if (isStationGroupCapabilityRollup) {
        updateCapability(
          updateStationGroupCapabilityRollupType(
            rollupId,
            defaultStationGroupCapabilityRollup,
            value,
            groupsWithIncludedStations[groupName] ?? []
          )
        );
        removeAllErrorsFromStationGroupCapabilityDeletedRollupEntries(
          defaultStationGroupCapabilityRollup,
          rollupId
        );
      } else if (isChannelCapability) {
        updateCapability(
          updateChannelCapabilityRollupType(
            rollupId,
            defaultChannelCapabilityRollup[groupName][channelName],
            value,
            selectedMonitors ?? []
          )
        );
        removeAllErrorsFromChannelCapabilityDeletedRollupEntries(
          defaultChannelCapabilityRollup[groupName][channelName],
          rollupId
        );
      } else {
        updateCapability(
          updateStationCapabilityRollupType(
            rollupId,
            defaultStationCapabilityRollup[groupName],
            value,
            selectedChannels
          )
        );
        removeAllErrorsFromStationCapabilityDeletedRollupEntries(
          defaultStationCapabilityRollup[groupName],
          rollupId
        );
      }
    },
    [
      channelName,
      defaultChannelCapabilityRollup,
      defaultStationCapabilityRollup,
      defaultStationGroupCapabilityRollup,
      groupName,
      groupsWithIncludedStations,
      isChannelCapability,
      isStationGroupCapabilityRollup,
      removeAllErrorsFromChannelCapabilityDeletedRollupEntries,
      removeAllErrorsFromStationCapabilityDeletedRollupEntries,
      removeAllErrorsFromStationGroupCapabilityDeletedRollupEntries,
      rollupId,
      selectedChannels,
      selectedMonitors,
      updateCapability,
    ]
  );

  const updateErrors = React.useCallback(
    (goodThreshold: string, marginalThreshold: string) => {
      batch(() => {
        const newMarginalInputErrors = determineThresholdsInputErrors(
          goodThreshold.toString(),
          marginalThreshold.toString()
        );
        if (
          operatorType === OperatorType.MIN_GOOD_OF &&
          (newMarginalInputErrors.doesGoodExceedMaxValue ||
            newMarginalInputErrors.doesMarginalExceedMaxValue ||
            newMarginalInputErrors.isMarginalGreaterError)
        ) {
          if (
            newMarginalInputErrors.doesGoodExceedMaxValue ||
            newMarginalInputErrors.doesMarginalExceedMaxValue
          ) {
            updateErrorState(
              `${rollupId} ${ChannelCapabilityErrorTypes.THRESHOLD_EXCEEDS_MAX}`,
              true,
              determineErrorReasonTextForThresholds(
                newMarginalInputErrors.doesGoodExceedMaxValue,
                newMarginalInputErrors.doesMarginalExceedMaxValue,
                false // don't want to include error text for marginalGreaterError
              )
            );
          }
          if (newMarginalInputErrors.isMarginalGreaterError) {
            updateErrorState(
              `${rollupId} ${ChannelCapabilityErrorTypes.MARGINAL_EXCEEDS_GOOD}`,
              true,
              determineErrorReasonTextForThresholds(
                false, // don't want to include error text for goodExceedsMaxValue
                false, // don't want to include error text for marginalExceedsMaxValue
                newMarginalInputErrors.isMarginalGreaterError
              )
            );
          }
        } else {
          updateErrorState(
            `${rollupId} ${ChannelCapabilityErrorTypes.THRESHOLD_EXCEEDS_MAX}`,
            false,
            ''
          );
          updateErrorState(
            `${rollupId} ${ChannelCapabilityErrorTypes.MARGINAL_EXCEEDS_GOOD}`,
            false,
            ''
          );
        }
      });
    },
    [
      determineErrorReasonTextForThresholds,
      determineThresholdsInputErrors,
      operatorType,
      rollupId,
      updateErrorState,
    ]
  );

  React.useEffect(() => {
    batch(() => {
      if (rollupType === RollupType.ROLLUP_OF_ROLLUPS) {
        let rollup: RollupEntry;
        let errorType: string = StationCapabilityErrorTypes.NO_ROLLUPS;
        let errorMessage: string;
        if (isStationGroupCapabilityRollup) {
          rollup = getRollupByDefaultAndId(
            defaultStationGroupCapabilityRollup,
            rollupId
          );
          errorType = StationGroupCapabilityErrorTypes.NO_ROLLUPS;
          errorMessage = `Must have one rollup included, go to ${AppSections.GROUP} ${groupName} ${AppSections.STATION_GROUP_CAPABILITY} and create a rollup entry`;
          // !This catches the case where a user has the app in no stations error state then switches rollupType to Rollup of rollups
          updateErrorState(
            `${rollupId} ${StationGroupCapabilityErrorTypes.NO_STATIONS}`,
            false,
            ''
          );
        } else if (isChannelCapability) {
          rollup = getRollupByDefaultAndId(
            defaultChannelCapabilityRollup[groupName][channelName],
            rollupId
          );
          errorType = ChannelCapabilityErrorTypes.NO_ROLLUPS;
          errorMessage = `Must have one rollup included, go to ${AppSections.GROUP} ${groupName} ${AppSections.CHANNEL_CAPABILITY} ${channelName} and create a rollup entry`;
          // !This catches the case where a user has the app in no monitors error state then switches rollupType to Rollup of rollups
          updateErrorState(
            `${rollupId} ${ChannelCapabilityErrorTypes.NO_MONITORS}`,
            false,
            ''
          );
        } else {
          rollup = getRollupByDefaultAndId(
            defaultStationCapabilityRollup[groupName],
            rollupId
          );
          errorMessage = `Must have one rollup included, go to ${AppSections.GROUP} ${groupName} ${AppSections.STATION_CAPABILITY} and create a rollup entry`;
          // !This catches the case where a user has the app in no channels error state then switches rollupType to Rollup of rollups
          updateErrorState(
            `${rollupId} ${StationCapabilityErrorTypes.NO_CHANNELS}`,
            false,
            ''
          );
        }
        if (!rollup.rollups || rollup.rollups.length === 0) {
          updateErrorState(`${rollupId} ${errorType}`, true, errorMessage);
        } else {
          updateErrorState(`${rollupId} ${errorType}`, false, '');
        }
      } else {
        updateErrorState(
          `${rollupId} ${SharedCapabilityErrorTypes.NO_ROLLUPS}`,
          false,
          ''
        );
      }
    });
  }, [
    channelName,
    defaultChannelCapabilityRollup,
    defaultStationCapabilityRollup,
    defaultStationGroupCapabilityRollup,
    groupName,
    isChannelCapability,
    isStationGroupCapabilityRollup,
    rollupId,
    rollupType,
    updateErrorState,
  ]);

  return (
    <div
      className={`${classes.header} ${hasErrors ? classes.errorBorder : ''}`}
    >
      <FormControl margin='none' className={classes.formControl}>
        <Autocomplete
          className={classes.formEntry}
          size={'small'}
          autoComplete
          disablePortal
          disableClearable
          id='#/properties/rollup-type'
          value={rollupType}
          options={rollupTypeOptions}
          onChange={(e, value) => {
            updateRollupStatus(value);
          }}
          renderInput={(params) => (
            <TextField {...params} label={'Rollup Type'} />
          )}
        />
      </FormControl>
      <FormControl margin='none' className={classes.formControl}>
        <Autocomplete
          className={classes.formEntry}
          size={'small'}
          autoComplete
          disablePortal
          disableClearable
          id='#/properties/operator-type'
          value={operatorType}
          options={operatorTypeOptions}
          onChange={(e, value) => {
            updateCapability(
              updateCapabilityOperatorType(
                rollupId,
                determineRollupToUse(),
                value
              )
            );
          }}
          renderInput={(params) => (
            <TextField {...params} label={'Operator Type'} />
          )}
        />
      </FormControl>
      <FormControl margin='none' className={classes.formControl}>
        <TextField
          className={classes.threshold}
          disabled={operatorType !== OperatorType.MIN_GOOD_OF}
          size={'small'}
          label={`Good threshold`}
          value={
            operatorType === OperatorType.MIN_GOOD_OF ? goodThreshold : 'N/A'
          }
          error={
            thresholdInputErrors.doesGoodExceedMaxValue ||
            thresholdInputErrors.isMarginalGreaterError
          }
          onChange={(e) => {
            // convert to string and remove leading 0s
            let value = e.currentTarget.value.toString();
            let isNumber = /^\d+$/.test(value);
            // checks if number and doesn't lead with 0s so input cannot be 01
            if (
              (isNumber && value === '0') ||
              (isNumber && !/^0+/.test(value))
            ) {
              updateErrors(value, marginalThreshold?.toString() ?? '');
              updateCapability(
                updateCapabilityGoodThreshold(
                  rollupId,
                  determineRollupToUse(),
                  e.target.value
                )
              );
            }
          }}
          onClickCapture={(e) => e.stopPropagation()}
        />
      </FormControl>
      <FormControl margin='none' className={classes.formControl}>
        <TextField
          className={classes.threshold}
          disabled={operatorType !== OperatorType.MIN_GOOD_OF}
          size={'small'}
          label={`Marginal threshold`}
          value={
            operatorType === OperatorType.MIN_GOOD_OF
              ? marginalThreshold
              : 'N/A'
          }
          error={
            thresholdInputErrors.doesMarginalExceedMaxValue ||
            thresholdInputErrors.isMarginalGreaterError
          }
          onChange={(e) => {
            let value = e.currentTarget.value.toString();
            let isNumber = /^\d+$/.test(value);
            // checks if number and doesn't lead with 0s so input cannot be 01
            if (
              (isNumber && value === '0') ||
              (isNumber && !/^0+/.test(value))
            ) {
              updateErrors(goodThreshold?.toLocaleString() ?? '', value);
              updateCapability(
                updateCapabilityMarginalThreshold(
                  rollupId,
                  determineRollupToUse(),
                  e.target.value
                )
              );
            }
          }}
          onClickCapture={(e) => e.stopPropagation()}
        />
      </FormControl>
    </div>
  );
};
