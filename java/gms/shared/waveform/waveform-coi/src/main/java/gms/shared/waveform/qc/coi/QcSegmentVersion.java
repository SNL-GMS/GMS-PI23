package gms.shared.waveform.qc.coi;

import gms.shared.stationdefinition.coi.qc.QcSegmentCategory;
import gms.shared.stationdefinition.coi.qc.QcSegmentType;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.google.auto.value.AutoValue;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.waveform.coi.ChannelSegment;
import gms.shared.waveform.coi.Timeseries;
import gms.shared.workflow.coi.WorkflowDefinitionId;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import javax.annotation.Nullable;

/**
 * Models the QcSgementVersion COI, with faceting.
 */
@AutoValue
@JsonSerialize(as = QcSegmentVersion.class)
@JsonDeserialize(builder = AutoValue_QcSegmentVersion.Builder.class)
public abstract class QcSegmentVersion implements Comparable<QcSegmentVersion> {

  /**
   *
   * @return Identifier of this QcSegmentVersion
   */
  public abstract QcSegmentVersionId getId();

  /**
   *
   * @return Data fields if populated, empty optional otherwise.
   */
  @JsonUnwrapped
  public abstract Optional<Data> getData();

  /**
   *
   * @return A builder for building an instance of this class.
   */
  public static Builder instanceBuilder() {
    return new AutoValue_QcSegmentVersion.Builder();
  }

  /**
   *
   * @return A builder with fields already sat to match the fields of this
   * class.
   */
  public abstract Builder toBuilder();

  /**
   * Create an entity reference, that is, a faceted object with only the
   * identifier populated.
   *
   * @param id ID of QcSegmentVersion
   *
   * @return Entity reference for a QcSegmnetVersion
   */
  public static QcSegmentVersion createEntityReference(QcSegmentVersionId id) {
    return instanceBuilder()
      .setId(id)
      .build();
  }

  /**
   * Turn this object into an entity reference.
   *
   * @return QcSegmentVersion with no data fields.
   */
  public QcSegmentVersion toEntityReference() {
    return instanceBuilder()
      .setId(getId())
      .build();
  }

  /**
   * Compare with another QcSegmentVersion for ordering. Compares the effective
   * date in the identifier.
   *
   * @param t Other QcSegmentVersion to compare to
   *
   * @return Result of comparing the Instants returned by getEffectiveAt()
   */
  @Override
  public int compareTo(QcSegmentVersion t) {
    return getId().getEffectiveAt().compareTo(t.getId().getEffectiveAt());
  }

  /**
   * Builder class.
   */
  @AutoValue.Builder
  @JsonPOJOBuilder(withPrefix = "set")
  public abstract static class Builder {

    public abstract Builder setId(QcSegmentVersionId id);

    @JsonUnwrapped
    public abstract Builder setData(@Nullable Data data);

    public abstract QcSegmentVersion build();

  }

  /**
   * Data class.
   */
  @AutoValue
  @JsonSerialize(as = QcSegmentVersion.Data.class)
  @JsonDeserialize(builder = QcSegmentVersion.Data.JacksonBuilder.class)
  public abstract static class Data {

    public abstract Optional<WorkflowDefinitionId> getStageId();

    public abstract List<ChannelSegment<? extends Timeseries>> getDiscoveredOn();

    public abstract List<Channel> getChannels();

    public abstract String getRationale();

    public abstract boolean isRejected();

    public abstract String getCreatedBy();

    public abstract Instant getEndTime();

    public abstract Instant getStartTime();

    public abstract Optional<QcSegmentType> getType();

    public abstract Optional<QcSegmentCategory> getCategory();

    public abstract Builder toBuilder();

    public static Builder instanceBuilder() {
      return new AutoValue_QcSegmentVersion_Data.Builder();
    }

    //
    // Since we have two builder classes, have an interface that has all of the
    // needed setters and build methods.
    //
    public static interface BuilderInterface {

      BuilderInterface setStageId(@Nullable WorkflowDefinitionId stageId);

      BuilderInterface setDiscoveredOn(List<ChannelSegment<? extends Timeseries>> segments);

      BuilderInterface setChannels(List<Channel> channels);

      BuilderInterface setRationale(String rationale);

      BuilderInterface setRejected(boolean isRejected);

