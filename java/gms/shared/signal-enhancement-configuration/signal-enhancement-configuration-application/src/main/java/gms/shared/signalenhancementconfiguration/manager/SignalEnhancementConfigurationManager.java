package gms.shared.signalenhancementconfiguration.manager;

import static gms.shared.frameworks.common.ContentType.MSGPACK_NAME;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageByChannelSegment;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageBySignalDetectionHypothesis;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForChannelSegmentsRequest;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByUsageForSignalDetectionHypothesesRequest;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.signalenhancementconfiguration.service.SignalEnhancementConfigurationService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/signal-enhancement-configuration",
  produces = {MediaType.APPLICATION_JSON_VALUE, MSGPACK_NAME})
public class SignalEnhancementConfigurationManager {
  private SignalEnhancementConfigurationService signalEnhancementConfigurationService;
  

  @Autowired
  public SignalEnhancementConfigurationManager(SignalEnhancementConfigurationService signalEnhancementConfigurationService) {
    this.signalEnhancementConfigurationService = signalEnhancementConfigurationService;
  }
  /**
   * Finds {@link FilterListDefinition} and returns serialized json response
     * @return 
   */
  @GetMapping(value = "/filter-lists-definition")
  @Operation(summary = "retrieves filter lists definition")
  public FilterListDefinition getFilterListsDefinition() {
    return signalEnhancementConfigurationService.filterListDefinition();
  }
   /**
     * Resolves default FilterDefinitions for each of the provided ChannelSegment objects for each FilterDefinitionUsage literal
     * @param request
     * @return {@link FilterDefinitionByUsageByChannelSegments}
   */
  @PostMapping(value = "/default-filter-definitions-for-channel-segments")
  @Operation(summary = "retrieves filter lists definition")
  public FilterDefinitionByUsageByChannelSegment getDefaultFilterDefinitionByUsageForChannelSegments(
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "List of Channel Segments and an optional event hypothesis")
    @RequestBody FilterDefinitionByUsageForChannelSegmentsRequest request) {
      return signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForChannelSegments(request);
  }
    /**
     * Resolves default FilterDefinitions for each of the provided SignalDetectionHypothesis objects for each FilterDefinitionUsage literal
     * @param request
     * @return {@link FilterDefinitionByUsageBySignalDetectionHypothesis}
   */
  @PostMapping("/default-filter-definitions-for-signal-detection-hypotheses")
  @Operation(summary = "Resolves default FilterDefinitions for each of the provided SignalDetectionHypothesis objects for each FilterDefinitionUsage literal")
  public FilterDefinitionByUsageBySignalDetectionHypothesis getByDefaultFilterDefinitionByUsageForSignalDetectionHypotheses(
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "List of Signal Detection Hypotheses and an optional event hypothesis")
    @RequestBody FilterDefinitionByUsageForSignalDetectionHypothesesRequest request) {
      return signalEnhancementConfigurationService.getDefaultFilterDefinitionByUsageForSignalDetectionHypothesis(request);
  }
}
