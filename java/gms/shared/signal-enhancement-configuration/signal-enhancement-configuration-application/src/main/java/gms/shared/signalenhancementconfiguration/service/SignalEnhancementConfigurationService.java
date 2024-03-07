package gms.shared.signalenhancementconfiguration.service;

import gms.shared.event.coi.EventHypothesis;
import gms.shared.signaldetection.api.SignalDetectionAccessorInterface;
import gms.shared.signaldetection.api.facet.SignalDetectionFacetingUtility;
import gms.shared.signaldetection.coi.detection.FeatureMeasurement;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.coi.types.FeatureMeasurementTypes;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.signaldetection.coi.values.ArrivalTimeMeasurementValue;
import gms.shared.signaldetection.coi.values.PhaseTypeMeasurementValue;
import gms.shared.signalenhancementconfiguration.api.ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByFilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageByChannelSegment;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForChannelSegmentsRequest;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.api.SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.stationdefinition.api.StationDefinitionAccessorInterface;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelProcessingMetadataType;
import gms.shared.stationdefinition.coi.facets.FacetingDefinition;
import gms.shared.stationdefinition.facet.FacetingTypes;
import gms.shared.stationdefinition.facet.StationDefinitionFacetingUtility;
import gms.shared.waveform.api.WaveformAccessorInterface;
import gms.shared.waveform.api.facet.WaveformFacetingUtility;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.Waveform;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.stereotype.Component;

@Component("signalEnhancementConfiguration")
@ComponentScan(basePackages = {"gms.shared.signaldetection", "gms.shared.stationdefinition", "gms.shared.waveform",
  "gms.shared.emf"})
public class SignalEnhancementConfigurationService {
  private static final FacetingDefinition channelFacetingDefinition = FacetingDefinition.builder()
    .setClassType(FacetingTypes.CHANNEL_TYPE.getValue())
    .setPopulated(true)
    .build();
  private final SignalEnhancementConfigurationInterface signalEnhancementConfiguration;
    private static final FacetingDefinition featureMeasurementFacetingDefinition = FacetingDefinition.builder()
    .setClassType(FeatureMeasurement.class.getSimpleName())
    .setPopulated(true)
    .build();
  private final FacetingDefinition signalDetectionHypothesisFacetingDefinition = FacetingDefinition.builder()
    .setClassType(SignalDetectionHypothesis.class.getSimpleName())
    .setPopulated(true)
    .addFacetingDefinitions("featureMeasurements", featureMeasurementFacetingDefinition)
    .build();

  private final SignalDetectionFacetingUtility signalDetectionFacetingUtility;
  private final StationDefinitionFacetingUtility stationDefinitionFacetingUtility;
  
  @Autowired
  public SignalEnhancementConfigurationService(@Qualifier("signalEnhancementConfigurationResolver") SignalEnhancementConfigurationInterface signalEnhancementConfiguration, 
            StationDefinitionFacetingUtility stationDefinitionFacetingUtility,  WaveformAccessorInterface waveformAccessor,
    @Qualifier("bridgedAccessor") StationDefinitionAccessorInterface stationDefinitionAccessorImpl, @Qualifier("bridgedSignalDetectionAccessor") SignalDetectionAccessorInterface signalDetectionAccessor) {
 
    var waveformFacetingUtility = new WaveformFacetingUtility(waveformAccessor, stationDefinitionAccessorImpl);
    this.signalEnhancementConfiguration = signalEnhancementConfiguration;
    this.signalDetectionFacetingUtility = SignalDetectionFacetingUtility.create(signalDetectionAccessor, waveformFacetingUtility, stationDefinitionFacetingUtility);
    this.stationDefinitionFacetingUtility = stationDefinitionFacetingUtility;
  }

