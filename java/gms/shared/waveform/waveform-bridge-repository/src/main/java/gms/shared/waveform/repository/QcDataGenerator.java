package gms.shared.waveform.repository;

import gms.shared.waveform.qc.coi.QcData;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.waveform.qc.coi.QcSegment;
import gms.shared.stationdefinition.coi.qc.QcSegmentCategory;
import gms.shared.stationdefinition.coi.qc.QcSegmentType;
import gms.shared.waveform.qc.coi.QcSegmentVersion;
import gms.shared.waveform.qc.coi.QcSegmentVersionId;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Optional;
import java.util.TreeSet;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Generates Canned Qc Data
 */
@Service
public class QcDataGenerator {

  private static final Logger logger = LoggerFactory.getLogger(QcDataGenerator.class);

  private ArrayList<QcConversionData> qcMapping;
  private static final Instant offsetTimeSeconds = Instant.ofEpochSecond(1546704000);

  public QcDataGenerator() {
    if (qcMapping == null || qcMapping.isEmpty()) {
      qcMapping = buildData();
    }
  }

  /**
   * Shifts the provided myTime + offset value from baseTime to newBaseTime,
   * maintaining the duration interval during the shift
   *
   * @param shiftTimeFloor The time reference point serving as the established
   * start for all records.
   * @param inputDataTime The input data time to shift. The shift will be the
   * duration between shiftTimeFloor and this and
   * @param sampleNum Sample number value to apply to offset calculation
   * @param sampleRate Sample rate value to apply to offset calculation
   * @param myTime The configured interval to reset as the new floor
   *
   * @return Updated Instant with shifted time
   */
  protected static Instant timeShift(Instant shiftTimeFloor, Instant inputDataTime, double sampleNum, double sampleRate, Instant myTime) {

    var durationAfterMyTime = Duration.between(shiftTimeFloor, inputDataTime);

    myTime = myTime.plusNanos(durationAfterMyTime.toNanos());

    var offsetModifier = (long) ((sampleNum) / (sampleRate) * 1_000_000_000L);
    myTime = myTime.plusNanos(offsetModifier);

    return myTime;
  }

  /**
   * Create the Channel Name from the associated {@link QcData}
   *
   * @param data {@link QcData} containing the data necessary to generate the
   * channel name.
   *
   * @return The channel name from the canned {@link QcData}
   */
  private String createChannelName(QcData data) {
    return data.getSta() + "." + data.getChan();
  }

  /**
   * Creates canned data for the QcSegment canned data endpoint
   *
   * @param data QcSegment data values needed to create a QcSegment.
   * @param originTime The new floor time used to offset all startTimes.
   * @param extraVersions number of additional versions beyond the initial
   * default of 1.
   *
   * @return QcSegment with shifted time interval with 1 or more version
   */
  public QcSegment createCannedQcSegmentWithVersions(QcData data, Instant originTime, int extraVersions) {

    var channelName = createChannelName(data);
    logger.debug("Creating QcCannedData for:{} StartTime:{} Extra Versions:{}", channelName, data.getStartTime(), extraVersions);

    if (data.getSampRate() == 0) {
      throw new IllegalArgumentException("Qc sample rate must not be 0");
    }

    var id = Arrays.toString(Long.toString(data.getQcmaskid()).getBytes())
      + Arrays.toString(Integer.toString(data.getStartSample()).getBytes());
    var uuid = UUID.nameUUIDFromBytes(id.getBytes());

    var versionedSet = new TreeSet<>(createVersions(data, originTime, extraVersions));
    if (versionedSet.size() != (extraVersions + 1)) {
      logger.warn("Invalid version set size.");
    }

    var qcSegmentData = QcSegment.Data.instanceBuilder()
      .setChannel(Channel.createEntityReference(channelName))
      .setVersionHistory(versionedSet)
      .build();

    return QcSegment.instanceBuilder()
      .setId(uuid)
      .setData(qcSegmentData)
      .build();
  }

