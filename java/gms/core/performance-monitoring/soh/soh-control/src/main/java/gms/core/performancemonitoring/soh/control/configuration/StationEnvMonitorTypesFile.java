package gms.core.performancemonitoring.soh.control.configuration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import com.google.common.collect.ImmutableSet;
import gms.shared.frameworks.osd.coi.soh.SohMonitorType;
import java.util.Set;

@AutoValue
public abstract class StationEnvMonitorTypesFile {
  public abstract ImmutableSet<SohMonitorType> getStationEnvMonitorTypes();

  @JsonCreator
  public static StationEnvMonitorTypesFile from(
    @JsonProperty("envMonitorTypes") ImmutableSet<SohMonitorType> envMonitorTypes) {
    return new AutoValue_StationEnvMonitorTypesFile(envMonitorTypes);
  }

  public static StationEnvMonitorTypesFile from(Set<SohMonitorType> envMonitorTypes) {
    return from(ImmutableSet.copyOf(envMonitorTypes));
  }
}