   public SignalEnhancementConfigurationService(SignalEnhancementConfiguration signalEnhancementConfiguration, 
            StationDefinitionFacetingUtility stationDefinitionFacetingUtility, SignalDetectionFacetingUtility signalDetectionFacetingUtility) {
    this.signalEnhancementConfiguration = signalEnhancementConfiguration;
    this.signalDetectionFacetingUtility = signalDetectionFacetingUtility;
    this.stationDefinitionFacetingUtility = stationDefinitionFacetingUtility;
  }
  public FilterListDefinition filterListDefinition() {
    return signalEnhancementConfiguration.filterListDefinition();
  }
    /**
   * Resolves default FilterDefinitions for each of the provided ChannelSegment objects for each FilterDefinitionUsage literal
   *
   * @param request A list of ChannelSegment and an optional EventHypothesis
   * @return A map of maps consisting of SignalDetectionHypothesis keys to values consisting of maps of FilterDefinitionUsuage keys to FilterDefinition values
   */
  public FilterDefinitionByUsageByChannelSegment getDefaultFilterDefinitionByUsageForChannelSegments(FilterDefinitionByUsageForChannelSegmentsRequest request) {
      Map<ChannelSegment<Waveform>, Channel> channelSegmentToChannel = request.getChannelSegments().stream()
              .map(chanSeg ->  Pair.of(chanSeg, chanSeg.getId().getChannel().isPresent()? chanSeg.getId().getChannel() : populateChannel(chanSeg.getId().getChannel())))
              .collect(Collectors.toMap(Pair::getLeft, Pair::getRight, (oldValue, newValue) -> oldValue));
      
      Map<Channel, FilterDefinitionByFilterDefinitionUsage> channelToFilterDefinitionUsage = channelSegmentToChannel.values().stream()
              .map(channel -> Pair.of(channel, signalEnhancementConfiguration.getDefaultFilterDefinitionByUsageForChannel(channel, request.getEventHypothesis(), getPhaseTypeFromChannelBeamDef(channel))))
              .collect(Collectors.toMap(Pair::getLeft, Pair::getRight, (oldValue, newValue) -> oldValue));
      return channelSegmentToChannel.entrySet().stream()
              .map(entry -> ChannelSegmentFilterDefinitionByFilterDefinitionUsagePair.builder()
                      .setChannelSegment(entry.getKey())
                      .setFilterDefinitionByFilterDefinitionUsage(channelToFilterDefinitionUsage.get(entry.getValue()))
                      .build())
              .collect(Collectors.collectingAndThen(Collectors.toList(), FilterDefinitionByUsageByChannelSegment::from)); 
  }
  /**
   * Resolves default FilterDefinitions for each of the provided SignalDetectionHypothesis objects for each FilterDefinitionUsage literal
   *
   * @param request A list of SignalDetectionHypotheses and an optional EventHypothesis
   * @return A map of maps consisting of SignalDetectionHypothesis keys to values consisting of maps of FilterDefinitionUsuage keys to FilterDefinition values
   */
  public FilterDefinitionByUsageBySignalDetectionHypothesis getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(FilterDefinitionByUsageForSignalDetectionHypothesesRequest request) {
      Collection<SignalDetectionHypothesis> signalDetectionHypothesises = populateSignalDetectionHypothesises(request.getSignalDetectionsHypotheses());
      Optional<EventHypothesis> eventHypothesis = request.getEventHypothesis();
      Map<SignalDetectionHypothesis, Optional<PhaseType>> hypothesisToPhaseTypeMap = signalDetectionHypothesises.stream()
              .collect(Collectors.toMap(Function.identity(), this::getPhaseType));
      Map<SignalDetectionHypothesis, Channel> hypothesisToChannelMap = signalDetectionHypothesises.stream()
              .collect(Collectors.toMap(Function.identity(), this::getArrivalTimeFeatureMeasurementChannel));
      
      List<SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair> signalDetectionFilterDefByUsuagePairs = signalDetectionHypothesises.stream()
              .map(hypoth -> SignalDetectionHypothesisFilterDefinitionByFilterDefinitionUsagePair.create(hypoth.toEntityReference(), 
                      signalEnhancementConfiguration.getDefaultFilterDefinitionByUsageForChannel(hypothesisToChannelMap.get(hypoth), eventHypothesis, hypothesisToPhaseTypeMap.get(hypoth))))
              .collect(Collectors.toList());
      return FilterDefinitionByUsageBySignalDetectionHypothesis.from(signalDetectionFilterDefByUsuagePairs);
  }
  
  private Channel getArrivalTimeFeatureMeasurementChannel(SignalDetectionHypothesis signalDetectionHypothesis) {
      Optional<FeatureMeasurement<ArrivalTimeMeasurementValue>> arrivalTime =
      signalDetectionHypothesis.getData().orElseThrow().getFeatureMeasurement(FeatureMeasurementTypes.ARRIVAL_TIME); 
      var featureChannel = arrivalTime.orElseThrow().getChannel();
      featureChannel = featureChannel.isPresent() ? featureChannel: populateChannel(featureChannel);
      return featureChannel;
  }

  private Optional<PhaseType> getPhaseType(SignalDetectionHypothesis signalDetectionHypothesis) {
      Optional<FeatureMeasurement<PhaseTypeMeasurementValue>> phase =
        signalDetectionHypothesis.getData().orElseThrow().getFeatureMeasurement(FeatureMeasurementTypes.PHASE);
      return phase.isPresent() ? Optional.of(phase.get().getMeasurementValue().getValue()): Optional.empty();
  }
  private Optional<PhaseType> getPhaseTypeFromChannelBeamDef(Channel channel) {
      var phaseType = (PhaseType) channel.getProcessingMetadata().get(ChannelProcessingMetadataType.BEAM_TYPE);
      return Optional.ofNullable(phaseType);
  }
  private Collection<SignalDetectionHypothesis> populateSignalDetectionHypothesises(Collection<SignalDetectionHypothesis> signalDetectionHypothesis) {
      return signalDetectionHypothesis.stream()
              .map(hypoth -> hypoth.isPresent()? hypoth: signalDetectionFacetingUtility.populateFacets(hypoth, signalDetectionHypothesisFacetingDefinition))
              .collect(Collectors.toList());
  }
  private Channel populateChannel(Channel channel) {
      Instant effectiveAt = channel.getEffectiveAt().orElseThrow();
      return stationDefinitionFacetingUtility.populateFacets(channel, channelFacetingDefinition, effectiveAt);
  }
}
