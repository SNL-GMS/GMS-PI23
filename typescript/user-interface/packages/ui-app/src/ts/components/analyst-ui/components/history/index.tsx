import { nonIdealStateWithSpinner } from '@gms/ui-core-components';
import React from 'react';

import type { HistoryProps } from './types';

const HistoryLazy = React.lazy(async () =>
  import(/* webpackChunkName: 'ui-app-history' */ './history-container').then(module => ({
    default: module.ReactHistoryContainer
  }))
);

export function History(props: HistoryProps) {
  return (
    <React.Suspense fallback={nonIdealStateWithSpinner()}>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <HistoryLazy {...props} />
    </React.Suspense>
  );
}
