/* eslint-disable react/destructuring-assignment */
import type { FkTypes } from '@gms/common-model';
import isEqual from 'lodash/isEqual';
import React from 'react';

import type { FkUnits } from '../types';
import * as fkUtil from './fk-util';

/**
 * Fk Thumbnail Props.
 */
export interface FkThumbnailProps {
  fkData: FkTypes.FkPowerSpectra;
  sizePx: number;
  label: string;
  fkUnit: FkUnits;
  dimFk: boolean;
  highlightLabel?: boolean;
  predictedPoint?: FkTypes.FkAttributes;
  selected?: boolean;
  arrivalTimeMovieSpectrumIndex: number;

  showFkThumbnailMenu?(event: React.MouseEvent): void;
  onClick?(e: React.MouseEvent<HTMLDivElement>): void;
}

/**
 * Fk Thumbnail State
 */
export interface FkThumbnailState {
  currentFkDisplayData: number[][];
}

/**
 * A single fk thumbnail in the thumbnail-list
 */
export class FkThumbnail extends React.Component<FkThumbnailProps, FkThumbnailState> {
  /** destination to draw the fk. */
  private canvasRef: HTMLCanvasElement | undefined;

  /** The current fk represented as an ImageBitmap. */
  private currentImage: ImageBitmap;

  public constructor(props: FkThumbnailProps) {
    super(props);
    this.state = {
      currentFkDisplayData: [] // Init empty (double array)
    };
  }

  // ***************************************
  // BEGIN REACT COMPONENT LIFECYCLE METHODS
  // ***************************************

  /**
   * React component lifecycle.
   */
  // eslint-disable-next-line react/sort-comp
  public render(): JSX.Element {
    const classNames = ['fk-thumbnail', this.props.selected ? 'selected' : undefined].join(' ');
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div
        className={classNames}
        style={{
          width: `${this.props.sizePx}px`,
          height: `${this.props.sizePx}px`
        }}
        onClick={this.props.onClick ? this.props.onClick : undefined}
        onContextMenu={e => this.showThumbnailContextMenu(e)}
      >
        <div
          className={
            !this.props.highlightLabel || this.props.dimFk
              ? 'fk-thumbnail__label--reviewed'
              : 'fk-thumbnail__label'
          }
        >
          {this.props.label}
        </div>
        <canvas
          className="fk-thumbnail__canvas"
          height={this.props.sizePx}
          width={this.props.sizePx}
          ref={ref => {
            this.canvasRef = ref;
          }}
        />
      </div>
    );
  }

  /**
   * React component lifecycle.
   */
  public async componentDidMount(): Promise<void> {
    const fkDisplayData = fkUtil.getFkHeatmapArrayFromFkSpectra(
      this.props.fkData.values[this.props.arrivalTimeMovieSpectrumIndex],
      this.props.fkUnit
    );
    const [min, max] = fkUtil.computeMinMaxFkValues(fkDisplayData);
    this.currentImage = await fkUtil.createFkImageBitmap(fkDisplayData, min, max);
    fkUtil.drawImage(this.canvasRef, this.currentImage, this.props.dimFk);
    fkUtil.draw(
      this.canvasRef,
      this.props.fkData,
      this.props.predictedPoint,
      this.props.arrivalTimeMovieSpectrumIndex,
      true,
      this.props.dimFk
    );
    this.setState({
      currentFkDisplayData: fkDisplayData
    });
  }

  /**
   * React component lifecycle.
   */
  public async componentDidUpdate(prevProps: FkThumbnailProps): Promise<void> {
    const fkDisplayData = fkUtil.getFkHeatmapArrayFromFkSpectra(
      this.props.fkData.values[this.props.arrivalTimeMovieSpectrumIndex],
      this.props.fkUnit
    );

    if (
      !isEqual(this.state.currentFkDisplayData, fkDisplayData) ||
      this.props.fkUnit !== prevProps.fkUnit ||
      this.props.dimFk !== prevProps.dimFk
    ) {
      const [min, max] = fkUtil.computeMinMaxFkValues(fkDisplayData);
      this.currentImage = await fkUtil.createFkImageBitmap(fkDisplayData, min, max);
      fkUtil.drawImage(this.canvasRef, this.currentImage, this.props.dimFk);
      fkUtil.draw(
        this.canvasRef,
        this.props.fkData,
        this.props.predictedPoint,
        this.props.arrivalTimeMovieSpectrumIndex,
        true,
        this.props.dimFk
      );
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        currentFkDisplayData: fkDisplayData
      });
    } else if (prevProps.sizePx !== this.props.sizePx) {
      fkUtil.drawImage(this.canvasRef, this.currentImage, this.props.dimFk);
      fkUtil.draw(
        this.canvasRef,
        this.props.fkData,
        this.props.predictedPoint,
        this.props.arrivalTimeMovieSpectrumIndex,
        true,
        this.props.dimFk
      );
    }
  }

  /**
   * Displays a context menu for reviewing/clearing an fk
   */
  private showThumbnailContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    if (this.props.showFkThumbnailMenu) {
      this.props.showFkThumbnailMenu(e);
    }
  }
}
