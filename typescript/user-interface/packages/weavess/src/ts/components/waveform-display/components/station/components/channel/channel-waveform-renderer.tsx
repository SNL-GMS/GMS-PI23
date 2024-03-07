import type { WeavessTypes } from '@gms/weavess-core';
import * as React from 'react';

import type { PositionConverters } from '../../../../../../util/types';
import type {
  AnimationFrameOptions,
  updateMeasureWindow as updateMeasureWindowFunction
} from '../../../../types';
import { MeasureWindowSelectionListener } from '../../../measure-window/measure-window-selection';
import { ContentRenderer } from './components/content-renderer/content-renderer';
import { WaveformRenderer } from './components/waveform-renderer/waveform-renderer';

/**
 * returns an object containing a description that should be displayed in the bottom right corner of the channel row,
 * along with setError to set isError: boolean, and errorMessage: string.
 *
 * If isError == true, description will be the error message, and a hover tooltip with additional error info will be added
 * If the channel already has a description, use that.
 * If all channel segments share a description, use that.
 * If channel segments have multiple descriptions, use 'mixed' as the description
 * and finally, uses undefined if there are no descriptions and there is no error.
 */
export function useDescription(
  channel: WeavessTypes.Channel,
  channelSegments: WeavessTypes.ChannelSegment[]
): {
  setError: (isError: boolean, errorMessage?: string) => void;
  description: string | WeavessTypes.ChannelDescription;
} {
  const [isError, setIsError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
  const setError = React.useCallback((isE: boolean, msg: string) => {
    setIsError(isE);
    setErrorMessage(msg);
  }, []);
  return React.useMemo(() => {
    if (isError) {
      return {
        setError,
        description: {
          isError,
          message:
            typeof channel.description === 'string'
              ? channel.description
              : channel.description.message,
          tooltipMessage: isError
            ? errorMessage ?? `Error! There was a problem rendering ${channel.name}`
            : undefined
        }
      };
    }
    if (channel.description) {
      return { setError, description: channel.description };
    }
    if (channelSegments.every(cs => cs.description === channelSegments[0]?.description)) {
      return { setError, description: channelSegments[0]?.description };
    }
    if (channelSegments.find(cs => cs.description != null)) {
      return { setError, description: 'mixed' };
    }
    return {
      setError,
      description: undefined
    };
  }, [channel.description, channel.name, channelSegments, errorMessage, isError, setError]);
}

/**
 * The type of the props for the {@link ChannelWaveformRenderer} component
 */
export interface ChannelWaveformRendererProps {
  canvasRef(): HTMLCanvasElement;
  channel: WeavessTypes.Channel;
  channelSegments: WeavessTypes.ChannelSegment[];
  contentRenderMouseDown;
  converters: PositionConverters;
  /** viewable interval plus its min/max offsets; full amount of data window */
  displayInterval: WeavessTypes.TimeRange;
  /** viewable time interval, the amount of data initially loaded into weavess (excluding offsets) */
  viewableInterval: WeavessTypes.TimeRange;
  events: WeavessTypes.ChannelEvents;
  getBoundaries(
    channelName: string,
    channelSegment?: WeavessTypes.ChannelSegment,
    timeRange?: WeavessTypes.TimeRange
  ): Promise<WeavessTypes.ChannelSegmentBoundaries>;
  getContentRenderer: (this: any, contentRenderer: any) => any[];
  getPositionBuffer(
    id: string,
    startTime: number,
    endTime: number,
    domainTimeRange: WeavessTypes.TimeRange
  ): Promise<Float32Array>;
  getSignalDetections: (signalDetections: WeavessTypes.PickMarker[]) => WeavessTypes.PickMarker[];
  getZoomRatio: () => number;
  glMax: number;
  glMin: number;
  height: number;
  initialConfiguration: WeavessTypes.Configuration;
  isDefaultChannel: boolean;
  isMeasureWindow: boolean;
  isMeasureWindowEnabled(): boolean;
  labelWidthPx: number;
  msrWindowWaveformAmplitudeScaleFactor?: number;
  numberOfRenderers: number;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onWaveformContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  onWaveformKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onWaveformMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
  renderWaveforms(options?: AnimationFrameOptions): void;
  selections: WeavessTypes.Selections;
  setWaveformContainerRef: (ref: HTMLDivElement) => void;
  setWaveformContentRendererRef: (ref: ContentRenderer) => void;
  setWaveformRendererRef: (ref: WaveformRenderer) => void;
  setWaveformYAxisBounds: (min: number, max: number) => void;
  stationId: string;
  toast: (message: string) => void;
  updateMeasureWindow: updateMeasureWindowFunction;
  updateMeasureWindowPanel: (
    timeRange: WeavessTypes.TimeRange,
    removeMeasureWindowSelection: () => void
  ) => void;
  waveform: WeavessTypes.ChannelWaveformContent;
  workerRpcs: any[];
}

/**
 * Renders the waveform content for the channel, including the measure window
 * selection listener, the ContentRenderer, and the waveform renderer
 */
// eslint-disable-next-line react/function-component-definition
export const InternalChannelWaveformRenderer: React.FC<ChannelWaveformRendererProps> = ({
  canvasRef,
  channel,
  channelSegments,
  contentRenderMouseDown,
  converters,
  displayInterval,
  viewableInterval,
  events,
  getBoundaries,
  getContentRenderer,
  getPositionBuffer,
  getSignalDetections,
  getZoomRatio,
  glMax,
  glMin,
  height,
  initialConfiguration,
  isDefaultChannel,
  isMeasureWindow,
  isMeasureWindowEnabled,
  labelWidthPx,
  msrWindowWaveformAmplitudeScaleFactor,
  numberOfRenderers,
  onMouseMove,
  onWaveformContextMenu,
  onWaveformKeyDown,
  onWaveformMouseUp,
  renderWaveforms,
  selections,
  setWaveformContainerRef,
  setWaveformContentRendererRef,
  setWaveformRendererRef,
  setWaveformYAxisBounds,
  stationId,
  toast,
  updateMeasureWindow,
  updateMeasureWindowPanel,
  waveform,
  workerRpcs
}: ChannelWaveformRendererProps) => {
  const { description, setError } = useDescription(channel, channelSegments);
  const onSetAmplitude = React.useCallback(
    (
      channelId: string,
      channelSegmentBounds: WeavessTypes.ChannelSegmentBoundaries,
      measureWindow: boolean
    ) => {
      return events?.onSetAmplitude
        ? events?.onSetAmplitude(channelId, channelSegmentBounds, measureWindow)
        : undefined;
    },
    [events]
  );
  const renderMeasureWindowSelectionChildren = React.useCallback(
    ({ contentRenderer, onMouseDown }) => {
      return (
        <div
          className="channel-content-container"
          key={`channel-segment-${waveform.channelSegmentId}`}
          ref={setWaveformContainerRef}
          style={{
            height: `${height / numberOfRenderers}px`,
            width: `calc(100% - ${labelWidthPx}px)`,
            left: `${labelWidthPx}px`
          }}
        >
          <ContentRenderer
            ref={setWaveformContentRendererRef}
            canvasRef={canvasRef}
            converters={converters}
            displayInterval={displayInterval}
            initialConfiguration={initialConfiguration}
            isDefaultChannel={isDefaultChannel}
            renderWaveforms={renderWaveforms}
            selections={selections}
            stationId={stationId}
            workerRpcs={workerRpcs}
            getZoomRatio={getZoomRatio}
            updateMeasureWindow={updateMeasureWindow}
            contentRenderers={getContentRenderer(contentRenderer)}
            channelId={channel.id}
            description={description}
            descriptionLabelColor={channelSegments[0]?.descriptionLabelColor}
            signalDetections={getSignalDetections(waveform.signalDetections)}
            predictedPhases={waveform?.predictedPhases}
            theoreticalPhaseWindows={waveform?.theoreticalPhaseWindows}
            markers={waveform?.markers}
            events={events?.events}
            onContextMenu={onWaveformContextMenu}
            onMouseMove={onMouseMove}
            onMouseDown={contentRenderMouseDown(onMouseDown)}
            onMouseUp={onWaveformMouseUp}
            onKeyDown={onWaveformKeyDown}
          />
          <WaveformRenderer
            ref={setWaveformRendererRef}
            displayInterval={displayInterval}
            viewableInterval={viewableInterval}
            glMax={glMax}
            glMin={glMin}
            onSetAmplitude={onSetAmplitude}
            renderWaveforms={renderWaveforms}
            workerRpcs={workerRpcs}
            initialConfiguration={initialConfiguration}
            getPositionBuffer={getPositionBuffer}
            getBoundaries={getBoundaries}
            channelName={channel.id}
            defaultRange={channel.defaultRange}
            channelSegmentId={waveform.channelSegmentId ?? ''}
            channelSegmentsRecord={waveform.channelSegmentsRecord ?? {}}
            masks={waveform?.masks}
            setYAxisBounds={setWaveformYAxisBounds}
            msrWindowWaveformAmplitudeScaleFactor={msrWindowWaveformAmplitudeScaleFactor}
            isMeasureWindow={isMeasureWindow}
            channelOffset={channel.timeOffsetSeconds}
            setError={setError}
          />
        </div>
      );
    },
    [
      waveform.channelSegmentId,
      waveform.signalDetections,
      waveform?.predictedPhases,
      waveform?.theoreticalPhaseWindows,
      waveform?.markers,
      waveform.channelSegmentsRecord,
      waveform?.masks,
      setWaveformContainerRef,
      height,
      numberOfRenderers,
      labelWidthPx,
      setWaveformContentRendererRef,
      canvasRef,
      converters,
      displayInterval,
      viewableInterval,
      channel.timeOffsetSeconds,
      channel.id,
      channel.defaultRange,
      initialConfiguration,
      isDefaultChannel,
      renderWaveforms,
      selections,
      stationId,
      workerRpcs,
      getZoomRatio,
      updateMeasureWindow,
      getContentRenderer,
      description,
      channelSegments,
      getSignalDetections,
      events?.events,
      onWaveformContextMenu,
      onMouseMove,
      contentRenderMouseDown,
      onWaveformMouseUp,
      onWaveformKeyDown,
      setWaveformRendererRef,
      glMax,
      glMin,
      onSetAmplitude,
      getPositionBuffer,
      getBoundaries,
      setWaveformYAxisBounds,
      msrWindowWaveformAmplitudeScaleFactor,
      isMeasureWindow,
      setError
    ]
  );

  if (!waveform) {
    return null;
  }

  return (
    <MeasureWindowSelectionListener
      displayInterval={displayInterval}
      offsetSecs={channel.timeOffsetSeconds}
      hotKeys={initialConfiguration.hotKeys}
      isMeasureWindowEnabled={isMeasureWindowEnabled}
      // eslint-disable-next-line @typescript-eslint/unbound-method
      computeTimeSecsFromMouseXPixels={converters.computeTimeSecsFromMouseXPixels}
      toast={toast}
      updateMeasureWindowPanel={updateMeasureWindowPanel}
    >
      {renderMeasureWindowSelectionChildren}
    </MeasureWindowSelectionListener>
  );
};

export const ChannelWaveformRenderer = React.memo(InternalChannelWaveformRenderer);
