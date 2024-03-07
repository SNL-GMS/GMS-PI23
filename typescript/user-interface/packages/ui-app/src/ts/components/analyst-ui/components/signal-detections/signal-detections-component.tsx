import { IanDisplays } from '@gms/common-model/lib/displays/types';
import { useAppSelector } from '@gms/ui-state';
import React from 'react';

import { BaseDisplay } from '~common-ui/components/base-display';

import { useVisibleSignalDetections } from '../waveform/waveform-hooks';
import { SignalDetectionsPanel } from './signal-detections-panel';
import type { SignalDetectionsComponentProps } from './types';

/**
 * IAN signal detections component.
 */
// eslint-disable-next-line react/function-component-definition
const IANSignalDetectionsComponent: React.FunctionComponent<SignalDetectionsComponentProps> = (
  props: SignalDetectionsComponentProps
) => {
  const { glContainer } = props;
  const isSynced = useAppSelector(
    state => state.app.signalDetections.displayedSignalDetectionConfiguration.syncWaveform
  );
  const signalDetectionsQuery = useVisibleSignalDetections(isSynced);
  return (
    <BaseDisplay
      glContainer={glContainer}
      tabName={IanDisplays.SIGNAL_DETECTIONS}
      className="ian-signal-detections-gl-container"
      data-cy="ian-signal-detections-container"
    >
      <SignalDetectionsPanel signalDetectionsQuery={signalDetectionsQuery} />
    </BaseDisplay>
  );
};

export const SignalDetectionsComponent = React.memo(IANSignalDetectionsComponent);
