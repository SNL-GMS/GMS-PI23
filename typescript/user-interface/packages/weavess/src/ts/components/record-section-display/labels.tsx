/* eslint-disable react/destructuring-assignment */
import React from 'react';

export interface RecordSectionLabelsProps {
  /** Bottom value as number */
  bottomVal: number;

  /** Top value as number */
  topVal: number;

  /** Phases options as any */
  phases: [
    {
      percentX: number;
      percentY: number;
      phase: string;
    }
  ];
}

export class RecordSectionLabels extends React.Component<RecordSectionLabelsProps, unknown> {
  public readonly containerStyle: React.CSSProperties = {
    borderLeft: 'solid',
    borderWidth: '3px',
    height: '100%',
    position: 'absolute',
    width: '100%'
  };

  public displayName = 'RecordSectionLabels';

  /**
   * Constructor
   *
   * @param props Record Section Labels props as RecordSectionLabelsProps
   */
  public constructor(props: RecordSectionLabelsProps) {
    super(props);
    this.state = {};
  }

  // eslint-disable-next-line react/sort-comp
  public render(): JSX.Element {
    const yAxisLabels: any[] = this.getLabels();
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const scalingFactor = 100 / (this.props.bottomVal - this.props.topVal);
    const yAxisLabelElements: any[] = [];
    const phaseLabelElements: any[] = [];

    for (let i = 0; i < yAxisLabels.length; i += 1) {
      const style: React.CSSProperties = {
        WebkitTransform: 'translate(0, -50%)',
        left: '-1px',
        msTransform: 'translate(0, -50%)',
        position: 'absolute',
        textShadow: '-1px 0 white, 0 1px white, 1px 0 white, 0 -1px white',
        top: `${(yAxisLabels[i] - this.props.topVal) * scalingFactor}%`,
        transform: 'translate(0, -50%)'
      };

      yAxisLabelElements.push(
        <div style={style} key={`label${i}`}>
          -{yAxisLabels[i]}
        </div>
      );
    }

    for (let i = 0; i < this.props.phases.length; i += 1) {
      const style: React.CSSProperties = {
        left: `${this.props.phases[i].percentX}%`,
        position: 'absolute',
        textShadow: '-1px 0 white, 0 1px white, 1px 0 white, 0 -1px white',
        top: `${this.props.phases[i].percentY}%`
      };

      phaseLabelElements.push(
        <div style={style} key={`phase${i}`}>
          {this.props.phases[i].phase}
        </div>
      );
    }

    return (
      <div className="y-axis-container" style={this.containerStyle}>
        {yAxisLabelElements}
        {phaseLabelElements}
      </div>
    );
  }

  /**
   * @returns labels as any[]
   */
  public getLabels(): any[] {
    let labels: any[] = [];
    const degreeRange = this.props.bottomVal - this.props.topVal;
    if (degreeRange) {
      const roundedTopVal = Math.floor(this.props.topVal);
      let interval = 0;

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (degreeRange < 50) {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        interval = 5;
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      } else if (degreeRange < 100) {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        interval = 10;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        interval = 20;
      }

      const numPoints = Math.floor(degreeRange / interval);
      const base = roundedTopVal + (interval - (roundedTopVal % interval));
      labels = Array.from(Array(numPoints).keys()).map(val => base + interval * val);
    }
    return labels;
  }
}
