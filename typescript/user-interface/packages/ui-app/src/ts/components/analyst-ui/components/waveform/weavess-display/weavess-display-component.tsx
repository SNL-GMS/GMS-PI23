/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable class-methods-use-this */
/* eslint-disable react/destructuring-assignment */
import { ContextMenu, NonIdealState } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { CommonTypes, QcMaskTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import type { QcSegment } from '@gms/common-model/lib/qc-segment';
import { QcSegmentCategory } from '@gms/common-model/lib/qc-segment';
import { AnalystWorkspaceTypes, getBoundaries, getPositionBuffer } from '@gms/ui-state';
import { addGlUpdateOnResize, addGlUpdateOnShow, UILogger } from '@gms/ui-util';
import { Weavess } from '@gms/weavess';
import { WeavessMessages, WeavessTypes, WeavessUtil } from '@gms/weavess-core';
import Immutable from 'immutable';
import difference from 'lodash/difference';
import flatMap from 'lodash/flatMap';
import includes from 'lodash/includes';
import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';
import union from 'lodash/union';
import memoizeOne from 'memoize-one';
import React from 'react';
import { toast } from 'react-toastify';

import { setPhaseContextMenu } from '~analyst-ui/common/menus/signal-detection-context-menu';
import type {
  SignalDetectionContextMenusCallbacks,
  SignalDetectionContextMenusGetOpenCallbackFunc
} from '~analyst-ui/common/menus/signal-detection-context-menus';
import { SignalDetectionContextMenus } from '~analyst-ui/common/menus/signal-detection-context-menus';
import { getSignalDetectionAssociationStatus } from '~analyst-ui/common/utils/event-util';
import {
  getAssocStatusColor,
  getAssocStatusString
} from '~analyst-ui/common/utils/signal-detection-util';
import { systemConfig } from '~analyst-ui/config/system-config';
import { gmsColors } from '~scss-config/color-preferences';

import type { FixedScaleValue } from '../components/waveform-controls/scaling-options';
import { AmplitudeScalingOptions } from '../components/waveform-controls/scaling-options';
import type {
  QcContextMenuCallbacks,
  QcContextMenuGetOpenCallbackFunc
} from '../quality-control/qc-context-menus';
import { QcContextMenus } from '../quality-control/qc-context-menus';
import { QcMaskDialogBoxType } from '../quality-control/types';
import type { WeavessContextData } from '../weavess-context';
import { WeavessContext } from '../weavess-context';
import { getBoundaryCacheKey } from './get-boundary-util';
import type { WeavessDisplayProps, WeavessDisplayState } from './types';

const logger = UILogger.create('GMS_LOG_WAVEFORM', process.env.GMS_LOG_WAVEFORM);

const ENABLE_SD_DRAG = false;

/**
 * Primary waveform display component.
 */
export class WeavessDisplayComponent extends React.PureComponent<
  WeavessDisplayProps,
  WeavessDisplayState
> {
  /** The type of the Weavess context, so this component knows how it's typed */
  public static readonly contextType: React.Context<WeavessContextData> = WeavessContext;

  /** The Weavess context. We store a ref to our Weavess instance in here. */
  public declare readonly context: React.ContextType<typeof WeavessContext>;

  private readonly weavessEventHandlers: WeavessTypes.Events;

  /**
   * For each channel, the last boundaries object that was computed.
   */
  private lastBoundaries: Immutable.Map<string, WeavessTypes.ChannelSegmentBoundaries>;

  /**
   * When scaleAllChannelsToThis scale option is selected
   */
  private scaleAllChannelsToThisBoundaries: WeavessTypes.ChannelSegmentBoundaries | undefined;

  /**
   * The callback functions for opening the QC context menus (popups).
   */
  private qcContextMenuCb: QcContextMenuCallbacks;

  /**
   * The callback functions for opening the Signal Detection context menus (popups).
   */
  private signalDetectionContextMenusCb: SignalDetectionContextMenusCallbacks;

  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Constructor.
   *
   * @param props The initial props
   */
  public constructor(props: WeavessDisplayProps) {
    super(props);
    this.state = {
      qcSegmentModifyInterval: undefined,
      selectedQcSegment: undefined,
      selectionRangeAnchor: undefined
    };
    this.weavessEventHandlers = this.buildDefaultWeavessEventHandlers();
    this.lastBoundaries = Immutable.Map();
    this.updateWeavessEventHandlers();
  }

  /**
   * Invoked when the component mounted.
   */
  public componentDidMount(): void {
    const callback = () => {
      this.forceUpdate();
      this.refresh();
    };
    addGlUpdateOnShow(this.props.glContainer, callback);
    addGlUpdateOnResize(this.props.glContainer, callback);
  }

  // ***************************************
  // END REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * Refreshes the WEAVESS display.
   * This function is helpful when the window resizes to ensure
   * that the current zoom display is maintained.
   */
  // eslint-disable-next-line react/sort-comp
  public readonly refresh = (): void => {
    if (this.context.weavessRef) {
      this.context.weavessRef.refresh();
    }
  };

  /**
   * Sets the Selected Station Id's and the Sd Id's
   */
  private readonly setSelectedStationAndSdIds = () => {
    this.props.setSelectedStationIds([]);
    this.props.setSelectedSdIds([]);
  };

  /**
   * When escape key is pressed, teh listener is removed and QC Mask is deselected
   */
  private readonly escapeKeyActions = () => {
    if (this.state.selectedQcSegment) {
      document.body.removeEventListener('click', this.onBodyClick, {
        capture: true
      });
      this.deselectQcSegment();
    }
  };

  /**
   * Event handler for when a key is pressed
   *
   * @param e mouse event as React.MouseEvent<HTMLDivElement>
   * @param clientX x location of where the key was pressed
   * @param clientY y location of where the key was pressed
   * @param channelName a channel name as a string
   * @param timeSecs epoch seconds of where the key was pressed in respect to the data
   */
  // eslint-disable-next-line complexity
  public readonly onKeyPress = (
    e: React.KeyboardEvent<HTMLDivElement>,
    clientX: number,
    clientY: number
  ): void => {
    if (e.key === 'Escape') {
      this.escapeKeyActions();
      this.setSelectedStationAndSdIds();
    } else if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'p':
          e.preventDefault();
          if (clientX && clientY) {
            const sds = this.props.signalDetections?.filter(sd =>
              includes(this.props.selectedSdIds, sd.id)
            );
            const openEvent = this.props.events.find(
              event => this.props.currentOpenEventId === event.id
            );
            // TODO: Read signal detection check
            // && !isInConflictAndNotAssociatedToOpenEvent(sds, openEvent)
            if (sds && openEvent) {
              // testing sonarqube
              this.showRephaseMenu(clientX, clientY);
            } else {
              toast.info(WeavessMessages.signalDetectionInConflict);
            }
          }
          return;
        case 'f':
          this.markSelectedSignalDetectionsToShowFk();
          return;
        case 'a':
          this.selectAllParentChannels();
          break;
        default:
        // do nothing
      }
    }
  };

  private readonly updateWeavessEventHandlers = () => {
    merge(this.weavessEventHandlers, this.props.weavessProps.events);
  };

  /**
   * Callback function, used when the amplitude has been set by Weavess.
   * This function to updates the lastBoundaries cache when amplitude scaling.
   *
   * @param channelId used to generate a key for this particular cached bounds
   * @param channelSegmentBounds the bounds to be cached
   * @param isMeasureWindow true if the bounds are being applied to a measure window
   */
  private readonly onSetAmplitude = (
    channelId: string,
    channelSegmentBounds: WeavessTypes.ChannelSegmentBoundaries,
    isMeasureWindow: boolean
  ) => {
    if (
      channelSegmentBounds.topMax !== undefined &&
      channelSegmentBounds.bottomMax !== undefined &&
      channelSegmentBounds.offset !== undefined
    ) {
      this.lastBoundaries = this.lastBoundaries.set(
        getBoundaryCacheKey(channelId, isMeasureWindow),
        channelSegmentBounds
      );
    }
  };

  /**
   * Returns the default weavess default channel event handlers.
   */
  private readonly buildDefaultWeavessDefaultChannelEventHandlers = (): WeavessTypes.ChannelEvents => ({
    labelEvents: {
      onChannelExpanded: this.onChannelExpanded,
      onChannelCollapsed: this.onChannelCollapsed,
      onChannelLabelClick: this.onChannelLabelClick
    },
    events: {
      onContextMenu: this.onContextMenu,
      onChannelClick: this.onChannelClick,
      onSignalDetectionContextMenu: this.onSignalDetectionContextMenu,
      onSignalDetectionClick: this.onSignalDetectionClick,
      onMaskClick: undefined,
      onMaskContextClick: undefined,
      onMaskCreateDragEnd: undefined,
      onSignalDetectionDragEnd: undefined,
      onMeasureWindowUpdated: this.onMeasureWindowUpdated,
      onUpdateMarker: this.onUpdateChannelMarker,
      onUpdateSelectionWindow: this.onUpdateChannelSelectionWindow,
      onClickSelectionWindow: this.onClickChannelSelectionWindow
    },
    onKeyPress: this.onKeyPress,
    onSetAmplitude: this.onSetAmplitude
  });

  /**
   * Returns the default weavess non-default channel event handlers.
   */
  private readonly buildDefaultWeavessNonDefaultChannelEventHandlers = (): WeavessTypes.ChannelEvents => ({
    labelEvents: {
      onChannelExpanded: this.onChannelExpanded,
      onChannelCollapsed: this.onChannelCollapsed,
      onChannelLabelClick: this.onChannelLabelClick
    },
    events: {
      onContextMenu: this.onContextMenu,
      onChannelClick: this.onChannelClick,
      onSignalDetectionContextMenu: this.onSignalDetectionContextMenu,
      onSignalDetectionClick: this.onSignalDetectionClick,
      onSignalDetectionDragEnd: this.onSignalDetectionDragEnd,
      onMaskClick: this.onMaskClick,
      onMaskContextClick: this.onMaskContextClick,
      onMaskCreateDragEnd: this.onMaskCreateDragEnd,
      onMeasureWindowUpdated: this.onMeasureWindowUpdated,
      onUpdateMarker: this.onUpdateChannelMarker,
      onUpdateSelectionWindow: this.onUpdateChannelSelectionWindow
    },
    onKeyPress: this.onKeyPress,
    onSetAmplitude: this.onSetAmplitude
  });

  /**
   * Returns the default weavess event handler definitions.
   */
  private readonly buildDefaultWeavessEventHandlers = (): WeavessTypes.Events => ({
    stationEvents: {
      defaultChannelEvents: this.buildDefaultWeavessDefaultChannelEventHandlers(),
      nonDefaultChannelEvents: this.buildDefaultWeavessNonDefaultChannelEventHandlers()
    },
    onUpdateMarker: this.onUpdateMarker,
    onUpdateSelectionWindow: this.onUpdateSelectionWindow
  });

  /**
   * set mask if not rejected
   *
   * @param qcSegment qc mask
   */
  private readonly setSelectedQcSegment = (qcSegment: QcSegment): void => {
    const version = qcSegment.versionHistory[qcSegment.versionHistory.length - 1];
    if (version.rejected) {
      toast.warn('Cannot modify a rejected mask');
      return;
    }

    if (this.state.selectedQcSegment === undefined || this.state.selectedQcSegment === null) {
      const qcMaskModifyInterval: CommonTypes.TimeRange = {
        startTimeSecs: version.startTime,
        endTimeSecs: version.endTime
      };
      // Selects the mask's channel
      this.props.setSelectedStationIds([qcSegment.channel.name]);
      this.setState({
        qcSegmentModifyInterval: qcMaskModifyInterval,
        selectedQcSegment: qcSegment
      });
      // Listens for clicks and ends the interactive mask modification if another part of the UI is clicked
      const delayMs = 200;
      setTimeout(() => {
        document.body.addEventListener('click', this.onBodyClick, {
          capture: true,
          once: true
        });
      }, delayMs);
    }
  };

  /**
   * Event handler for clicking on mask
   *
   * @param event mouse event as React.MouseEvent<HTMLDivElement>
   * @param channelName a channel name as a string
   * @param maskId mask Ids as a string array
   * @param maskCreateHotKey (optional) indicates a hotkey is pressed
   */
  private readonly onMaskClick = (
    event: React.MouseEvent<HTMLDivElement>,
    channelName: string,
    masks: string[],
    maskCreateHotKey?: boolean,
    viewQcSegmentHotKey?: boolean
  ) => {
    this.showQcSegmentContextMenu(event, channelName, masks, maskCreateHotKey, viewQcSegmentHotKey);
  };

  /**
   * Event handler for updating markers value
   *
   * @param marker the marker
   */
  private readonly onUpdateMarker = (): void => {
    /* no-op */
  };

  /**
   * Event handler for updating selections value
   *
   * @param selection the selection
   */
  private readonly onUpdateSelectionWindow = (selection: WeavessTypes.SelectionWindow) => {
    const newStartTime = selection.startMarker.timeSecs;
    const newEndTime = selection.endMarker.timeSecs;

    // handle qc mask modification selection
    if (selection.id === 'selection-qc-mask-modify') {
      const analystDefined = Object.keys(QcSegmentCategory).find(
        k => QcSegmentCategory[k] === QcSegmentCategory.ANALYST_DEFINED
      );
      if (this.state.selectedQcSegment) {
        const version = this.state.selectedQcSegment.versionHistory[
          this.state.selectedQcSegment.versionHistory.length - 1
        ];
        // Sets new time range and mask category to ANALYST_DEFINED
        const qcInput: QcMaskTypes.QcMaskInput = {
          timeRange: {
            startTimeSecs: newStartTime,
            endTimeSecs: newEndTime
          },
          category: analystDefined,
          type: version.type,
          rationale: version.rationale
        };
        const type = QcMaskDialogBoxType.Modify;
        const newInterval: CommonTypes.TimeRange = {
          startTimeSecs: newStartTime,
          endTimeSecs: newEndTime
        };
        // Must set the modifyInterval or else old values stick around unpredictably
        this.setState({ qcSegmentModifyInterval: newInterval });
        this.handleQcMaskMutation(type, this.state.selectedQcSegment.id, qcInput);
      }
    }
  };

  /**
   * Event handler for updating markers value
   *
   * @param id the unique channel name of the channel
   * @param marker the marker
   */
  private readonly onUpdateChannelMarker = () => {
    /* no-op */
  };

  /**
   * Event handler for updating selections value to handle amplitude measurement changes
   *
   * @param id the unique channel id of the channel
   * @param selection the selection
   */
  private readonly onUpdateChannelSelectionWindow = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selection: WeavessTypes.SelectionWindow
  ) => {
    // TODO: Legacy this method updated the amplitude for selected signal detection
    throw new Error(`Weavess Component onUpdateChannelSelectionWindow not yet implemented`);
  };

  /**
   * Event handler for click events within a selection to handle amplitude measurement changes
   *
   * @param id the unique channel id of the channel
   * @param selection the selection
   * @param timeSecs epoch seconds of where drag ended in respect to the data
   */
  // eslint-disable-next-line complexity
  private readonly onClickChannelSelectionWindow = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selection: WeavessTypes.SelectionWindow,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    timeSecs: number
  ) => {
    // TODO: Legacy this method updated the amplitude for selected signal detection
    throw new Error(`Weavess Component onClickChannelSelectionWindow not yet implemented`);
  };

  /**
   * Listens for clicks and ends the interactive mask modification if
   * another part of the UI is clicked.
   */
  private readonly onBodyClick = (event: any): void => {
    // Ignore clicks within the modification widget
    if (
      event.target.className === 'selection-window-selection' ||
      event.target.className === 'moveable-marker' ||
      event.target.className === 'selection-window'
    ) {
      document.body.addEventListener('click', this.onBodyClick, {
        capture: true,
        once: true
      });
    } else {
      this.deselectQcSegment();
    }
  };

  /**
   * Deselects all QC segments.
   */
  private readonly deselectQcSegment = () => {
    if (this.state.qcSegmentModifyInterval && this.state.selectedQcSegment) {
      this.setState({
        qcSegmentModifyInterval: undefined,
        selectedQcSegment: undefined
      });
      this.props.setSelectedStationIds([]);
    }
  };

  /**
   * Generates a function that creates fixed boundaries using the given scale. Referentially stable for any given fixedScaleVal.
   *
   * @param fixedScaleVal the boundary scale to use
   * @returns the getFixedBoundaries function, pinned to the given scale
   */
  private readonly getFixedBoundariesGenerator = memoizeOne((fixedScaleVal: FixedScaleValue) => {
    let getFixedBoundaries: (
      id: string,
      channelSegment?: WeavessTypes.ChannelSegment,
      timeRange?: WeavessTypes.TimeRange,
      isMeasureWindow?: boolean
    ) => Promise<WeavessTypes.ChannelSegmentBoundaries>;
    if (typeof fixedScaleVal === 'number') {
      /**
       * Generate a boundaries object based on the hardcoded fixedScaleVal
       *
       * @param id the channel id
       * @param _ the channel segment (unused)
       * @param __ the time range (unused)
       * @param isMeasureWindow whether this is for the measure window or not.
       * Measure window bounds are cached independently of another channel segment with the same name.
       * Defaults to false.
       * @returns a boundaries object
       */
      getFixedBoundaries = async (id: string): Promise<WeavessTypes.ChannelSegmentBoundaries> => {
        const bounds = {
          channelSegmentId: id,
          samplesCount: -1,
          topMax: fixedScaleVal,
          channelAvg: 0,
          bottomMax: -fixedScaleVal,
          offset: fixedScaleVal
        };
        return Promise.resolve(bounds);
      };
    } else {
      /**
       * Generate a boundaries object based on the min and max values within the provided time range, or the
       * currently visible range, if none is provided.
       *
       * @param id the channel id
       * @param channelSegment the channel segment for which to get the boundaries
       * @param timeRange the time range for which to get the bounds
       * @param isMeasureWindow whether this is for the measure window or not.
       * Measure window bounds are cached independently of another channel segment with the same name.
       * Defaults to false.
       * @returns a boundaries object
       */
      getFixedBoundaries = async (
        id: string,
        channelSegment: WeavessTypes.ChannelSegment,
        timeRange?: WeavessTypes.TimeRange,
        isMeasureWindow = false
      ): Promise<WeavessTypes.ChannelSegmentBoundaries> => {
        // Check if we have a boundary valid for this time range
        if (
          timeRange &&
          !WeavessUtil.doTimeRangesOverlap(
            WeavessUtil.getTimeRangeFromChannelSegment(channelSegment),
            timeRange
          )
        ) {
          return Promise.resolve(undefined);
        }
        const bounds = this.lastBoundaries.get(getBoundaryCacheKey(id, isMeasureWindow));
        // If fixed bounds don't exist yet, use auto-scale
        return bounds
          ? Promise.resolve(bounds)
          : this.getWindowedBoundaries(id, channelSegment, timeRange);
      };
    }
    return getFixedBoundaries;
  });

  /**
   * Generate a boundaries object based on the waveform data in the given channel segment.
   *
   * @param id the channel id
   * @param channelSegment the channel segment to generate boundaries for
   * @param timeRange the start and end times for which to get boundaries.
   * Default to the current view time range if not defined.
   * @returns a boundaries object
   */
  private readonly getWindowedBoundaries = async (
    id: string,
    channelSegment: WeavessTypes.ChannelSegment,
    timeRange?: WeavessTypes.TimeRange
  ): Promise<WeavessTypes.ChannelSegmentBoundaries> => {
    const currentZoomInterval = this.context.weavessRef?.waveformPanelRef?.getCurrentZoomInterval();
    return getBoundaries(
      channelSegment,
      timeRange?.startTimeSecs ?? currentZoomInterval.startTimeSecs,
      timeRange?.endTimeSecs ?? currentZoomInterval.endTimeSecs
    );
  };

  /**
   * Generate a boundaries object based on scaleAllChannelsToThisBoundaries override being set.
   *
   * @param id the channel id
   * @param channelSegment the channel segment to generate boundaries for
   * @param timeRange the start and end times for which to get boundaries.
   * Default to the current view time range if not defined.
   * @returns a boundaries object
   */
  private readonly getScaleAllChannelsToThisChannelBounds = async (
    id: string,
    channelSegment: WeavessTypes.ChannelSegment,
    timeRange?: WeavessTypes.TimeRange
  ): Promise<WeavessTypes.ChannelSegmentBoundaries> => {
    const currentZoomInterval = this.context.weavessRef?.waveformPanelRef?.getCurrentZoomInterval();
    const boundaries = await getBoundaries(
      channelSegment,
      timeRange?.startTimeSecs ?? currentZoomInterval.startTimeSecs,
      timeRange?.endTimeSecs ?? currentZoomInterval.endTimeSecs
    );

    if (!boundaries) {
      return undefined;
    }
    const scaleAllBoundaries: WeavessTypes.ChannelSegmentBoundaries = {
      topMax: this.scaleAllChannelsToThisBoundaries.topMax,
      bottomMax: this.scaleAllChannelsToThisBoundaries.bottomMax,
      offset: this.scaleAllChannelsToThisBoundaries.topMax,
      channelAvg: this.scaleAllChannelsToThisBoundaries.channelAvg,
      channelSegmentId: boundaries.channelSegmentId
    };
    return Promise.resolve(scaleAllBoundaries);
  };

  /**
   * Get the function that will calculate the boundaries for a channel segment.
   * For a given set of arguments, this will return the same reference every time.
   *
   * @param amplitudeScaleOption the type of scaling to use
   * @returns a function that can be used to generate boundaries
   */
  private readonly getBoundariesCalculator = (
    amplitudeScaleOption: AmplitudeScalingOptions,
    fixedScaleVal: FixedScaleValue,
    scaleAmplitudeChannelName: string,
    scaledAmplitudeChannelMinValue: number,
    scaledAmplitudeChannelMaxValue: number
  ) => {
    // If scale all channel name is set return the getScaleAllChannelsToThisChannelBounds function
    if (scaleAmplitudeChannelName) {
      // build the scale all channels boundaries channel segment id is a undefined
      // and will be set in getScaleAllChannelsToThisChannelBounds function for each channel segment
      this.scaleAllChannelsToThisBoundaries = {
        topMax: scaledAmplitudeChannelMaxValue,
        bottomMax: scaledAmplitudeChannelMinValue,
        channelAvg: 0,
        channelSegmentId: undefined,
        offset: scaledAmplitudeChannelMaxValue
      };
      return this.getScaleAllChannelsToThisChannelBounds;
    }
    this.scaleAllChannelsToThisBoundaries = undefined;

    if (amplitudeScaleOption === AmplitudeScalingOptions.FIXED) {
      return this.getFixedBoundariesGenerator(fixedScaleVal);
    }
    return this.getWindowedBoundaries;
  };

  /**
   * Event handler for context clicking on a mask
   *
   * @param event mouse event as React.MouseEvent<HTMLDivElement>
   * @param channelName a channel name as a string
   * @param masks mask ids as a string array
   */
  private readonly onMaskContextClick = (
    event: React.MouseEvent<HTMLDivElement>,
    channelName: string,
    masks: string[]
  ) => {
    this.showQcSegmentContextMenu(event, channelName, masks, false, false);
  };

  /**
   * Event handler for channel expansion
   *
   * @param channelName a channel name as a string
   */
  private readonly onChannelExpanded = () => {
    /* no-op */
  };

  /**
   * Event handler for channel collapse
   *
   * @param channelName a channel name as a string
   */
  private readonly onChannelCollapsed = () => {
    /* no-op */
  };

  /**
   * Select a channel.
   *
   * @param channelName the unique channel name
   */
  private readonly selectChannel = (channelName: string) => {
    this.props.setSelectedStationIds([channelName]);
  };

  /**
   * Clears the selected channels.
   */
  private readonly clearSelectedChannels = () => {
    this.props.setSelectedStationIds([]);
    this.setState({ selectionRangeAnchor: undefined });
  };

  /**
   * Given a channel, return it with any children/non-default channels.
   *
   * @param channelName the possible parent channel
   * @returns an array that includes the input channel and any children
   */
  private readonly getParentChannelWithChildren = (channelName: string) => {
    const clickedDefaultStation = this.props.defaultStations.find(
      station => station.name === channelName
    );
    // Look up all of the sub channels that fall under the selected default channel.
    const subChannelIds: string[] =
      clickedDefaultStation?.allRawChannels.map(channel => channel.name) || [];
    return [channelName, ...subChannelIds];
  };

  /**
   * Get a range of the currently visible stations/channels. The bounds do not need to be ordered.
   *
   * @param channelBound1 one of the channels that defines the range boundary
   * @param channelBound2 the other channel that defines the range boundary
   * @param waveformDisplay a reference to the Weavess WaveformDisplay
   * @returns a list of channels in the range, including the bounds
   */
  private static getVisibleChannelRange(
    channelBound1: string,
    channelBound2: string,
    waveformDisplay: Weavess
  ): string[] {
    // Get the React components corresponding to stations
    const visibleChannels = waveformDisplay.waveformPanelRef.getOrderedVisibleChannelNames();

    // Find the index into the visible channels for the first bound
    const bound1Idx = Math.max(
      visibleChannels.findIndex(channel => channel === channelBound1),
      0
    );
    // Find the index into the visible channels for the second bound
    const bound2Idx = visibleChannels.findIndex(channel => channel === channelBound2);
    // Return the visible channels within the selection
    return visibleChannels.slice(
      Math.min(bound1Idx, bound2Idx),
      Math.max(bound1Idx, bound2Idx) + 1
    );
  }

  /**
   * Whether or not a click should trigger a deselect given the current selection state.
   *
   * @param channelName the channel that was clicked
   * @param altPressed whether or not the alt key was pressed when the click occurred
   * @returns true if the click should trigger a deselect
   */
  private shouldClickTriggerDeselect(channelName: string, altPressed: boolean) {
    return altPressed
      ? // If alt pressed, only deselect when parent+children are all already selected
        this.getParentChannelWithChildren(channelName).every(channel =>
          this.props.selectedStationIds.includes(channel)
        )
      : // Alt not pressed, so deselect if currently selected
        this.props.selectedStationIds.includes(channelName);
  }

  /**
   * Event handler for when a channel label is clicked
   *
   * @param e mouse event as React.MouseEvent<HTMLDivElement>
   * @param channelName a channel name as a string
   */
  private readonly onChannelLabelClick = (
    e: React.MouseEvent<HTMLDivElement>,
    channelName: string
  ) => {
    e.preventDefault();
    /**
     * The channels that will be added to the selection.
     */
    let selectedChannels: string[] = [];
    /**
     * The channels that will be removed from the selection.  Removed channels trump added channels.
     */
    let newDeselectedChannels: string[] = [];

    if (e.shiftKey) {
      // If shift key is pressed, do a range select
      selectedChannels = WeavessDisplayComponent.getVisibleChannelRange(
        this.state.selectionRangeAnchor,
        channelName,
        this.context.weavessRef
      );
    }
    // No range select, so check whether or not the click should trigger deselection
    else if (this.shouldClickTriggerDeselect(channelName, e.altKey)) {
      newDeselectedChannels = [channelName];
    } else {
      selectedChannels = [channelName];
    }

    // If alt key is pressed, (de)selection will involve children channels
    if (e.altKey) {
      selectedChannels = flatMap(selectedChannels, this.getParentChannelWithChildren);
      newDeselectedChannels = flatMap(newDeselectedChannels, this.getParentChannelWithChildren);
    }

    // If ctrl key is pressed, new selection will be additive
    if (e.metaKey || e.ctrlKey) {
      selectedChannels = union(this.props.selectedStationIds, selectedChannels);
    }

    // Ensure that deselected channels override selected ones
    const selection = difference(selectedChannels, newDeselectedChannels);
    this.props.setSelectedStationIds(selection);
    // Update the anchor for the selection range as long as this is not an update to the range
    if (!e.shiftKey) this.setState({ selectionRangeAnchor: channelName });
  };

  /**
   * Event handler for when channel is clicked
   *
   * @param e mouse event as React.MouseEvent<HTMLDivElement>
   * @param channelId a Channel Id as a string
   * @param timeSecs epoch seconds of where clicked in respect to the data
   */
  private readonly onChannelClick = (
    e: React.MouseEvent<HTMLDivElement>,
    stationId: string,
    timeSecs: number
  ) => {
    e.preventDefault();

    // ctrl or meta click = create a signal detection
    const clickedDefaultChannel = this.props.defaultStations.find(
      station => station.name === stationId
    );
    if (e.ctrlKey || e.metaKey) {
      if (e.ctrlKey) {
        e.stopPropagation();
      }
      if (clickedDefaultChannel && this.props.createSignalDetection) {
        const input: SignalDetectionTypes.CreateDetectionMutationArgs = {
          input: {
            stationId,
            phase: this.props.defaultSignalDetectionPhase,
            signalDetectionTiming: {
              arrivalTime: timeSecs,
              timeUncertaintySec: 0.5
            },
            eventId: this.props.currentOpenEventId ? this.props.currentOpenEventId : undefined
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.props
          .createSignalDetection(input)
          .catch(err => logger.error(`Failed to create detection: ${err.message}`));
      }
    } else if (
      clickedDefaultChannel &&
      this.props.measurementMode.mode === AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT
    ) {
      // user clicked outside of the measurement selection area
      toast.warn('Must perform measurement calculation inside grey selection area');
    }
  };

  /**
   * Event handler for when signal detection is clicked
   *
   * @param event mouse event as React.MouseEvent<HTMLDivElement>
   * @param signalDetectionId a Signal Detection Id as a string
   */
  private readonly onSignalDetectionClick = (
    event: React.MouseEvent<HTMLDivElement>,
    signalDetectionId: string
  ) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.altKey) {
      const signalDetection = this.props.signalDetections?.find(sd => sd.id === signalDetectionId);
      const assocStatus = getSignalDetectionAssociationStatus(
        signalDetection,
        this.props.events,
        this.props.currentOpenEventId ? this.props.currentOpenEventId : undefined,
        this.props.eventStatuses
      );
      const assocColor = getAssocStatusColor(assocStatus, this.props.uiTheme);
      const assocStatusString = getAssocStatusString(assocStatus);
      this.signalDetectionContextMenusCb.signalDetectionDetailsCb(event, {
        signalDetection,
        color: assocColor,
        assocStatus: assocStatusString
      });
    } else {
      const selectedSdIds = this.getSelectedSdIds(event, signalDetectionId);
      if (!isEqual(this.props.selectedSdIds, selectedSdIds)) {
        this.props.setSelectedSdIds(selectedSdIds);
      }
    }
  };

  /**
   * Builds list of selected Signal Detection ids based on hotkeys and
   * the Signal Detection clicked on
   *
   * @param e
   * @param sdId
   * @returns string[] list of SD ids
   */
  private readonly getSelectedSdIds = (
    e: React.MouseEvent<HTMLDivElement>,
    sdId: string
  ): string[] => {
    const alreadySelected = this.props.selectedSdIds.indexOf(sdId) > -1;
    let selectedSdIds: string[] = [];

    // If ctrl, meta, or shift is pressed, append to current list, otherwise new singleton list
    if (e.metaKey || e.shiftKey || e.ctrlKey) {
      // meta + already selected = remove the element
      if (alreadySelected) {
        selectedSdIds = this.props.selectedSdIds.filter(id => id !== sdId);
      } else {
        selectedSdIds = [...this.props.selectedSdIds, sdId];
      }
    } else if (alreadySelected) {
      selectedSdIds = [];
    } else {
      selectedSdIds = [sdId];
    }
    return selectedSdIds;
  };

  /**
   * Event handler for when a create mask drag ends
   *
   * @param e mouse event as React.MouseEvent<HTMLDivElement>
   * @param startTimeSecs epoch seconds of where clicked started
   * @param endTimeSecs epoch seconds of where clicked ended
   * @param needToDeselect boolean that indicates to deselect the channel
   */
  private readonly onMaskCreateDragEnd = (
    event: React.MouseEvent<HTMLDivElement>,
    startTimeSecs: number,
    endTimeSecs: number,
    needToDeselect: boolean
  ) => {
    // TODO: Remove eslint-disable @typescript-eslint/no-unused-vars from the top when this is implemented
    toast.warn('Start time cannot be after end time');
  };

  /**
   * Invokes the call to the create QC mask mutation.
   *
   * @param type the qc mask dialog box type
   * @param maskId the unique mask id
   * @param input the qc mask input to the mutation
   */
  private readonly handleQcMaskMutation = (
    type: QcMaskDialogBoxType,
    maskId: string,
    input: QcMaskTypes.QcMaskInput
  ) => {
    if (type === QcMaskDialogBoxType.Create) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.props
        .createQcMask({
          channelNames: this.props.selectedStationIds,
          input
        })
        .catch(err => logger.error(`Failed to create mask: ${err.message}`));
    } else if (type === QcMaskDialogBoxType.Modify) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.props
        .updateQcMask({
          maskId,
          input
        })
        .catch(err => logger.error(`Failed to update mask: ${err.message}`));
    } else if (type === QcMaskDialogBoxType.Reject) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.props
        .rejectQcMask({
          maskId,
          inputRationale: input.rationale
        })
        .catch(err => logger.error(`Failed to reject mask: ${err.message}`));
    }
  };

  /**
   * Event handler that is invoked and handled when the Measure Window is updated.
   */
  private readonly onMeasureWindowUpdated = () => {
    /** no-op */
  };

  /**
   * Event handler for when a signal detection drag ends
   *
   * @param sdId a Signal Detection Id as a string
   * @param timeSecs epoch seconds of where drag ended in respect to the data
   */
  private readonly onSignalDetectionDragEnd = (sdId: string, timeSecs: number): void => {
    if (ENABLE_SD_DRAG) {
      this.updateSignalDetectionMutation(sdId, timeSecs);
      this.props.setSelectedSdIds([sdId]);
    }
  };

  /**
   * Helper function to call UpdateDetection Mutation
   */
  /**
   * Invokes the call to the update signal detection mutation.
   *
   * @param sdId the unique signal detection id
   * @param timeSecs the epoch seconds time
   * @param amplitudeFeatureMeasurementValue the amplitude feature measurement value
   */
  // TODO: made public so don't have to comment out. Can make private when
  // signal detection mutation is implemented
  public updateSignalDetectionMutation(
    sdId: string,
    timeSecs: number,
    amplitudeFeatureMeasurementValue?: SignalDetectionTypes.AmplitudeMeasurementValue
  ): void {
    if (this.props.updateSignalDetection) {
      const input: SignalDetectionTypes.UpdateDetectionsMutationArgs = {
        detectionIds: [sdId],
        input: {
          signalDetectionTiming: {
            arrivalTime: timeSecs,
            timeUncertaintySec: 0.5,
            amplitudeMeasurement: amplitudeFeatureMeasurementValue
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.props
        .updateSignalDetection(input)
        .catch(err => logger.error(`Failed to update detections: ${err.message}`));
    }
  }

  /**
   * Renders the component.
   */
  public render(): JSX.Element {
    // ***************************************
    // BEGIN NON IDEAL STATE CASES
    // ***************************************

    // ! This case must be first
    // if the golden-layout container is not visible, do not attempt to render
    // the component, this is to prevent JS errors that may occur when trying to
    // render the component while the golden-layout container is hidden
    if (this.props.glContainer && this.props.glContainer.isHidden) {
      return <NonIdealState />;
    }

    if (!this.props.currentTimeInterval) {
      return (
        <NonIdealState
          icon={IconNames.TIMELINE_LINE_CHART}
          title="No waveform data currently loaded"
        />
      );
    }

    // ***************************************
    // END NON IDEAL STATE CASES
    // ***************************************

    // Selection for modifying QC Mask
    if (this.state.qcSegmentModifyInterval) {
      this.addMaskSelectionWindows();
    }

    let title = 'No Waveforms to display';
    if (this.props.events) {
      const currentOpenEvent = this.props.events.find(e => e.id === this.props.currentOpenEventId);
      if (
        this.props.measurementMode.mode === AnalystWorkspaceTypes.WaveformDisplayMode.MEASUREMENT &&
        currentOpenEvent.overallPreferred?.associatedSignalDetectionHypotheses.length < 1
      ) {
        title = 'Unable to enter measurement mode: No associated signal detections available';
      }
    }
    return (
      <>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="weavess-container" tabIndex={0}>
          <div className="weavess-container__wrapper">
            {this.props.weavessProps.stations.length > 0 ? (
              <>
                <SignalDetectionContextMenus
                  getOpenCallback={this.setSignalDetectionContextMenusCb}
                />
                <QcContextMenus getOpenCallback={this.setQcContextMenusCb} />
                <Weavess
                  ref={ref => {
                    if (ref && ref !== this.context.weavessRef) {
                      this.context.setWeavessRef(ref);
                    }
                  }}
                  disableToastContainer
                  // eslint-disable-next-line react/jsx-props-no-spreading
                  {...this.props.weavessProps}
                  getPositionBuffer={getPositionBuffer}
                  getBoundaries={this.getBoundariesCalculator(
                    this.props.amplitudeScaleOption,
                    this.props.fixedScaleVal,
                    this.props.scaleAmplitudeChannelName,
                    this.props.scaledAmplitudeChannelMinValue,
                    this.props.scaledAmplitudeChannelMaxValue
                  )}
                  selectChannel={this.selectChannel}
                  clearSelectedChannels={this.clearSelectedChannels}
                  events={this.weavessEventHandlers}
                />
              </>
            ) : (
              <NonIdealState icon={IconNames.TIMELINE_LINE_CHART} title={title} />
            )}
          </div>
        </div>
      </>
    );
  }

  /**
   * Assigns the QC Context Menu callback; which can be used to imperatively show the context menus.
   *
   * @param callback the context menu open callback
   */
  private readonly setQcContextMenusCb: QcContextMenuGetOpenCallbackFunc = callback => {
    this.qcContextMenuCb = callback;
  };

  /**
   * Shows the QC Segment Context menu for the provided display type.
   *
   * @param event mouse event as React.MouseEvent<HTMLDivElement>
   * @param channelName a channel name as a string
   * @param masks mask ids as a string array
   * @para type the qc segment display type
   */
  private readonly showQcSegmentContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    channelName: string,
    masks: string[],
    maskCreateHotKey: boolean,
    viewQcSegmentHotKey: boolean
  ) => {
    const qcSegments: QcSegment[] = flatMap(
      Object.values(this.props.qcSegmentsByChannelName).map(r => Object.values(r))
    ).filter(m => includes(masks, m.id));
    if (qcSegments.length > 0) {
      if (viewQcSegmentHotKey) {
        if (qcSegments.length === 1) {
          this.qcContextMenuCb.qcSegmentEditContextMenuCb(event, qcSegments[0]);
        } else {
          this.qcContextMenuCb.qcSegmentSelectionContextMenuCb(event, qcSegments);
        }
      } else if (maskCreateHotKey) {
        // begin interactive modification of a qc segment
        if (qcSegments.length === 1) {
          this.setSelectedQcSegment(qcSegments[0]);
        } else {
          this.qcContextMenuCb.qcSegmentSelectionContextMenuCb(event, qcSegments);
        }
      } else {
        this.qcContextMenuCb.qcSegmentsContextMenuCb(event, qcSegments);
      }
    }
  };

  private readonly addMaskSelectionWindows = (): void => {
    const maskSelectionWindow: WeavessTypes.SelectionWindow = {
      id: 'selection-qc-mask-modify',
      startMarker: {
        id: 'maskStart',
        color: gmsColors.gmsMain,
        lineStyle: WeavessTypes.LineStyle.DASHED,
        timeSecs: this.state.qcSegmentModifyInterval.startTimeSecs
      },
      endMarker: {
        id: 'maskEnd',
        color: gmsColors.gmsMain,
        lineStyle: WeavessTypes.LineStyle.DASHED,
        timeSecs: this.state.qcSegmentModifyInterval.endTimeSecs
      },
      isMoveable: true,
      color: 'rgba(255,255,255,0.2)'
    };
    // TODO: Don't mutate props!
    // add to the selection windows; do not overwrite
    if (!this.props.weavessProps.markers) this.props.weavessProps.markers = {};
    if (!this.props.weavessProps.markers.selectionWindows) {
      this.props.weavessProps.markers.selectionWindows = [];
    }
    this.props.weavessProps.markers.selectionWindows.push(maskSelectionWindow);
  };

  /**
   * Event handler for when context menu is displayed
   */
  private readonly onContextMenu = (): void => {
    /* no-op */
  };

  /**
   * Assigns the Signal Detection Context Menu callbacks; which can be used to imperatively show the context menus.
   *
   * @param callback the context menu open callback
   */
  private readonly setSignalDetectionContextMenusCb: SignalDetectionContextMenusGetOpenCallbackFunc = callback => {
    this.signalDetectionContextMenusCb = callback;
  };

  /**
   * Event handler for when context menu is displayed
   *
   * @param e mouse event as React.MouseEvent<HTMLDivElement>
   * @param channelName a Channel Id as a string
   * @param sdId a Signal Detection Id as a string
   */
  private readonly onSignalDetectionContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    channelName: string,
    sdId: string
  ) => {
    e.preventDefault();
    if (e.ctrlKey) {
      return;
    }
    // if provided && not already selected, set the current selection to just the context-menu'd detection
    const detectionIds =
      sdId && this.props.selectedSdIds.indexOf(sdId) === -1 ? [sdId] : this.props.selectedSdIds;
    const sds = this.props.signalDetections?.filter(
      sd => detectionIds.indexOf(sd.id) !== -1 || sd.id === sdId
    );

    this.signalDetectionContextMenusCb.signalDetectionContextMenuCb(e, {
      signalDetections: this.props.signalDetections,
      selectedSds: sds,
      currentOpenEventId: this.props.currentOpenEventId,
      changeAssociation: this.props.setEventSignalDetectionAssociation,
      rejectDetections: this.props.rejectSignalDetection,
      updateDetections: this.props.updateSignalDetection,
      setSdIdsToShowFk: this.props.setSdIdsToShowFk,
      sdIdsToShowFk: this.props.sdIdsToShowFk,
      associateToNewEvent: this.props.createEvent,
      measurementMode: this.props.measurementMode,
      setMeasurementModeEntries: this.props.setMeasurementModeEntries,
      eventStatuses: this.props.eventStatuses,
      events: this.props.events,
      uiTheme: this.props.uiTheme,
      signalDetectionDetailsCb: this.signalDetectionContextMenusCb.signalDetectionDetailsCb
    });
  };

  /**
   * Selects all parent channels (default channels in weavess).
   */
  private readonly selectAllParentChannels = () => {
    const parentStationIds = this.props.defaultStations.map(station => station.name);
    this.props.setSelectedStationIds(parentStationIds);
  };

  /**
   * Returns true if the selected signal detection can be used to generate an FK.
   */
  private readonly canGenerateFk = (
    signalDetection: SignalDetectionTypes.SignalDetection
  ): boolean => {
    const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(signalDetection.signalDetectionHypotheses)
        .featureMeasurements
    );
    return (
      systemConfig.nonFkSdPhases
        // eslint-disable-next-line newline-per-chained-call
        .findIndex(phase => phase.toLowerCase() === fmPhase.value.toString().toLowerCase()) === -1
    );
  };

  /**
   * Mark the selected signal detection ids to show fk.
   */
  private readonly markSelectedSignalDetectionsToShowFk = () => {
    const signalDetections: SignalDetectionTypes.SignalDetection[] = [];
    this.props.selectedSdIds.forEach(selectedId => {
      const signalDetection = this.props.signalDetections?.find(sd => sd.id === selectedId);
      if (signalDetection && this.canGenerateFk(signalDetection)) {
        signalDetections.push(signalDetection);
      }
    });
    this.props.setSdIdsToShowFk(signalDetections.map(sd => sd.id));
  };

  /**
   * Shows or displays the signal detection re-phase context menu dialog.
   *
   * @param clientX the client x
   * @param clientY the client y
   */
  private readonly showRephaseMenu = (clientX: number, clientY: number) => {
    if (this.props.selectedSdIds.length === 0) return;
    const stageIntervalContextMenu = setPhaseContextMenu(
      this.props.selectedSdIds,
      this.props.updateSignalDetection
    );
    // TODO update to ContextMenu2 see https://blueprintjs.com/docs/#popover2-package/context-menu2
    ContextMenu.show(stageIntervalContextMenu, {
      left: clientX,
      top: clientY
    });
  };

  // eslint-disable-next-line max-lines
}
