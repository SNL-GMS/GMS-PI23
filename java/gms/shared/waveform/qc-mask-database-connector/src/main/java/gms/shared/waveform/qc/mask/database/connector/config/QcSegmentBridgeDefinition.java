package gms.shared.waveform.qc.mask.database.connector.config;

import com.google.auto.value.AutoValue;
import com.google.common.base.Preconditions;
import java.time.Duration;
import java.time.Instant;

@AutoValue
public abstract class QcSegmentBridgeDefinition {

  public abstract Duration getMaxQcSegmentDuration();

  public abstract Instant getSeedQcMaskInfoStartTime();

  public abstract Duration getSeedQcMaskInfoDuration();

  public static Builder builder() {
    return new AutoValue_QcSegmentBridgeDefinition.Builder();
  }

  @AutoValue.Builder
  public interface Builder {

    Builder setMaxQcSegmentDuration(Duration maxQcSegmentDuration);

    Builder setSeedQcMaskInfoStartTime(Instant seedQcMaskInfoStartTime);

    Builder setSeedQcMaskInfoDuration(Duration seedQcMaskInfoDuration);

    QcSegmentBridgeDefinition autobuild();

    default QcSegmentBridgeDefinition build() {
      QcSegmentBridgeDefinition definition = autobuild();

      Preconditions.checkState(!definition.getMaxQcSegmentDuration().isNegative(),
        "Max QcSegment duration cannot be negative");

      Preconditions.checkState(!definition.getSeedQcMaskInfoDuration().isNegative(),
        "Seed QcMaskInfo duration cannot be negative");

      return definition;
    }
  }
}
