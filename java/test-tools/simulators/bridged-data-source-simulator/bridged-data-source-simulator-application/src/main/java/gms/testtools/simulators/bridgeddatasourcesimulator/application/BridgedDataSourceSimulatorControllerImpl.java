package gms.testtools.simulators.bridgeddatasourcesimulator.application;

import com.google.common.annotations.VisibleForTesting;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.DataSimulatorErrors;
import gms.shared.frameworks.control.ControlContext;
import gms.shared.utilities.bridge.database.BridgedEntityManagerFactoryProvider;
import gms.shared.utilities.javautilities.objectmapper.DatabaseLivenessCheck;
import gms.shared.utilities.javautilities.objectmapper.OracleLivenessCheck;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.DataSimulatorStateMachine;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.DataSimulatorResult;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.ExceptionSummary;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.Site;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.SiteChan;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.util.DataSimulatorSpec;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.util.SourceInterval;
import gms.testtools.simulators.bridgeddatasourcesimulator.application.factory.DataSimulatorFactory;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.commons.lang3.Validate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import gms.testtools.simulators.bridgeddatasourcesimulator.api.DataSimulatorController;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.DataSimulatorStateMachine.State;

import static com.google.common.base.Preconditions.checkArgument;
import static com.google.common.base.Preconditions.checkNotNull;
import static com.google.common.base.Preconditions.checkState;

/**
 * This is the backing implementation of the restful api defined in {@link
 * DataSimulatorController} and is used the start the Bridged Data Source Simulator Service in
 * {@link BridgedDataSourceSimulatorApplication}.
 */
public class BridgedDataSourceSimulatorControllerImpl implements DataSimulatorController {

  private static final Logger logger = LoggerFactory.getLogger(DataSimulatorController.class);

  private static final String SIMULATOR_BRIDGED_DATA_SOURCE_CONFIG = "simulator.bridged-data-source-config";
  private static final String DEFAULT_SCHEMA_CONFIG_KEY = "default_schema";
  private static final String SIMULATION_SCHEMA_CONFIG_KEY = "simulation_schema";
  private static final String CALIB_DELTA = "calib_delta";

  private final AtomicReference<DataSimulatorErrors> simulatorErrors;
  private final DataSimulatorStateMachine stateMachine;
  private final BridgedDataSourceSimulatorService simulatorService;

  public BridgedDataSourceSimulatorControllerImpl(DataSimulatorStateMachine stateMachine, BridgedDataSourceSimulatorService simulatorService) {
    this.simulatorErrors = new AtomicReference<>(DataSimulatorErrors.empty());
    this.stateMachine = stateMachine;
    this.simulatorService = simulatorService;
  }

  /**
   * Initializes a {@link DataSimulatorController} by providing a Processing Config {@link ControlContext}
   *
   * @param context - the context used to retrieve processing config.
   *
   * @return an initialized {@link DataSimulatorController}
   */
  public static BridgedDataSourceSimulatorControllerImpl create(ControlContext context) {
    Validate.notNull(context, "ControlContext");

    DatabaseLivenessCheck simDataLivenessCheck = OracleLivenessCheck.create(
      context.getSystemConfig());
    if (!simDataLivenessCheck.isLive()) {
      logger.error("Could not establish database liveness.  Exiting");
      System.exit(1);
    }

    //get config values
    var configurationConsumerUtility = context.getProcessingConfigurationConsumerUtility();

    Map<String, Object> processingConfig = configurationConsumerUtility
      .resolve(SIMULATOR_BRIDGED_DATA_SOURCE_CONFIG, List.of());

    var defaultSchemaConfigStringValue = getProcessingConfigStringValue(processingConfig,
      DEFAULT_SCHEMA_CONFIG_KEY, "Default Schema");
    var simulationSchemaConfigStringValue = getProcessingConfigStringValue(
      processingConfig,
      SIMULATION_SCHEMA_CONFIG_KEY, "Simulation Schema");

    var calibDeltaValue = (Integer) (processingConfig.getOrDefault(
      CALIB_DELTA, 5));

    //create database connections
    var seedDataEntityManagerFactoryProvider = BridgedEntityManagerFactoryProvider
      .create(defaultSchemaConfigStringValue);
    var simulationDataEntityManagerFactoryProvider = BridgedEntityManagerFactoryProvider
      .create(simulationSchemaConfigStringValue);

    var dataSimulatorFactory = DataSimulatorFactory.create(seedDataEntityManagerFactoryProvider,
      simulationDataEntityManagerFactoryProvider, calibDeltaValue);

    Runtime.getRuntime().addShutdownHook(new Thread(dataSimulatorFactory::cleanup));

    BridgedDataSourceSimulatorService simulatorService = new BridgedDataSourceSimulatorService(List
      .of(dataSimulatorFactory.getBridgedDataSourceStationSimulatorInstance(),
        dataSimulatorFactory.getBridgedDataSourceAnalysisSimulatorInstance(),
        dataSimulatorFactory.getBridgedDataSourceIntervalSimulatorInstance()));

    return BridgedDataSourceSimulatorControllerImpl.create(new DataSimulatorStateMachine(), simulatorService);
  }

