import { render } from '@testing-library/react';
import React from 'react';

import {
  EventContextMenu,
  EventContextMenuContent
} from '../../../../../src/ts/components/analyst-ui/components/events/context-menus';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Enzyme = require('enzyme');

describe('EventContextMenu', () => {
  it('is exported', () => {
    expect(EventContextMenu).toBeDefined();
  });

  it('matches snapshot', () => {
    const { container } = render(<EventContextMenu getOpenCallback={jest.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it('Open is enabled and calls the callback when isOpen is false', () => {
    const openCallback = jest.fn();
    const closeCallback = jest.fn();
    const component = Enzyme.mount(
      <EventContextMenuContent
        selectedEventId="testID"
        isOpen={false}
        openCallback={openCallback}
        closeCallback={closeCallback}
        includeEventDetailsMenuItem={false}
      />
    );

    const menuItem = component.find('[className="menu-item-open-event"]');
    menuItem.props().onClick();
    expect(menuItem.props().disabled).toBeFalsy();
    expect(openCallback).toHaveBeenCalledWith('testID');
  });

  it('Close is enabled and calls the callback when isOpen is true', () => {
    const openCallback = jest.fn();
    const closeCallback = jest.fn();
    const component = Enzyme.mount(
      <EventContextMenuContent
        selectedEventId="testID"
        isOpen
        openCallback={openCallback}
        closeCallback={closeCallback}
        includeEventDetailsMenuItem={false}
      />
    );

    const menuItem = component.find('[className="menu-item-close-event"]');
    menuItem.props().onClick();
    expect(menuItem.props().disabled).toBeFalsy();
    expect(closeCallback).toHaveBeenCalledWith('testID');
  });
  it('calls the set event id callback if defined', () => {
    const openCallback = jest.fn();
    const closeCallback = jest.fn();
    const setEventIdCallback = jest.fn();
    const updateVisibleStationsForCloseEvent = jest.fn();
    const component = Enzyme.mount(
      <EventContextMenuContent
        selectedEventId="testID"
        isOpen
        openCallback={openCallback}
        closeCallback={closeCallback}
        setEventIdCallback={setEventIdCallback}
        updateVisibleStationsForCloseEvent={updateVisibleStationsForCloseEvent}
        includeEventDetailsMenuItem={false}
      />
    );

    const menuItem = component.find('[className="menu-item-close-event"]');
    menuItem.props().onClick();
    expect(menuItem.props().disabled).toBeFalsy();
    expect(updateVisibleStationsForCloseEvent).toHaveBeenCalled();
    expect(setEventIdCallback).toHaveBeenCalledWith(undefined);
  });
});
