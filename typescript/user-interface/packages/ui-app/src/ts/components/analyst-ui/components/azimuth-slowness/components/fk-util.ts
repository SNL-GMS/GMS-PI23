import type { EventTypes, FkTypes } from '@gms/common-model';
import { SignalDetectionTypes } from '@gms/common-model';
import { isNumericMeasurementValue } from '@gms/common-model/lib/signal-detection/util';
import { AnalystWorkspaceTypes, BoundaryUtil } from '@gms/ui-state';
import { UILogger } from '@gms/ui-util';
import type { WeavessTypes } from '@gms/weavess-core';
import * as d3 from 'd3';
import orderBy from 'lodash/orderBy';
import sortBy from 'lodash/sortBy';

import { getFkDummyData } from '~analyst-ui/common/utils/fk-utils';
import { systemConfig } from '~analyst-ui/config/system-config';
import { gmsColors } from '~scss-config/color-preferences';

import { FkUnits } from '../types';
import type { AnalystCurrentFk } from './fk-rendering/fk-rendering';

const logger = UILogger.create('GMS_LOG_FK', process.env.GMS_LOG_FK);

export const markerRadiusSize = 5;
export const digitPrecision = 1;
const CONSTANT_360 = 360;
const CONSTANT_180 = CONSTANT_360 / 2;
const CONSTANT_90 = CONSTANT_180 / 2;

/**
 * Values and labels for FK Velocity Rings
 * The smaller value is a Pn to P transition at 180 degrees, the
 * large is a Pn to Pg transition at 2degrees
 * reverting back to previous values
 * Use 6, 8, 10 km/s for the slowness rings.
 * Show the labels on the plot as km/s, but plot the circles based on the slowness values.
 * Use the following slowness values: 18.5 s/deg, 13.875 s/deg, and 11.1 s/deg.
 */
const RING1 = 18.5;
const RING2 = 13.875;
const RING3 = 11.1;
const FK_VELOCITY_RADII = [RING1, RING2, RING3];
const FK_VELOCITY_RADII_LABELS = ['6 km/s', '8 km/s', '10 km/s'];

/**
 * Miscellaneous functions for rendering and processing fk data
 */

/**
 * Gets the predicted point values from the incoming signal detection
 *
 * @param sd to get point from
 */
export const getPredictedPoint = (
  featurePredictions: EventTypes.FeaturePrediction[]
): FkTypes.FkAttributes => {
  const predictedAzimuth = featurePredictions.find(
    fp =>
      fp.predictionType ===
        SignalDetectionTypes.FeatureMeasurementType.RECEIVER_TO_SOURCE_AZIMUTH ||
      fp.predictionType === SignalDetectionTypes.FeatureMeasurementType.SOURCE_TO_RECEIVER_AZIMUTH
  );

  const azValue =
    predictedAzimuth && isNumericMeasurementValue(predictedAzimuth.predictionValue?.predictedValue)
      ? predictedAzimuth.predictionValue.predictedValue
      : undefined;

  const predictedSlowness = featurePredictions.find(
    fp => fp.predictionType === SignalDetectionTypes.FeatureMeasurementType.SLOWNESS
  );

  const slowValue =
    predictedSlowness &&
    isNumericMeasurementValue(predictedSlowness.predictionValue?.predictedValue)
      ? predictedSlowness.predictionValue.predictedValue
      : undefined;

  if (azValue && slowValue) {
    return {
      slowness: slowValue.measuredValue.value,
      slownessUncertainty: slowValue.measuredValue.standardDeviation,
      azimuth: azValue.measuredValue.value,
      azimuthUncertainty: azValue.measuredValue.standardDeviation,
      peakFStat: undefined,
      // TODO: what should these values?
      xSlow: 0.41,
      ySlow: 0.41
    };
  }
  return undefined;
};

/**
 * Returns an array of [min, max] values for the y axis of a spectra
 *
 * @param fkPowerSpectra the spectra to get scales from
 */
