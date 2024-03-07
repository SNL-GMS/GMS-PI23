package gms.shared.signalenhancementconfiguration.utils;

import java.util.Set;
import gms.shared.event.coi.EventHypothesis;
import gms.shared.event.coi.EventTestFixtures;
import gms.shared.frameworks.configuration.Selector;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.signaldetection.coi.detection.FeatureMeasurement;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesisId;
import gms.shared.signaldetection.coi.types.FeatureMeasurementTypes;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.signaldetection.coi.values.ArrivalTimeMeasurementValue;
import gms.shared.signaldetection.coi.values.PhaseTypeMeasurementValue;
import gms.shared.signaldetection.testfixtures.SignalDetectionTestFixtures;

import static gms.shared.signaldetection.testfixtures.SignalDetectionTestFixtures.ARRIVAL_TIME_MEASUREMENT;
import static gms.shared.signaldetection.testfixtures.SignalDetectionTestFixtures.SIGNAL_DETECTION_FM_SNR;
import static gms.shared.signaldetection.testfixtures.SignalDetectionTestFixtures.detectionId;
import static gms.shared.signaldetection.testfixtures.SignalDetectionTestFixtures.hypothesis1Id;

import gms.shared.signalenhancementconfiguration.coi.filter.FilterList;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelBandType;
import gms.shared.stationdefinition.coi.channel.ChannelDataType;
import gms.shared.stationdefinition.coi.channel.ChannelInstrumentType;
import gms.shared.stationdefinition.coi.channel.ChannelOrientationType;
import gms.shared.stationdefinition.coi.channel.ChannelProcessingMetadataType;
import gms.shared.stationdefinition.coi.channel.Location;
import gms.shared.stationdefinition.coi.channel.Orientation;
import gms.shared.stationdefinition.coi.filter.CascadeFilterDescription;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.coi.filter.LinearFilterDescription;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.utils.Units;

import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.Waveform;
import gms.shared.waveform.processingmask.coi.ProcessingMask;

