package gms.shared.signalenhancementconfiguration.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import static com.google.common.base.Preconditions.checkNotNull;

import gms.shared.event.coi.EventHypothesis;
import gms.shared.frameworks.configuration.RetryConfig;
import gms.shared.frameworks.configuration.repository.FileConfigurationRepository;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.signaldetection.api.facet.SignalDetectionFacetingUtility;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.signalenhancementconfiguration.api.ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByFilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageByChannelSegment;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForChannelSegmentsRequest;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.api.SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterList;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.service.SignalEnhancementConfigurationService;
import gms.shared.signalenhancementconfiguration.service.SignalEnhancementConfiguration;
import gms.shared.signalenhancementconfiguration.utils.ConfigurationTestUtility;
import gms.shared.signalenhancementconfiguration.utils.FilterName;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelBandType;
import gms.shared.stationdefinition.coi.channel.ChannelInstrumentType;
import gms.shared.stationdefinition.coi.channel.ChannelOrientationType;
import gms.shared.stationdefinition.coi.channel.Location;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import gms.shared.stationdefinition.facet.StationDefinitionFacetingUtility;
import gms.shared.utilities.javautilities.objectmapper.ObjectMapperFactory;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.ChannelSegmentDescriptor;
import gms.shared.waveform.coi.Waveform;
import gms.shared.waveform.processingmask.coi.ProcessingMask;
import java.io.File;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Collection;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.commons.lang3.tuple.Pair;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;

import static org.junit.jupiter.params.provider.Arguments.arguments;

import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockitoExtension.class)
class SignalEnhancementConfigurationServiceTest {

  private static final String WILD_CARD = "*";
  private ConfigurationConsumerUtility configurationConsumerUtility;

  SignalEnhancementConfiguration signalEnhancementConfiguration;
  ConfigurationTestUtility testUtility;
  SignalEnhancementConfigurationService signalEnhancementConfigurationService;
  Map<String, FilterDefinition> filterDefinitionMap;
  SignalDetectionHypothesis sigDetHyp;

  @Mock
  StationDefinitionFacetingUtility stationDefinitionFacetingUtility;

  @Mock
  SignalDetectionFacetingUtility signalDetectionFacetingUtility;

  @BeforeAll
  void init() {
    var configurationRoot = checkNotNull(
      Thread.currentThread().getContextClassLoader().getResource("configuration-base")
    ).getPath();

    configurationConsumerUtility = ConfigurationConsumerUtility
      .builder(FileConfigurationRepository.create(new File(configurationRoot).toPath()))
      .retryConfiguration(RetryConfig.create(1, 2, ChronoUnit.SECONDS, 1))
      .build();
    sigDetHyp = SignalDetectionHypothesis.builder()
      .setId(ConfigurationTestUtility.RANDOM_SIG_DET_HYP_ID)
      .build();
  }

  @BeforeEach
  void setUp() {
    signalEnhancementConfiguration = new SignalEnhancementConfiguration(configurationConsumerUtility);
    signalEnhancementConfiguration.filterListDefinitionConfig = "global.filter-list-definition";
    signalEnhancementConfiguration.filterMetadataConfig = "global.filter-metadata";

    testUtility = new ConfigurationTestUtility(configurationConsumerUtility);
    signalEnhancementConfigurationService = new SignalEnhancementConfigurationService(signalEnhancementConfiguration, stationDefinitionFacetingUtility, signalDetectionFacetingUtility);
    filterDefinitionMap = testUtility.filterDefinitionMap();
  }

  @Test
  void testResolveFilterListDefinition() {
    FilterListDefinition filterListDefinition = signalEnhancementConfigurationService.filterListDefinition();

    List<FilterList> actualFilterList = filterListDefinition.getFilterLists()
      .stream()
      .collect(Collectors.toUnmodifiableList());

    List<FilterList> expectedFilterList = testUtility.filterListMap().values()
      .stream()
      .collect(Collectors.toUnmodifiableList());

    Assertions.assertEquals(expectedFilterList, actualFilterList);
  }
  
