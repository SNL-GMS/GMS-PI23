package gms.shared.signaldetection.manager;

import static gms.shared.frameworks.common.ContentType.MSGPACK_NAME;
import gms.shared.signaldetection.api.SignalDetectionAccessorInterface;
import gms.shared.signaldetection.api.request.DetectionsWithSegmentsByIdsRequest;
import gms.shared.signaldetection.api.request.DetectionsWithSegmentsByStationsAndTimeRequest;
import gms.shared.signaldetection.api.request.FilterDefinitionsForSignalDetectionsRequest;
import gms.shared.signaldetection.api.response.SignalDetectionsWithChannelSegments;
import gms.shared.signaldetection.coi.detection.SignalDetection;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import io.swagger.v3.oas.annotations.Operation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(value = "/signal-detection",
  consumes = MediaType.APPLICATION_JSON_VALUE,
  produces = {MediaType.APPLICATION_JSON_VALUE, MSGPACK_NAME})
public class SignalDetectionManager {
  private static final Logger logger = LoggerFactory.getLogger(SignalDetectionManager.class);

  private final SignalDetectionAccessorInterface signalDetectionAccessorImpl;

  @Autowired
  public SignalDetectionManager(
    @Qualifier("bridgedSignalDetectionAccessor") SignalDetectionAccessorInterface signalDetectionAccessorImpl) {

    this.signalDetectionAccessorImpl = signalDetectionAccessorImpl;
  }

  /**
   * Retrieves {@link SignalDetectionsWithChannelSegments} based on the stations, time range, stage id and excluded
   * {@link SignalDetection}s in the request.
   *
   * @param request The {@link DetectionsWithSegmentsByStationsAndTimeRequest} defining the request parameters
   * @return The {@link SignalDetectionsWithChannelSegments} satisfying the request parameters
   */
  @PostMapping("/signal-detections-with-channel-segments/query/stations-timerange")
  @Operation(summary = "retrieves all signal detections and associated with channel segments specified by the provided " +
    "stations, time range, stage, and excluding all signal detections having any of the provided signal detection ids")
  public SignalDetectionsWithChannelSegments findDetectionsWithSegmentsByStationsAndTime(
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "A list of " +
      "stations, a time range, stage id, and signal detection ids to exclude")
    @RequestBody DetectionsWithSegmentsByStationsAndTimeRequest request) {

    return signalDetectionAccessorImpl.findWithSegmentsByStationsAndTime(request.getStations(),
      request.getStartTime(),
      request.getEndTime(),
      request.getStageId(),
      request.getExcludedSignalDetections());
  }

  /**
   * Retrieves {@link SignalDetectionsWithChannelSegments} based on the SignalDetection uuids and stage id in the request
   *
   * @param request The {@link DetectionsWithSegmentsByIdsRequest} defining the request parameters
   * @return The {@link SignalDetectionsWithChannelSegments} satisfying the request parameters
   */
  @PostMapping("/signal-detections-with-channel-segments/query/ids")
  @Operation(summary = "retrieves all signal detections and associated with channel segments specified by the provided " +
    "signal detections ids and stage id")
  public SignalDetectionsWithChannelSegments findDetectionsWithSegmentsByIds(
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "A list of signal detection ids and a stage id")
    @RequestBody DetectionsWithSegmentsByIdsRequest request) {

    return signalDetectionAccessorImpl.findWithSegmentsByIds(request.getDetectionIds(),
      request.getStageId());
  }

  @PostMapping("/filter-definitions-by-usage/query/signal-detections")
  @Operation(summary = "retrieves all filter definitions keyed by usage, keyed additionally by the provided signal detection hypotheses")
  public Mono<FilterDefinitionByUsageBySignalDetectionHypothesis> findFilterDefinitionsForSignalDetections(
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "A list of signal detection hypotheses with an optional event hypothesis")
    @RequestBody FilterDefinitionsForSignalDetectionsRequest request
  ) {
    return signalDetectionAccessorImpl.findFilterDefinitionsForSignalDetections(request.getSignalDetections(), request.getStageId())
      .onErrorMap(err -> err instanceof IllegalArgumentException, 
        err -> new ResponseStatusException(HttpStatus.BAD_REQUEST, 
          "Request propagated to resolve to invalid arguments", err));
  }
}
