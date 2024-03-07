package gms.shared.signaldetection.accessor;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableSet;
import gms.shared.signaldetection.api.SignalDetectionAccessorInterface;
import gms.shared.signaldetection.api.SignalDetectionRepositoryInterface;
import gms.shared.signaldetection.api.facet.SignalDetectionFacetingUtility;
import gms.shared.signaldetection.api.response.SignalDetectionsWithChannelSegments;
import gms.shared.signaldetection.coi.detection.FeatureMeasurement;
import gms.shared.signaldetection.coi.detection.SignalDetection;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesisId;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.api.webclient.SignalEnhancementConfigurationClient;
import gms.shared.stationdefinition.api.StationDefinitionAccessorInterface;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.facet.FacetingTypes;
import gms.shared.stationdefinition.facet.StationDefinitionFacetingUtility;
import gms.shared.waveform.api.WaveformAccessorInterface;
import gms.shared.waveform.api.facet.WaveformFacetingUtility;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import gms.shared.waveform.coi.Waveform;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * The Accessor to retrieve SignalDetection Objects, based on information contained in BridgedSignalDetectionRepository
 * and the Waveform Accessor provided.
 * Implements {@link SignalDetectionAccessorInterface}
 */
@Component
@Qualifier("bridgedSignalDetectionAccessor")
public class BridgedSignalDetectionAccessor implements SignalDetectionAccessorInterface {

  private static final Logger logger = LoggerFactory.getLogger(BridgedSignalDetectionAccessor.class);

  public static final String NULL_IDS_MESSAGE = "IDs cannot be null";
  public static final String NULL_STATIONS_MESSAGE = "Stations cannot be null";
  public static final String NULL_EXCLUDED_SIGNAL_DETECTIONS_LIST = "Excluded signal detections list can be empty, but not null";
  public static final String EMPTY_STATIONS_MESSAGE = "Stations cannot be empty";
  public static final String NULL_FACETING_DEFINITION_MESSAGE = "Faceting definition cannot be null";
  public static final String EMPTY_IDS_MESSAGE = "IDs cannot be empty";
  public static final String NULL_STAGE_ID_MESSAGE = "Stage ID cannot be null";
  public static final String MISSING_FACETING_UTILITY_MESSAGE = "StationDefinitionFacetingUtility must be set before attempting faceting";
  public static final String START_END_TIME_ERR = "Start Time cannot be after end time";
  public static final String NULL_START_TIME_MESSAGE = "Start time cannot be null";
  public static final String NULL_END_TIME_MESSAGE = "End time cannot be null";

  private static final String STATION = "station";
  private static final FacetingDefinition stationFacetingDefinition = FacetingDefinition.builder()
    .setClassType(FacetingTypes.STATION_TYPE.getValue())
    .setPopulated(false)
    .setFacetingDefinitions(Map.of())
    .build();
  private static final FacetingDefinition channelFacetingDefinition = FacetingDefinition.builder()
    .setClassType(FacetingTypes.CHANNEL_TYPE.getValue())
    .setPopulated(false)
    .setFacetingDefinitions(Map.of())
    .build();
  private static final FacetingDefinition featureMeasurementFacetingDefinition = FacetingDefinition.builder()
    .setClassType(FeatureMeasurement.class.getSimpleName())
    .setPopulated(true)
    .addFacetingDefinitions("channel", channelFacetingDefinition)
    .build();
  static final FacetingDefinition withSegmentsDefinition = FacetingDefinition.builder()
    .setClassType(SignalDetection.class.getSimpleName())
    .setPopulated(true)
    .addFacetingDefinitions(STATION, stationFacetingDefinition)
    .addFacetingDefinitions("signalDetectionHypotheses", FacetingDefinition.builder()
      .setClassType(SignalDetectionHypothesis.class.getSimpleName())
      .setPopulated(true)
      .addFacetingDefinitions(STATION, stationFacetingDefinition)
      .addFacetingDefinitions("featureMeasurements", featureMeasurementFacetingDefinition)
      .build())
    .build();

