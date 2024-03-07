package gms.shared.frameworks.osd.dao.transferredfile;

import com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType;
import gms.shared.frameworks.osd.coi.waveforms.RawStationDataFrame;
import gms.shared.frameworks.osd.coi.waveforms.RawStationDataFrame.AuthenticationStatus;
import gms.shared.frameworks.osd.coi.waveforms.RawStationDataFrameMetadata;
import gms.shared.frameworks.osd.coi.waveforms.RawStationDataFramePayloadFormat;
import gms.shared.frameworks.osd.coi.waveforms.WaveformSummary;
import gms.shared.frameworks.osd.dao.util.TimePartitionKey;
import java.io.Serializable;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.CascadeType;
import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.JoinColumn;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import javax.persistence.AttributeOverride;
import javax.persistence.EmbeddedId;
import javax.persistence.JoinColumns;
import javax.persistence.MapKey;
import org.apache.commons.lang3.Validate;

@Entity
@Table(name = "raw_station_data_frame")
//    indexes = {@Index(columnList = "station_id, acquisition_protocol, payload_data_start_time")})
@TypeDef(
  name = "pgsql_enum",
  typeClass = PostgreSQLEnumType.class
)
@NamedQueries(
  @NamedQuery(name = "RawStationDataFrameDao.exists",
    query = "SELECT CASE WHEN COUNT(dao) > 0 THEN 1 ELSE 0 END FROM RawStationDataFrameDao dao WHERE dao.id = :id")
)
public class RawStationDataFrameDao implements Serializable {

	@EmbeddedId
	@AttributeOverride(name = "time", column = @Column(name = "reception_time"))
	private TimePartitionKey id;

