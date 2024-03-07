package gms.shared.waveform.qc.mask.database.connector.config;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.stream.Stream;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class QcSegmentBridgeDefinitionTest {

  private static final Duration maxQcSegmentDuration = Duration.ofMillis(400);
  private static final Instant seedQcMaskInfoStartTime = Instant.EPOCH;
  private static final Duration seedQcMaskInfoDuration = Duration.ofMillis(500);
  
  private static final LocalDateTime currDateTime = LocalDateTime.of(2023, 02, 23, 6, 0, 0);
  private static final LocalDateTime prevDateTime = LocalDateTime.of(2023, 02, 22, 6, 0, 0);

  @ParameterizedTest
  @MethodSource("getBuildValidationArguments")
  void testBuildValidation(String expectedMessage,
    Duration maxQcSegmentDuration,
    Instant seedQcMaskInfoStartTime,
    Duration seedQcMaskInfoDuration) {
    
    QcSegmentBridgeDefinition.Builder builder = QcSegmentBridgeDefinition.builder()
      .setMaxQcSegmentDuration(maxQcSegmentDuration)
      .setSeedQcMaskInfoStartTime(seedQcMaskInfoStartTime)
      .setSeedQcMaskInfoDuration(seedQcMaskInfoDuration);
    
    IllegalStateException exception = Assertions.assertThrows(IllegalStateException.class,
      () -> builder.build());
    Assertions.assertEquals(expectedMessage, exception.getMessage());
  }

  static Stream<Arguments> getBuildValidationArguments() {
    return Stream.of(
      arguments("Max QcSegment duration cannot be negative",
        Duration.between(currDateTime, prevDateTime),
        seedQcMaskInfoStartTime,
        seedQcMaskInfoDuration),
      arguments("Seed QcMaskInfo duration cannot be negative",
        maxQcSegmentDuration,
        seedQcMaskInfoStartTime,
        Duration.between(currDateTime, prevDateTime)));
  }
  
  @Test
  void testBuild() {
    QcSegmentBridgeDefinition.Builder builder = QcSegmentBridgeDefinition.builder()
      .setMaxQcSegmentDuration(maxQcSegmentDuration)
      .setSeedQcMaskInfoStartTime(seedQcMaskInfoStartTime)
      .setSeedQcMaskInfoDuration(seedQcMaskInfoDuration);
    QcSegmentBridgeDefinition definition = Assertions.assertDoesNotThrow(
      () -> builder.build());
    assertNotNull(definition);
  }
}
