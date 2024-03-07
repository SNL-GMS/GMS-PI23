package gms.shared.waveform.qc.mask.database.connector;

import gms.shared.stationdefinition.dao.css.SiteChanKey;
import gms.shared.utilities.bridge.database.converter.InstantToDoubleConverterNegativeNa;
import gms.shared.waveform.qc.mask.dao.QcMaskInfoDao;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.persistence.EntityManagerFactory;
import org.junit.Assert;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class QcMaskInfoDatabaseConnectorTest extends QcMaskDbTest<QcMaskInfoDatabaseConnector> {

  private static final Instant START_TIME = new InstantToDoubleConverterNegativeNa()
    .convertToEntityAttribute(1546704000.0);
  private static final Instant END_TIME = START_TIME.plusSeconds(7200);
  private static final List<SiteChanKey> SITE_CHAN_KEYS = List.of(
    new SiteChanKey("AS01", "SHZ", START_TIME),
    new SiteChanKey("AS02", "SHZ", START_TIME));

  @Override
  protected QcMaskInfoDatabaseConnector getRepository(EntityManagerFactory entityManagerFactory) {
    return new QcMaskInfoDatabaseConnector(entityManagerFactory);
  }

  @Test
  void missingSiteChanKeysErrorTest() {
    assertErrorThrown(NullPointerException.class,
      QcMaskInfoDatabaseConnector.EMPTY_SITECHANKEY_LIST_ERROR,
      () -> repository.findMaskInfoDaos(null, START_TIME, END_TIME));
  }

  @Test
  void missingStartTimeErrorTest() {
    assertErrorThrown(NullPointerException.class,
      QcMaskInfoDatabaseConnector.MISSING_START_TIME_ERROR,
      () -> repository.findMaskInfoDaos(SITE_CHAN_KEYS, null, END_TIME));
  }

  @Test
  void missingEndTimeErrorTest() {
    assertErrorThrown(NullPointerException.class,
      QcMaskInfoDatabaseConnector.MISSING_END_TIME_ERROR,
      () -> repository.findMaskInfoDaos(SITE_CHAN_KEYS, START_TIME, null));
  }

  @Test
  void endTimeBeforeStartTimeErrorTest() {
    assertThrows(IllegalArgumentException.class,
      () -> repository.findMaskInfoDaos(SITE_CHAN_KEYS, Instant.MAX, END_TIME),
      QcMaskInfoDatabaseConnector.START_NOT_BEFORE_END_TIME_ERROR);
  }

  @Test
  void emptySiteChanKeysTest() {
    List<QcMaskInfoDao> qcMaskInfoDaos = repository.
      findMaskInfoDaos(new ArrayList<>(), START_TIME, END_TIME);
    Assert.assertTrue(qcMaskInfoDaos.isEmpty());
  }

  @ParameterizedTest
  @MethodSource("findQcMaskInfoDaos")
  void findQcMaskInfoDaosTest(List<SiteChanKey> siteChanKeys, Instant startTime,
    Instant endTime, List<String> stationNames, List<String> channelNames, int size) {

    List<QcMaskInfoDao> qcMaskInfoDaos = repository.
      findMaskInfoDaos(siteChanKeys, startTime, endTime);

    assertEquals(size, qcMaskInfoDaos.size());
    qcMaskInfoDaos.forEach(dao -> assertTrue(stationNames.contains(dao.getStation())));
    qcMaskInfoDaos.forEach(dao -> assertTrue(channelNames.contains(dao.getChannel())));
  }

  static Stream<Arguments> findQcMaskInfoDaos() {
    List<String> stationNames = SITE_CHAN_KEYS.stream()
      .map(siteChanKey -> siteChanKey.getStationCode())
      .collect(Collectors.toList());

    List<String> channelNames = SITE_CHAN_KEYS.stream()
      .map(siteChanKey -> siteChanKey.getChannelCode())
      .collect(Collectors.toList());

    return Stream.of(
      arguments(SITE_CHAN_KEYS, START_TIME, END_TIME, stationNames,
        channelNames, 2),
      arguments(SITE_CHAN_KEYS, START_TIME.minusSeconds(10), END_TIME,
        stationNames, channelNames, 0),
      arguments(SITE_CHAN_KEYS, START_TIME, END_TIME.plusSeconds(100),
        stationNames, channelNames, 0),
      arguments(List.of(new SiteChanKey("AS02", "SHZ", START_TIME)), START_TIME,
        END_TIME, stationNames, channelNames, 1),
      arguments(List.of(new SiteChanKey("AS05", "SHZ", START_TIME)), START_TIME,
        END_TIME, stationNames, channelNames, 0),
      arguments(List.of(new SiteChanKey("AS02", "YHD", START_TIME)), START_TIME,
        END_TIME, stationNames, channelNames, 0)
    );
  }
}
