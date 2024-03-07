/* eslint-disable react/destructuring-assignment */
import { IanDisplays } from '@gms/common-model/lib/displays/types';
import { WithNonIdealStates } from '@gms/ui-core-components';
import type { SignalDetectionFetchResult } from '@gms/ui-state';
import {
  useBaseStationTime,
  useChannels,
  useEventStatusQuery,
  useFilterQueue,
  useGetAssociatedEvents,
  useGetChannelSegments,
  useGetEvents,
  useGetProcessingAnalystConfigurationQuery,
  useGetSignalDetections,
  useMaximumOffset,
  useMinimumOffset,
  usePan,
  useSelectedFilterList,
  useShouldShowPredictedPhases,
  useShouldShowTimeUncertainty,
  useStationsAssociatedWithCurrentOpenEvent,
  useStationsVisibility,
  useUiTheme,
  useViewableInterval,
  useWorkflowIntervalUniqueId,
  useZoomInterval
} from '@gms/ui-state';
import type { Weavess } from '@gms/weavess';
import flatMap from 'lodash/flatMap';
import React from 'react';

import { AnalystNonIdealStates } from '~analyst-ui/common/non-ideal-states';
import {
  getDistanceToStationsForPreferredLocationSolutionId,
  memoizedLocationToEventAzimuth,
  memoizedLocationToEventDistance
} from '~analyst-ui/common/utils/event-util';
import { BaseDisplay } from '~common-ui/components/base-display';
import { CommonNonIdealStateDefs } from '~common-ui/components/non-ideal-states';

import { useToggleQcMaskVisibilityHotkey } from './components/waveform-controls/qc-mask-control';
import type { WaveformComponentProps, WaveformDisplayProps } from './types';
import {
  useFeaturePredictionQueryByLocationForWaveformDisplay,
  useMaskVisibility,
  useOnWeavessMount,
  useProcessingMaskForWaveformDisplay,
  useQcMasksForWaveformDisplay,
  useWaveformOffsets,
  useWaveformStations
} from './waveform-hooks';
import { WaveformPanel } from './waveform-panel';
import { WeavessContext } from './weavess-context';
import * as WaveformUtil from './weavess-stations-util';

interface WaveformNonIdealStateProps extends Omit<WaveformDisplayProps, 'signalDetections'> {
  signalDetectionResults: SignalDetectionFetchResult;
}

export function WaveformComponentScopedHotKeys(props: WaveformDisplayProps) {
  const toggleQcMaskVisibilityHotkeyRef = useToggleQcMaskVisibilityHotkey();
  useFilterQueue();

  return (
    <div
      ref={toggleQcMaskVisibilityHotkeyRef as any}
      style={{ height: '100%' }}
      role="tab"
      tabIndex={-1}
    >
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <WaveformPanel {...props} />
    </div>
  );
}

const WaveformOrNonIdealState = WithNonIdealStates<
  WaveformNonIdealStateProps,
  WaveformDisplayProps
>(
  [
    ...CommonNonIdealStateDefs.baseNonIdealStateDefinitions,
    ...AnalystNonIdealStates.processingAnalystConfigNonIdealStateDefinitions,
    ...AnalystNonIdealStates.timeRangeNonIdealStateDefinitions('waveforms', 'currentTimeInterval'),
    ...AnalystNonIdealStates.stationDefinitionNonIdealStateDefinitions,
    ...AnalystNonIdealStates.signalDetectionsNonIdealStateDefinitions,
    ...AnalystNonIdealStates.waveformIntervalsNonIdealStateDefinitions
  ],
  WaveformComponentScopedHotKeys
);