      BuilderInterface setCreatedBy(String createdBy);

      BuilderInterface setStartTime(Instant startTime);

      BuilderInterface setEndTime(Instant endTime);

      BuilderInterface setType(@Nullable QcSegmentType type);

      BuilderInterface setCategory(@Nullable QcSegmentCategory catagory);

      Data build();
    }

    /**
     * Data builder class for use by developers.
     */
    @AutoValue.Builder
    public abstract static class Builder implements BuilderInterface {

      abstract Data autoBuild();

      @Nullable
      @Override
      public Data build() {

        var tentativeData = autoBuild();

        validateCatagoryAndType(tentativeData);

        return tentativeData;
      }

      private void validateCatagoryAndType(Data tentativeData) {

        tentativeData.getCategory().ifPresentOrElse(
          catagory -> {

            if (tentativeData.isRejected()) {
              throw new IllegalArgumentException("Rejected QcSegmentVersion can't have a category");
            }

            tentativeData.getType().ifPresentOrElse(
              type -> {
                if (!catagory.getAllowableTypes().contains(type)) {
                  throw new IllegalArgumentException("Invalid type " + tentativeData.getType() + " for category " + tentativeData.getCategory());
                }
              },
              () -> {
                if (!catagory.allowEmptyType()) {
                  throw new IllegalArgumentException("No type specified, but allowed types for category not empty");
                }
              }
            );
          },
          () -> {
            if (tentativeData.getType().isPresent()) {
              throw new IllegalArgumentException("Type is specfied but catagory is not");
            }
          }
        );
      }

    }

    //
    // Seperate data bulder class for Jackson. This was the only way, it seems,
    // to prevent calling AutoValues builder directly when all fields were empty,
    // which would cause Autovalues builder to fail. Since we dont want to turn
    // off null checks for that builder, use this one for Jackson which returns
    // null if all fields are unset, and delegates to Autovalues builder otherwise.
    //
    // Since this is not intended for developsrs, it is made private.
    //
    @JsonPOJOBuilder(withPrefix = "set")
    private static class JacksonBuilder implements BuilderInterface {

      private final AutoValue_QcSegmentVersion_Data.Builder delgateBuilder = new AutoValue_QcSegmentVersion_Data.Builder();
      private int invokedSetterCount;

      @Override
      public BuilderInterface setStageId(@Nullable WorkflowDefinitionId stageId) {
        invokedSetterCount++;
        delgateBuilder.setStageId(stageId);
        return this;
      }

      @Override
      public BuilderInterface setDiscoveredOn(List<ChannelSegment<? extends Timeseries>> segments) {
        invokedSetterCount++;
        delgateBuilder.setDiscoveredOn(segments);
        return this;
      }

      @Override
      public BuilderInterface setChannels(List<Channel> channels) {
        invokedSetterCount++;
        delgateBuilder.setChannels(channels);
        return this;
      }

      @Override
      public BuilderInterface setRationale(String rationale) {
        invokedSetterCount++;
        delgateBuilder.setRationale(rationale);
        return this;
      }

      @Override
      public BuilderInterface setRejected(boolean isRejected) {
        invokedSetterCount++;
        delgateBuilder.setRejected(isRejected);
        return this;
      }

      @Override
      public BuilderInterface setCreatedBy(String createdBy) {
        invokedSetterCount++;
        delgateBuilder.setCreatedBy(createdBy);
        return this;
      }

      @Override
      public BuilderInterface setStartTime(Instant startTime) {
        invokedSetterCount++;
        delgateBuilder.setStartTime(startTime);
        return this;
      }

      @Override
      public BuilderInterface setEndTime(Instant endTime) {
        invokedSetterCount++;
        delgateBuilder.setEndTime(endTime);
        return this;
      }

      @Override
      public BuilderInterface setType(@Nullable QcSegmentType type) {
        invokedSetterCount++;
        delgateBuilder.setType(type);
        return this;
      }

      @Override
      public BuilderInterface setCategory(@Nullable QcSegmentCategory catagory) {
        invokedSetterCount++;
        delgateBuilder.setCategory(catagory);
        return this;
      }

      @Nullable
      @Override
      public Data build() {
        if (invokedSetterCount == 0) {
          return null;
        }

        return delgateBuilder.build();
      }

    }
  }
}
