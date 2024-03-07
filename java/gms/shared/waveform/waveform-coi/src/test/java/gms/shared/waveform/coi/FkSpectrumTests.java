package gms.shared.waveform.coi;

import gms.shared.waveform.coi.Immutable2dDoubleArray;
import gms.shared.waveform.coi.FkSpectrum;
import gms.shared.utilities.test.TestUtilities;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static gms.shared.waveform.testfixture.FkTestFixtures.SPECTRUM;

class FkSpectrumTests {
 
  @ParameterizedTest
  @MethodSource("getBuildArguments")
  void testBuildValidation(String expectedMessage, FkSpectrum.Builder builder) {
    IllegalStateException ex = assertThrows(IllegalStateException.class, () -> builder.build());
    assertEquals(expectedMessage, ex.getMessage());
  }
  
  static Stream<Arguments> getBuildArguments() {
    return Stream.of(
      arguments("Power and Fstat must have same row count", 
        SPECTRUM.toBuilder().setPower(Immutable2dDoubleArray.from(new double[][]{{0.1, 0.1, 0.1}, {0.1, 0.5, 0.1}}))), 
      arguments("Power and Fstat must have same column count", 
        SPECTRUM.toBuilder().setPower(Immutable2dDoubleArray.from(new double[][]{{0.1, 0.1}, {0.1, 0.5}, {0.1, 0.1}}))));
  }
  
  @Test
  void testSerialization() {
    TestUtilities.assertSerializes(SPECTRUM, FkSpectrum.class);
  }   
}