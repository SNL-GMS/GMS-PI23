package gms.shared.waveform.testfixture;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.TypeFactory;
import gms.shared.waveform.coi.FkAttributes;
import gms.shared.waveform.coi.FkSpectra;
import gms.shared.waveform.coi.FkSpectrum;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.channel.ChannelProcessingMetadataType;
import gms.shared.stationdefinition.coi.channel.Orientation;
import gms.shared.stationdefinition.coi.channel.RelativePosition;
import gms.shared.stationdefinition.coi.utils.CoiObjectMapperFactory;
import gms.shared.stationdefinition.coi.utils.Units;
import gms.shared.stationdefinition.testfixtures.UtilsTestFixtures;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.Waveform;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.LoggerFactory;

import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.CHANNEL;
import static gms.shared.stationdefinition.testfixtures.UtilsTestFixtures.STATION;

public class FkTestFixtures {

  private FkTestFixtures() {
  }
  
  
  public static final FkAttributes ATTRIBUTES = FkAttributes.builder()
    .setAzimuth(1)
    .setSlowness(1)
    .setAzimuthUncertainty(1)
    .setSlownessUncertainty(1)
    .setPeakFStat(0.4)
    .build();
  
  public static final FkSpectrum SPECTRUM = FkSpectrum.builder()
    .setQuality(1)
    .setPower(new double[][]{{0.1, 0.1, 0.1}, {0.1, 0.5, 0.1}, {0.1, 0.1, 0.1}})
    .setFstat(new double[][]{{0.1, 0.1, 0.1}, {0.1, 0.1, 0.1}, {0.1, 0.1, 0.1}})
    .setAttributes(List.of(FkAttributes.builder()
      .setAzimuth(0.1)
      .setSlowness(0.2)
      .setAzimuthUncertainty(0.3)
      .setSlownessUncertainty(0.4)
      .setPeakFStat(0.5)
      .build()))
    .build();
  
  private static final Instant START_TIME_INSTANT = Instant.EPOCH;
  private static final double SAMPLE_RATE = 1.0;
  private static final PhaseType PHASE_TYPE = PhaseType.P;
  private static final double SLOW_START_X = -.5;
  private static final double SLOW_DELTA_X = 0.1;
  private static final double SLOW_START_Y = -.2;
  private static final double SLOW_DELTA_Y = 0.2;

  private static final FkSpectra.Metadata METADATA = FkSpectra.Metadata.builder()
    .setPhaseType(PHASE_TYPE)
    .setSlowStartX(SLOW_START_X)
    .setSlowStartY(SLOW_START_Y)
    .setSlowDeltaX(SLOW_DELTA_X)
    .setSlowDeltaY(SLOW_DELTA_Y)
    .build();
  private static final int FK_QUAL = 4;
  private static final double[][] POWER_VALUES = new double[][]{
    {-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5},
    {5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5},
    {-.5, -.4, -.3, -.2, -.1, 0, .1, .2, .3, .4, .5}
  };
  
  private static final double[][] FSTAT_VALUES = new double[][]{
    {5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5},
    {-.5, -.4, -.3, -.2, -.1, 0, .1, .2, .3, .4, .5},
    {-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5}};

  public static final FkSpectrum FK_SPECTRUM2 = FkSpectrum.builder()
    .setPower(POWER_VALUES)
    .setFstat(FSTAT_VALUES)
    .setQuality(FK_QUAL)
    .setAttributes(ATTRIBUTES)
    .build();
  
  public static final FkSpectrum FK_SPECTRUM3 = FkSpectrum.builder()
    .setPower(new double[][]{{-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5}, {5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5}}) 
    .setFstat(new double[][]{{5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5}, {-.5, -.4, -.3, -.2, -.1, 0, .1, .2, .3, .4, .5}})
    .setQuality(FK_QUAL)
    .setAttributes(ATTRIBUTES)
    .build();
    
   public static final FkSpectra SPECTRA = FkSpectra.builder()
     .setStartTime(START_TIME_INSTANT)
     .setSampleRateHz(SAMPLE_RATE)
     .setMetadata(METADATA)
     .withValues(List.of(FK_SPECTRUM2))
     .build();

  public static final double[] TEST_FREQ_BINS_EVEN = new double[]{0, 1, 2, 3, 4, -5, -4, -3, -2,
      -1};
  public static final double[] TEST_FREQ_BINS_ODD = new double[]{0, 1, 2, 3, 4, -4, -3, -2, -1};

  public static final double WF_SAMPLE_RATE = 40;

  public static final double FK_SAMPLE_RATE = 1.0;

