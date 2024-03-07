package gms.shared.stationdefinition.coi.qc;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import java.time.Duration;
import java.util.Set;

@AutoValue
public abstract class ProcessingMaskDefinition {
  
  public abstract Duration getMaskedSegmentMergeThreshold();
  
  public abstract ProcessingOperation getProcessingOperation();
  
  public abstract Set<QcSegmentCategoryAndType> getAppliedQcSegmentCategoriesAndTypes();
  
  @JsonCreator
  public static ProcessingMaskDefinition create(
    @JsonProperty("maskedSegmentMergeThreshold") Duration maskedSegmentMergeThreshold,
    @JsonProperty("processingOperation") ProcessingOperation processingOperation,
    @JsonProperty("appliedQcSegmentCategoriesAndTypes") Set<QcSegmentCategoryAndType> appliedQcSegmentCategoriesAndTypes
  ) {
    return new AutoValue_ProcessingMaskDefinition(
      maskedSegmentMergeThreshold, 
      processingOperation, 
      appliedQcSegmentCategoriesAndTypes
    );
  }
  
}
