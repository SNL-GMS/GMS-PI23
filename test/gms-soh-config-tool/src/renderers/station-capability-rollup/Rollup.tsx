import React from 'react';
import { RollupEntry } from '../../state/station-controls-slice';
import { CapabilityRollup } from './CapabilityRollup';

/**
 * The type of the props for the {@link Rollup} component
 */
export interface RollupProps {
  groupName: string;
  isStationGroupCapabilityRollup?: boolean;
  channelName?: string;
  defaultRollup: RollupEntry;
  rollups: RollupEntry[];
  rollupTypeOptions: string[];
  operatorTypeOptions: string[];
}

/**
 * Station Capability rollups
 */
export const Rollup: React.FC<RollupProps> = ({
  groupName,
  isStationGroupCapabilityRollup,
  channelName,
  defaultRollup,
  rollups,
  rollupTypeOptions,
  operatorTypeOptions,
}: RollupProps) => {
  return (
    <CapabilityRollup
      key={`capability-rollup-${groupName}-${defaultRollup.id}`}
      defaultRollup={defaultRollup}
      groupName={groupName}
      isStationGroupCapabilityRollup={isStationGroupCapabilityRollup}
      channelName={channelName}
      rollupId={defaultRollup.id}
      rollups={rollups}
      rollupType={defaultRollup.rollupType}
      rollupTypeOptions={rollupTypeOptions}
      operatorType={defaultRollup.operatorType}
      operatorTypeOptions={operatorTypeOptions}
      goodThreshold={defaultRollup.threshold?.goodThreshold}
      marginalThreshold={defaultRollup.threshold?.marginalThreshold}
    />
  );
};
