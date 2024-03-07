import type {
  CommonTypes,
  EventTypes,
  FkTypes,
  SignalDetectionTypes,
  StationTypes,
  WorkflowTypes
} from '@gms/common-model';
import type { FkConfiguration } from '@gms/common-model/lib/fk/types';
import type GoldenLayout from '@gms/golden-layout';
import type {
  AnalystWorkspaceTypes,
  ChannelSegmentFetchResult,
  EventsFetchResult,
  EventStatus,
  FindEventStatusInfoByStageIdAndEventIdsQuery,
  ProcessingAnalystConfigurationQueryProps,
  SignalDetectionFetchResult,
  StationQueryProps,
  UiChannelSegment
} from '@gms/ui-state';
import type Immutable from 'immutable';

import type {
  FilterType,
  FkThumbnailSize
} from './components/fk-thumbnail-list/fk-thumbnails-controls';
import type { LeadLagPairs } from './constants';

export interface FkParams {
  windowParams: FkTypes.WindowParameters;
  frequencyPair: FkTypes.FrequencyBand;
}

export interface LeadLagPairAndString {
  leadLagPairs: LeadLagPairs;
  windowParams: FkTypes.WindowParameters;
}

export enum FkUnits {
  FSTAT = 'FSTAT',
  POWER = 'POWER'
}

/**
 * Used to return a super set of the fk configuration from the fk config popover
 */
export interface FkConfigurationWithUnits extends FkConfiguration {
  fkUnitToDisplay: FkUnits;
}

/**
 * Azimuth Slowness Redux Props
 */
export interface AzimuthSlownessReduxProps {
  // passed in from golden-layout
  glContainer?: GoldenLayout.Container;
  viewableInterval: CommonTypes.TimeRange;
  openEventId: string;
  unassociatedSDColor: string;
  sdIdsToShowFk: string[];
  analysisMode: WorkflowTypes.AnalysisMode;
  location: AnalystWorkspaceTypes.LocationSolutionState;
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType;
  setSdIdsToShowFk(signalDetectionIds: string[]): void;
  setMeasurementModeEntries(entries: Record<string, boolean>): void;
  signalDetectionResults: SignalDetectionFetchResult;
  channelSegmentResults: ChannelSegmentFetchResult;
  eventResults: EventsFetchResult;
  eventStatusQuery: FindEventStatusInfoByStageIdAndEventIdsQuery;
  stageNames: string[];
  openIntervalName: string;
}

export interface SubscriptionAction {
  (
    list: SignalDetectionTypes.SignalDetection[],
    index: number,
    prev: SignalDetectionTypes.SignalDetection[],
    currentIteree: SignalDetectionTypes.SignalDetection
  ): void;
}

/**
 * Azimuth Slowness State
 */
export interface AzimuthSlownessState {
  fkThumbnailSizePx: FkThumbnailSize;
  fkThumbnailColumnSizePx: number;
  filterType: FilterType;
  userInputFkWindowParameters: FkTypes.WindowParameters;
  userInputFkFrequency: FkTypes.FrequencyBand;
  numberOfOutstandingComputeFkMutations: number;
  fkUnitsForEachSdId: Immutable.Map<string, FkUnits>;
  fkInnerContainerWidthPx: number;
  fkFrequencyThumbnails: Immutable.Map<string, FkTypes.FkFrequencyThumbnail[]>;
  displayedSignalDetection: SignalDetectionTypes.SignalDetection;
}

/**
 * Mutations used by the Az Slow display
 */
export interface AzimuthSlownessMutations {
  computeFks: (fkInput: FkTypes.FkInputWithConfiguration[]) => Promise<void>;
  computeFkFrequencyThumbnails: (args: any) => Promise<void>;
  setWindowLead: (args: any) => Promise<void>;
  markFksReviewed: (args: any) => Promise<void>;
}

/**
 * Consolidated props for Azimuth Slowness
 */
export type AzimuthSlownessProps = AzimuthSlownessReduxProps &
  AzimuthSlownessMutations &
  ProcessingAnalystConfigurationQueryProps &
  StationQueryProps &
  SignalDetectionFetchResult &
  ChannelSegmentFetchResult &
  EventsFetchResult &
  FindEventStatusInfoByStageIdAndEventIdsQuery;

/**
 * State of the az slow panel
 */
export interface AzimuthSlownessPanelState {
  currentMovieSpectrumIndex: number;
  selectedSdIds: string[];
}

export interface AzimuthSlownessPanelProps {
  // Data
  defaultStations: StationTypes.Station[];
  eventsInTimeRange: EventTypes.Event[];
  eventStatuses: Record<string, EventStatus>;
  displayedSignalDetection: SignalDetectionTypes.SignalDetection | undefined;
  openEvent: EventTypes.Event | undefined;
  unassociatedSignalDetectionByColor: string;
  associatedSignalDetections: SignalDetectionTypes.SignalDetection[];
  signalDetectionsToDraw: SignalDetectionTypes.SignalDetection[];
  signalDetectionsIdToFeaturePredictions: Immutable.Map<string, EventTypes.FeaturePrediction[]>;
  signalDetectionsByStation: SignalDetectionTypes.SignalDetection[];
  channelSegments: Record<string, Record<string, UiChannelSegment[]>>;
  featurePredictionsForDisplayedSignalDetection: EventTypes.FeaturePrediction[];
  distances: EventTypes.LocationDistance[];
  sdIdsToShowFk: string[];
  location: AnalystWorkspaceTypes.LocationSolutionState;
  fkFrequencyThumbnails: FkTypes.FkFrequencyThumbnail[];
  // Azimuth display state as props
  fkThumbnailColumnSizePx: number;
  fkDisplayWidthPx: number;
  fkDisplayHeightPx: number;
  filterType: FilterType;
  fkThumbnailSizePx: FkThumbnailSize;
  fkUnitsForEachSdId: Immutable.Map<string, FkUnits>;
  numberOfOutstandingComputeFkMutations: number;
  userInputFkFrequency: FkTypes.FrequencyBand;
  fkUnitForDisplayedSignalDetection: FkUnits;
  userInputFkWindowParameters: FkTypes.WindowParameters;
  fkInnerContainerWidthPx: number;
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType;
  // Prop functions
  adjustFkInnerContainerWidth(
    fkThumbnailsContainer: HTMLDivElement,
    fkThumbnailsInnerContainer: HTMLDivElement
  ): void;
  markFksForSdIdsAsReviewed(sdIds: string[]): void;
  updateFkThumbnailSize(size: FkThumbnailSize): void;
  updateFkFilter(filterType: FilterType): void;
  setFkThumbnailColumnSizePx(newSizePx: number): void;
  computeFkAndUpdateState(fkParams: FkParams, configuration: FkTypes.FkConfiguration): void;
  changeUserInputFks(
    windowParams: FkTypes.WindowParameters,
    frequencyBand: FkTypes.FrequencyBand
  ): void;
  setFkUnitForSdId(sdId: string, fkUnit: FkUnits): void;
  setSdIdsToShowFk(signalDetectionIds: string[]): void;
  setDisplayedSignalDetection(sd: SignalDetectionTypes.SignalDetection): void;
  setMeasurementModeEntries(entries: Record<string, boolean>): void;
}
