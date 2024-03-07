
package gms.shared.signalenhancementconfiguration.service;

import gms.shared.event.coi.EventHypothesis;
import gms.shared.common.coi.types.PhaseType;
import gms.shared.signalenhancementconfiguration.api.FilterDefinitionByFilterDefinitionUsage;
import gms.shared.signalenhancementconfiguration.coi.filter.FilterListDefinition;
import gms.shared.stationdefinition.coi.channel.Channel;
import java.util.Optional;

public interface SignalEnhancementConfigurationInterface {
    public FilterListDefinition filterListDefinition();
    public FilterDefinitionByFilterDefinitionUsage getDefaultFilterDefinitionByUsageForChannel(Channel channel,
      Optional<EventHypothesis> eventHypothesis, Optional<PhaseType> phaseType);
}