export const getYAxisForFkSpectra = (fkPowerSpectra: FkTypes.FkPowerSpectra): number[] => [
  fkPowerSpectra.metadata.slowStartY,
  -fkPowerSpectra.metadata.slowStartY
];

/**
 * Returns an array of [min, max] values for the x axis of a spectra
 *
 * @param fkPowerSpectra the spectra to get scales from
 */
export const getXAxisForFkSpectra = (fkPowerSpectra: FkTypes.FkPowerSpectra): number[] => [
  fkPowerSpectra.metadata.slowStartX,
  -fkPowerSpectra.metadata.slowStartX
];

export const getChannelSegmentBoundaries = async (
  channelName: string,
  channelSegment: WeavessTypes.ChannelSegment,
  timeRange?: WeavessTypes.TimeRange
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<WeavessTypes.ChannelSegmentBoundaries> => {
  if (timeRange) {
    return BoundaryUtil.calculateChannelSegBounds(
      channelSegment,
      timeRange.startTimeSecs,
      timeRange.endTimeSecs
    );
  }
  return BoundaryUtil.calculateChannelSegBounds(channelSegment);
};

/**
 * Draws a circle
 *
 * @param ctx The canvas context to draw in
 * @param x The x coordinate to start drawing
 * @param y The y coordinate to start drawing at
 * @param strokeColor The circle's color, defaults to RED
 * @param isFilled If true, fills the circle
 */
export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radii: number[],
  strokeColor: string = gmsColors.gmsStrongWarning,
  isFilled = false
): void => {
  ctx.strokeStyle = strokeColor;
  radii.forEach(radius => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (isFilled) {
      ctx.fillStyle = strokeColor;
      ctx.fill();
    } else {
      ctx.stroke();
    }
  });
};

/**
 * Draw the crosshairs.
 *
 * @param canvasRef the canvas to draw on
 * @param ctx the canvas' drawing context
 */
export function drawFkCrossHairs(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): void {
  ctx.strokeStyle = gmsColors.gmsMain;
  ctx.beginPath();

  ctx.moveTo(canvasRef.width / 2, 0);
  ctx.lineTo(canvasRef.width / 2, canvasRef.height);
  ctx.stroke();

  ctx.moveTo(0, canvasRef.height / 2);
  ctx.lineTo(canvasRef.width, canvasRef.height / 2);
  ctx.stroke();
}

/**
 * Draw velocity radius indicators
 *
 * @param canvasRef The canvas to draw on
 * @param ctx The canvas' context
 * @param fkData the data to render
 * @param hideRingLabels if true, hides the ring's labels
 */
export function drawVelocityRings(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  fkData: FkTypes.FkPowerSpectra,
  hideRingLabels = false
): void {
  const scale = d3
    .scaleLinear()
    .domain([0, -fkData.metadata.slowStartY])
    .range([0, canvasRef.height / 2]);
  FK_VELOCITY_RADII.sort((a, b) => b - a);
  const radii = FK_VELOCITY_RADII;
  const scaledRadii: number[] = radii.map(scale);

  const center: any = {
    x: canvasRef.width / 2,
    y: canvasRef.height / 2
  };

  // add labels for each ring
  if (!hideRingLabels) {
    scaledRadii.forEach((value: number, index) => {
      ctx.fillStyle = gmsColors.gmsMain;
      const label = `${FK_VELOCITY_RADII_LABELS[index]}`;
      ctx.fillText(label, Number(center.x) + 3, Number(center.y) - (value + 3));
    });
  }
  drawCircle(ctx, center.x, center.y, scaledRadii, gmsColors.gmsMain);
}

/**
 * Converts polar point to X,Y point
 *
 * @param slowness Radius in polar coordinates
 * @param azimuth Theta in polar coordinates
 */
export const convertPolarToXY = (
  slowness: number,
  azimuth: number
): {
  x: number;
  y: number;
} => {
  const radians = (azimuth - CONSTANT_90) * (Math.PI / CONSTANT_180);
  const x = slowness * Math.cos(radians);
  const y = slowness * Math.sin(radians);

  return { x, y };
};

