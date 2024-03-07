import { QcSegmentCategory } from '@gms/common-model/lib/qc-segment';
import type { UITheme } from '@gms/common-model/lib/ui-configuration/types';

/**
 * Determine the swatch color of a given {@link QcSegmentCategory}
 *
 * @returns Color hex string
 */
export function getQCSegmentSwatchColor(category: QcSegmentCategory, uiTheme: UITheme): string {
  switch (category) {
    case QcSegmentCategory.ANALYST_DEFINED:
      return uiTheme.colors.qcMaskColors.analystDefined ?? '#EB06C8';
    case QcSegmentCategory.DATA_AUTHENTICATION:
      return uiTheme.colors.qcMaskColors.dataAuthentication ?? '#8A57FF';
    case QcSegmentCategory.LONG_TERM:
      return uiTheme.colors.qcMaskColors.longTerm ?? '#0E9B96';
    case QcSegmentCategory.STATION_SOH:
      return uiTheme.colors.qcMaskColors.stationSOH ?? '#B58400';
    case QcSegmentCategory.UNPROCESSED:
      return uiTheme.colors.qcMaskColors.unprocessed ?? '#FFFFFF';
    case QcSegmentCategory.WAVEFORM:
      return uiTheme.colors.qcMaskColors.waveform ?? '#00E22B';
    default:
      return uiTheme.colors.qcMaskColors.rejected ?? '#FF0000';
  }
}

/**
 * Convert a {@link QcSegmentCategory} to a human-readable string
 */
export function getQCSegmentCategoryString(category: QcSegmentCategory): string {
  switch (category) {
    case QcSegmentCategory.ANALYST_DEFINED:
      return 'Analyst Defined';
    case QcSegmentCategory.DATA_AUTHENTICATION:
      return 'Data Authentication';
    case QcSegmentCategory.STATION_SOH:
      return 'Station SOH';
    case QcSegmentCategory.LONG_TERM:
      return 'Long Term';
    case QcSegmentCategory.UNPROCESSED:
      return 'Unprocessed';
    case QcSegmentCategory.WAVEFORM:
      return 'Waveform';
    default:
      return '';
  }
}