  private final SignalDetectionRepositoryInterface signalDetectionRepository;
  private final WaveformAccessorInterface waveformAccessor;
  private SignalDetectionFacetingUtility signalDetectionFacetingUtility;
  private final SignalEnhancementConfigurationClient secClient;
  private boolean initialized = false;

  @Autowired
  public BridgedSignalDetectionAccessor(
    @Qualifier("bridgedSignalDetectionRepository") SignalDetectionRepositoryInterface signalDetectionRepository,
    WaveformAccessorInterface waveformAccessor,
    @Qualifier("bridgedAccessor") StationDefinitionAccessorInterface stationDefinitionAccessorImpl,
    SignalEnhancementConfigurationClient secClient) {

    this.signalDetectionRepository = signalDetectionRepository;
    this.waveformAccessor = waveformAccessor;
    this.signalDetectionFacetingUtility = SignalDetectionFacetingUtility.create(this,
      new WaveformFacetingUtility(waveformAccessor, stationDefinitionAccessorImpl),
      StationDefinitionFacetingUtility.create(stationDefinitionAccessorImpl));
    this.secClient = secClient;

    initialized = true;
  }

  public void setSignalDetectionFacetingUtility(SignalDetectionFacetingUtility signalDetectionFacetingUtility) {
    Objects.requireNonNull(signalDetectionFacetingUtility);

    this.signalDetectionFacetingUtility = signalDetectionFacetingUtility;
    initialized = true;
  }

  @Override
  public SignalDetectionsWithChannelSegments findWithSegmentsByIds(List<UUID> signalDetectionIds,
    WorkflowDefinitionId stageId) {

    // find signal detections using signalDetectionIds and stageId
    List<SignalDetection> signalDetections = findByIds(signalDetectionIds, stageId, withSegmentsDefinition);

    // find collection of channel segments using signal detections
    Collection<ChannelSegment<Waveform>> channelSegments = findChannelSegments(signalDetections);

    return SignalDetectionsWithChannelSegments.builder()
      .setChannelSegments(ImmutableSet.copyOf(channelSegments))
      .setSignalDetections(ImmutableSet.copyOf(signalDetections))
      .build();
  }

  @Override
  public SignalDetectionsWithChannelSegments findWithSegmentsByStationsAndTime(List<Station> stations,
    Instant startTime, Instant endTime, WorkflowDefinitionId stageId, List<SignalDetection> excludedSignalDetections) {

    Preconditions.checkNotNull(stations, "Station List cannot be null");
    Preconditions.checkState(!stations.isEmpty(), EMPTY_STATIONS_MESSAGE);
    Preconditions.checkState(startTime.isBefore(endTime), START_END_TIME_ERR);
    Preconditions.checkNotNull(stageId, NULL_STAGE_ID_MESSAGE);
    Preconditions.checkNotNull(excludedSignalDetections, NULL_EXCLUDED_SIGNAL_DETECTIONS_LIST);

    List<SignalDetection> signalDetections =
      findByStationsAndTime(stations, startTime, endTime, stageId, excludedSignalDetections, withSegmentsDefinition);

    if (signalDetections.isEmpty()) {
      logger.debug("Signal detections cannot be empty");
      return SignalDetectionsWithChannelSegments.builder()
        .setChannelSegments(Set.of())
        .setSignalDetections(Set.of())
        .build();
    }

    Collection<ChannelSegment<Waveform>> channelSegments = findChannelSegments(signalDetections);

    return SignalDetectionsWithChannelSegments.builder()
      .setChannelSegments(ImmutableSet.copyOf(channelSegments))
      .setSignalDetections(ImmutableSet.copyOf(signalDetections))
      .build();
  }

