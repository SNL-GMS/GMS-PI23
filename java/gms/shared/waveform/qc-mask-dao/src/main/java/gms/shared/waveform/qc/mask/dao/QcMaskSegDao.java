package gms.shared.waveform.qc.mask.dao;

import java.time.Instant;
import org.apache.commons.lang3.Validate;
import javax.persistence.Entity;
import javax.persistence.Table;
import javax.persistence.EmbeddedId;
import javax.persistence.Column;

@Entity
@Table(name = "qcmaskseg")
public class QcMaskSegDao {

  private QcMaskIdStartSampleKey qcMaskSegKey;
  private long endSample;
  private long maskType;
  private String author;
  private Instant loadDate;

  public QcMaskSegDao() {
  }

  /**
   * Create a deep copy of the given {@link QcMaskSegDao}
   *
   * @param QcMaskSegDaoCopy QcMaskInfoDao to copy
   *
   * @return {@link QcMaskSegDao}
   */
  public QcMaskSegDao(QcMaskSegDao qcMaskSegDaoCopy) {
    Validate.notNull(qcMaskSegDaoCopy);
    Validate.notNull(qcMaskSegDaoCopy.getQcMaskSegKey());

    this.endSample = qcMaskSegDaoCopy.endSample;
    this.maskType = qcMaskSegDaoCopy.maskType;
    this.author = qcMaskSegDaoCopy.author;
    this.loadDate = qcMaskSegDaoCopy.loadDate;
    this.qcMaskSegKey = new QcMaskIdStartSampleKey();

    QcMaskIdStartSampleKey qcMaskSegOldKey = qcMaskSegDaoCopy.getQcMaskSegKey();

    this.qcMaskSegKey.setQcMaskId(qcMaskSegOldKey.getQcMaskId());
    this.qcMaskSegKey.setStartSample(qcMaskSegOldKey.getStartSample());
  }

  @EmbeddedId
  public QcMaskIdStartSampleKey getQcMaskSegKey() {
    return qcMaskSegKey;
  }

  public void setQcMaskSegKey(QcMaskIdStartSampleKey qcMaskSegKey) {
    this.qcMaskSegKey = qcMaskSegKey;
  }

  @Column(name = "endsample", nullable = false)
  public long getEndSample() {
    return endSample;
  }

  public void setEndSample(long endSample) {
    this.endSample = endSample;
  }

  @Column(name = "masktype", nullable = false)
  public long getMaskType() {
    return maskType;
  }

  public void setMaskType(long maskType) {
    this.maskType = maskType;
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
    return "QcMaskSegDao{"
      + "qcMaskSegKey=" + qcMaskSegKey
      + ", endSample=" + endSample
      + ", maskType=" + maskType
      + ", author=" + author
      + ", loadDate=" + loadDate
      + '}';
  }
}