/**
 * Converts the incoming X,Y point to polar coordinates represented by
 * Azimuth Degrees and Radial Slowness
 *
 * @param x x coordinate
 * @param y y coordinate
 */
export const convertXYtoPolar = (
  x: number,
  y: number
): {
  azimuthDeg: number;
  radialSlowness: number;
} => {
  if (x && y) {
    // converts xy to theta in degree - adjusted to have 0 degrees be North
    const adjustmentDegrees = 270;
    const theta =
      CONSTANT_360 -
      ((Math.atan2(y, x) * (CONSTANT_180 / Math.PI) + adjustmentDegrees) % CONSTANT_360);

    // Calculate radius from center
    const radius = Math.sqrt(x ** 2 + y ** 2);

    return {
      azimuthDeg: theta,
      radialSlowness: radius
    };
  }
  return {
    azimuthDeg: undefined,
    radialSlowness: undefined
  };
};

/**
 * Draw the Max FK marker.
 *
 * @param canvasRef The canvas to draw on
 * @param ctx The canvas' context
 * @param fkData the data to render
 * @param arrivalTime the arrival time
 */
export function drawMaxFk(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  fkData: FkTypes.FkPowerSpectra,
  currentMovieSpectrumIndex: number
): void {
  const currentSpectrum = fkData.values[currentMovieSpectrumIndex];
  if (!currentSpectrum) {
    logger.warn(`Undefined spectrum - index set to ${currentMovieSpectrumIndex}`);
  }
  const scale = d3.scaleLinear().domain(getYAxisForFkSpectra(fkData)).range([0, canvasRef.height]);
  const point = convertPolarToXY(
    currentSpectrum.attributes.slowness,
    currentSpectrum.attributes.azimuth
  );

  drawCircle(ctx, scale(point.x), scale(point.y), [markerRadiusSize - 1], gmsColors.gmsMain, true);
}
/**
 * Draw the predicted FK marker crosshair dot.
 *
 * @param ctx The canvas' context
 * @param x x coordinate
 * @param y y coordinate
 * @param strokeColor the color of the cross hair dot
 * @param size (OPTIONAL) radius size uses class defined radius by default
 */
export function drawCrosshairDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  strokeColor: string,
  size = markerRadiusSize
): void {
  const length = markerRadiusSize - 1;

  ctx.strokeStyle = gmsColors.gmsRecessed;

  ctx.beginPath();
  ctx.moveTo(x - length, y - length);
  ctx.lineTo(x + length, y + length);

  ctx.moveTo(x + length, y - length);
  ctx.lineTo(x - length, y + length);
  ctx.stroke();

  drawCircle(ctx, x, y, [size], strokeColor, false);
}

/**
 * Draw the predicted FK marker.
 *
 * @param canvasRef The canvas to draw on
 * @param ctx The canvas' context
 * @param fkData the data to render
 */
export function drawPredictedFk(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  fkData: FkTypes.FkPowerSpectra,
  predictedPoint: FkTypes.FkAttributes,
  strokeColor: string = gmsColors.gmsRecessed
): void {
  if (!fkData || !predictedPoint || !canvasRef) {
    return;
  }
  const scale = d3.scaleLinear().domain(getYAxisForFkSpectra(fkData)).range([0, canvasRef.height]);
  const point = convertPolarToXY(predictedPoint.slowness, predictedPoint.azimuth);
  const x = scale(point.x);
  const y = scale(point.y);
  drawCrosshairDot(ctx, x, y, strokeColor);
}

/**
 * Draws a single dot on the canvas.
 *
 * @param canvasRef the canvas reference
 * @param ctx the 2d rendering context
 * @param coordinates the coordinates
 */
function drawDot(
  canvasRef: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  coordinates: AnalystCurrentFk
) {
  drawCircle(
    ctx,
    coordinates.x,
    coordinates.y,
    [markerRadiusSize - 1],
    gmsColors.gmsRecessed,
    true
  );
}

