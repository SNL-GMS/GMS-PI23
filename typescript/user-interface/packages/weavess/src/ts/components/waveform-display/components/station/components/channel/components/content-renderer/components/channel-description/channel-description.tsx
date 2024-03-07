import { Tooltip2 } from '@blueprintjs/popover2';
import classNames from 'classnames';
import React from 'react';

/**
 * The type of the props for the {@link ChannelDescriptionLabel} component
 */
export interface ChannelDescriptionLabelProps {
  isError?: boolean;
  message: string;
  tooltipMessage?: string;
}

/**
 * Renders a channel description label, which is a string that will turn red and add a tooltip if the isError flag is set to true.
 */
export function ChannelDescriptionLabel({
  isError,
  message,
  tooltipMessage
}: ChannelDescriptionLabelProps) {
  return (
    <span
      className={classNames({
        'contentrenderer-content__description': true,
        'contentrenderer-content__description--error': isError
      })}
    >
      {tooltipMessage != null ? <Tooltip2 content={tooltipMessage}>{message}</Tooltip2> : message}
    </span>
  );
}