	@Column(name = "station_name")
  private String stationName;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "raw_station_data_frame_channel_names",
    joinColumns = {@JoinColumn(name = "raw_station_data_frame_id", referencedColumnName = "id"), 
		@JoinColumn(name = "reception_time", referencedColumnName = "reception_time")})
  @Column(name = "channel_name")
  private List<String> channelNames;


  @Enumerated(EnumType.STRING)
  @Column(name = "payload_format", columnDefinition = "public.rsdf_payload_format")
  @Type(type = "pgsql_enum")
  private RawStationDataFramePayloadFormat payloadFormat;

  @Column(nullable = false, name = "payload_data_start_time")
  private Instant payloadDataStartTime;

  @Column(nullable = false, name = "payload_data_end_time")
  private Instant payloadDataEndTime;

  @Column(nullable = false, name = "authentication_status", columnDefinition = "public.authentication_status")
  @Enumerated(EnumType.STRING)
  @Type(type = "pgsql_enum")
  private AuthenticationStatus authenticationStatus;

  @OneToMany(cascade = {CascadeType.ALL})
  @JoinColumns({@JoinColumn(name = "raw_station_data_frame_id", referencedColumnName = "id"), 
		@JoinColumn(name = "reception_time", referencedColumnName = "reception_time")})
  @MapKey(name = "channelName")
  private Map<String, WaveformSummaryDao> waveformSummaries;


  /**
   * Default no-arg constructor (for use by JPA)
   */
  public RawStationDataFrameDao() {
  }

  public RawStationDataFrameDao(RawStationDataFrame df) {
    Map<String, WaveformSummaryDao> summaries = new HashMap<>();

    for (Map.Entry<String, WaveformSummary> entry : df.getMetadata().getWaveformSummaries()
      .entrySet()) {
      summaries.put(entry.getKey(), WaveformSummaryDao.from(entry.getValue(), df.getMetadata().getReceptionTime()));
    }

    Validate.notNull(df);
		var id = new TimePartitionKey(df.getId(), df.getMetadata().getReceptionTime());
    this.id = id;
    this.stationName = df.getMetadata().getStationName();
    this.channelNames = df.getMetadata().getChannelNames().asList();
    this.payloadFormat = df.getMetadata().getPayloadFormat();
    this.payloadDataStartTime = df.getMetadata().getPayloadStartTime();
    this.payloadDataEndTime = df.getMetadata().getPayloadEndTime();
    this.authenticationStatus = df.getMetadata().getAuthenticationStatus();
    this.waveformSummaries = summaries;
  }

  public RawStationDataFrame toCoi() {
    Map<String, WaveformSummary> summaries = new HashMap<>();

    for (Map.Entry<String, WaveformSummaryDao> entry : this.getWaveformSummaries().entrySet()) {
      WaveformSummaryDao ws = entry.getValue();

      summaries.put(entry.getKey(), WaveformSummary
        .from(ws.getChannelName(), ws.getStartTime(),
          ws.getEndTime()));
    }

    return RawStationDataFrame.builder()
      .setId(this.id.getId())
      .setMetadata(RawStationDataFrameMetadata.builder()
        .setStationName(this.stationName)
        .setChannelNames(this.channelNames)
        .setPayloadStartTime(this.payloadDataStartTime)
        .setPayloadEndTime(this.payloadDataEndTime)
        .setPayloadFormat(this.payloadFormat)
        .setAuthenticationStatus(this.authenticationStatus)
        .setReceptionTime(this.id.getTime())
        .setWaveformSummaries(summaries)
        .build())
      .build();
  }

  public TimePartitionKey getId() {
    return id;
  }

  public void setId(TimePartitionKey id) {
    this.id = id;
  }

  public String getStationName() {
    return stationName;
  }

  public void setStationName(String stationName) {
    this.stationName = stationName;
  }

  public List<String> getChannelNames() {
    return channelNames;
  }

  public void setChannelNames(List<String> channelNames) {
    this.channelNames = channelNames;
  }

  public RawStationDataFramePayloadFormat getPayloadFormat() {
    return payloadFormat;
  }

  public void setPayloadFormat(
    RawStationDataFramePayloadFormat payloadFormat) {
    this.payloadFormat = payloadFormat;
  }


  public Instant getPayloadStartTime() {
    return payloadDataStartTime;
  }

  public void setPayloadStartTime(Instant payloadDataStartTime) {
    this.payloadDataStartTime = payloadDataStartTime;
  }

  public Instant getPayloadEndTime() {
    return payloadDataEndTime;
  }

  public void setPayloadEndTime(Instant payloadDataEndTime) {
    this.payloadDataEndTime = payloadDataEndTime;
  }

  public AuthenticationStatus getAuthenticationStatus() {
    return authenticationStatus;
  }

  public void setAuthenticationStatus(AuthenticationStatus authenticationStatus) {
    this.authenticationStatus = authenticationStatus;
  }

  public Map<String, WaveformSummaryDao> getWaveformSummaries() {
    return waveformSummaries;
  }

  public void setWaveformSummaries(
    Map<String, WaveformSummaryDao> waveformSummaries) {
    this.waveformSummaries = waveformSummaries;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    RawStationDataFrameDao that = (RawStationDataFrameDao) o;
    return Objects.equals(id, that.id) &&
      Objects.equals(stationName, that.stationName) &&
      Objects.equals(channelNames, that.channelNames) &&
      payloadFormat == that.payloadFormat &&
      Objects.equals(payloadDataStartTime, that.payloadDataStartTime) &&
      Objects.equals(payloadDataEndTime, that.payloadDataEndTime) &&
      authenticationStatus == that.authenticationStatus &&
      Objects.equals(waveformSummaries, that.waveformSummaries);
  }

  @Override
  public int hashCode() {
    return Objects
      .hash(id, stationName, channelNames, payloadFormat, payloadDataStartTime,
        payloadDataEndTime, authenticationStatus,
        waveformSummaries);
  }

  @Override
  public String toString() {
    return "RawStationDataFrameDao{" +
      "id=" + id.getId() +
      ", stationName=" + stationName +
      ", channelNames=" + channelNames +
      ", payloadFormat=" + payloadFormat +
      ", payloadDataStartTime=" + payloadDataStartTime +
      ", payloadDataEndTime=" + payloadDataEndTime +
      ", receptionTime=" + id.getTime() +
      ", authenticationStatus=" + authenticationStatus +
      ", waveformSummaries=" + waveformSummaries +
      '}';
  }
}