  @Override
  public List<SignalDetection> findByIds(List<UUID> ids, WorkflowDefinitionId stageId) {
    return signalDetectionRepository.findByIds(ids, stageId);
  }

  @Override
  public List<SignalDetection> findByIds(List<UUID> ids,
    WorkflowDefinitionId stageId,
    FacetingDefinition facetingDefinition) {

    Objects.requireNonNull(ids, NULL_IDS_MESSAGE);
    Objects.requireNonNull(stageId, NULL_STAGE_ID_MESSAGE);
    Objects.requireNonNull(facetingDefinition, NULL_FACETING_DEFINITION_MESSAGE);
    Preconditions.checkState(!ids.isEmpty(), EMPTY_IDS_MESSAGE);
    Preconditions.checkState(initialized, MISSING_FACETING_UTILITY_MESSAGE);

    List<SignalDetection> signalDetections = signalDetectionRepository.findByIds(ids, stageId);
    return signalDetections.stream()
      .map(sd -> signalDetectionFacetingUtility.populateFacets(sd, facetingDefinition, stageId))
      .collect(Collectors.toList());
  }

  @Override
  public List<SignalDetectionHypothesis> findHypothesesByIds(List<SignalDetectionHypothesisId> ids) {
    return signalDetectionRepository.findHypothesesByIds(ids);
  }

  @Override
  public List<SignalDetectionHypothesis> findHypothesesByIds(List<SignalDetectionHypothesisId> ids,
    FacetingDefinition facetingDefinition) {

    Objects.requireNonNull(ids, NULL_IDS_MESSAGE);
    Objects.requireNonNull(facetingDefinition, NULL_FACETING_DEFINITION_MESSAGE);
    Preconditions.checkState(!ids.isEmpty(), EMPTY_IDS_MESSAGE);
    Preconditions.checkState(initialized, MISSING_FACETING_UTILITY_MESSAGE);

    return signalDetectionRepository.findHypothesesByIds(ids).stream()
      .map(sdh -> signalDetectionFacetingUtility.populateFacets(sdh, facetingDefinition))
      .collect(Collectors.toList());
  }

  @Override
  public List<SignalDetection> findByStationsAndTime(List<Station> stations, Instant startTime, Instant endTime,
    WorkflowDefinitionId stageId, List<SignalDetection> excludedSignalDetections) {

    Objects.requireNonNull(stations, NULL_STATIONS_MESSAGE);
    Preconditions.checkState(!stations.isEmpty(), EMPTY_STATIONS_MESSAGE);
    Preconditions.checkState(startTime.isBefore(endTime), START_END_TIME_ERR);
    Preconditions.checkNotNull(stageId, NULL_STAGE_ID_MESSAGE);
    Preconditions.checkNotNull(excludedSignalDetections, NULL_EXCLUDED_SIGNAL_DETECTIONS_LIST);

    return signalDetectionRepository.findByStationsAndTime(
      stations, startTime, endTime, stageId, excludedSignalDetections);
  }

  @Override
  public List<SignalDetection> findByStationsAndTime(List<Station> stations,
    Instant startTime,
    Instant endTime,
    WorkflowDefinitionId stageId,
    List<SignalDetection> excludedSignalDetections,
    FacetingDefinition facetingDefinition) {

    Objects.requireNonNull(stations, NULL_STATIONS_MESSAGE);
    Objects.requireNonNull(startTime, NULL_START_TIME_MESSAGE);
    Objects.requireNonNull(endTime, NULL_END_TIME_MESSAGE);
    Objects.requireNonNull(stageId, NULL_STAGE_ID_MESSAGE);
    Objects.requireNonNull(excludedSignalDetections, NULL_EXCLUDED_SIGNAL_DETECTIONS_LIST);
    Objects.requireNonNull(facetingDefinition, NULL_FACETING_DEFINITION_MESSAGE);
    Preconditions.checkState(!stations.isEmpty(), EMPTY_STATIONS_MESSAGE);
    Preconditions.checkState(startTime.isBefore(endTime), START_END_TIME_ERR);
    Preconditions.checkState(initialized, MISSING_FACETING_UTILITY_MESSAGE);

    return signalDetectionRepository
      .findByStationsAndTime(stations, startTime, endTime, stageId, excludedSignalDetections)
      .stream()
      .map(detection -> signalDetectionFacetingUtility.populateFacets(detection, facetingDefinition, stageId))
      .filter(Objects::nonNull)
      .collect(Collectors.toList());
  }