import static gms.shared.waveform.testfixture.WaveformTestFixtures.SEGMENT_START;
import static gms.shared.waveform.testfixture.WaveformTestFixtures.epochStart100RandomSamples;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class ConfigurationTestUtility {

  private static final String NAME_SELECTOR = "name";

  private static final String filterDefinitionConfig = "global.filter-definition";
  private static final String filterDescriptionConfig = "global.filter-description";
  private static final String cascadeFilterConfig = "global.filter-cascade";
  private static final String filterListConfig = "global.filter-list";

  public static final Double DEFAULT_DOUBLE = 834.0;
  public static final String DEFAULT_STRING = "a default String";
  public static final Instant START = Instant.parse("2008-11-10T17:26:44Z");
  public static final Instant END = Instant.parse("2019-07-23T10:42:29Z");
  public static final SignalDetectionHypothesisId RANDOM_SIG_DET_HYP_ID = SignalDetectionHypothesisId.from(detectionId, hypothesis1Id);
  private final ConfigurationConsumerUtility configurationConsumerUtility;
  private static final Waveform EARLIER_WAVEFORM = Waveform.create(
    START, 1.0, new double[5]);
  private static final Waveform LATER_WAVEFORM = Waveform.create(
    START.plusSeconds(30), 1.0, new double[10]);
  private static final List<Waveform> WFS = List
    .of(LATER_WAVEFORM, EARLIER_WAVEFORM);

  public ConfigurationTestUtility(ConfigurationConsumerUtility configurationConsumerUtility) {
    this.configurationConsumerUtility = configurationConsumerUtility;
  }

  public List<FilterDefinition> filterDefinitionList() {
    return Arrays.stream(FilterName.values())
      .map(filterName -> configurationConsumerUtility.resolve(filterDefinitionConfig,
      List.of(Selector.from(NAME_SELECTOR, filterName.getFilter())), FilterDefinition.class)).collect(Collectors.toList());
  }

  public Map<String, FilterDefinition> filterDefinitionMap() {
    return filterDefinitionList().stream()
      .collect(Collectors.toMap(FilterDefinition::getName, Function.identity()));
  }

  public List<LinearFilterDescription> filterDescriptionList(FilterDescriptionName... filterDescriptionNames) {
    return Arrays.stream(filterDescriptionNames)
      .map(filterName -> configurationConsumerUtility.resolve(filterDescriptionConfig,
      List.of(Selector.from(NAME_SELECTOR, filterName.getFilterDescription())),
      LinearFilterDescription.class))
      .collect(Collectors.toList());
  }

  public Map<String, FilterDefinition> cascadeFilterMap() {
    List<CascadeFilterDescription> cascadeFilterDescriptions = Arrays.stream(CascadeFilterName.values())
      .map(cascadeFilterName -> configurationConsumerUtility.resolve(cascadeFilterConfig,
      List.of(Selector.from(NAME_SELECTOR, cascadeFilterName.getFilterName())),
      CascadeFilterDescription.class))
      .collect(Collectors.toList());

    return cascadeFilterDescriptions.stream()
      .map(cascadeFilterDescription -> FilterDefinition.from(
      cascadeFilterDescription.getComments()
        .map(x -> x.replace(" comments", ""))
        .orElse("name"),
      cascadeFilterDescription.getComments(),
      cascadeFilterDescription))
      .collect(Collectors.toMap(FilterDefinition::getName, Function.identity()));
  }

  public Map<String, FilterList> filterListMap() {
    return Arrays.stream(FilterListName.values())
      .map(filterListName -> configurationConsumerUtility.resolve(filterListConfig,
      List.of(Selector.from(NAME_SELECTOR, filterListName.getFilterName())), FilterList.class))
      .collect(Collectors.toMap(FilterList::getName, Function.identity()));
  }

  public static SignalDetectionHypothesis buildSignalDetectionHypothesis(String stationName, String channelGroup, ChannelBandType bandType, ChannelInstrumentType instrumentType, ChannelOrientationType orientationType, Location receiverLocation, PhaseType signalPhaseType) {
    Channel channel = buildChannel(stationName, channelGroup, bandType, instrumentType, orientationType, receiverLocation, Optional.empty());
    SignalDetectionHypothesis protoHypothesis = SignalDetectionTestFixtures.HYPOTHESIS_FROM_ARRIVAL_1;
    SignalDetectionHypothesis.Data protodata = protoHypothesis.getData().orElseThrow();
    FeatureMeasurement<PhaseTypeMeasurementValue> phaseTypeFeatureMeasurement = getPhaseFeatureMeasurement(channel, signalPhaseType);
    FeatureMeasurement<ArrivalTimeMeasurementValue> arrivalTimeFeatureMeasurement = getArrivalTimeFeatureMeasurement(channel);

    return protoHypothesis.toBuilder()
      .setData(protodata.toBuilder()
        .setFeatureMeasurements(Set.of(arrivalTimeFeatureMeasurement, phaseTypeFeatureMeasurement))
        .setStation(Station.createEntityReference(stationName))
        .build())
      .build();
  }

  public static SignalDetectionHypothesis buildSignalDetectionHypothesisWithVersionChannelInFeatureMeasurement(String stationName, String channelGroup, ChannelBandType bandType, ChannelInstrumentType instrumentType, ChannelOrientationType orientationType, Location receiverLocation, PhaseType signalPhaseType) {
    Channel channel = buildChannel(stationName, channelGroup, bandType, instrumentType, orientationType, receiverLocation, Optional.empty());
    SignalDetectionHypothesis protoHypothesis = SignalDetectionTestFixtures.HYPOTHESIS_FROM_ARRIVAL_1;
    SignalDetectionHypothesis.Data protodata = protoHypothesis.getData().orElseThrow();
    FeatureMeasurement<PhaseTypeMeasurementValue> phaseTypeFeatureMeasurement = getPhaseFeatureMeasurement(channel, signalPhaseType);
    FeatureMeasurement<ArrivalTimeMeasurementValue> arrivalTimeFeatureMeasurement = getArrivalTimeFeatureMeasurementWithVersionedChannel(channel);

    return protoHypothesis.toBuilder()
      .setData(protodata.toBuilder()
        .setFeatureMeasurements(Set.of(arrivalTimeFeatureMeasurement, phaseTypeFeatureMeasurement))
        .setStation(Station.createEntityReference(stationName))
        .build())
      .build();
  }

  public static ChannelSegment<Waveform> buildChannelSegment(String stationName, String channelGroup, ChannelBandType bandType, ChannelInstrumentType instrumentType, ChannelOrientationType orientationType, Location receiverLocation, PhaseType signalPhaseType, Collection<ProcessingMask> maskedBy) {
    Channel channel = buildChannel(stationName, channelGroup, bandType, instrumentType, orientationType, receiverLocation, Optional.of(signalPhaseType));
    return ChannelSegment.from(channel, channel.getUnits(), WFS, Instant.EPOCH.plusSeconds(10), maskedBy);
  }
  
  public static ChannelSegment<Waveform> buildChannelSegmentWithTime(String stationName, String channelGroup, ChannelBandType bandType, ChannelInstrumentType instrumentType, ChannelOrientationType orientationType, Location receiverLocation, PhaseType signalPhaseType, Collection<ProcessingMask> maskedBy, Instant startTime) {
    Channel channel = buildChannel(stationName, channelGroup, bandType, instrumentType, orientationType, receiverLocation, Optional.of(signalPhaseType));
    return ChannelSegment.from(channel, channel.getUnits(), WFS, startTime, maskedBy);
  }

  public static FeatureMeasurement<ArrivalTimeMeasurementValue> getArrivalTimeFeatureMeasurement(Channel channel) {
    ChannelSegment<Waveform> segment = ChannelSegment.from(channel, channel.getUnits(), List.of(epochStart100RandomSamples(channel.getNominalSampleRateHz())), SEGMENT_START.minus(1, ChronoUnit.MINUTES), List.of());//add processing mask data??

    return FeatureMeasurement.from(channel, segment, FeatureMeasurementTypes.ARRIVAL_TIME, ARRIVAL_TIME_MEASUREMENT, SIGNAL_DETECTION_FM_SNR);
  }

  public static FeatureMeasurement<ArrivalTimeMeasurementValue> getArrivalTimeFeatureMeasurementWithVersionedChannel(Channel channel) {
    ChannelSegment<Waveform> segment = ChannelSegment.from(channel, channel.getUnits(), List.of(epochStart100RandomSamples(channel.getNominalSampleRateHz())), SEGMENT_START.minus(1, ChronoUnit.MINUTES), List.of());//add processing mask data??
    Instant effectiveAt = channel.getEffectiveAt().orElseThrow();
    Channel versionedChannel = channel.toEntityReference().toBuilder().setEffectiveAt(effectiveAt).build();
    return FeatureMeasurement.from(versionedChannel, segment, FeatureMeasurementTypes.ARRIVAL_TIME, ARRIVAL_TIME_MEASUREMENT, SIGNAL_DETECTION_FM_SNR);
  }

  public static FeatureMeasurement<PhaseTypeMeasurementValue> getPhaseFeatureMeasurement(Channel channel, PhaseType phaseType) {
    ChannelSegment<Waveform> segment = ChannelSegment.from(channel, channel.getUnits(), List.of(epochStart100RandomSamples(channel.getNominalSampleRateHz())), SEGMENT_START.minus(1, ChronoUnit.MINUTES), List.of());//add processing mask data??
    PhaseTypeMeasurementValue phaseMeasurement = PhaseTypeMeasurementValue.fromFeaturePrediction(
      phaseType, Optional.of(0.5));
    return FeatureMeasurement.from(channel, segment,
      FeatureMeasurementTypes.PHASE, phaseMeasurement, Optional.empty());
  }

  public static Channel buildChannel(String stationName, String channelGroup, ChannelBandType bandType, ChannelInstrumentType instrumentType, ChannelOrientationType orientationType, Location location, Optional<PhaseType> beamPhase) {
    Map<ChannelProcessingMetadataType, Object> processingMetadata = new EnumMap<>(ChannelProcessingMetadataType.class);
    processingMetadata.put(ChannelProcessingMetadataType.CHANNEL_GROUP, channelGroup);
    if (beamPhase.isPresent()) {
      processingMetadata.put(ChannelProcessingMetadataType.BEAM_TYPE, beamPhase.get());
    }

    var data = Channel.Data.builder()
      .setCanonicalName(DEFAULT_STRING)
      .setDescription(DEFAULT_STRING)
      .setStation(Station.createEntityReference(stationName))
      .setChannelDataType(ChannelDataType.DIAGNOSTIC_SOH)
      .setChannelBandType(bandType)
      .setChannelInstrumentType(instrumentType)
      .setChannelOrientationType(orientationType)
      .setChannelOrientationCode(orientationType.getCode())
      .setUnits(Units.NANOMETERS)
      .setNominalSampleRateHz(DEFAULT_DOUBLE)
      .setLocation(location)
      .setOrientationAngles(Orientation.from(
        DEFAULT_DOUBLE,
        DEFAULT_DOUBLE))
      .setConfiguredInputs(List.of())
      .setProcessingDefinition(Map.of())
      .setProcessingMetadata(processingMetadata)
      .setResponse(Optional.empty())
      .setEffectiveUntil(END)
      .build();

    return Channel.builder()
      .setName(DEFAULT_STRING)
      .setEffectiveAt(START)
      .setData(data)
      .build();
  }

  public static EventHypothesis buildEventHypothesis(Location location) {
    return EventTestFixtures.generateDummyEventHypothesisForFilterTest(location.getLatitudeDegrees(), location.getLongitudeDegrees());
  }

}
