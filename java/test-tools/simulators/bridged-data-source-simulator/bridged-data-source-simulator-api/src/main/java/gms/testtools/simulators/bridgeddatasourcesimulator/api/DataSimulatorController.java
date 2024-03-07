package gms.testtools.simulators.bridgeddatasourcesimulator.api;

import gms.shared.frameworks.common.ContentType;
import gms.shared.frameworks.common.annotations.Component;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.Site;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.coi.SiteChan;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.util.DataSimulatorSpec;
import gms.testtools.simulators.bridgeddatasourcesimulator.api.util.SourceInterval;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import java.util.Collection;
import java.util.List;

@Component("bridged-data-source-simulator")
@Path("/bridged-data-source-simulator")
public interface DataSimulatorController extends DataSimulator {

  @Override
  @Path("/initialize")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Initializes a simulation based on the provided specification details")
  void initialize(
    @RequestBody(description = "an object to provided the simulation specification details", required = true) DataSimulatorSpec bridgedDataSourceSimulatorSpec);

  @Override
  @Path("/start")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Start an initialized simulation")
  void start(
    @RequestBody(description = "Any string value. This is required by the framework, but it will be ignored.", required = true) String placeholder);

  @Override
  @Path("/stop")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Stop a started simulation")
  void stop(
    @RequestBody(description = "Any string value. This is required by the framework, but it will be ignored.", required = true) String placeholder);

  @Override
  @Path("/cleanup")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Cleans up an initialized, non running, simulation")
  void cleanup(
    @RequestBody(description = "Any string value. This is required by the framework, but it will be ignored.", required = true) String placeholder);

  @Path("/status")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Returns the current status of the simulation")
  DataSimulatorStateMachine.State status(
    @RequestBody(description = "Any string value. This required by the framework, but it will be ignored.", required = true) String placeholder);

  @Path("/errors")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Returns any errors that occurred in the simulator")
  DataSimulatorErrors errors(
    @RequestBody(description = "Any string value. This required by the framework, but it will be ignored.", required = true) String placeholder);

  @Path("/store-intervals")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Stores the provided intervals in the simulation database")
  void storeIntervals(List<SourceInterval> intervalList);

  @Path("/store-new-channel-versions")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Stores new version of channels")
  void storeNewChannelVersions(
    @RequestBody(description = "A list of SiteChan cois.", required = true) Collection<SiteChan> channels);

  @Path("/store-new-site-versions")
  @POST
  @Consumes(ContentType.JSON_NAME)
  @Produces(ContentType.JSON_NAME)
  @Operation(summary = "Stores new version of sites")
  void storeNewSiteVersions(
    @RequestBody(description = "A list of Site cois.", required = true) Collection<Site> sites);

}
