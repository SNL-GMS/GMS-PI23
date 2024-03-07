package gms.shared.stationdefinition.coi.qc;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.auto.value.AutoValue;
import java.util.Optional;
import org.apache.commons.lang3.Validate;

@AutoValue
public abstract class QcSegmentCategoryAndType {
  
  public abstract QcSegmentCategory getQcSegmentCategory();
  
  @JsonInclude(Include.NON_EMPTY)
  public abstract Optional<QcSegmentType> getQcSegmentType();
  
  @JsonCreator
  public static QcSegmentCategoryAndType create(
    @JsonProperty("qcSegmentCategory") QcSegmentCategory qcSegmentCategory,
    @JsonProperty("qcSegmentType") QcSegmentType qcSegmentType
  ) {
    
    var qcSegmentTypeOptional = Optional.ofNullable(qcSegmentType);
    
    qcSegmentTypeOptional.ifPresentOrElse(
      type -> Validate.isTrue(
        qcSegmentCategory.getAllowableTypes().contains(type),
        "QcSegmentCategoryAndType: %s is not allowed for category %s",
        type, qcSegmentCategory
      ),
      () -> Validate.isTrue(
        qcSegmentCategory.allowEmptyType(),
        "QcSegmentCategoryAndType: no type specified, but %s requires a type",
        qcSegmentCategory
      )
    );
    
    return new AutoValue_QcSegmentCategoryAndType(
      qcSegmentCategory, qcSegmentTypeOptional
    );
  }
  
  public static QcSegmentCategoryAndType create(QcSegmentCategory qcSegmentCategory) {
    return create(qcSegmentCategory, null);
  }
  
}
