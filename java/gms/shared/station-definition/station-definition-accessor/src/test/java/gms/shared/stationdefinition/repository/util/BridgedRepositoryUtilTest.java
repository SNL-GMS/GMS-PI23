package gms.shared.stationdefinition.repository.util;

import gms.shared.stationdefinition.converter.util.StationDefinitionDataHolder;
import gms.shared.stationdefinition.dao.css.WfdiscDao;
import gms.shared.stationdefinition.database.connector.InstrumentDatabaseConnector;
import gms.shared.stationdefinition.database.connector.SensorDatabaseConnector;
import gms.shared.stationdefinition.database.connector.WfdiscDatabaseConnector;
import gms.shared.stationdefinition.repository.BridgedRepositoryUtils;
import gms.shared.stationdefinition.testfixtures.DefaultCoiTestFixtures;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import org.junit.jupiter.api.Assertions;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BridgedRepositoryUtilTest {

  @Mock
  WfdiscDatabaseConnector wfdiscDatabaseConnector;

  @Mock
  SensorDatabaseConnector sensorDatabaseConnector;

  @Mock
  InstrumentDatabaseConnector instrumentDatabaseConnector;

  @Test
  void testGetMinMaxFromSiteDaos() {

    var siteDao1 = DefaultCoiTestFixtures.getDefaultSiteDao();
    var siteDao2 = DefaultCoiTestFixtures.getDefaultSiteDao();

    var t1 = Instant.parse("2008-11-10T17:26:44Z");
    var t2 = Instant.parse("2010-11-10T17:26:44Z");
    var t3 = Instant.parse("2015-11-10T17:26:44Z");

    siteDao1.getId().setOnDate(t1);
    siteDao1.setOffDate(t2);
    siteDao2.getId().setOnDate(t2);
    siteDao2.setOffDate(t3);

    var pairTime = BridgedRepositoryUtils.getMinMaxFromSiteDaos(List.of(siteDao1, siteDao2), t1, t2);

    assertEquals(t1.minusSeconds(1), pairTime.getLeft());
    assertEquals(t3.plusSeconds(1), pairTime.getRight());
  }

  @Test
  void testGetMinMaxFromSiteDaosMaxMinTimes() {

    var siteDao1 = DefaultCoiTestFixtures.getDefaultSiteDao();
    var t1 = Instant.parse("2008-11-10T17:26:44Z");
    var t2 = Instant.parse("2010-11-10T17:26:44Z");

    siteDao1.getId().setOnDate(Instant.MIN);
    siteDao1.setOffDate(Instant.MAX);

    var pairTime = BridgedRepositoryUtils.getMinMaxFromSiteDaos(List.of(siteDao1), t1, t2);

    assertEquals(Instant.MIN, pairTime.getLeft());
    assert (pairTime.getRight().isBefore(Instant.MAX));
  }

  @Test
  void testGetSensorAndWfdiscData() {

    var siteChan1 = DefaultCoiTestFixtures.getDefaultSiteChanDao();
    var siteChan2 = DefaultCoiTestFixtures.getDefaultSiteChanDao();
    var t1 = Instant.parse("2008-11-10T17:26:44Z");
    var t2 = Instant.parse("2010-11-10T17:26:44Z");
    var t3 = Instant.parse("2015-11-10T17:26:44Z");
    var tStart = Instant.parse("2008-11-09T17:26:44Z");
    var tEnd = Instant.parse("2015-11-11T17:26:44Z");
    siteChan1.getId().setOnDate(t1);
    siteChan1.setOffDate(t2);
    siteChan2.getId().setOnDate(t2);
    siteChan2.setOffDate(t3);

    var sensor1 = DefaultCoiTestFixtures.getDefaultSensorDao();
    var t4 = Instant.parse("2008-04-10T17:26:44Z");
    sensor1.setEndTime(t2);
    sensor1.getSensorKey().setTime(t4);
    var wfdisc = DefaultCoiTestFixtures.getDefaultWfdisc();

    var listOfSiteChanKeys = List.of(siteChan1.getId(), siteChan2.getId());

    when(sensorDatabaseConnector.findSensorsByKeyAndTimeRange(listOfSiteChanKeys, tStart, tEnd)).thenReturn(List.of(sensor1));
    when(wfdiscDatabaseConnector.findWfdiscsByNameAndTimeRange(listOfSiteChanKeys, t4, tEnd)).thenReturn(List.of(wfdisc));

    var dataHolder = new StationDefinitionDataHolder(List.of(), List.of(siteChan1, siteChan2), List.of(), List.of(), List.of(), null);

    var dataHolderReturned
      = BridgedRepositoryUtils.getSensorAndWfdiscData(dataHolder, sensorDatabaseConnector, wfdiscDatabaseConnector);

    assertEquals(List.of(sensor1), dataHolderReturned.getSensorDaos());
    assertEquals(1, dataHolderReturned.getWfdiscVersions().size());
  }

  @Test
  void testGetInstrumentData() {

    var sensor1 = DefaultCoiTestFixtures.getDefaultSensorDao();
    var t2 = Instant.parse("2010-11-10T17:26:44Z");
    var t4 = Instant.parse("2008-04-10T17:26:44Z");
    sensor1.setEndTime(t2);
    sensor1.getSensorKey().setTime(t4);

    var dataHolder = new StationDefinitionDataHolder(List.of(), List.of(), List.of(sensor1), List.of(), List.of(), null);

    var instrument = DefaultCoiTestFixtures.getDefaultInstrumentDao();
    when(instrumentDatabaseConnector.findInstruments(List.of(sensor1.getInstrument().getInstrumentId())))
      .thenReturn(List.of(instrument));

    var insDaos = BridgedRepositoryUtils.getInstrumentData(dataHolder, instrumentDatabaseConnector);
    assertEquals(1, insDaos.size());
  }

  @Test
  void testMergeWfdiscsAndUpdateTime() {

    var t1 = Instant.parse("2000-11-10T17:26:44Z");
    var t2 = Instant.parse("2002-06-10T17:26:44Z");
    var t3 = Instant.parse("2003-07-10T17:26:44Z");
    var t4 = Instant.parse("2008-11-10T17:26:44Z");
    var t5 = Instant.parse("2010-07-10T17:26:44Z");
    var t6 = Instant.parse("2015-09-10T17:26:44Z");
    var t7 = Instant.parse("2020-09-10T17:26:44Z");

    var sta1 = "STA1";
    var chan1 = "CHAN1";
    var sta2 = "STA2";
    var chan2 = "CHAN2";
    var sta3 = "STA3";
    var chan3 = "CHAN3";

    //GIVEN WFDISCS
    var wfdisc1 = DefaultCoiTestFixtures.getDefaultWfdisc();
    wfdisc1.setStationCode(sta1);
    wfdisc1.setChannelCode(chan1);
    wfdisc1.setTime(t1);
    wfdisc1.setEndTime(t2);

    var wfdisc2 = DefaultCoiTestFixtures.getDefaultWfdisc();
    wfdisc2.setStationCode(sta2);
    wfdisc2.setChannelCode(chan2);
    wfdisc2.setTime(t1);
    wfdisc2.setEndTime(t2);

    var wfdisc3 = DefaultCoiTestFixtures.getDefaultWfdisc();
    wfdisc3.setStationCode(sta2);
    wfdisc3.setChannelCode(chan2);
    wfdisc3.setTime(t3);
    wfdisc3.setEndTime(t4);

    var wfdisc4 = DefaultCoiTestFixtures.getDefaultWfdisc();
    wfdisc4.setStationCode(sta2);
    wfdisc4.setChannelCode(chan2);
    wfdisc4.setTime(t5);
    wfdisc4.setEndTime(t6);
    wfdisc4.setCalib(206);

    var wfdisc5 = DefaultCoiTestFixtures.getDefaultWfdisc();
    wfdisc5.setStationCode(sta3);
    wfdisc5.setChannelCode(chan3);
    wfdisc5.setTime(t1);
    wfdisc5.setEndTime(t2);

    var wfdisc6 = DefaultCoiTestFixtures.getDefaultWfdisc();
    wfdisc6.setStationCode(sta3);
    wfdisc6.setChannelCode(chan3);
    wfdisc6.setTime(t5);
    wfdisc6.setEndTime(t6);
    wfdisc6.setSampRate(88);

    var wfdiscList = List.of(wfdisc1, wfdisc2, wfdisc3, wfdisc4, wfdisc5, wfdisc6);

    var sensor1 = DefaultCoiTestFixtures.getDefaultSensorDao();
    sensor1.getSensorKey().setStation(sta1);
    sensor1.getSensorKey().setChannel(chan1);
    sensor1.getSensorKey().setTime(t1);
    sensor1.getSensorKey().setEndTime(Instant.MAX);

    var sensor2 = DefaultCoiTestFixtures.getDefaultSensorDao();
    sensor2.getSensorKey().setStation(sta2);
    sensor2.getSensorKey().setChannel(chan2);
    sensor2.getSensorKey().setTime(t1);
    sensor2.getSensorKey().setEndTime(t6);

    var sensor3 = DefaultCoiTestFixtures.getDefaultSensorDao();
    sensor3.getSensorKey().setStation(sta3);
    sensor3.getSensorKey().setChannel(chan3);
    sensor3.getSensorKey().setTime(t1);
    sensor3.getSensorKey().setEndTime(t3.minusMillis(1));

    var sensor4 = DefaultCoiTestFixtures.getDefaultSensorDao();
    sensor4.getSensorKey().setStation(sta3);
    sensor4.getSensorKey().setChannel(chan3);
    sensor4.getSensorKey().setTime(t3.plusSeconds(5000));
    sensor4.getSensorKey().setEndTime(t7);

    var sensorList = List.of(sensor1, sensor2, sensor3, sensor4);

    var actual = BridgedRepositoryUtils.mergeWfdiscsAndUpdateTime(wfdiscList, sensorList);

    assertEquals(5, actual.size());

    HashSet<String> actualValues = new HashSet();
    for (WfdiscDao wfdisc : actual) {

      actualValues.add(wfdisc.getStationCode() + wfdisc.getChannelCode()
        + wfdisc.getTime().toString() + wfdisc.getEndTime().toString());
    }

    HashSet<String> expectedValues = new HashSet();
    expectedValues.add(sta1 + chan1 + t1 + Instant.MAX.toString());
    expectedValues.add(sta2 + chan2 + t1 + t5.minusMillis(1).toString());
    expectedValues.add(sta2 + chan2 + t5 + t6);
    expectedValues.add(sta3 + chan3 + t1 + t3.minusMillis(1).toString());
    expectedValues.add(sta3 + chan3 + t5 + t7);

    for (String val : expectedValues) {
      Assertions.assertTrue(actualValues.contains(val));
    }

  }
}
