package gms.shared.stationdefinition.coi.channel;

import gms.shared.fk.coi.FkSpectraDefinition;
import gms.shared.stationdefinition.coi.station.Station;
import gms.shared.stationdefinition.coi.utils.Units;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import static gms.shared.fk.testfixtures.FkTestFixtures.DEFINITION;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.CHANNEL;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.STATION;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.STATION_2;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class ChannelFactoryTests {

  @ParameterizedTest
  @MethodSource("getCreateFkChannelValidationArguments")
  void testCreateFkChannelValidation(Class<? extends Exception> expectedException,
    String expectedMessage,
    Station station,
    List<Channel> inputChannels,
    FkSpectraDefinition fkSpectraDefinition) {

    Exception ex = assertThrows(expectedException, () -> ChannelFactory.createFkChannel(station, inputChannels, fkSpectraDefinition));
    assertEquals(expectedMessage, ex.getMessage());
  }

  static Stream<Arguments> getCreateFkChannelValidationArguments() {
    Channel channel2 = CHANNEL.toBuilder()
      .setData(CHANNEL.getData().map(data -> data.toBuilder().setStation(STATION_2).build()))
      .build();

    return Stream.of(arguments(NullPointerException.class,
      "Cannot create FK CHannel from null Station",
      null,
      List.of(CHANNEL),
      DEFINITION),
      arguments(NullPointerException.class,
        "Cannot create FK Channel from null input Channels",
        STATION,
        null,
        DEFINITION),
      arguments(NullPointerException.class,
        "Cannot create FK Channel from null FkSpectraDefinition",
        STATION,
        List.of(CHANNEL),
        null),
      arguments(IllegalArgumentException.class,
        "Cannot create FK Channel from faceted Station",
        STATION.toEntityReference(),
        List.of(CHANNEL),
        DEFINITION),
      arguments(IllegalArgumentException.class,
        "Cannot create FK Channel from empty input Channels",
        STATION,
        List.of(),
        DEFINITION),
      arguments(IllegalStateException.class,
        "Cannot create FK Channel from faceted input Channels",
        STATION,
        List.of(CHANNEL.toEntityReference()),
        DEFINITION),
      arguments(IllegalStateException.class,
        "Cannot create FK Channel from Channels from multiple Stations",
        STATION,
        List.of(CHANNEL, channel2),
        DEFINITION));
  }

  @ParameterizedTest
  @MethodSource("getCreateFkChannelArguments")
  void testCreateFkChannel(Channel expectedChannel, Station station, List<Channel> inputChannels, FkSpectraDefinition fkSpectraDefinition) {
    Channel actualChannel = assertDoesNotThrow(() -> ChannelFactory.createFkChannel(station, inputChannels, fkSpectraDefinition));
    assertEquals(expectedChannel, actualChannel);
  }

  static Stream<Arguments> getCreateFkChannelArguments() {
    Channel verticalInputChannel = CHANNEL.toBuilder()
      .setData(CHANNEL.getData().map(data -> data.toBuilder().setStation(STATION).build()))
      .build();
    
    Channel northInputChannel = verticalInputChannel.toBuilder()
      .setData(verticalInputChannel.getData()
        .map(data -> data.toBuilder().setChannelOrientationType(ChannelOrientationType.NORTH_SOUTH)
        .setChannelOrientationCode(ChannelOrientationType.NORTH_SOUTH.getCode()).build()))
      .build();
    
    Channel eastInputChannel = northInputChannel.toBuilder()
      .setData(northInputChannel.getData()
        .map(data -> data.toBuilder().setChannelOrientationType(ChannelOrientationType.EAST_WEST)
        .setChannelOrientationCode(ChannelOrientationType.EAST_WEST.getCode())
        .build()))
      .build();
    
    Channel unknownInputChannel = eastInputChannel.toBuilder()
      .setData(eastInputChannel.getData()
        .map(data -> data.toBuilder().setChannelOrientationType(ChannelOrientationType.UNKNOWN)
          .setChannelOrientationCode(ChannelOrientationType.UNKNOWN.getCode())
          .build()))
        .build();
    
    Map<ChannelProcessingMetadataType, Object> fkMetadata = new EnumMap<>(CHANNEL.getProcessingMetadata());
    fkMetadata.put(ChannelProcessingMetadataType.CHANNEL_GROUP, "fk");
    Channel expectedVerticalChannel = verticalInputChannel.toBuilder()
      .setData(verticalInputChannel.getData()
        .map(data -> data.toBuilder()
          .setConfiguredInputs(List.of(verticalInputChannel.toEntityReference()))
          .setProcessingMetadata(fkMetadata)
          .setOrientationAngles(Orientation.from(Double.NaN, 0))
          .setUnits(Units.NANOMETERS_SQUARED_PER_SECOND)
          .setLocation(STATION.getLocation())
          .setNominalSampleRateHz(DEFINITION.getSampleRateHz())
          .setStation(STATION.toEntityReference())
          .setResponse(Optional.empty())
        .build()))
      .setName("STA.fk.BHZ/25d7911d09bc53eae87815c9f8d23acb4169a91d4e8bbd62ccbebe7d6f47957c")
      .build();

    Channel expectedNorthChannel = expectedVerticalChannel.toBuilder()
      .setData(expectedVerticalChannel.getData()
        .map(data -> data.toBuilder()
          .setConfiguredInputs(List.of(northInputChannel.toEntityReference()))
          .setChannelOrientationType(ChannelOrientationType.NORTH_SOUTH)
          .setChannelOrientationCode(ChannelOrientationType.NORTH_SOUTH.getCode())
          .setOrientationAngles(Orientation.from(0, 90.0))
          .build()))
      .setName("STA.fk.BHN/4c03295a4acff0f9706c429b19535249576116f89c845709d6f0afbdfa5f934f")
      .build();

    Channel expectedEastChannel = expectedNorthChannel.toBuilder()
      .setData(expectedNorthChannel.getData()
        .map(data -> data.toBuilder()
          .setConfiguredInputs(List.of(eastInputChannel.toEntityReference()))
          .setChannelOrientationType(ChannelOrientationType.EAST_WEST)
          .setChannelOrientationCode(ChannelOrientationType.EAST_WEST.getCode())
          .setOrientationAngles(Orientation.from(90.0, 90.0))
        .build()))
      .setName("STA.fk.BHE/7a03271670e7aef0dfda3936a2b87305a70880700a9e707e00fac753d31e4972")
      .build();
    
    Channel expectedUnknownChannel = expectedEastChannel.toBuilder()
      .setData(expectedEastChannel.getData()
        .map(data -> data.toBuilder()
          .setConfiguredInputs(List.of(unknownInputChannel.toEntityReference()))
          .setChannelOrientationType(ChannelOrientationType.UNKNOWN)
          .setChannelOrientationCode(ChannelOrientationType.UNKNOWN.getCode())
          .setOrientationAngles(Orientation.from(Double.NaN, Double.NaN))
        .build()))
        .setName("STA.fk.BH-/16f6d27c8dd7fdbb5968e73332fdf6b14d3e074f1145c81491bb5b0903b875d5")
      .build();
    
    return Stream.of(arguments(expectedVerticalChannel,
        STATION,
        List.of(verticalInputChannel),
        DEFINITION),
      arguments(expectedNorthChannel,
        STATION,
        List.of(northInputChannel),
        DEFINITION),
      arguments(expectedEastChannel, 
        STATION,
        List.of(eastInputChannel), 
        DEFINITION), 
      arguments(expectedUnknownChannel,
        STATION,
        List.of(unknownInputChannel), 
        DEFINITION));
  }
}
