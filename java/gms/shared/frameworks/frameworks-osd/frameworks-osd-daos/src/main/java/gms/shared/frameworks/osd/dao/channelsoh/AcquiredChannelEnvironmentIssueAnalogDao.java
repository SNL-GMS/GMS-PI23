package gms.shared.frameworks.osd.dao.channelsoh;

import gms.shared.frameworks.osd.coi.channel.soh.AcquiredChannelEnvironmentIssueAnalog;
import java.util.Objects;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;

/**
 * Define a Data Access Object to allow access to the relational database.
 */
@Entity
@Table(name = "channel_env_issue_analog")
public class AcquiredChannelEnvironmentIssueAnalogDao extends AcquiredChannelEnvironmentIssueDao {

  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "channel_env_issue_analog_sequence")
  @SequenceGenerator(name = "channel_env_issue_analog_sequence", sequenceName = "channel_env_issue_analog_sequence",
    allocationSize = 1)
  protected long id;

  @Column(name = "status", nullable = false)
  private double status;

  public long getId() {
    return id;
  }

  public void setId(long id) {
    this.id = id;
  }

  public double getStatus() {
    return status;
  }

  public void setStatus(double status) {
    this.status = status;
  }

  public AcquiredChannelEnvironmentIssueAnalog toCoi() {
    return AcquiredChannelEnvironmentIssueAnalog.from(
      this.channelName, this.type,
      this.startTime, this.endTime, this.status);
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof AcquiredChannelEnvironmentIssueAnalogDao)) return false;
    if (!super.equals(o)) return false;
    AcquiredChannelEnvironmentIssueAnalogDao that = (AcquiredChannelEnvironmentIssueAnalogDao) o;
    return Double.compare(that.getStatus(), getStatus()) == 0;
  }

  @Override
  public int hashCode() {
    return Objects.hash(super.hashCode(), getStatus());
  }

  @Override
  public String toString() {
    return "AcquiredChannelEnvironmentIssueAnalogDao{" +
      "status=" + status +
      ", id=" + id +
      ", channelName='" + channelName + '\'' +
      ", type=" + type +
      ", startTime=" + startTime +
      ", endTime=" + endTime +
      '}';
  }
}
