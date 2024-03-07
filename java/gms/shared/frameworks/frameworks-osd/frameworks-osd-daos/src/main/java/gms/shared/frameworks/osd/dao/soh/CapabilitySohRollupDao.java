package gms.shared.frameworks.osd.dao.soh;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

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
import javax.persistence.Table;

import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType;

import gms.shared.frameworks.osd.coi.soh.SohStatus;
import gms.shared.frameworks.osd.dao.util.TimePartitionKey;
import javax.persistence.AttributeOverride;
import javax.persistence.EmbeddedId;

@Entity
@NamedQueries(
  @NamedQuery(name = "CapabilitySohRollupDao.exists",
    query = "SELECT CASE WHEN COUNT(dao) > 0 THEN 1 ELSE 0 END FROM CapabilitySohRollupDao dao WHERE dao.id = :id")
)
@TypeDef(
  name = "pgsql_enum",
  typeClass = PostgreSQLEnumType.class
)
@Table(name = "capability_soh_rollup")
public class CapabilitySohRollupDao {

	@EmbeddedId
	@AttributeOverride(name = "time", column = @Column(name = "capability_rollup_time"))
  private TimePartitionKey id;

  @Enumerated(EnumType.STRING)
  @Column(name = "group_rollup_status", nullable = false, columnDefinition = "public.soh_status_enum")
  @Type(type = "pgsql_enum")
  private SohStatus groupRollupStatus;

  @Column(name = "station_group_name")
  private String stationGroupName;

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "capability_station_soh_uuids",
    joinColumns = {@JoinColumn(name = "capability_rollup_id", referencedColumnName = "id"), 
			@JoinColumn(name = "capability_rollup_time", referencedColumnName = "capability_rollup_time")})
  @Column(name = "station_soh_id")
  private Set<UUID> stationSohUUIDS;

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "capability_station_soh_status_map",
    joinColumns = {@JoinColumn(name = "capability_rollup_id", referencedColumnName = "id"),
			@JoinColumn(name = "capability_rollup_time", referencedColumnName = "capability_rollup_time")})
  private List<CapabilityStationStatusDao> stationSohStatusMapping;

  public TimePartitionKey getId() {
    return this.id;
  }

  public void setId(TimePartitionKey id) {
    this.id = id;
  }

  public SohStatus getGroupRollupstatus() {
    return this.groupRollupStatus;
  }

  public void setGroupRollupstatus(SohStatus status) {
    this.groupRollupStatus = status;
  }

  public String getStationGroupName() {
    return this.stationGroupName;
  }

  public void setStationGroupName(String stationGroupName) {
    this.stationGroupName = stationGroupName;
  }

  public Set<UUID> getStationSohUUIDs() {
    return this.stationSohUUIDS;
  }

  public void setStationSohUUIDS(Set<UUID> stationSohUUIDS) {
    this.stationSohUUIDS = stationSohUUIDS;
  }

  public List<CapabilityStationStatusDao> getRollupSohStatusByStation() {
    return this.stationSohStatusMapping;
  }

  public void setRollupSohStatusByStation(List<CapabilityStationStatusDao> stationDaoSohStatusMap) {
    this.stationSohStatusMapping = stationDaoSohStatusMap;
  }


  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (!(o instanceof CapabilitySohRollupDao)) {
      return false;
    }
    CapabilitySohRollupDao that = (CapabilitySohRollupDao) o;
    return Objects.equals(id, that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hash(id);
  }

}