  protected static BridgedDataSourceSimulatorControllerImpl create(
    DataSimulatorStateMachine stateMachine,
    BridgedDataSourceSimulatorService simulatorService) {
    Validate.notNull(stateMachine, "stateMachine cannot be null");
    Validate.notNull(simulatorService, "simulatorService cannot be null");

    return new BridgedDataSourceSimulatorControllerImpl(stateMachine, simulatorService);
  }

  private static String getProcessingConfigStringValue(Map<String, Object> processingConfig,
    String cacheKey, final String dataTypeString) {
    final var configValueObject = processingConfig.get(cacheKey);
    final var errorMessage = String
      .format("No %s were found in processing config for simulation config.", dataTypeString);
    Validate.notNull(configValueObject, errorMessage);
    final var configStringValue = String.valueOf(configValueObject);
    Validate.isTrue(!configStringValue.isBlank(), errorMessage);
    return configStringValue;
  }

  /**
   * Verifies that the state machine can be transitioned to the {@link
   * BridgedDataSourceSimulatorStatus#INITIALIZED} state using the {@link
   * BridgedDataSourceSimulatorTransition#INITIALIZE} transition. BridgedDataSourceSimulatorStateMachine}.
   * <p>
   * If the transition is allowed, then
   * {@link BridgedDataSourceDataSimulator#initialize(BridgedDataSourceSimulatorSpec)} is called on each
   * {@link DataSimulatorController#dataSimulators}
   *
   * @param bridgedDataSourceSimulatorSpec - An {@link DataSimulatorSpec} to provided the simulation specification
   * details.
   */
  @Override
  public void initialize(DataSimulatorSpec bridgedDataSourceSimulatorSpec) {
    checkState(stateMachine.isValidTransition(State.INITIALIZING),
      "Cannot initialize simulator in current state %s", stateMachine.getCurrentState());

    logger.info("Initializing Simulator...");
    stateMachine.transition(State.INITIALIZING);
    simulatorService.initialize(bridgedDataSourceSimulatorSpec)
      .collectList()
      .subscribe(results -> handleResults(results, "initialize", () -> stateMachine.transition(State.INITIALIZED)), this::handleError);
  }

  /**
   * Verifies that the the state machine can be transitioned to the {@link
   * BridgedDataSourceSimulatorStatus#STARTED} state using the {@link
   * BridgedDataSourceSimulatorTransition#START} transition.
   * <p>
   * If the transition is allowed, then {@link BridgedDataSourceDataSimulator#start(String)} is called on each
   * {@link DataSimulatorController#dataSimulators}
   *
   * @param placeholder - Any string value. This required by the framework, but it will be ignored.
   */
  @Override
  public void start(String placeholder) {
    checkState(stateMachine.isValidTransition(State.STARTED),
      "Cannot start simulator in current state %s", stateMachine.getCurrentState());

    logger.info("Starting Simulator...");
    simulatorService.start()
      .collectList()
      .subscribe(results -> handleResults(results, "start", () -> stateMachine.transition(State.STARTED)), this::handleError);
  }

  /**
   * Verifies that the the state machine can be transitioned to the {@link
   * BridgedDataSourceSimulatorStatus#STOPPED} state using the {@link
   * BridgedDataSourceSimulatorTransition#STOP} transition.
   * <p>
   * If the transition is allowed, then {@link BridgedDataSourceDataSimulator#stop(String)} is called on each
   * {@link DataSimulatorController#dataSimulators}
   *
   * @param placeholder - Any string value. This required by the framework, but it will be ignored.
   */
  @Override
  public void stop(String placeholder) {
    checkState(stateMachine.isValidTransition(State.STOPPED),
      "Cannot stop simulator in current state %s", stateMachine.getCurrentState());
    logger.info("Stopping Simulator...");
    simulatorService.stop()
      .collectList()
      .subscribe(results -> handleResults(results, "stop", () -> stateMachine.transition(State.STOPPED)), this::handleError);
  }