  /**
   *
   * The method will create 1 or more versions of the
   *
   * @param data QcSegment data values needed to create a QcSegment.
   * @param originTime The new floor time used to offset all startTimes.
   * @param extraVersions number of versions beyond the original, if provided a
   * number less than 0, it will default 0
   *
   *
   * @return QcSegment with shifted time interval with 1 or more version
   */
  public Set<QcSegmentVersion> createVersions(QcData data, Instant originTime, int extraVersions) {
    if (extraVersions < 0) {
      extraVersions = 0;
    }

    var versionSet = new HashSet<QcSegmentVersion>();
    for (var offsetShift = 0; offsetShift <= extraVersions; offsetShift++) {
      var startTime = timeShift(offsetTimeSeconds, data.getStartTime(), (double) data.getStartSample() + offsetShift, data.getSampRate(), originTime);

      var endTimeRef = data.getStartTime();
      if (data.getEndSample() == 0) {
        endTimeRef = data.getEndTime();//use exact end time if endsample is 0
      }
      var endTime = timeShift(offsetTimeSeconds, endTimeRef, data.getEndSample(), data.getSampRate(), originTime);

      var mappedEntry = qcMapping.stream().filter(id
        -> Integer.toString(data.getMaskType()).equals(id.getMapping()))
        .findFirst()
        .orElseThrow(() -> new IllegalStateException("Missing mapping type for mask: " + data.getMaskType()));

      var isRejected = false;
      if ("300".equals(mappedEntry.mapping)) {
        isRejected = true;
      }

      Optional<QcSegmentCategory> category = mappedEntry.getCategory();
      Optional<QcSegmentType> type = mappedEntry.getType();

      var id = Arrays.toString(Long.toString(data.getQcmaskid()).getBytes())
        + Arrays.toString(Integer.toString(data.getStartSample()).getBytes());
      var uuid = UUID.nameUUIDFromBytes(id.getBytes());
      var qcSegmentVersionId = QcSegmentVersionId.instanceBuilder()
        //canned data using end time instead of lddate and shift if multiple versions used
        .setEffectiveAt(endTime.plusNanos(offsetShift))
        .setParentQcSegmentId(uuid)
        .build();

      var versionData = QcSegmentVersion.Data.instanceBuilder()
        .setCreatedBy(data.getCreatedBy())
        .setChannels(List.of(Channel.createEntityReference(createChannelName(data))))
        .setStartTime(startTime)
        .setEndTime(endTime)
        .setCategory(category.isPresent() ? category.get() : null)
        .setType(type.isPresent() ? type.get() : null)
        .setDiscoveredOn(List.of())
        .setRejected(isRejected)
        .setRationale("N/A (bridged)")
        .build();

      var versionHistory = QcSegmentVersion.instanceBuilder()
        .setId(qcSegmentVersionId)
        .setData(versionData)
        .build();
      versionSet.add(versionHistory);
    }

    return versionSet;
  }

