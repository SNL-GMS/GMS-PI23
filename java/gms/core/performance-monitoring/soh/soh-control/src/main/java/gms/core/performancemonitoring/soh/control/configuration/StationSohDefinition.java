package gms.core.performancemonitoring.soh.control.configuration;

import com.google.auto.value.AutoValue;
import com.google.auto.value.extension.memoized.Memoized;
import gms.shared.frameworks.osd.coi.soh.SohMonitorType;
import org.apache.commons.lang3.Validate;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * SOH configuration for a single station.
 */
@AutoValue
public abstract class StationSohDefinition {

  /**
   * @return station name
   */
  public abstract String getStationName();

  /**
   * @return the monitor types that are in the rollup
   */
  public abstract Set<SohMonitorType> getSohMonitorTypesForRollup();
  
  /**
   * @return The environmental monitor types calculated for this station
   */
  public abstract Set<SohMonitorType> getEnvMonitorTypes();

  /**
   * @return map of SohMonitorType, so the set of channels being used for that monitor type
   */
  public abstract Map<SohMonitorType, Set<String>> getChannelsBySohMonitorType();

  /**
   * @return Channel-specific configurations
   */
  public abstract Set<ChannelSohDefinition> getChannelSohDefinitions();

  /**
   * @return The map of monitor type to time window definition
   */
  public abstract Map<SohMonitorType, TimeWindowDefinition> getTimeWindowBySohMonitorType();

  @Memoized
  public Map<String, ChannelSohDefinition> getChannelDefinitionMap() {

    return getChannelSohDefinitions().stream()
      .collect(Collectors.toMap(
        ChannelSohDefinition::getChannelName,
        Function.identity()
      ));
  }

  /**
   * Create a new StationSohDefinition object
   *
   * @param stationName name of station
   * @param sohMonitorTypesForRollup Monitor types to use in rollup
   * @param envMonitorTypes Environmental monitor types for station
   * @param channelsBySohMonitorType map of monitor type to channels
   * @param channelSohDefinitions set of channel-specific configurations
   * @param timeWindowBySohMonitorType Map of {@link SohMonitorType} to the {@link
   * TimeWindowDefinition}s to use for the calculation of that type
   * @return new StationSohDefinition
   */
  public static StationSohDefinition create(
    String stationName,
    Set<SohMonitorType> sohMonitorTypesForRollup,
    Set<SohMonitorType> envMonitorTypes,
    Map<SohMonitorType, Set<String>> channelsBySohMonitorType,
    Set<ChannelSohDefinition> channelSohDefinitions,
    Map<SohMonitorType, TimeWindowDefinition> timeWindowBySohMonitorType
  ) {

    validateParameters(
      stationName,
      sohMonitorTypesForRollup,
      envMonitorTypes,
      channelsBySohMonitorType,
      channelSohDefinitions,
      timeWindowBySohMonitorType
    );

    return new AutoValue_StationSohDefinition(
      stationName,
      sohMonitorTypesForRollup,
      envMonitorTypes,
      channelsBySohMonitorType,
      channelSohDefinitions,
      timeWindowBySohMonitorType
    );
  }

  private static void validateParameters(
    String stationName,
    Set<SohMonitorType> sohMonitorTypesForRollup,
    Set<SohMonitorType> envMonitorTypes,
    Map<SohMonitorType, Set<String>> channelsBySohMonitorType,
    Set<ChannelSohDefinition> channelSohDefinitions,
    Map<SohMonitorType, TimeWindowDefinition> timeWindowBySohMonitorType
  ) {

    Validate.notBlank(stationName, "Station name can't be blank");

    Validate.isTrue(
      channelsBySohMonitorType.keySet().containsAll(sohMonitorTypesForRollup),
      "Monitor types for rollup need to be associated with channels"
    );
    
    Validate.isTrue(
      envMonitorTypes.stream().allMatch(SohMonitorType::isEnvironmentIssue),
      "Environment Monitor types for station must all be environmental");

    Validate.isTrue(
      timeWindowBySohMonitorType.keySet().containsAll(sohMonitorTypesForRollup),
      "Monitor types for rollup need to be associated with calculation interval and backoff duration"
    );

    Set<String> definitionChannelNames = channelSohDefinitions.stream()
      .map(ChannelSohDefinition::getChannelName)
      .collect(Collectors.toSet());

    Set<String> channelNameSetDifference = channelsBySohMonitorType.values().stream()
      .flatMap(Collection::stream)
      .filter(channelName -> !definitionChannelNames.contains(channelName))
      .collect(Collectors.toSet());

    Validate.isTrue(
      channelNameSetDifference.isEmpty(),
      "There are channels mapped to a SohMonitorType without configuration: " + channelNameSetDifference
    );

  }
}