  /**
   * Find {@link ChannelSegment}s using list of {@link SignalDetection}
   *
   * @param signalDetections list of {@link SignalDetection}
   * @return collection of {@link ChannelSegment}
   */
  Collection<ChannelSegment<Waveform>> findChannelSegments(List<SignalDetection> signalDetections) {

    Set<ChannelSegmentDescriptor> channelSegmentDescriptors = signalDetections.stream()
      .flatMap(sd -> sd.getSignalDetectionHypotheses().stream())
      .filter(SignalDetectionHypothesis::isPresent)
      .flatMap(sdh -> sdh.getFeatureMeasurements().stream())
      .map(fm -> fm.getMeasuredChannelSegment().getId())
      .collect(Collectors.toSet());

    return channelSegmentDescriptors.isEmpty() ? new ArrayList<>() :
      waveformAccessor.findByChannelSegmentDescriptors(channelSegmentDescriptors);
  }

  @Override
  public Mono<FilterDefinitionByUsageBySignalDetectionHypothesis> findFilterDefinitionsForSignalDetections(List<SignalDetection> signalDetections, WorkflowDefinitionId stageId) {
    var sdWithSimpleHypothesesDefinition = FacetingDefinition.builder()
      .setClassType(SignalDetection.class.getSimpleName())
      .setPopulated(true)
      .addFacetingDefinitions(STATION, stationFacetingDefinition)
      .addFacetingDefinitions("signalDetectionHypotheses", FacetingDefinition.builder()
        .setClassType(SignalDetectionHypothesis.class.getSimpleName())
        //TODO: Faceting utility doesn't seem to properly handle when we only want hypotheses as entity refrences
        .setPopulated(true)
        .addFacetingDefinitions(STATION, stationFacetingDefinition)
        .addFacetingDefinitions("featureMeasurements", featureMeasurementFacetingDefinition)
        .build())
      .build();

    return Mono.just(signalDetections)
      .map(sds -> {
        Preconditions.checkArgument(
          !signalDetections.isEmpty(), "Must provide at least one signal detection");
        return sds;
      })
      .map(sds -> FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
        .setSignalDetectionsHypotheses(resolveHypotheses(sds, sdWithSimpleHypothesesDefinition, stageId))
        .build())
      .flatMap(request -> secClient.queryDefaultFilterDefByUsageForSDHs(request));
  }

  private List<SignalDetectionHypothesis> resolveHypotheses(List<SignalDetection> sds, FacetingDefinition definition, WorkflowDefinitionId stageId) {
    var hypotheses = sds.stream()
      .map(sd ->
        Optional.ofNullable(sd.isPresent() ?
          sd : signalDetectionFacetingUtility.populateFacets(sd, definition, stageId))
          .or(() -> {
            logger.warn("Faceting utility returned null for faceted detection {}", sd.getId());
            return Optional.empty();
          }))
      .flatMap(Optional::stream)
      .map(sd -> {
        var sdhs = sd.getSignalDetectionHypotheses();
        if (sdhs.isEmpty()) {
          logger.warn("Provided signal detection {} did not resolve any of its hypotheses", sd.getId());
        }
        return sdhs;
      })
      .flatMap(List::stream)
      .collect(Collectors.toList());
    Preconditions.checkArgument(!hypotheses.isEmpty(), "Signal detections provided must collectively resolve at least one signal detection hypothesis");
    return hypotheses;
  }
}