export function WaveformComponent(props: WaveformComponentProps) {
  const processingAnalystConfiguration = useGetProcessingAnalystConfigurationQuery();
  const stationDefResult = useWaveformStations();

  const maskVisibility = useMaskVisibility();

  const [uiTheme] = useUiTheme();
  // Use state rather than a ref because we want things to rerender when this updates.
  const [weavessInstance, setWeavessInstance] = React.useState<Weavess>();

  const [viewableInterval, setViewableInterval] = useViewableInterval();
  const [maximumOffset, setMaximumOffset] = useMaximumOffset();
  const [minimumOffset, setMinimumOffset] = useMinimumOffset();
  const [baseStationTime, setBaseStationTime] = useBaseStationTime();
  const [zoomInterval, setZoomInterval] = useZoomInterval();
  const pan = usePan();

  const stationsVisibilityProps = useStationsVisibility();
  const [shouldShowTimeUncertainty, setShouldShowTimeUncertainty] = useShouldShowTimeUncertainty();
  const [shouldShowPredictedPhases, setShouldShowPredictedPhases] = useShouldShowPredictedPhases();

  const signalDetectionResults = useGetSignalDetections(viewableInterval);
  const channelSegmentResults = useGetChannelSegments(viewableInterval);
  const eventResults = useGetEvents();
  const associatedEventResults = useGetAssociatedEvents();
  const eventStatusQuery = useEventStatusQuery();

  const filterList = useSelectedFilterList();
  const offsets = useWaveformOffsets();

  const [stationsAssociatedWithCurrentOpenEvent] = useStationsAssociatedWithCurrentOpenEvent();

  React.useEffect(() => {
    memoizedLocationToEventDistance.clear();
    memoizedLocationToEventAzimuth.clear();
  }, [props.currentOpenEventId]);

  const populatedChannels = useChannels();

  const currentOpenEvent = eventResults.data?.find(event => event.id === props.currentOpenEventId);
  const distances = React.useMemo(() => {
    return getDistanceToStationsForPreferredLocationSolutionId(
      currentOpenEvent,
      stationDefResult.data,
      props.currentStageName,
      signalDetectionResults.data,
      populatedChannels
    );
  }, [
    currentOpenEvent,
    populatedChannels,
    props.currentStageName,
    signalDetectionResults.data,
    stationDefResult.data
  ]);

  // Memoize for now so result is referentially stable. Eventually, when we get redux data, it should be stable.
  const qcMaskQueryResult = React.useMemo(() => ({ data: [] }), []);

  const qcSegments = useQcMasksForWaveformDisplay();
  const processingMask = useProcessingMaskForWaveformDisplay(signalDetectionResults);
  const featurePredictionQuery = useFeaturePredictionQueryByLocationForWaveformDisplay(
    eventResults,
    props.currentOpenEventId,
    props.phaseToAlignOn
  );

  const alignablePhases = React.useMemo(() => {
    if (featurePredictionQuery.data?.receiverLocationsByName) {
      return WaveformUtil.getAlignablePhases(
        flatMap(
          Object.values(featurePredictionQuery.data?.receiverLocationsByName).map(
            response => response.featurePredictions
          )
        )
      );
    }
    return [];
  }, [featurePredictionQuery.data?.receiverLocationsByName]);

  const weavessContextValue = React.useMemo(
    () => ({
      weavessRef: weavessInstance,
      setWeavessRef: setWeavessInstance
    }),
    [weavessInstance]
  );

  const onWeavessMount = useOnWeavessMount();

  return (
    <BaseDisplay
      key={useWorkflowIntervalUniqueId()}
      tabName={IanDisplays.WAVEFORM}
      glContainer={props.glContainer}
      className="waveform-display-window gms-body-text"
      data-cy="waveform-display-window"
    >
      <WeavessContext.Provider value={weavessContextValue}>
        <WaveformOrNonIdealState
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...props}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...stationsVisibilityProps}
          processingAnalystConfigurationQuery={processingAnalystConfiguration}
          featurePredictionQuery={featurePredictionQuery}
          qcMaskQuery={qcMaskQueryResult}
          qcSegments={qcSegments.data}
          processingMask={processingMask}
          maskVisibility={maskVisibility}
          stationsQuery={stationDefResult}
          events={(eventResults.data, associatedEventResults.data)}
          eventStatuses={eventStatusQuery.data}
          signalDetectionResults={signalDetectionResults}
          channelSegments={channelSegmentResults.data}
          viewableInterval={viewableInterval}
          setViewableInterval={setViewableInterval}
          maximumOffset={maximumOffset}
          setMaximumOffset={setMaximumOffset}
          minimumOffset={minimumOffset}
          setMinimumOffset={setMinimumOffset}
          baseStationTime={baseStationTime}
          setBaseStationTime={setBaseStationTime}
          pan={pan}
          zoomInterval={zoomInterval}
          setZoomInterval={setZoomInterval}
          shouldShowTimeUncertainty={shouldShowTimeUncertainty}
          setShouldShowTimeUncertainty={setShouldShowTimeUncertainty}
          shouldShowPredictedPhases={shouldShowPredictedPhases}
          setShouldShowPredictedPhases={setShouldShowPredictedPhases}
          uiTheme={uiTheme}
          alignablePhases={alignablePhases}
          onWeavessMount={onWeavessMount}
          distances={distances}
          stationsAssociatedWithCurrentOpenEvent={stationsAssociatedWithCurrentOpenEvent}
          offsets={offsets}
          filterList={filterList}
        />
      </WeavessContext.Provider>
    </BaseDisplay>
  );
}
