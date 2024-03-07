package gms.shared.utilities.signalprocessing.validation;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import java.time.Duration;
import java.time.Instant;

import static gms.shared.waveform.testfixture.WaveformTestFixtures.WAVEFORM_1;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

class JitterPredicateTests {

  @Test
  void testNoJitter() {
    JitterPredicate jitterPredicate = new JitterPredicate(WAVEFORM_1.getStartTime());
    Assertions.assertTrue(jitterPredicate.test(WAVEFORM_1));
  }
  
  @Test
  void testAcceptableJitter() {
    Duration samplePeriod = WAVEFORM_1.getSamplePeriod();
    Instant jitterStart = WAVEFORM_1.getStartTime().minus(samplePeriod.dividedBy(3));
    JitterPredicate jitterPredicate = new JitterPredicate(jitterStart);
    assertTrue(jitterPredicate.test(WAVEFORM_1));
  }
 
  @Test
  void testUnacceptableJitter() {
    Duration samplePeriod = WAVEFORM_1.getSamplePeriod();
    Instant jitterStart = WAVEFORM_1.getStartTime().minus(samplePeriod.dividedBy(2));
    JitterPredicate jitterPredicate = new JitterPredicate(jitterStart);
    assertFalse(jitterPredicate.test(WAVEFORM_1));    
  }
}
