import { QcSegmentCategory } from '@gms/common-model/lib/qc-segment';

import {
  getQCSegmentCategoryString,
  getQCSegmentSwatchColor
} from '~analyst-ui/components/waveform/quality-control/qc-segment-utils';

describe('QC Segment Util functions', () => {
  it('exists', () => {
    expect(getQCSegmentCategoryString).toBeDefined();
    expect(getQCSegmentSwatchColor).toBeDefined();
  });

  it('can get the dialog swatch color', () => {
    let theme: any = {
      colors: {
        qcMaskColors: {
          analystDefined: undefined,
          dataAuthentication: undefined,
          stationSOH: undefined,
          unprocessed: undefined,
          waveform: undefined,
          rejected: undefined
        }
      }
    };

    expect(getQCSegmentSwatchColor(QcSegmentCategory.ANALYST_DEFINED, theme)).toEqual('#EB06C8');
    expect(getQCSegmentSwatchColor(QcSegmentCategory.DATA_AUTHENTICATION, theme)).toEqual(
      '#8A57FF'
    );
    expect(getQCSegmentSwatchColor(QcSegmentCategory.LONG_TERM, theme)).toEqual('#0E9B96');
    expect(getQCSegmentSwatchColor(QcSegmentCategory.STATION_SOH, theme)).toEqual('#B58400');
    expect(getQCSegmentSwatchColor(QcSegmentCategory.UNPROCESSED, theme)).toEqual('#FFFFFF');
    expect(getQCSegmentSwatchColor(QcSegmentCategory.WAVEFORM, theme)).toEqual('#00E22B');
    expect(getQCSegmentSwatchColor(undefined, theme)).toEqual('#FF0000');

    theme = {
      colors: {
        qcMaskColors: {
          analystDefined: '#FF0000',
          dataAuthentication: '#00E22B',
          longTerm: '#0E9B96',
          stationSOH: '#FFFFFF',
          unprocessed: '#B58400',
          waveform: '#8A57FF',
          rejected: '#EB06C8'
        }
      }
    };

    expect(getQCSegmentSwatchColor(QcSegmentCategory.ANALYST_DEFINED, theme)).toEqual('#FF0000');
    expect(getQCSegmentSwatchColor(QcSegmentCategory.DATA_AUTHENTICATION, theme)).toEqual(
      '#00E22B'
    );
    expect(getQCSegmentSwatchColor(QcSegmentCategory.LONG_TERM, theme)).toEqual('#0E9B96');
    expect(getQCSegmentSwatchColor(QcSegmentCategory.STATION_SOH, theme)).toEqual('#FFFFFF');
    expect(getQCSegmentSwatchColor(QcSegmentCategory.UNPROCESSED, theme)).toEqual('#B58400');
    expect(getQCSegmentSwatchColor(QcSegmentCategory.WAVEFORM, theme)).toEqual('#8A57FF');
    expect(getQCSegmentSwatchColor(undefined, theme)).toEqual('#EB06C8');
  });

  it('can get the dialog category string', () => {
    expect(getQCSegmentCategoryString(QcSegmentCategory.ANALYST_DEFINED)).toEqual(
      'Analyst Defined'
    );
    expect(getQCSegmentCategoryString(QcSegmentCategory.DATA_AUTHENTICATION)).toEqual(
      'Data Authentication'
    );
    expect(getQCSegmentCategoryString(QcSegmentCategory.STATION_SOH)).toEqual('Station SOH');
    expect(getQCSegmentCategoryString(QcSegmentCategory.UNPROCESSED)).toEqual('Unprocessed');
    expect(getQCSegmentCategoryString(QcSegmentCategory.WAVEFORM)).toEqual('Waveform');
    expect(getQCSegmentCategoryString(undefined)).toEqual('');
  });
});
