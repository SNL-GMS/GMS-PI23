import { Colors } from '@blueprintjs/core';
import type { ConfigurationTypes } from '@gms/common-model';

export const defaultTheme: ConfigurationTypes.UITheme = {
  name: 'GMS Default (dark)',
  isDarkMode: true,
  display: {
    edgeEventOpacity: 0.35,
    edgeSDOpacity: 0.2,
    predictionSDOpacity: 0.1
  },
  colors: {
    gmsMain: '#f5f8fa',
    gmsMainInverted: '#10161a',
    gmsBackground: '#182026',
    gmsSelection: '#1589d1',
    gmsTableSelection: '#f5f8fa',
    mapVisibleStation: '#D9822B',
    mapStationDefault: '#6F6E74',
    waveformDimPercent: 0.75,
    waveformRaw: Colors.COBALT4,
    waveformFilterLabel: Colors.LIGHT_GRAY5,
    waveformMaskLabel: '#EB06C8',
    unassociatedSDColor: '#C23030',
    unassociatedSDHoverColor: '#E76A6E',
    openEventSDColor: '#C87619',
    openEventSDHoverColor: '#EC9A3C',
    completeEventSDColor: '#62D96B',
    completeEventSDHoverColor: '#BBFFBC',
    otherEventSDColor: '#FFFFFF',
    otherEventSDHoverColor: '#DCE0E5',
    predictionSDColor: '#C58C1B',
    qcMaskColors: {
      analystDefined: '#EB06C8',
      dataAuthentication: '#8A57FF',
      longTerm: '#0E9B96',
      processingMask: '#F87C2E',
      rejected: '#FF0000',
      stationSOH: '#B58400',
      unprocessed: '#FFFFFF',
      waveform: '#00E22B'
    },
    weavessOutOfBounds: '#10161a'
  }
};
