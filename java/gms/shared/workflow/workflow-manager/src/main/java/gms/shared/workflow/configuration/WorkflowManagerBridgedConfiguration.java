package gms.shared.workflow.configuration;

import gms.shared.workflow.accessor.CachedWorkflowAccessor;
import gms.shared.workflow.api.IntervalRepositoryInterface;
import gms.shared.workflow.api.WorkflowAccessorInterface;
import gms.shared.workflow.coi.Workflow;
import gms.shared.workflow.repository.BridgedIntervalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.ScheduledExecutorService;

/**
 * Configuration used for deploying the {@link gms.shared.workflow.manager.WorkflowManager} application in bridged mode.
 */
@Configuration("workflow-managerConfiguration")
@ConditionalOnProperty(prefix = "service.run-state", name = "manager-config", havingValue = "bridged", matchIfMissing = true)
@ComponentScan(basePackages = {"gms.shared.spring", "gms.shared.system.events"})
public class WorkflowManagerBridgedConfiguration {

  /**
   * Provides the configured {@link Workflow} definition
   *
   * @param workflowConfiguration configuration to retrieve definition from
   *
   * @return {@link Workflow} definition configured
   */
  @Bean
  @Autowired
  public Workflow workflow(WorkflowManagerConfigurationUtility workflowConfiguration) {
    return workflowConfiguration.resolveWorkflowDefinition();
  }

  /**
   * Provides the configured implementation of the {@link WorkflowAccessorInterface1} for this configuration
   * <p>
   * NOTE: Alternative configurations must declare a bean with the same name to properly replace
   *
   * @param workflowAccessor Implementation of the {@link WorkflowAccessorInterface1} configured
   *
   * @return The configured implementation, allowing for alternative implementations to be declared per configuration
   */
  @Bean("workflow-accessor")
  @Autowired
  public WorkflowAccessorInterface workflowAccessor(CachedWorkflowAccessor workflowAccessor) {
    return workflowAccessor;
  }

  /**
   * Provides the configured implementation of the {@link IntervalRepositoryInterface} for this configuration
   * <p>
   * NOTE: Alternative configurations must declare a bean with the same name to properly replace
   *
   * @param bridgedIntervalRepository Implementation of the {@link IntervalRepositoryInterface} configured
   *
   * @return The configured implementation, allowing for alternative implementations to be declared per configuration
   */
  @Bean("interval-repository")
  @Autowired
  public IntervalRepositoryInterface intervalRepository(BridgedIntervalRepository bridgedIntervalRepository) {
    return bridgedIntervalRepository;
  }

  /**
   * Bean to provide delegate task scheduler for async runners
   *
   * @return A single-threaded {@link ScheduledExecutorService}
   */
  @Bean
  TaskScheduler taskScheduler() {
    return new ThreadPoolTaskScheduler();
  }

}