  public static final double MULTIPLE_FK_LOW_FREQUENCY = 1.2;
  public static final double MULTIPLE_FK_HIGH_FREQUENCY = 1.8;

  public static final double EAST_SLOW_START = -0.3;
  public static final double EAST_SLOW_DELTA = 0.0046875;
  public static final int EAST_SLOW_COUNT = 128;

  public static final double NORTH_SLOW_START = -0.3;
  public static final double NORTH_SLOW_DELTA = 0.0046875;
  public static final int NORTH_SLOW_COUNT = 128;

  public static final Duration WINDOW_LEAD = Duration.ZERO;
  public static final Duration WINDOW_LENGTH = Duration.ofSeconds(4);
  public static final int MIN_WAVEFORMS = 2;

  public static final List<Channel> BASE_CHANNELS = new ArrayList<>();
  public static final List<RelativePosition> RELATIVE_POSITIONS = new ArrayList<>();
  public static final List<FkSpectrum> BASE_FKS = new ArrayList<>();
  public static final List<FkSpectrum> GAP_FKS = new ArrayList<>();
  public static final List<FkSpectrum> NORMALIZED_FKS = new ArrayList<>();
  public static final List<ChannelSegment<Waveform>> BASE_CHANNEL_SEGMENTS = new ArrayList<>();
  public static final List<ChannelSegment<Waveform>> DETRENDED_CHANNEL_SEGMENTS = new ArrayList<>();
  public static ChannelSegment<Waveform> GAP_CHANNEL_SEGMENT;
  public static final Map<Channel, RelativePosition> RELATIVE_POSITION_MAP = new HashMap<>();
  public static final Channel FK_CHANNEL = CHANNEL.toBuilder()
    .setName("STA.fk.SHZ")
    .setEffectiveAt(Instant.EPOCH)
    .setData(CHANNEL.getData()
      .map(data -> data.toBuilder()
        .setStation(STATION.toEntityReference())
        .setNominalSampleRateHz(FK_SAMPLE_RATE)
        .setConfiguredInputs(BASE_CHANNELS.stream().map(Channel::toEntityReference).collect(Collectors.toList()))
        .setOrientationAngles(Orientation.from(Double.NaN, 0))
        .setLocation(STATION.getLocation())
        .setUnits(Units.NANOMETERS_SQUARED_PER_SECOND)
        .setProcessingMetadata(Map.of(ChannelProcessingMetadataType.CHANNEL_GROUP, "fk"))
        .setResponse(Optional.empty())
      .build()))
    .build();

