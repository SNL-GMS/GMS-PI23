
package gms.shared.signalenhancementconfiguration.service;

import com.google.common.base.Preconditions;
import gms.shared.event.coi.EventHypothesis;
import gms.shared.featureprediction.utilities.math.GeoMath;
import gms.shared.frameworks.configuration.Selector;
import gms.shared.frameworks.configuration.repository.client.ConfigurationConsumerUtility;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByFilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterConfiguration;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.signalenhancementconfiguration.coi.types.FilterDefinitionUsage;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelProcessingMetadataType;
import gms.shared.stationdefinition.coi.filter.FilterDefinition;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;


@Component("signalEnhancementConfigurationResolver")
public class SignalEnhancementConfiguration implements SignalEnhancementConfigurationInterface{
  private static final String STATION_NAME_SELECTOR = "station";
  private static final String CHANNEL_GROUP_NAME_SELECTOR = "channelGroup";
  private static final String CHANNEL_BAND_NAME_SELECTOR = "channelBand";
  private static final String CHANNEL_INSTRUMENT_NAME_SELECTOR = "channelInstrument";
  private static final String CHANNEL_ORIENTATION_NAME_SELECTOR = "channelOrientation";
  private static final String PHASE_NAME_SELECTOR = "phase";
  private static final String DISTANCE_NAME_SELECTOR = "distance";
  private static final String FILTER_DEFINITION_USAGE_SELECTOR = "filter";
  private static final String DISTANCE_OUT_OF_RANGE = "-99.0";
  private static final String WILD_CARD = "*";


  @Value("${filterListDefinitionConfig}")
  public String filterListDefinitionConfig;

  @Value("${filterMetadataConfig}")
  public String filterMetadataConfig;
  
  private final ConfigurationConsumerUtility configurationConsumerUtility;
  
  @Autowired
  public SignalEnhancementConfiguration(ConfigurationConsumerUtility configurationConsumerUtility) {
    this.configurationConsumerUtility = configurationConsumerUtility;
  }
  
  @Override
  public FilterListDefinition filterListDefinition() {
    return configurationConsumerUtility
      .resolve(filterListDefinitionConfig, List.of(), FilterListDefinition.class);
  }
    
  @Override
  public FilterDefinitionByFilterDefinitionUsage getDefaultFilterDefinitionByUsageForChannel(Channel channel,
    Optional<EventHypothesis> eventHypothesis, Optional<PhaseType> phaseType) {

    Preconditions.checkArgument(channel.getData().isPresent(),
      "Channel is not populated.");

    var properties = getProperties(channel, phaseType, eventHypothesis);

    return FilterDefinitionByFilterDefinitionUsage.from(getFilterDefinitionUsageByFilterDefinitionMap(properties));
  }

  public Map<FilterDefinitionUsage, FilterDefinition> getFilterDefinitionUsageByFilterDefinitionMap(Properties criterionProperties) {
    var stationNameSelector = Selector.from(STATION_NAME_SELECTOR, criterionProperties.getProperty(STATION_NAME_SELECTOR));
    var channelGroupNameSelector = Selector.from(CHANNEL_GROUP_NAME_SELECTOR, criterionProperties.getProperty(CHANNEL_GROUP_NAME_SELECTOR));
    var channelBandNameSelector = Selector.from(CHANNEL_BAND_NAME_SELECTOR, criterionProperties.getProperty(CHANNEL_BAND_NAME_SELECTOR));
    var channelInstrumentNameSelector = Selector.from(CHANNEL_INSTRUMENT_NAME_SELECTOR, criterionProperties.getProperty(CHANNEL_INSTRUMENT_NAME_SELECTOR));
    var channelOrientationNameSelector = Selector.from(CHANNEL_ORIENTATION_NAME_SELECTOR, criterionProperties.getProperty(CHANNEL_ORIENTATION_NAME_SELECTOR));
    var phaseNameSelector = Selector.from(PHASE_NAME_SELECTOR, criterionProperties.getProperty(PHASE_NAME_SELECTOR));
    var distanceNameSelector = Selector.from(DISTANCE_NAME_SELECTOR, getDistance(criterionProperties));

    return Arrays.stream(FilterDefinitionUsage.values()).collect(Collectors.toMap(Function.identity(), filterDefinitionUsage
      -> configurationConsumerUtility.resolve(filterMetadataConfig, List.of(
        stationNameSelector, channelGroupNameSelector, channelBandNameSelector, channelInstrumentNameSelector,
        channelOrientationNameSelector, phaseNameSelector, distanceNameSelector,
        Selector.from(FILTER_DEFINITION_USAGE_SELECTOR, filterDefinitionUsage.getName())), FilterConfiguration.class).getFilterDefinition()));
  }

  public Properties getProperties(Channel channel, Optional<PhaseType> phaseType, Optional<EventHypothesis> eventHypothesis) {
    var station = channel.getStation().getName();
    var channelGroup = channel.getProcessingMetadata().get(ChannelProcessingMetadataType.CHANNEL_GROUP).toString(); 
    var channelBand = String.valueOf(channel.getChannelBandType().getCode());
    var channelInstrument = String.valueOf(channel.getChannelInstrumentType().getCode());
    var channelOrientation = String.valueOf(channel.getChannelOrientationType().getCode());
    var phase = phaseType.orElse(PhaseType.UNKNOWN).getLabel();
    var properties = new Properties();

    properties.setProperty(STATION_NAME_SELECTOR, station);
    properties.setProperty(CHANNEL_GROUP_NAME_SELECTOR, channelGroup);
    properties.setProperty(CHANNEL_BAND_NAME_SELECTOR, channelBand);
    properties.setProperty(CHANNEL_INSTRUMENT_NAME_SELECTOR, channelInstrument);
    properties.setProperty(CHANNEL_ORIENTATION_NAME_SELECTOR, channelOrientation);
    properties.setProperty(PHASE_NAME_SELECTOR, phase);
    properties.setProperty(DISTANCE_NAME_SELECTOR, "");

    eventHypothesis.ifPresent(event -> event.getData()
      .ifPresent(data -> data.getPreferredLocationSolution()
      .ifPresent(preferredLocation -> preferredLocation.getData()
      .ifPresent(location -> properties.setProperty(DISTANCE_NAME_SELECTOR,
      String.valueOf(GeoMath.greatCircleAngularSeparation(location.getLocation()
        .getLatitudeDegrees(), location.getLocation().getLongitudeDegrees(), channel
        .getLocation().getLatitudeDegrees(), channel.getLocation().getLongitudeDegrees())))))));

    return properties;
  }

  public double getDistance(Properties criterionProperties) {
    String distance = criterionProperties.getProperty(DISTANCE_NAME_SELECTOR);
    if (distance.equals(WILD_CARD) || distance.isEmpty()) {
      distance = DISTANCE_OUT_OF_RANGE;
    }
    
    return Double.parseDouble(distance);
  }
}
