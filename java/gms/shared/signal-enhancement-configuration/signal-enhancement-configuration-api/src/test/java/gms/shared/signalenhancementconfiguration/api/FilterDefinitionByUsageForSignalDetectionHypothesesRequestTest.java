
package gms.shared.signalenhancementconfiguration.api;

import gms.shared.event.coi.EventHypothesis;
import gms.shared.event.coi.EventTestFixtures;
import gms.shared.signaldetection.coi.detection.SignalDetectionHypothesis;
import gms.shared.signaldetection.testfixtures.SignalDetectionTestFixtures;
import gms.shared.utilities.test.TestUtilities;
import java.util.Collection;
import java.util.List;
import org.junit.jupiter.api.Test;


class FilterDefinitionByUsageForSignalDetectionHypothesesRequestTest {
  @Test
  void serialization() {
    EventHypothesis eventHypothesis = EventTestFixtures.generateDummyEventHypothesisForFilterTest(10, 10);
    Collection<SignalDetectionHypothesis> signalDetectionHypotheses = List.of(SignalDetectionTestFixtures.HYPOTHESIS_FROM_ARRIVAL_1, SignalDetectionTestFixtures.HYPOTHESIS_FROM_ARRIVAL_2);
    FilterDefinitionByUsageForSignalDetectionHypothesesRequest filterDefinitionByUsuageForSignalDetectionHypothesesRequest = 
            FilterDefinitionByUsageForSignalDetectionHypothesesRequest.builder()
            .setEventHypothesis(eventHypothesis)
            .setSignalDetectionsHypotheses(signalDetectionHypotheses)
            .build();
            
    TestUtilities.assertSerializes(filterDefinitionByUsuageForSignalDetectionHypothesesRequest,
      FilterDefinitionByUsageForSignalDetectionHypothesesRequest.class);
  }
}
