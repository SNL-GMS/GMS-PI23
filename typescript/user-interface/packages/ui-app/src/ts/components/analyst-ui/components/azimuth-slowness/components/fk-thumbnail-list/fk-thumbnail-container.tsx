/* eslint-disable react/destructuring-assignment */
import { NonIdealState } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type { EventTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import React from 'react';

import { getFkDummyData } from '~analyst-ui/common/utils/fk-utils';

import type { FkUnits } from '../../types';
import { FkThumbnail } from '../fk-thumbnail';
import * as fkUtil from '../fk-util';

/**
 * Fk Thumbnail Props.
 */
export interface FkThumbnailContainerProps {
  data: SignalDetectionTypes.SignalDetection;
  signalDetectionFeaturePredictions: EventTypes.FeaturePrediction[];
  sizePx: number;
  selected: boolean;
  isUnassociated: boolean;
  fkUnit: FkUnits;
  arrivalTimeMovieSpectrumIndex: number;

  showFkThumbnailMenu?(event: React.MouseEvent): void;
  onClick?(e: React.MouseEvent<HTMLDivElement>): void;
}

/**
 * A single fk thumbnail in the thumbnail-list
 */
export class FkThumbnailContainer extends React.PureComponent<FkThumbnailContainerProps> {
  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * React component lifecycle.
   */
  public render(): JSX.Element {
    const fmPhase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
      SignalDetectionTypes.Util.getCurrentHypothesis(this.props.data.signalDetectionHypotheses)
        .featureMeasurements
    );
    if (!this.props.data) {
      return <NonIdealState icon={IconNames.HEAT_GRID} title="All Fks Filtered Out" />;
    }
    const needsReview = fkUtil.fkNeedsReview(this.props.data);
    const label = `${this.props.data.station.name} ${fmPhase.value.toString()}`;
    const fkData = getFkDummyData(this.props.data);
    const predictedPoint = fkUtil.getPredictedPoint(this.props.signalDetectionFeaturePredictions);

    return (
      <FkThumbnail
        fkData={fkData}
        label={label}
        dimFk={this.props.isUnassociated}
        highlightLabel={needsReview}
        fkUnit={this.props.fkUnit}
        sizePx={this.props.sizePx}
        onClick={this.props.onClick}
        predictedPoint={predictedPoint}
        selected={this.props.selected}
        showFkThumbnailMenu={this.props.showFkThumbnailMenu}
        arrivalTimeMovieSpectrumIndex={this.props.arrivalTimeMovieSpectrumIndex}
      />
    );
  }
}