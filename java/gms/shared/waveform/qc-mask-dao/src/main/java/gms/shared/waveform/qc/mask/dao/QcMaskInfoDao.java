package gms.shared.waveform.qc.mask.dao;

import gms.shared.utilities.bridge.database.converter.InstantToDoubleConverterNegativeNa;
import java.time.Instant;
import org.apache.commons.lang3.Validate;
import javax.persistence.Entity;
import javax.persistence.Table;
import javax.persistence.Id;
import javax.persistence.Column;
import javax.persistence.Convert;

@Entity
@Table(name = "qcmaskinfo")
public class QcMaskInfoDao {

  private long qcMaskId;
  private String station;
  private String channel;
  private Instant time;
  private Instant endTime;
  private double sampleRate;
  private long numberOfQcMaskSegRecords;
  private long qcMaskDefId;
  private String author;
  private Instant loadDate;

  public QcMaskInfoDao() {
  }

  /**
   * Create a deep copy of the given {@link QcMaskInfoDao}
   *
   * @param QcMaskInfoDaoCopy QcMaskInfoDao to copy
   *
   * @return {@link QcMaskInfoDao}
   */
  public QcMaskInfoDao(QcMaskInfoDao qcMaskInfoDaoCopy) {
    Validate.notNull(qcMaskInfoDaoCopy);
    Validate.notNaN(qcMaskId, "qcMaskId must be provided");

    this.qcMaskId = qcMaskInfoDaoCopy.qcMaskId;
    this.station = qcMaskInfoDaoCopy.station;
    this.channel = qcMaskInfoDaoCopy.channel;
    this.time = qcMaskInfoDaoCopy.time;
    this.endTime = qcMaskInfoDaoCopy.endTime;
    this.sampleRate = qcMaskInfoDaoCopy.sampleRate;
    this.numberOfQcMaskSegRecords = qcMaskInfoDaoCopy.numberOfQcMaskSegRecords;
    this.qcMaskDefId = qcMaskInfoDaoCopy.qcMaskDefId;
    this.author = qcMaskInfoDaoCopy.author;
    this.loadDate = qcMaskInfoDaoCopy.loadDate;
  }

  @Id
  @Column(name = "qcmaskid", nullable = false)
  public long getQcMaskId() {
    return qcMaskId;
  }

  public void setQcMaskId(long qcMaskId) {
    this.qcMaskId = qcMaskId;
  }

  @Column(name = "sta")
  public String getStation() {
    return station;
  }

  public void setStation(String station) {
    this.station = station;
  }

  @Column(name = "chan")
  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  @Column(name = "time", nullable = false)
  @Convert(converter = InstantToDoubleConverterNegativeNa.class)
  public Instant getTime() {
    return time;
  }

  public void setTime(Instant time) {
    this.time = time;
  }

  @Column(name = "endtime", nullable = false)
  @Convert(converter = InstantToDoubleConverterNegativeNa.class)
  public Instant getEndTime() {
    return endTime;
  }

  public void setEndTime(Instant endTime) {
    this.endTime = endTime;
  }

  @Column(name = "samprate")
  public double getSampleRate() {
    return sampleRate;
  }

  public void setSampleRate(double sampleRate) {
    this.sampleRate = sampleRate;
  }

  @Column(name = "nseg")
  public long getNumberOfQcMaskSegRecords() {
    return numberOfQcMaskSegRecords;
  }

  public void setNumberOfQcMaskSegRecords(long nSeg) {
    this.numberOfQcMaskSegRecords = nSeg;
  }

  @Column(name = "qcdefid")
  public long getQcMaskDefId() {
    return qcMaskDefId;
  }

  public void setQcMaskDefId(long qcMaskDefId) {
    this.qcMaskDefId = qcMaskDefId;
  }

  @Column(name = "auth")
  public String getAuthor() {
    return author;
  }

  public void setAuthor(String author) {
    this.author = author;
  }

  @Column(name = "lddate")
  public Instant getLoadDate() {
    return loadDate;
  }

  public void setLoadDate(Instant loadDate) {
    this.loadDate = loadDate;
  }

  @Override
  public String toString() {
    return "QcMaskInfoDao{"
      + "qcMaskId=" + qcMaskId
      + ", station=" + station
      + ", channel=" + channel
      + ", time=" + time
      + ", endTime=" + endTime
      + ", sampleRate=" + sampleRate
      + ", numberOfQcMaskSegRecords=" + numberOfQcMaskSegRecords
      + ", qcMaskDefId=" + qcMaskDefId
      + ", author=" + author
      + ", loadDate=" + loadDate
      + '}';
  }
}