  @Test
  void multipleChannelWithDifferentTimingTest() throws JsonProcessingException {
    String station = "ASAR";
    String channelGroup = "AS31";
    ChannelBandType channelBand = ChannelBandType.BROADBAND;
    ChannelInstrumentType channelInstrument = ChannelInstrumentType.HIGH_GAIN_SEISMOMETER;
    ChannelOrientationType channelOrientation = ChannelOrientationType.NORTH_SOUTH;
    PhaseType phaseType = PhaseType.P;
    Collection<ProcessingMask> maskedBy = List.of();
    Instant startTimeCs1 = Instant.EPOCH.plusSeconds(10);
    Instant startTimeCs2 = Instant.EPOCH.plusSeconds(300);
    double channelLatitude = -23.665;
    double channelLongitude = 133.905;
    double eventHypothesisLatitude = -23.665;
    double eventHypothesisLongitude = 134.905;
    List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs = List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL));
    
    ChannelSegment<Waveform> cs1 = ConfigurationTestUtility.buildChannelSegmentWithTime(station, channelGroup, channelBand, channelInstrument, channelOrientation, Location.from(channelLatitude, channelLongitude, 0, 0), phaseType, maskedBy, startTimeCs1);//TODO Add ProcessingMask stuff here
    ChannelSegment<Waveform> cs2 = ConfigurationTestUtility.buildChannelSegmentWithTime(station, channelGroup, channelBand, channelInstrument, channelOrientation, Location.from(channelLatitude, channelLongitude, 0, 0), phaseType, maskedBy, startTimeCs2);//TODO Add ProcessingMask stuff here
    EventHypothesis eventHypothesis = ConfigurationTestUtility.buildEventHypothesis(Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));
    var request = FilterDefinitionByUsageForChannelSegmentsRequest.builder()
      .setChannelSegments(List.of(cs1, cs2))
      .setEventHypothesis(eventHypothesis)
      .build();
    var actual = signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(request);
    var expected = getChanSegFilterMap(List.of(cs1, cs2), expectedFilterDefinitionsPairs);
    
    Assertions.assertEquals(expected.getChannelSegmentByFilterDefinition(), actual.getChannelSegmentByFilterDefinition());
    Assertions.assertEquals(expected.getChannelSegmentByFilterDefinitionUsage(), actual.getChannelSegmentByFilterDefinitionUsage());
    Assertions.assertEquals(expected.getChannelSegmentByFilterDefinitionByFilterDefinitionUsage(), actual.getChannelSegmentByFilterDefinitionByFilterDefinitionUsage());
  }
  
  @Test
  void multipleChannelWithTheSameTimingTest() throws JsonProcessingException {
    String station = "ASAR";
    String channelGroup = "AS31";
    ChannelBandType channelBand = ChannelBandType.BROADBAND;
    ChannelInstrumentType channelInstrument = ChannelInstrumentType.HIGH_GAIN_SEISMOMETER;
    ChannelOrientationType channelOrientation = ChannelOrientationType.NORTH_SOUTH;
    PhaseType phaseType = PhaseType.P;
    Collection<ProcessingMask> maskedBy = List.of();
    double channelLatitude = -23.665;
    double channelLongitude = 133.905;
    double eventHypothesisLatitude = -23.665;
    double eventHypothesisLongitude = 134.905;
    List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs = List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL));
    
    ChannelSegment<Waveform> cs1 = ConfigurationTestUtility.buildChannelSegment(station, channelGroup, channelBand, channelInstrument, channelOrientation, Location.from(channelLatitude, channelLongitude, 0, 0), phaseType, maskedBy);//TODO Add ProcessingMask stuff here
    ChannelSegment<Waveform> cs2 = ConfigurationTestUtility.buildChannelSegment(station, channelGroup, channelBand, channelInstrument, channelOrientation, Location.from(channelLatitude, channelLongitude, 0, 0), phaseType, maskedBy);//TODO Add ProcessingMask stuff here
    EventHypothesis eventHypothesis = ConfigurationTestUtility.buildEventHypothesis(Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));
    var request = FilterDefinitionByUsageForChannelSegmentsRequest.builder()
      .setChannelSegments(List.of(cs1, cs2))
      .setEventHypothesis(eventHypothesis)
      .build();
    var actual = signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(request);
    var expected = getChanSegFilterMap(List.of(cs1), expectedFilterDefinitionsPairs);
    
    Assertions.assertEquals(expected, actual);
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputGetDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(String station, String channelGroup, ChannelBandType channelBand,
    ChannelInstrumentType channelInstrument, ChannelOrientationType channelOrientation, double channelLatitude, double channelLongitude,
    PhaseType phaseType, Collection<ProcessingMask> maskedBy, double eventHypothesisLatitude, double eventHypothesisLongitude, List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {
    //TODO verify whether maskedBy is needed.  currently set for parameterized tests

    SignalDetectionHypothesis sdh = ConfigurationTestUtility.buildSignalDetectionHypothesis(station,
      channelGroup, channelBand, channelInstrument, channelOrientation,
      Location.from(channelLatitude, channelLongitude, 0, 0), phaseType);
    EventHypothesis eventHypothesis = ConfigurationTestUtility.buildEventHypothesis(Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));
    var request = FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
      .setEventHypothesis(eventHypothesis)
      .setSignalDetectionsHypotheses(List.of(sdh))
      .build();

    var actual = signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);

    var expected = getSigDetFilterMap(sigDetHyp, expectedFilterDefinitionsPairs);
    Assertions.assertEquals(expected, actual);
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputGetDefaultFilterDefinitionByUsageForSignalDetectionHypothesisWithVersionedChannels(String station, String channelGroup, ChannelBandType channelBand,
    ChannelInstrumentType channelInstrument, ChannelOrientationType channelOrientation, double channelLatitude, double channelLongitude,
    PhaseType phaseType, Collection<ProcessingMask> maskedBy, double eventHypothesisLatitude, double eventHypothesisLongitude, List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {
    //TODO verify whether maskedBy is needed.  currently set for parameterized tests

    SignalDetectionHypothesis sdh = ConfigurationTestUtility.buildSignalDetectionHypothesisWithVersionChannelInFeatureMeasurement(station,
      channelGroup, channelBand, channelInstrument, channelOrientation,
      Location.from(channelLatitude, channelLongitude, 0, 0), phaseType);
    EventHypothesis eventHypothesis = ConfigurationTestUtility.buildEventHypothesis(Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));
    var request = FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
      .setEventHypothesis(eventHypothesis)
      .setSignalDetectionsHypotheses(List.of(sdh))
      .build();
    Mockito.when(stationDefinitionFacetingUtility.populateFacets(Mockito.any(Channel.class), Mockito.any(FacetingDefinition.class), Mockito.any(Instant.class)))
      .thenReturn(ConfigurationTestUtility.buildChannel(station, channelGroup, channelBand, channelInstrument, channelOrientation, Location.from(channelLatitude, channelLongitude, 0, 0), Optional.empty()));
    var actual = signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);
    var expected = getSigDetFilterMap(sigDetHyp, expectedFilterDefinitionsPairs);
    Assertions.assertEquals(expected, actual);
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputGetDefaultFilterDefinitionByUsageForFacetedSignalDetectionHypothesis(String station, String channelGroup, ChannelBandType channelBand,
    ChannelInstrumentType channelInstrument, ChannelOrientationType channelOrientation, double channelLatitude, double channelLongitude,
    PhaseType phaseType, Collection<ProcessingMask> maskedBy, double eventHypothesisLatitude, double eventHypothesisLongitude, List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {
    //TODO verify whether maskedBy is needed.  currently set for parameterized tests

    SignalDetectionHypothesis sdh = ConfigurationTestUtility.buildSignalDetectionHypothesis(station,
      channelGroup, channelBand, channelInstrument, channelOrientation,
      Location.from(channelLatitude, channelLongitude, 0, 0), phaseType);
    SignalDetectionHypothesis facetedSdh = sdh.toEntityReference();
    EventHypothesis eventHypothesis = ConfigurationTestUtility.buildEventHypothesis(Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));
    var request = FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
      .setEventHypothesis(eventHypothesis)
      .setSignalDetectionsHypotheses(List.of(facetedSdh))
      .build();
    Mockito.when(signalDetectionFacetingUtility.populateFacets(Mockito.any(), Mockito.any()))
      .thenReturn(sdh);
    var actual = signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);
    var expected = getSigDetFilterMap(sigDetHyp, expectedFilterDefinitionsPairs);
    Assertions.assertEquals(expected, actual);
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputGetDefaultUsageForChannelSegment(String station, String channelGroup, ChannelBandType channelBand,
    ChannelInstrumentType channelInstrument, ChannelOrientationType channelOrientation, double channelLatitude, double channelLongitude,
    PhaseType phaseType, Collection<ProcessingMask> maskedBy, double eventHypothesisLatitude, double eventHypothesisLongitude, List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {
    ChannelSegment<Waveform> cs = ConfigurationTestUtility.buildChannelSegment(station, channelGroup, channelBand, channelInstrument, channelOrientation, Location.from(channelLatitude, channelLongitude, 0, 0), phaseType, maskedBy);//TODO Add ProcessingMask stuff here
    EventHypothesis eventHypothesis = ConfigurationTestUtility.buildEventHypothesis(Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));
    var request = FilterDefinitionByUsageForChannelSegmentsRequest.builder()
      .setChannelSegments(List.of(cs))
      .setEventHypothesis(eventHypothesis)
      .build();
    var actual = signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(request);
    var expected = getChanSegFilterMap(List.of(cs), expectedFilterDefinitionsPairs);
    Assertions.assertEquals(expected, actual);
  }

  @ParameterizedTest
  @MethodSource("inputFilterDefinitionUsageForChannel")
  void testInputGetDefaultUsageForChannelSegmentWithFacetedChannel(String station, String channelGroup, ChannelBandType channelBand,
    ChannelInstrumentType channelInstrument, ChannelOrientationType channelOrientation, double channelLatitude, double channelLongitude,
    PhaseType phaseType, Collection<ProcessingMask> maskedBy, double eventHypothesisLatitude, double eventHypothesisLongitude, List<Pair<FilterDefinitionUsage, FilterName>> expectedFilterDefinitionsPairs) {
    ChannelSegment<Waveform> cs = ConfigurationTestUtility.buildChannelSegment(station, channelGroup, channelBand, channelInstrument, channelOrientation,
      Location.from(channelLatitude, channelLongitude, 0, 0), phaseType, maskedBy);//TODO Add ProcessingMask stuff here
    ChannelSegmentDescriptor csd = cs.getId();
    Channel channel = csd.getChannel();
    ChannelSegment<Waveform> facetedCs = cs.toBuilder().setId(ChannelSegmentDescriptor.from(channel.toEntityReference().toBuilder().setEffectiveAt(channel.getEffectiveAt()).build(), csd.getCreationTime(), csd.getStartTime(), csd.getEndTime())).build();

    EventHypothesis eventHypothesis = ConfigurationTestUtility.buildEventHypothesis(Location.from(eventHypothesisLatitude, eventHypothesisLongitude, 0, 0));
    var request = FilterDefinitionByUsageForChannelSegmentsRequest.builder()
      .setChannelSegments(List.of(facetedCs))
      .setEventHypothesis(eventHypothesis)
      .build();
    Mockito.when(stationDefinitionFacetingUtility.populateFacets(Mockito.any(Channel.class), Mockito.any(FacetingDefinition.class), Mockito.any(Instant.class)))
      .thenReturn(channel);
    var actual = signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(request);
    var expected = getChanSegFilterMap(List.of(facetedCs), expectedFilterDefinitionsPairs);
    Assertions.assertEquals(expected, actual);
  }

  static Stream<Arguments> inputFilterDefinitionUsageForChannel() {
    return Stream.of(
      arguments("ASAR", "AS31", ChannelBandType.BROADBAND, ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
        ChannelOrientationType.NORTH_SOUTH, -23.665, 133.905, PhaseType.P, List.of(), -23.665, 134.905,
        List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_5_1_5_3_HZ_NON_CAUSAL))),
      arguments("ASAR", "AS31", ChannelBandType.BROADBAND, ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
        ChannelOrientationType.VERTICAL, -23.665, 133.905, PhaseType.P, List.of(), -23.665, 134.905,
        List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_LP_0_0_4_2_1_HZ_NON_CAUSAL))),
      arguments("ASAR", "AS01", ChannelBandType.SHORT_PERIOD, ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
        ChannelOrientationType.VERTICAL, -23.665, 133.905, PhaseType.P, List.of(), -23.665, 134.905,
        List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_1_0_3_0_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_5_4_0_3_HZ_NON_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_4_0_8_0_3_HZ_CAUSAL))),
      arguments("VNDA", "VNDA1", ChannelBandType.SHORT_PERIOD, ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
        ChannelOrientationType.VERTICAL, -77.517, 161.853, PhaseType.S, List.of(), -76.517, 161.853,
        List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_1_5_3_0_3_HZ_CAUSAL))),
      arguments("VNDA", "VNDA1", ChannelBandType.SHORT_PERIOD, ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
        ChannelOrientationType.VERTICAL, -77.517, 161.853, PhaseType.P, List.of(), -75.517, 161.853,
        List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_2_0_5_0_3_HZ_CAUSAL))),
      arguments("VNDA", "VNDA1", ChannelBandType.SHORT_PERIOD, ChannelInstrumentType.HIGH_GAIN_SEISMOMETER,
        ChannelOrientationType.VERTICAL, -77.517, 161.853, PhaseType.P, List.of(), -70.517, 161.853,
        List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_4_0_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL))),
      arguments(WILD_CARD, WILD_CARD, ChannelBandType.UNKNOWN, ChannelInstrumentType.UNKNOWN,
        ChannelOrientationType.UNKNOWN, -77.517, 161.853, PhaseType.UNKNOWN, List.of(), -70.517, 161.853,
        List.of(Pair.of(FilterDefinitionUsage.DETECTION, FilterName.BW_IIR_BP_0_5_4_0_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.FK, FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL), Pair.of(FilterDefinitionUsage.ONSET, FilterName.BW_IIR_BP_0_4_3_5_3_HZ_CAUSAL))));
  }

  private FilterDefinitionByUsageBySignalDetectionHypothesis getSigDetFilterMap(SignalDetectionHypothesis signalDetectionHypothesis, List<Pair<FilterDefinitionUsage, FilterName>> filterDefintionByFilterDefinitionUsuagePairs) {
    FilterDefinitionByFilterDefinitionUsage filterDefinitionByFilterDefinitionUsage = FilterDefinitionByFilterDefinitionUsage.from(
      filterDefintionByFilterDefinitionUsuagePairs.stream()
        .map(pair -> Pair.of(pair.getLeft(), filterDefinitionMap.get(pair.getRight().toString())))
        .collect(Collectors.toMap(pair -> pair.getLeft(), pair -> pair.getRight())));
    
    return FilterDefinitionByUsageBySignalDetectionHypothesis.from(
      List.of(SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair.builder()
        .setSignalDetectionHypothesis(signalDetectionHypothesis)
        .setFilterDefinitionByFilterDefinitionUsage(filterDefinitionByFilterDefinitionUsage)
        .build()));
  }
  
  private FilterDefinitionByUsageByChannelSegment getChanSegFilterMap(List<ChannelSegment<Waveform>> chanSegs, List<Pair<FilterDefinitionUsage, FilterName>> filterDefintionByFilterDefinitionUsuagePairs) {
    FilterDefinitionByFilterDefinitionUsage filterDefinitionByFilterDefinitionUsage = FilterDefinitionByFilterDefinitionUsage.from(
      filterDefintionByFilterDefinitionUsuagePairs.stream()
        .map(pair -> Pair.of(pair.getLeft(), filterDefinitionMap.get(pair.getRight().toString())))
        .collect(Collectors.toMap(pair -> pair.getLeft(), pair -> pair.getRight())));
    
    List<ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair> pairs = chanSegs.stream().map(chanSeg -> ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair.builder()
      .setChannelSegment(chanSeg)
      .setFilterDefinitionByFilterDefinitionUsage(filterDefinitionByFilterDefinitionUsage)
      .build()).collect(Collectors.toList());
    
    return FilterDefinitionByUsageByChannelSegment.from(pairs);
  }
}
