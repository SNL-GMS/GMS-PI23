import React from 'react';
import ReactDOMServer from 'react-dom/server';

/**
 * Function to generate a string for Cesium to display a billboard for station triangles
 */
export function buildStationTriangle(): string {
  return `data:image/svg+xml,${encodeURIComponent(
    ReactDOMServer.renderToStaticMarkup(
      <svg
        data-name="StationTriangle"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 85.29 76"
        height="124"
        width="124"
      >
        <g id="Station_triangle" data-name="Station triangle" transform="translate(0 0)">
          <path
            id="Path_1"
            data-name="Path 1"
            className="station-triangle__outer"
            d="M37.44,3.02c1.65-2.87,5.31-3.87,8.19-2.22,.92,.53,1.69,1.3,2.22,2.22l36.65,63.93c1.65,2.87,.65,6.54-2.22,8.19-.91,.52-1.94,.79-2.98,.79H6c-3.31,0-6-2.69-5.99-6.01,0-1.05,.27-2.07,.79-2.98L37.44,3.02Z"
          />
          <path
            id="Path_2"
            data-name="Path 2"
            className="station-triangle__inner"
            fill="#fff"
            d="M40.04,5.01c.82-1.44,2.65-1.94,4.09-1.12,.47,.27,.86,.65,1.12,1.12l35.84,62.94c.82,1.44,.32,3.27-1.12,4.09-.45,.26-.96,.39-1.49,.39H6.81c-1.66,0-3-1.34-3-3,0-.52,.14-1.03,.39-1.49L40.04,5.01Z"
          />
        </g>
      </svg>
    )
  )}`;
}
