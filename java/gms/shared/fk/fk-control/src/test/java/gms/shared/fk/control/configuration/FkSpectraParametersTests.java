package gms.shared.fk.control.configuration;

import org.junit.jupiter.api.Test;
import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.utilities.test.TestUtilities;
import java.util.List;

import static gms.shared.fk.testfixtures.FkTestFixtures.DEFINITION;

class FkSpectraParametersTests {
 
  @Test
  void testSerialization() {
    FkSpectraParameters parameters = FkSpectraParameters.from("test", List.of(Channel.createEntityReference("channel1"), Channel.createEntityReference("channel2")), DEFINITION);
    TestUtilities.assertSerializes(parameters, FkSpectraParameters.class);
  }
  
}
