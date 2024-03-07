package gms.shared.stationdefinition.coi.channel;

import com.google.common.base.Preconditions;
import gms.shared.fk.coi.FkSpectraDefinition;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.utils.Units;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

public class ChannelFactory {

  private ChannelFactory() {
    // prevent instantiation
  }

  public static Channel createFkChannel(Station station, List<Channel> inputChannels, FkSpectraDefinition fkSpectraDefinition) {
    Objects.requireNonNull(station, "Cannot create FK CHannel from null Station");
    Objects.requireNonNull(inputChannels, "Cannot create FK Channel from null input Channels");
    Objects.requireNonNull(fkSpectraDefinition, "Cannot create FK Channel from null FkSpectraDefinition");
    Preconditions.checkArgument(station.isPresent(), "Cannot create FK Channel from faceted Station");
    Preconditions.checkArgument(!inputChannels.isEmpty(), "Cannot create FK Channel from empty input Channels");

    List<Channel> populatedChannels = inputChannels.stream()
      .filter(Channel::isPresent)
      .collect(Collectors.toList());

    Preconditions.checkState(populatedChannels.size() == inputChannels.size(), "Cannot create FK Channel from faceted input Channels");
    List<String> stationNames = populatedChannels.stream()
      .map(Channel::getData)
      .filter(Optional::isPresent)
      .map(Optional::get)
      .map(Channel.Data::getStation)
      .map(Station::getName)
      .filter(stationName -> !stationName.equals(station.getName()))
      .distinct()
      .collect(Collectors.toList());

    Preconditions.checkState(stationNames.isEmpty(), "Cannot create FK Channel from Channels from multiple Stations");

    var baseChannel = populatedChannels.get(0);
    var data = baseChannel.getData().orElseThrow();

    List<Channel> configuredInputs = populatedChannels.stream()
      .map(Channel::toEntityReference)
      .collect(Collectors.toList());

    Map<ChannelProcessingMetadataType, Object> metadata = new EnumMap<>(ChannelProcessingMetadataType.class);
    metadata.putAll(metadata);
    metadata.put(ChannelProcessingMetadataType.CHANNEL_GROUP, "fk");

    var orientationType = data.getChannelOrientationType();

    Orientation orientation;

    if (orientationType == ChannelOrientationType.VERTICAL) {
      // TODO: The individual angles within the orientation object should be optionals.  
      // once that change is made, the horizontal angle for this case should be an emtpy optional
      orientation = Orientation.from(Double.NaN, 0);
    } else if (orientationType == ChannelOrientationType.NORTH_SOUTH) {
      orientation = Orientation.from(0, 90.0);
    } else if (orientationType == ChannelOrientationType.EAST_WEST) {
      orientation = Orientation.from(90.0, 90.0);
    } else {
      orientation = Orientation.from(Double.NaN, Double.NaN);
    }

    Optional<Instant> possibleEffectiveAt = inputChannels.stream()
      .map(Channel::getEffectiveAt)
      .filter(Optional::isPresent)
      .map(Optional::get)
      .max(Instant::compareTo);

    // Previous checks guarantee that all channels will have an effectiveAt
    Instant effectiveAt = possibleEffectiveAt.orElse(null);

    Optional<Instant> possibleEffectiveUntil = inputChannels.stream()
      .map(Channel::getEffectiveUntil)
      .filter(Optional::isPresent)
      .map(Optional::get)
      .min(Instant::compareTo);

    var updatedData = data.toBuilder()
      .setStation(station.toEntityReference())
      .setNominalSampleRateHz(fkSpectraDefinition.getSampleRateHz())
      .setConfiguredInputs(configuredInputs)
      .setLocation(station.getLocation())
      .setUnits(Units.NANOMETERS_SQUARED_PER_SECOND)
      .setProcessingMetadata(metadata)
      .setOrientationAngles(orientation)
      .setEffectiveUntil(possibleEffectiveUntil)
      .setResponse(Optional.empty())
      .build();

    Channel derived = baseChannel.toBuilder()
      .setEffectiveAt(effectiveAt)
      .setData(updatedData)
      .build();

    String name = ChannelNameUtilities.createName(derived);
    return derived.toBuilder()
      .setName(name)
      .build();
  }

}
