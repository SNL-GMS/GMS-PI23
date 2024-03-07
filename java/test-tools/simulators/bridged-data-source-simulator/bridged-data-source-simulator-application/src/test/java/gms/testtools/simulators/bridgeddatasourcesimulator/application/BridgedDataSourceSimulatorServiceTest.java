package gms.testtools.simulators.bridgeddatasourcesimulator.application;

import gms.testtools.simulators.bridgeddatasourceanalysissimulator.BridgedDataSourceAnalysisDataSimulator;
import gms.testtools.simulators.bridgeddatasourceintervalsimulator.BridgedDataSourceIntervalSimulator;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.DataSimulator;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.DataSimulatorResult;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.Site;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.SiteChan;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.util.SourceInterval;
import gms.testtools.simulators.bridgeddatasourcesimulator.application.fixtures.BridgedDataTestFixtures;
import gms.testtools.simulators.bridgeddatasourcestationsimulator.BridgedDataSourceStationSimulator;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.test.StepVerifier;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;

/**
 *
 * @author rudsand
 */
@ExtendWith(MockitoExtension.class)
public class BridgedDataSourceSimulatorServiceTest {

  @Mock
  private BridgedDataSourceStationSimulator stationSimulator;

  @Mock
  private BridgedDataSourceAnalysisDataSimulator analysisSimulator;

  @Mock
  private BridgedDataSourceIntervalSimulator intervalSimulator;

  private List<DataSimulator> simulators;

  private BridgedDataSourceSimulatorService simulatorService;

  @BeforeEach
  public void setup() {
    this.simulators = List.of(stationSimulator, analysisSimulator, intervalSimulator);
    this.simulatorService = new BridgedDataSourceSimulatorService(simulators);
  }

  @Test
  public void testInitialize() {
    var simulatorSpec = BridgedDataTestFixtures.simulatorSpec();

    StepVerifier.create(simulatorService.initialize(simulatorSpec))
      .verifyComplete();
    verifyAllSimulatorsCalledOnce(simulator -> simulator.initialize(simulatorSpec));
  }

  @Test
  public void testInitializeSimulatorErrorCompletesWithErrorResult() {
    var simulatorSpec = BridgedDataTestFixtures.simulatorSpec();

    willThrow(IllegalStateException.class).given(stationSimulator).initialize(simulatorSpec);

    StepVerifier.create(simulatorService.initialize(simulatorSpec).collectList())
      .expectNextMatches(results -> hasError(results, "BridgedDataSourceStationSimulator", IllegalStateException.class))
      .verifyComplete();
    verifyAllSimulatorsCalledOnce(simulator -> simulator.initialize(simulatorSpec));
  }

  @Test
  public void testStart() {
    StepVerifier.create(simulatorService.start())
      .verifyComplete();
    verifyAllSimulatorsCalledOnce(simulator -> simulator.start(any()));
  }

  @Test
  public void testStartSimulatorErrorCompletesWithErrorResult() {
    willThrow(IllegalStateException.class).given(stationSimulator).start(any());

    StepVerifier.create(simulatorService.start().collectList())
      .expectNextMatches(results -> hasError(results, "BridgedDataSourceStationSimulator", IllegalStateException.class))
      .verifyComplete();
    verifyAllSimulatorsCalledOnce(simulator -> simulator.start(any()));
  }

  @Test
  public void testStop() {
    StepVerifier.create(simulatorService.stop())
      .verifyComplete();
    verifyAllSimulatorsCalledOnce(simulator -> simulator.stop(any()));
  }

  @Test
  public void testStopSimulatorErrorCompletesWithErrorResult() {
    willThrow(IllegalStateException.class).given(stationSimulator).stop(any());

    StepVerifier.create(simulatorService.stop().collectList())
      .expectNextMatches(results -> hasError(results, "BridgedDataSourceStationSimulator", IllegalStateException.class))
      .verifyComplete();
    verifyAllSimulatorsCalledOnce(simulator -> simulator.stop(any()));
  }

  @Test
  public void testCleanup() {
    StepVerifier.create(simulatorService.cleanup())
      .verifyComplete();
    verifyAllSimulatorsCalledOnce(simulator -> simulator.cleanup(any()));
  }

  @Test
  public void testCleanupSimulatorErrorCompletesWithErrorResult() {
    willThrow(IllegalStateException.class).given(stationSimulator).cleanup(any());

    StepVerifier.create(simulatorService.cleanup().collectList())
      .expectNextMatches(results -> hasError(results, "BridgedDataSourceStationSimulator", IllegalStateException.class))
      .verifyComplete();
    verifyAllSimulatorsCalledOnce(simulator -> simulator.cleanup(any()));
  }

  @Test
  public void testStoreNewChannelVersions() throws SimulatorNotFoundException {
    List<SiteChan> siteChans = BridgedDataTestFixtures.siteChans();
    StepVerifier.create(simulatorService.storeNewChannelVersions(siteChans))
      .verifyComplete();
    verify(stationSimulator).storeNewChannelVersions(siteChans);
  }

  @Test
  public void testStoreNewSiteVersions() throws SimulatorNotFoundException {
    List<Site> sites = BridgedDataTestFixtures.sites();
    StepVerifier.create(simulatorService.storeNewSiteVersions(sites))
      .verifyComplete();
    verify(stationSimulator).storeNewSiteVersions(sites);
  }

  @Test
  public void testStoreIntervals() throws SimulatorNotFoundException {
    List<SourceInterval> sourceIntervals = BridgedDataTestFixtures.sourceIntervals();
    StepVerifier.create(simulatorService.storeIntervals(sourceIntervals))
      .verifyComplete();
    verify(intervalSimulator).storeIntervals(sourceIntervals);
  }

  private void verifyAllSimulatorsCalledOnce(Consumer<DataSimulator> simulatorCall) {
    simulators.forEach(simulator -> simulatorCall.accept(verify(simulator)));
  }

  private <T extends Throwable> boolean hasError(List<DataSimulatorResult<Void>> results, String simulatorName, Class<T> throwableType) {
    return results.stream()
      .filter(result -> result.getSimulatorName().contains(simulatorName))
      .filter(result -> result.getThrowable().filter(throwableType::isInstance).isPresent())
      .collect(Collectors.counting()) == 1;
  }
}