  static {
    try (var arrayStream = FkTestFixtures.class.getClassLoader().getResourceAsStream("array.json"); 
      var dataStream = FkTestFixtures.class.getClassLoader().getResourceAsStream("data.json");
      var detrendedDataStream = FkTestFixtures.class.getClassLoader().getResourceAsStream("data-detrended.json");
      var gapSiteStream = FkTestFixtures.class.getClassLoader().getResourceAsStream("optionalSite.json");
      var optionalDataStream = FkTestFixtures.class.getClassLoader().getResourceAsStream("optionalWaveform.json");
      var fkStream = FkTestFixtures.class.getClassLoader().getResourceAsStream("baseFks.json");
      var normalizedFkStream = FkTestFixtures.class.getClassLoader().getResourceAsStream("normalizedFks.json");
      var gapFkStream = FkTestFixtures.class.getClassLoader().getResourceAsStream("gapFks.json")) {
        ObjectMapper mapper = CoiObjectMapperFactory.getJsonObjectMapper();
        TypeFactory factory = mapper.getTypeFactory();
        JavaType mapType = factory.constructMapType(HashMap.class, String.class, Object.class);

        Map<String, Object> siteArray = mapper.readValue(arrayStream, mapType);

        JavaType dataListType = factory.constructCollectionType(List.class, double[].class);

        List<double[]> detrendedWaveforms = mapper.readValue(detrendedDataStream, dataListType);

        List<double[]> baseWaveforms = mapper.readValue(dataStream, dataListType);
        for (int i = 0; i < baseWaveforms.size(); i++) {
          String siteName = String.format("ARR%02d", i);
          Map<String, Object> siteCoordinates = mapper.convertValue(siteArray.get(siteName), mapType);
          RelativePosition relativePosition = RelativePosition.from(
            mapper.convertValue(siteCoordinates.get("north_km"), Double.class), 
            mapper.convertValue(siteCoordinates.get("east_km"), Double.class), 
            0);
          RELATIVE_POSITION_MAP.put(Channel.createEntityReference(siteName), relativePosition);
          RELATIVE_POSITIONS.add(relativePosition);

          Channel channel = CHANNEL.toBuilder().setName(siteName)
            .setData(CHANNEL.getData().map(data -> data.toBuilder().setStation(STATION.toEntityReference()).build()))
            .build();
          BASE_CHANNELS.add(channel);
          Waveform waveform = Waveform.create(Instant.EPOCH, WF_SAMPLE_RATE, baseWaveforms.get(i));
          BASE_CHANNEL_SEGMENTS.add(ChannelSegment.from(channel, Units.COUNTS_PER_NANOMETER, List.of(waveform), Instant.EPOCH, List.of()));

          Waveform detrendedWaveform = Waveform.create(Instant.EPOCH, WF_SAMPLE_RATE, detrendedWaveforms.get(i));
          DETRENDED_CHANNEL_SEGMENTS.add(ChannelSegment.from(channel.toEntityReference(), Units.COUNTS_PER_NANOMETER, List.of(detrendedWaveform), Instant.EPOCH, List.of()));      
        }

        Map<String, Object> gapSite = mapper.readValue(gapSiteStream, mapType);

        String siteName = "ARR04";
        Map<String, Object> siteMap = mapper.convertValue(gapSite.get(siteName), mapType);
        RelativePosition relativePosition = RelativePosition.from(mapper.convertValue(siteMap.get("north_km"), Double.class), 
          mapper.convertValue(siteMap.get("east_km"), Double.class), 
          0);
        RELATIVE_POSITION_MAP.put(Channel.createEntityReference(siteName), relativePosition);
        RELATIVE_POSITIONS.add(relativePosition);

        Map<String, Object> gapData = mapper.readValue(optionalDataStream, mapType);

        List<double[]> optionalWaveforms = mapper.convertValue(gapData.get("waveforms"), dataListType);
        int numSkippedSamples = mapper.convertValue(gapData.get("gapInSamples"), Integer.class);

        Waveform waveform1 = Waveform.create(Instant.EPOCH, WF_SAMPLE_RATE, optionalWaveforms.get(0));
        Waveform waveform2 = Waveform.create(Instant.EPOCH.plusSeconds((long) (numSkippedSamples / WF_SAMPLE_RATE)), WF_SAMPLE_RATE, TEST_FREQ_BINS_ODD);

        Channel channel = UtilsTestFixtures.CHANNEL.toBuilder().setName(siteName).build();
        GAP_CHANNEL_SEGMENT = ChannelSegment.from(channel.toEntityReference(), Units.COUNTS_PER_NANOMETER, List.of(waveform1, waveform2), Instant.EPOCH, List.of());

        Map<String, Object> normalizedFkData = mapper.readValue(fkStream, mapType);

        double[][] normalizedPower = mapper.convertValue(normalizedFkData.get("fk"), double[][].class);
        double[][] normalizedFstat = mapper.convertValue(normalizedFkData.get("fstat"), double[][].class);
        int normalizedQual = mapper.convertValue(normalizedFkData.get("fkqual"), int.class);
        BASE_FKS.add(FkSpectrum.from(normalizedPower, normalizedFstat, normalizedQual));

       Map<String, Object> preNormedFkData = mapper.readValue(normalizedFkStream, mapType);

       double[][] preNormedPower = mapper.convertValue(preNormedFkData.get("fk"), double[][].class);
       double[][] preNormedFstat = mapper.convertValue(preNormedFkData.get("fstat"), double[][].class);
       int preNormedQual = mapper.convertValue(preNormedFkData.get("fkqual"), int.class);
       NORMALIZED_FKS.add(FkSpectrum.from(preNormedPower, preNormedFstat, preNormedQual));

        Map<String, Object> normalizedGapFkData = 
          mapper.readValue(gapFkStream, mapType);

        JavaType doubleArrayListType = factory.constructCollectionType(List.class, double[][].class);
        List<double[][]> gapFkData = mapper.convertValue(normalizedGapFkData.get("fks"), doubleArrayListType);
        List<double[][]> gapFstats = mapper.convertValue(normalizedGapFkData.get("fstats"), doubleArrayListType);

        JavaType intListType = factory.constructCollectionType(List.class, Integer.class);
        List<Integer> fkQuals = mapper.convertValue(normalizedGapFkData.get("fkquals"), intListType);
        for (int i = 0; i < gapFkData.size(); i++) {
          GAP_FKS.add(FkSpectrum.from(gapFkData.get(i), gapFstats.get(i), fkQuals.get(i)));
        }
    } catch (Exception ex) {
          LoggerFactory.getLogger(FkTestFixtures.class).error("Error loading test fixtures");
    }
  }
}
