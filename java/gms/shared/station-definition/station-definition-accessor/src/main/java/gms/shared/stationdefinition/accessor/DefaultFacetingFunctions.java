package gms.shared.stationdefinition.accessor;

import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelGroup;
import gms.shared.stationdefinition.coi.channel.Response;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.station.StationGroup;
import gms.shared.stationdefinition.converter.util.TemporalMap;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DefaultFacetingFunctions {

  private DefaultFacetingFunctions() {
  }

  private static final Logger logger = LoggerFactory.getLogger(DefaultFacetingFunctions.class);

  public static UnaryOperator<List<StationGroup>> getStationGroupForTimeFacetingFunction(EntityCachingStationDefinitionAccessor accessor,
    Instant effectiveTime) {

    return stationGroups -> {

      List<String> stationNames = stationGroups.stream()
        .flatMap(stationGroup -> stationGroup.getStations().stream())
        .filter(station -> station.getEffectiveAt().isEmpty())
        .map(Station::getName)
        .distinct()
        .collect(Collectors.toList());

      Map<String, Station> versionReferenceStations;
      if (!stationNames.isEmpty()) {
        versionReferenceStations = accessor.findStationsByNameAndTimeEmptyData(stationNames, effectiveTime).stream()
          .collect(Collectors.toMap(Station::getName, Function.identity()));
      } else {
        versionReferenceStations = new HashMap<>();
      }

      return stationGroups.stream()
        .map(stationGroup -> {

          //ensure that all stations in station group have effective at time
          List<Station> stations = stationGroup.getStations().stream()
            .map(station -> versionReferenceStations.getOrDefault(station.getName(), station).toBuilder().setData(Optional.empty()).build()
            ).collect(Collectors.toList());

          return stationGroup.toBuilder()
            .setData(stationGroup.getData().orElseThrow().toBuilder()
              .setStations(stations)
              .build())
            .build();

        }).collect(Collectors.toList());

    };
  }

  public static UnaryOperator<List<Station>> getStationsForTimeFacetingFunction(EntityCachingStationDefinitionAccessor accessor,
    Instant effectiveTime) {

    return stations -> {

      List<String> channelNames = stations.stream()
        .flatMap(station -> station.getAllRawChannels().stream())
        .filter(channel -> channel.getEffectiveAt().isEmpty())
        .map(Channel::getName)
        .collect(Collectors.toList());

      Map<String, Channel> versionReferenceChannels;
      if (!channelNames.isEmpty()) {
        versionReferenceChannels = accessor.findChannelsByNameAndTimeEmptyData(channelNames, effectiveTime).stream()
          .collect(Collectors.toMap(Channel::getName, Function.identity()));
      } else {
        versionReferenceChannels = new HashMap<>();
      }

      List<String> channelGroupNames = stations.stream()
        .flatMap(station -> station.getChannelGroups().stream())
        .filter(channelGroup -> channelGroup.getEffectiveAt().isEmpty()
        || !channelGroupHasVersionChannels(channelGroup))
        .map(ChannelGroup::getName)
        .collect(Collectors.toList());

      Map<String, ChannelGroup> channelGroupFacets;
      if (!channelGroupNames.isEmpty()) {
        // The faceting for channel groups by time is the same as the faceting for channel groups within stations by time
        channelGroupFacets = accessor.findChannelGroupsByNameAndTime(channelGroupNames, effectiveTime).stream()
          .collect(Collectors.toMap(ChannelGroup::getName, Function.identity()));
      } else {
        channelGroupFacets = new HashMap<>();
      }

      return stations.stream()
        .map(station -> {

          List<Channel> rawChannels = station.getAllRawChannels().stream()
            .map(channel
              -> versionReferenceChannels.getOrDefault(channel.getName(), channel).toBuilder().setData(Optional.empty()).build())
            .collect(Collectors.toList());

          List<String> channelNamesForFiltering = station.getAllRawChannels().stream()
            .map(Channel::getName)
            .collect(Collectors.toList());

          List<ChannelGroup> channelGroups = station.getChannelGroups().stream()
            .map(channelGroup -> channelGroupFacets.getOrDefault(channelGroup.getName(), channelGroup))
            .filter(channelGroup -> channelNamesForFiltering.containsAll(
            channelGroup.getChannels().stream().map(Channel::getName).collect(Collectors.toList())))
            .collect(Collectors.toList());

          // filter version reference channels using channel group raw channels
          List<Channel> filteredReferenceChannels = filterVersionReferenceChannels(rawChannels,
            channelGroups);

          if (channelGroups.isEmpty() || filteredReferenceChannels.isEmpty()) {
            logger.warn("No channel group or channels found for station {}", station.getName());
            return null;
          }

          return station.toBuilder()
            .setData(station.getData().orElseThrow().toBuilder()
              .setAllRawChannels(filteredReferenceChannels)
              .setChannelGroups(channelGroups)
              .build())
            .build();
        }).filter(Objects::nonNull)
        .collect(Collectors.toList());
    };
  }

  private static boolean channelGroupHasVersionChannels(ChannelGroup channelGroup) {

    if (channelGroup.isPresent()) {
      var channels = channelGroup.getChannels();

      for (Channel channel : channels) {
        if (channel.getEffectiveAt().isEmpty()) {
          return false;
        }
      }

      return true;
    }
    return false;
  }

  public static UnaryOperator<List<Station>> getStationsForTimeRangeFacetingFunction(EntityCachingStationDefinitionAccessor accessor,
    Instant startTime, Instant endTime) {

    return stations -> {

      List<String> channelGroupNames = stations.stream()
        .flatMap(station -> station.getChannelGroups().stream())
        .filter(channelGroup -> channelGroup.getEffectiveAt().isEmpty()
        || channelGroup.getData().isEmpty())
        .map(ChannelGroup::getName)
        .collect(Collectors.toList());

      TemporalMap<String, ChannelGroup> channelGroupsByNameAndTime;
      if (!channelGroupNames.isEmpty()) {

        channelGroupsByNameAndTime = accessor.findChannelGroupsByNameAndTimeRange(channelGroupNames, startTime, endTime).stream()
          .filter(ChannelGroup::isPresent)
          .filter(Objects::nonNull)
          .collect(TemporalMap.collector(ChannelGroup::getName, channelGroup -> channelGroup.getEffectiveAt().orElse(Instant.MAX)));

      } else {
        channelGroupsByNameAndTime = TemporalMap.create();
      }

      return stations.stream()
        .map(station -> {

          List<Channel> rawChannels = station.getAllRawChannels().stream()
            .map(Channel::toEntityReference)
            .collect(Collectors.toList());

          List<String> channelNamesForFiltering = station.getAllRawChannels().stream()
            .map(Channel::getName)
            .collect(Collectors.toList());

          List<ChannelGroup> channelGroups = station.getChannelGroups().stream()
            .map(channelGroup -> getCorrectChannelGroup(station, channelGroup, channelGroupsByNameAndTime))
            .filter(Objects::nonNull)
            .filter(channelGroup -> channelNamesForFiltering.containsAll(channelGroup.getChannels().stream().map(Channel::getName).collect(Collectors.toList())))
            .map(channelGroup -> {

              List<Channel> entityChannels = channelGroup.getChannels().stream()
                .map(Channel::toEntityReference)
                .collect(Collectors.toList());

              return channelGroup.toBuilder()
                .setData(channelGroup.getData().orElseThrow().toBuilder()
                  .setChannels(entityChannels)
                  .build())
                .build();
            })
            .collect(Collectors.toList());

          // filter version reference channels using channel group raw channels
          List<Channel> filteredReferenceChannels = filterVersionReferenceChannels(rawChannels,
            channelGroups);

          if (channelGroups.isEmpty() || filteredReferenceChannels.isEmpty()) {
            return null;
          }

          return station.toBuilder()
            .setData(station.getData().orElseThrow().toBuilder()
              .setAllRawChannels(filteredReferenceChannels)
              .setChannelGroups(channelGroups)
              .build())
            .build();
        }).filter(Objects::nonNull)
        .collect(Collectors.toList());
    };

  }

  private static ChannelGroup getCorrectChannelGroup(Station station, ChannelGroup channelGroup, TemporalMap<String, ChannelGroup> channelGroupsByNameAndTime) {
    //if the channel group has the correct information just return it
    if (channelGroup.getEffectiveAt().isPresent() && channelGroup.isPresent()) {
      return channelGroup;
    }

    //figure out if there is a channel group of same name that exists at the same time 
    var stationStartTime = station.getEffectiveAt().orElseThrow();
    var stationEndTime = station.getEffectiveUntil().orElse(Instant.MAX);
    var posChannelGroup = channelGroupsByNameAndTime.getVersionFloor(channelGroup.getName(), stationStartTime);
    
    if (!posChannelGroup.isEmpty() && posChannelGroup.get().getEffectiveUntil().orElse(Instant.MAX).isAfter(stationStartTime)) {
      return posChannelGroup.get();
    }
    return null;
  }

  public static UnaryOperator<List<ChannelGroup>> getChannelGroupForTimeFacetingFunction(EntityCachingStationDefinitionAccessor accessor,
    Instant effectiveTime) {

    return channelGroups -> {

      List<String> channelNames = channelGroups.stream()
        .flatMap(channelGroup -> channelGroup.getChannels().stream())
        .filter(channelGroup -> channelGroup.getEffectiveAt().isEmpty())
        .map(Channel::getName)
        .collect(Collectors.toList());

      Map<String, Channel> versionReferenceChannels;
      if (!channelNames.isEmpty()) {
        versionReferenceChannels = accessor.findChannelsByNameAndTimeEmptyData(channelNames, effectiveTime).stream()
          .collect(Collectors.toMap(Channel::getName, Function.identity()));
      } else {
        versionReferenceChannels = new HashMap<>();
      }

      return channelGroups.stream()
        .map(channelGroup -> {

          List<Channel> channels = channelGroup.getChannels().stream()
            .map(channel -> versionReferenceChannels.getOrDefault(channel.getName(), channel)
            .toBuilder().setData(Optional.empty()).build())
            .collect(Collectors.toList());

          if (channels.isEmpty()) {
            return null;
          }

          return channelGroup.toBuilder()
            .setData(channelGroup.getData().orElseThrow().toBuilder()
              .setChannels(channels)
              .build())
            .build();
        }).filter(Objects::nonNull)
        .collect(Collectors.toList());
    };
  }

  public static UnaryOperator<List<Channel>> getChannelsForTimeFacetingFunction(EntityCachingStationDefinitionAccessor accessor,
    Instant effectiveTime) {

    return channels -> {

      List<UUID> uuids = channels.stream()
        .map(Channel::getResponse)
        .filter(response -> response.isPresent() && !response.get().isPresent())
        .map(res -> res.get().getId())
        .collect(Collectors.toList());

      Map<UUID, Response> responseMap;
      if (!uuids.isEmpty()) {
        responseMap = accessor.findResponsesById(uuids, effectiveTime).stream()
          .collect(Collectors.toMap(Response::getId, Function.identity()));
      } else {
        responseMap = new HashMap<>();
      }

      return channels.stream()
        .map(channel -> {

          if (channel.getResponse().isPresent()) {
            var res = responseMap.getOrDefault(channel.getResponse().get().getId(), channel.getResponse().get());
            channel = channel.toBuilder()
              .setData(channel.getData().orElseThrow().toBuilder()
                .setResponse(res)
                .build())
              .build();
          }

          return channel;
        }).collect(Collectors.toList());
    };
  }

  /**
   * Filtering operation to remove version reference channels that don't exist
   * in channel groups
   *
   * @param versionReferenceChannels list of version reference channels
   * @param channelGroups list of channel groups
   *
   * @return filtered version reference channels
   */
  private static List<Channel> filterVersionReferenceChannels(Collection<Channel> versionReferenceChannels,
    List<ChannelGroup> channelGroups) {
    Set<String> rawChannels = channelGroups.stream()
      .map(ChannelGroup::getChannels)
      .flatMap(Collection::stream)
      .map(Channel::getName)
      .collect(Collectors.toSet());

    return versionReferenceChannels.stream()
      .filter(channel -> rawChannels.contains(channel.getName()))
      .collect(Collectors.toList());
  }

}
