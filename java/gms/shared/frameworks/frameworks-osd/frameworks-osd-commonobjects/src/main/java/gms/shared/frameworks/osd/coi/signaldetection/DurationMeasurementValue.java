package gms.shared.frameworks.osd.coi.signaldetection;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import gms.shared.frameworks.osd.coi.DurationValue;
import gms.shared.frameworks.osd.coi.InstantValue;

import java.io.Serializable;

/**
 * Represents a measurement of a Duration starting at a particular time.
 */
@AutoValue
public abstract class DurationMeasurementValue implements Serializable {

  /**
   * Gets the start time of the measurement
   *
   * @return the start time
   */
  public abstract InstantValue getStartTime();

  /**
   * Gets the duration of the measurement
   *
   * @return the duration
   */
  public abstract DurationValue getDuration();

  /**
   * Creates a DurationMeasurementValue.
   *
   * @param startTime The InstantValue corresponding to start time
   * @param duration The DurationValue corresponding to duration
   * @return DurationMeasurementValue
   * @throws IllegalArgumentException if any of the parameters are null
   */
  @JsonCreator
  public static DurationMeasurementValue from(
    @JsonProperty("startTime") InstantValue startTime,
    @JsonProperty("duration") DurationValue duration) {
    return new AutoValue_DurationMeasurementValue(startTime, duration);
  }
}