  /**
   * Verifies that the the state machine can be transitioned to the {@link
   * BridgedDataSourceSimulatorStatus#UNINITIALIZED} state using the {@link
   * BridgedDataSourceSimulatorTransition#CLEANUP} transition.
   * <p>
   * If the transition is allowed, then {@link BridgedDataSourceDataSimulator#cleanup(String)} is called on each
   * {@link DataSimulatorController#dataSimulators}
   *
   * @param placeholder - Any string value. This required by the framework, but it will be ignored.
   */
  @Override
  public void cleanup(String placeholder) {
    checkState(stateMachine.isValidTransition(State.UNINITIALIZING),
      "Cannot clean up simulator in current state %s", stateMachine.getCurrentState());
    logger.info("Cleaning Up Simulator...");
    stateMachine.transition(State.UNINITIALIZING);
    simulatorService.cleanup()
      .collectList()
      .subscribe(results -> handleResults(results, "cleanup", () -> stateMachine.transition(State.UNINITIALIZED)), this::handleError);
  }

  /**
   * Verifies that simulator is not in {@link BridgedDataSourceSimulatorStatus#UNINITIALIZED} state so that
   * {@link DataSimulatorController#storeNewChannelVersions(Collection<SiteChan>)} can be called
   * <p>
   * @param chans - A collections of SiteChan.
   */
  @Override
  public void storeNewChannelVersions(Collection<SiteChan> chans) {
    State currentState = stateMachine.getCurrentState();
    checkState(currentState != State.UNINITIALIZED,
      "Cannot store new channel versions if simulator is uninitialized.");
    checkState(currentState != State.ERROR,
      "Simulator currently in ERROR state, please see /errors endpoint");
    checkNotNull(chans, "Cannot store null channel versions");
    checkArgument(!chans.isEmpty(), "Cannot store empty channel versions");

    try {
      simulatorService.storeNewChannelVersions(chans)
        .block();
    }
    catch (SimulatorNotFoundException ex) {
      throw new IllegalStateException(ex);
    }

    logger.info("New Channel Versions stored.");
  }

  /**
   * Verifies that simulator is not in {@link BridgedDataSourceSimulatorStatus#UNINITIALIZED} state so that
   * {@link DataSimulatorController#storeNewSiteVersions(Collection<Site>)} can be called
   * <p>
   * @param sites - A collections of Sites.
   */
  @Override
  public void storeNewSiteVersions(Collection<Site> sites) {
    var currentState = stateMachine.getCurrentState();
    checkState(currentState != State.UNINITIALIZED,
      "Cannot store new site versions if simulator is uninitialized.");
    checkState(currentState != State.ERROR,
      "Simulator currently in ERROR state, please see /errors endpoint");
    Objects.requireNonNull(sites, "Cannot store null sites");
    Validate.isTrue(!sites.isEmpty(), "Cannot store empty sites");

    try {
      simulatorService.storeNewSiteVersions(sites)
        .block();
    }
    catch (SimulatorNotFoundException ex) {
      throw new IllegalStateException(ex);
    }

    logger.info("New Site Versions stored.");
  }

  @Override
  public void storeIntervals(List<SourceInterval> intervalList) {
    try {
      simulatorService.storeIntervals(intervalList)
        .block();
    }
    catch (SimulatorNotFoundException ex) {
      throw new IllegalStateException(ex);
    }
  }

  @Override
  public State status(String placeholder) {
    logger.info("Simulation Status Requested.");
    return stateMachine.getCurrentState();
  }

  @Override
  public DataSimulatorErrors errors(String placeholder) {
    logger.info("Simulation Errors Requested.");
    return simulatorErrors.get();
  }

  private <T> void handleResults(Collection<DataSimulatorResult<T>> results, String command, Runnable onSuccess) {
    Map<String, ExceptionSummary> errorMap = results.stream()
      .collect(DataSimulatorResult.toExceptionSummaryMap());

    if (errorMap.isEmpty()) {
      logger.info("Successfully completed {} command", command);
      resetErrors();
      onSuccess.run();
    } else {
      logger.error("Error(s) running {} command. See /errors endpoint for more details.", command);
      setErrors(DataSimulatorErrors.create(command, errorMap));
      stateMachine.transition(State.ERROR);
    }

  }

  private void handleError(Throwable e) {
    logger.error("Uncaught exception in simulator.", e);
    setErrors(DataSimulatorErrors.create("Runtime", Map.of("Runtime", ExceptionSummary.create(e))));
  }

  @VisibleForTesting
  protected void setErrors(DataSimulatorErrors errors) {
    simulatorErrors.set(errors);
  }

  @VisibleForTesting
  protected void resetErrors() {
    simulatorErrors.set(DataSimulatorErrors.empty());
  }

}
