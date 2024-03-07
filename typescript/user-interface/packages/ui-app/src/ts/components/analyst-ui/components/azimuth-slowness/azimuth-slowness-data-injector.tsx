import { IanDisplays } from '@gms/common-model/lib/displays/types';
import { WithNonIdealStates } from '@gms/ui-core-components';
import type { SignalDetectionFetchResult } from '@gms/ui-state';
import {
  useAppSelector,
  useEffectiveTime,
  useEventStatusQuery,
  useGetAllStationsQuery,
  useGetChannelSegments,
  useGetEventsByTime,
  useGetProcessingAnalystConfigurationQuery,
  useGetSignalDetections,
  useQueryArgsForGetEventsWithDetectionsAndSegmentsByTime,
  useViewableInterval,
  useWorkflowQuery
} from '@gms/ui-state';
import React from 'react';

import { AnalystNonIdealStates } from '~analyst-ui/common/non-ideal-states';
import { BaseDisplay } from '~common-ui/components/base-display';
import { CommonNonIdealStateDefs } from '~common-ui/components/non-ideal-states';

import { AzimuthSlowness } from './azimuth-slowness-component';
import type { AzimuthSlownessProps } from './types';

interface AzimuthSlownessNonIdealStateProps extends Omit<AzimuthSlownessProps, 'signalDetections'> {
  signalDetectionResults: SignalDetectionFetchResult;
}

const AzimuthSlownessOrNonIdealState = WithNonIdealStates<
  AzimuthSlownessNonIdealStateProps,
  AzimuthSlownessProps
>(
  [
    ...CommonNonIdealStateDefs.baseNonIdealStateDefinitions,
    ...AnalystNonIdealStates.processingAnalystConfigNonIdealStateDefinitions,
    ...AnalystNonIdealStates.stationDefinitionNonIdealStateDefinitions,
    ...AnalystNonIdealStates.signalDetectionsNonIdealStateDefinitions
  ],
  AzimuthSlowness
);

export function AzimuthSlownessDataInjector(props: AzimuthSlownessProps) {
  const { glContainer } = props;
  const processingAnalystConfigurationQuery = useGetProcessingAnalystConfigurationQuery();
  const [viewableInterval] = useViewableInterval();
  const signalDetectionQuery = useGetSignalDetections(viewableInterval);
  const channelSegmentQuery = useGetChannelSegments(viewableInterval);
  const stationQuery = useGetAllStationsQuery(useEffectiveTime());
  const eventArgs = useQueryArgsForGetEventsWithDetectionsAndSegmentsByTime(viewableInterval);
  const eventQuery = useGetEventsByTime(eventArgs);
  const eventStatusQuery = useEventStatusQuery();
  const workflowQuery = useWorkflowQuery();
  const stageNames = React.useMemo(
    () => (workflowQuery.isSuccess ? workflowQuery.data?.stages.map(stage => stage.name) : []),
    [workflowQuery.isSuccess, workflowQuery.data?.stages]
  );
  const openIntervalName = useAppSelector(state => state.app.workflow.openIntervalName);
  return (
    <BaseDisplay
      tabName={IanDisplays.WAVEFORM}
      glContainer={glContainer}
      className="azimuth-slowness"
      data-cy="azimuth-slowness"
    >
      <AzimuthSlownessOrNonIdealState
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        signalDetectionResults={signalDetectionQuery}
        channelSegmentResults={channelSegmentQuery}
        stationsQuery={stationQuery}
        processingAnalystConfigurationQuery={processingAnalystConfigurationQuery}
        eventResults={eventQuery}
        eventStatusQuery={eventStatusQuery}
        stageNames={stageNames}
        openIntervalName={openIntervalName}
      />
    </BaseDisplay>
  );
}