/**
 * Main draw method for creating fk and dots
 *
 * @param canvasRef The canvas element to draw on
 * @param imageBitmap the bitmap to draw on the canvas
 * @param fkData the fk data to be rendered
 * @param arrivalTime arrival time of the parent signal detection for the fk
 * @param predictedPoint predictedPoint as FkAttributes
 * @param paddingInput optional, how much to pad the rendering
 * @param hideRingLabels  optional, if true, hides the labels for the rings
 * @param reduceOpacity optional, if true the drawing is set to 40% opacity
 * @param dotLocation optional, where to draw a black dot
 */
export function drawImage(
  canvasRef: HTMLCanvasElement,
  imageBitmap: ImageBitmap,
  reduceOpacity?: boolean
): CanvasRenderingContext2D {
  const ctx = canvasRef.getContext('2d');
  ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
  const transparencyPower = 0.4;
  if (reduceOpacity) {
    ctx.globalAlpha = transparencyPower;
  }
  ctx.drawImage(imageBitmap, 0, 0, canvasRef.width, canvasRef.height);
  return ctx;
}

/**
 * Main draw method for creating fk and dots
 *
 * @param canvasRef The canvas element to draw on
 * @param imageBitmap the bitmap to draw on the canvas
 * @param fkData the fk data to be rendered
 * @param arrivalTime arrival time of the parent signal detection for the fk
 * @param predictedPoint predictedPoint as FkAttributes
 * @param paddingInput optional, how much to pad the rendering
 * @param hideRingLabels  optional, if true, hides the labels for the rings
 * @param reduceOpacity optional, if true the drawing is set to 40% opacity
 * @param dotLocation optional, where to draw a black dot
 */
export function draw(
  canvasRef: HTMLCanvasElement,
  fkData: FkTypes.FkPowerSpectra,
  predictedPoint: FkTypes.FkAttributes,
  currentMovieSpectrumIndex: number,
  hideRingLabels?: boolean,
  reduceOpacity?: boolean,
  dotLocation?: AnalystCurrentFk
): CanvasRenderingContext2D {
  const ctx = canvasRef.getContext('2d');
  drawFkCrossHairs(canvasRef, ctx);
  drawVelocityRings(canvasRef, ctx, fkData, hideRingLabels);
  drawMaxFk(canvasRef, ctx, fkData, currentMovieSpectrumIndex);
  drawPredictedFk(canvasRef, ctx, fkData, predictedPoint);
  if (dotLocation) {
    drawDot(canvasRef, ctx, dotLocation);
  }
  if (reduceOpacity) {
    ctx.globalAlpha = 1;
  }
  return ctx;
}

/**
 * Converts a clicked x y coordinate and converts to coordinate space
 * and scales based on xy axis
 *
 * @param x x value in graphics space
 * @param y y value in graphics space
 * @param fkData fkdata used to retrieve the slowness scale
 */
export const convertGraphicsXYtoCoordinate = (
  x: number,
  y: number,
  fkData: FkTypes.FkPowerSpectra,
  width: number,
  height: number
): {
  x: number;
  y: number;
} => {
  if (!fkData) {
    return undefined;
  }
  const xscale = d3.scaleLinear().domain([0, width]).range(getXAxisForFkSpectra(fkData));
  const yscale = d3
    .scaleLinear()
    .domain([0, height])
    // Reversing to properly scale from graphics space to xy space
    .range(getYAxisForFkSpectra(fkData).reverse());

  const scaledX = xscale(x);
  const scaledY = yscale(y);

  // eslint-disable-next-line no-restricted-globals
  if (isNaN(scaledX) || isNaN(scaledY)) {
    return undefined;
  }

  return {
    x: scaledX,
    y: scaledY
  };
};

/**
 * Creates the location needed to draw the analyst selected dot
 *
 * @param x x coordinate
 * @param y y coordinate
 * @returns FkAttributes object with converted XYPolar
 */
export const getAnalystSelectedPoint = (x: number, y: number): FkTypes.FkAttributes => {
  const polar = convertXYtoPolar(x, y);
  return {
    azimuth: polar.azimuthDeg,
    azimuthUncertainty: 0,
    slowness: polar.radialSlowness,
    slownessUncertainty: 0,
    peakFStat: undefined,
    // TODO: what should these values?
    xSlow: 0.41,
    ySlow: 0.41
  };
};