  protected ArrayList<QcConversionData> buildData() {

    var qcConversionData = new ArrayList<QcConversionData>();
    qcConversionData.add(new QcConversionData("0", Optional.empty(), Optional.of(QcSegmentCategory.UNPROCESSED)));
    qcConversionData.add(new QcConversionData("10", Optional.of(QcSegmentType.GAP), Optional.of(QcSegmentCategory.WAVEFORM)));
    qcConversionData.add(new QcConversionData("20", Optional.of(QcSegmentType.FLAT), Optional.of(QcSegmentCategory.WAVEFORM)));
    qcConversionData.add(new QcConversionData("30", Optional.of(QcSegmentType.NOISY), Optional.of(QcSegmentCategory.WAVEFORM)));
    qcConversionData.add(new QcConversionData("40", Optional.of(QcSegmentType.SPIKE), Optional.of(QcSegmentCategory.WAVEFORM)));
    qcConversionData.add(new QcConversionData("50", Optional.of(QcSegmentType.SPIKE), Optional.of(QcSegmentCategory.WAVEFORM)));
    qcConversionData.add(new QcConversionData("60", Optional.of(QcSegmentType.SPIKE), Optional.of(QcSegmentCategory.WAVEFORM)));
    qcConversionData.add(new QcConversionData("70", Optional.of(QcSegmentType.SPIKE), Optional.of(QcSegmentCategory.WAVEFORM)));
    qcConversionData.add(new QcConversionData("100", Optional.of(QcSegmentType.AGGREGATE), Optional.of(QcSegmentCategory.WAVEFORM)));

    qcConversionData.add(new QcConversionData("200", Optional.empty(), Optional.of(QcSegmentCategory.LONG_TERM)));
    qcConversionData.add(new QcConversionData("300", Optional.empty(), Optional.empty()));
    qcConversionData.add(new QcConversionData("400", Optional.empty(), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("500", Optional.of(QcSegmentType.CALIBRATION), Optional.of(QcSegmentCategory.STATION_SOH)));
    //rework 600 use case in future
    qcConversionData.add(new QcConversionData("600", Optional.empty(), Optional.of(QcSegmentCategory.DATA_AUTHENTICATION)));

    qcConversionData.add(new QcConversionData("2000", Optional.of(QcSegmentType.AGGREGATE), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("2010", Optional.of(QcSegmentType.CALIBRATION), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("2020", Optional.of(QcSegmentType.FLAT), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("2030", Optional.of(QcSegmentType.GAP), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("2040", Optional.of(QcSegmentType.NOISY), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("2050", Optional.of(QcSegmentType.SENSOR_PROBLEM), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("2060", Optional.of(QcSegmentType.SPIKE), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("2070", Optional.of(QcSegmentType.STATION_PROBLEM), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));

    qcConversionData.add(new QcConversionData("2080", Optional.of(QcSegmentType.STATION_SECURITY), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));
    qcConversionData.add(new QcConversionData("2090", Optional.of(QcSegmentType.TIMING), Optional.of(QcSegmentCategory.ANALYST_DEFINED)));

    qcConversionData.add(new QcConversionData("3000", Optional.of(QcSegmentType.NOISY), Optional.of(QcSegmentCategory.STATION_SOH)));
    qcConversionData.add(new QcConversionData("3010", Optional.of(QcSegmentType.SENSOR_PROBLEM), Optional.of(QcSegmentCategory.STATION_SOH)));
    qcConversionData.add(new QcConversionData("3020", Optional.of(QcSegmentType.STATION_PROBLEM), Optional.of(QcSegmentCategory.STATION_SOH)));
    qcConversionData.add(new QcConversionData("3030", Optional.of(QcSegmentType.STATION_SECURITY), Optional.of(QcSegmentCategory.STATION_SOH)));
    qcConversionData.add(new QcConversionData("3040", Optional.of(QcSegmentType.TIMING), Optional.of(QcSegmentCategory.STATION_SOH)));

    return qcConversionData;
  }

  private class QcConversionData {

    private String mapping;
    private Optional<QcSegmentType> type;
    private Optional<QcSegmentCategory> category;

    public QcConversionData(String mapping, Optional<QcSegmentType> type, Optional<QcSegmentCategory> category) {
      this.mapping = mapping;
      this.type = type;
      this.category = category;
    }

    public String getMapping() {
      return mapping;
    }

    public void setMapping(String mapping) {
      this.mapping = mapping;
    }

    public Optional<QcSegmentType> getType() {
      return type;
    }

    public void setType(Optional<QcSegmentType> type) {
      this.type = type;
    }

    public Optional<QcSegmentCategory> getCategory() {
      return category;
    }

    public void setCategory(Optional<QcSegmentCategory> category) {
      this.category = category;
    }

  }

}
