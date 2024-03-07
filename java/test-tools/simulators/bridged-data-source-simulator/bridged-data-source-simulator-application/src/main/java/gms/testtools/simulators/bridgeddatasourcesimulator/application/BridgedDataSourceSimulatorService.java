package gms.testtools.simulators.bridgeddatasourcesimulator.application;

import gms.testtools.simulators.bridgeddatasourceintervalsimulator.BridgedDataSourceIntervalSimulator;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.DataSimulator;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.DataSimulatorResult;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.Site;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.SiteChan;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.util.DataSimulatorSpec;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.util.SourceInterval;
import gms.testtools.simulators.bridgeddatasourcestationsimulator.BridgedDataSourceStationSimulator;
import java.util.Collection;
import java.util.List;
import java.util.function.Consumer;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import static java.lang.String.format;

/**
 *
 * @author rudsand
 */
public class BridgedDataSourceSimulatorService {

  private final List<DataSimulator> dataSimulators;

  public BridgedDataSourceSimulatorService(List<DataSimulator> dataSimulators) {
    this.dataSimulators = dataSimulators;
  }

  public Flux<DataSimulatorResult<Void>> initialize(DataSimulatorSpec bridgedDataSourceSimulatorSpec) {
    return runSimulators(simulator -> simulator.initialize(bridgedDataSourceSimulatorSpec));
  }

  public Flux<DataSimulatorResult<Void>> start() {
    return runSimulators(simulator -> simulator.start(""));
  }

  public Flux<DataSimulatorResult<Void>> stop() {
    return runSimulators(simulator -> simulator.stop(""));
  }

  public Flux<DataSimulatorResult<Void>> cleanup() {
    return runSimulators(simulator -> simulator.cleanup(""));
  }

  public Mono<DataSimulatorResult<Void>> storeNewChannelVersions(Collection<SiteChan> chans) throws SimulatorNotFoundException {
    return runSimulator(BridgedDataSourceStationSimulator.class, simulator -> simulator.storeNewChannelVersions(chans));
  }

  /**
   * Verifies that simulator is not in {@link BridgedDataSourceSimulatorStatus#UNINITIALIZED} state so that
   * {@link BridgedDataSourceSimulatorController#storeNewSiteVersions(Collection<Site>)} can be called
   * <p>
   * @param sites - A collections of Sites.
   */
  public Mono<DataSimulatorResult<Void>> storeNewSiteVersions(Collection<Site> sites) throws SimulatorNotFoundException {
    return runSimulator(BridgedDataSourceStationSimulator.class, simulator -> simulator.storeNewSiteVersions(sites));
  }

  public Mono<DataSimulatorResult<Void>> storeIntervals(List<SourceInterval> intervals) throws SimulatorNotFoundException {
    return runSimulator(BridgedDataSourceIntervalSimulator.class, simulator -> simulator.storeIntervals(intervals));
  }

  private Flux<DataSimulatorResult<Void>> runSimulators(Consumer<DataSimulator> simulatorConsumer) {
    return Flux.fromIterable(dataSimulators)
      .flatMap(simulator -> runSimulator(simulator, simulatorConsumer));
  }

  private <T extends DataSimulator> Mono<DataSimulatorResult<Void>> runSimulator(Class<T> simulatorType,
    Consumer<T> simulatorConsumer) throws SimulatorNotFoundException {

    T simulator = dataSimulators.stream()
      .filter(simulatorType::isInstance)
      .findFirst()
      .map(simulatorType::cast)
      .orElseThrow(() -> new SimulatorNotFoundException(format("No simulator found of type %s", simulatorType.getName())));

    return runSimulator(simulator, simulatorConsumer);
  }

  private <T extends DataSimulator> Mono<DataSimulatorResult<Void>> runSimulator(T simulator,
    Consumer<T> simulatorConsumer) {
    return Mono.fromRunnable(() -> simulatorConsumer.accept(simulator))
      .map(v -> DataSimulatorResult.success(simulator.getClass().getName()))
      .onErrorResume(ex -> Mono.just(DataSimulatorResult.error(simulator.getClass().getName(), ex)))
      .subscribeOn(Schedulers.boundedElastic());
  }

}