/**
 * Draws the color scale
 *
 * @param min The minimum frequency value
 * @param max THe maximum frequency value
 * @returns D3 object that turns values into colors d3.ScaleSequential<d3.HSLColor>
 */
export const createColorScale: any = (min: number, max: number) =>
  d3
    .scaleSequential(t => {
      if (t < 0 || t > 1) {
        // eslint-disable-next-line no-param-reassign
        t -= Math.floor(t);
      }
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      const ts = Math.abs(t - 0.5);
      // map to range [240, 0] hue
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers, yoda
      return d3.hsl(240 - 240 * t, 1.5 - 1.5 * ts, 0.8 - 0.9 * ts);
    })
    .domain([min, max]);

/**
 * Convert fk data to an ImageBitmap
 *
 * @param fkData The data to render
 * @param min The minimum frequency value
 * @param max The maximum frequency value
 * @returns JS Promise that resolves to the FK ImageBitmap
 */
export const createFkImageBitmap = async (
  fkGrid: number[][],
  min: number,
  max: number
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<ImageBitmap> => {
  const dim = fkGrid.length;
  const size = dim * dim;
  const buffer = new Uint8ClampedArray(size * 4); // r, g, b, a for each point
  const uInt8Max = 255;

  const colorScale = createColorScale(min, max);
  for (let row = fkGrid.length - 1; row >= 0; row -= 1) {
    for (let col = 0; col < fkGrid[0].length; col += 1) {
      const value = fkGrid[row][col];
      const rowPos = fkGrid.length - row;
      const pos = (rowPos * fkGrid.length + col) * 4;
      const color = d3.rgb(colorScale(value));
      buffer[pos] = color.r;
      buffer[pos + 1] = color.g;
      buffer[pos + 2] = color.b;
      buffer[pos + 3] = uInt8Max;
    }
  }

  const imgData = new ImageData(buffer, fkGrid.length, fkGrid.length);
  return window.createImageBitmap(imgData);
};

/**
 * Create heat map color scale.
 *
 * @param heightPx The height in px of the bitmap
 * @param widthPx The width in px of the bitmap
 * @returns JS Promise that resolves to a ColorScale ImageBitmap
 */
export const createColorScaleImageBitmap = async (
  heightPx: number,
  widthPx: number
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<ImageBitmap> => {
  const size = heightPx * widthPx;
  const buffer = new Uint8ClampedArray(size * 4); // r, g, b, a for each point
  const uInt8Max = 255;

  const colorScale = createColorScale(0, heightPx + 1);
  for (let row = 0; row < heightPx; row += 1) {
    for (let col = 0; col < widthPx; col += 1) {
      const pos = (row * heightPx + col) * 4;

      const color = d3.rgb(colorScale(col));
      buffer[pos] = color.r;
      buffer[pos + 1] = color.g;
      buffer[pos + 2] = color.b;
      buffer[pos + 3] = uInt8Max;
    }
  }

  const imgData = new ImageData(buffer, heightPx, widthPx);
  return window.createImageBitmap(imgData);
};

/**
 * Finds the min/max frequency of an FK so the heatmap can be drawn.
 *
 * @param fkData the raw fk data to find a min/max for
 * @returns An array where index 0 is a minimum fk freq and an index 1 is a maximum fk freq
 */
export const computeMinMaxFkValues = (fkData: number[][]): [number, number] => {
  let max = -Infinity;
  let min = Infinity;

  // eslint-disable-next-line no-restricted-syntax
  for (const row of fkData) {
    // eslint-disable-next-line no-restricted-syntax
    for (const val of row) {
      if (val > max) max = val;
      if (val < min) min = val;
    }
  }

  return [min, max];
};

/**
 * Does the fk need review
 *
 * @param sd: the signal detection to check
 * @returns boolean
 */
export const fkNeedsReview = (sd: SignalDetectionTypes.SignalDetection): boolean => {
  const fkData = getFkDummyData(sd);
  const phase = SignalDetectionTypes.Util.findPhaseFeatureMeasurementValue(
    SignalDetectionTypes.Util.getCurrentHypothesis(sd.signalDetectionHypotheses).featureMeasurements
  ).value;
  if (!fkData) {
    return false;
  }
  if (fkData.reviewed) {
    return false;
  }
  if (systemConfig.fkNeedsReviewRuleSet.phasesNeedingReview.indexOf(phase) > -1) {
    return true;
  }
  return false;
};

/**
 * * Filter for Fks that MUST be reviewed
 *
 * @param sdsToFilter SignalDetectionTypes.SignalDetection[]
 * @param assocSDs SignalDetectionTypes.SignalDetection[]
 * @returns SignalDetectionTypes.SignalDetection[] to be reviewed
 */
export const filterInFksThatNeedReview = (
  sdsToFilter: SignalDetectionTypes.SignalDetection[],
  assocSDs: SignalDetectionTypes.SignalDetection[]
) => {
  return sdsToFilter.filter(sd => fkNeedsReview(sd) && assocSDs.find(aSD => aSD.id === sd.id));
};

/**
 * Return the heatmap array from the FK Spectra
 *
 * @param fkPowerSpectra: an fk power spectra
 * @returns number[][]
 */
export const getFkHeatmapArrayFromFkSpectra = (
  fkPowerSpectrum: FkTypes.FkPowerSpectrum,
  unit: FkUnits
): number[][] => {
  if (!fkPowerSpectrum) return [[]];

  return unit === FkUnits.FSTAT ? fkPowerSpectrum.fstat : fkPowerSpectrum.power;
};

/**
 * Calculates the fstat point based on input heatmap and az slow values
 *
 * @param fkData as FkPowerSpectra
 * @param heatMap as number[][]
 * @param azimuth azimuth
 * @param slowness slowness
 * @param units units as FkUnits
 */
export const getPeakValueFromAzSlow = (
  fkData: FkTypes.FkPowerSpectra,
  heatMap: number[][],
  azimuth: number,
  slowness: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  units: FkUnits
): number | undefined => {
  const xaxis = getXAxisForFkSpectra(fkData);
  const yaxis = getYAxisForFkSpectra(fkData);
  const xscale = d3
    .scaleLinear()
    .domain(xaxis)
    .range([0, xaxis[1] * 2]);
  const yscale = d3
    .scaleLinear()
    .domain(yaxis)
    .range([0, yaxis[1] * 2]);
  const xyPoint = convertPolarToXY(slowness, azimuth);
  const x = Math.floor(xscale(xyPoint.x));
  const y = Math.floor(yscale(xyPoint.y));
  // Index into heat map
  const rowLength = heatMap ? heatMap.length - 1 : 0;
  const maybeRow = heatMap ? heatMap[rowLength - y] : undefined;
  return maybeRow ? maybeRow[x] : undefined;
};

/**
 * Returns sorted signal detections based on sort type (Distance, Alphabetical)
 */
export function getSortedSignalDetections(
  signalDetections: SignalDetectionTypes.SignalDetection[],
  selectedSortType: AnalystWorkspaceTypes.WaveformSortType,
  distanceToSource: EventTypes.LocationDistance[]
): SignalDetectionTypes.SignalDetection[] {
  // apply sort based on sort type
  let data: SignalDetectionTypes.SignalDetection[] = [];
  // Sort by distance
  if (selectedSortType === AnalystWorkspaceTypes.WaveformSortType.distance && distanceToSource) {
    data = sortBy<SignalDetectionTypes.SignalDetection>(signalDetections, [
      (sd: SignalDetectionTypes.SignalDetection) =>
        distanceToSource.find(d => d.id === sd.station.name).distance
    ]);
  } else {
    // apply sort if a sort comparator is passed in
    data = selectedSortType
      ? orderBy<SignalDetectionTypes.SignalDetection>(
          signalDetections,
          [sd => sd.station.name],
          ['asc']
        )
      : signalDetections;
  }
  return data;
}
