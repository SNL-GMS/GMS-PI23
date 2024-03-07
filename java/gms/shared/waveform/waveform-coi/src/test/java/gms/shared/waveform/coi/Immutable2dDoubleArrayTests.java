package gms.shared.waveform.coi;

import gms.shared.waveform.coi.Immutable2dDoubleArray;
import java.util.Arrays;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class Immutable2dDoubleArrayTests {

  @Test
  void testCopyOf() {
    double[][] expected = new double[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    assertTrue(Arrays.deepEquals(expected, Immutable2dDoubleArray.from(expected).copyOf()));
  }

}
