import { Classes, Menu, MenuItem } from '@blueprintjs/core';
import type { RenderHookResult } from '@testing-library/react';
import { render, renderHook, waitFor } from '@testing-library/react';
import classNames from 'classnames';
import * as React from 'react';
import { act } from 'react-test-renderer';

import type { ImperativeContextMenuOpenFunc } from '../../src/ts/components';
import {
  closeImperativeContextMenu,
  ImperativeContextMenu,
  isReactMouseEvent,
  useImperativeContextMenuCallback
} from '../../src/ts/components';

// https://github.com/facebook/react/issues/11565
jest.mock('react-dom', () => {
  const actual = jest.requireActual('react-dom');
  return {
    ...actual,
    createPortal: node => node
  };
});

describe('imperative context menu', () => {
  it('is defined', () => {
    expect(ImperativeContextMenu).toBeDefined();
    expect(useImperativeContextMenuCallback).toBeDefined();
    expect(isReactMouseEvent).toBeDefined();
    expect(closeImperativeContextMenu).toBeDefined();
  });

  it('should match the snapshot', () => {
    expect(
      render(
        <div>
          <ImperativeContextMenu
            content={
              <Menu className="test-menu">
                <MenuItem text="Test Menu" />
              </Menu>
            }
            getOpenCallback={jest.fn()}
          />
        </div>
      ).baseElement
    ).toMatchSnapshot();
  });

  it('should call the callback', async () => {
    const callback = jest.fn();
    await act(() => {
      render(
        <ImperativeContextMenu
          content={
            <Menu className="test-menu">
              <MenuItem text="Test Menu" />
            </Menu>
          }
          getOpenCallback={callback}
        />
      );
    });
    expect(callback).toHaveBeenCalled();
  });

  it('can close ImperativeContextMenu', () => {
    const html = (
      <div className={classNames(Classes.OVERLAY, Classes.OVERLAY_OPEN)}>here is my content</div>
    );

    const result = render(html);
    expect(result.baseElement).toMatchSnapshot();
    closeImperativeContextMenu();
    expect(result.baseElement).toMatchSnapshot();
  });

  it('can check if is React event', () => {
    expect(isReactMouseEvent(new MouseEvent(''))).toBeFalsy();

    expect(
      isReactMouseEvent(({
        nativeEvent: new MouseEvent('contextmenu', {}),
        preventDefault: jest.fn(),
        shiftKey: true,
        stopPropagation: jest.fn()
      } as unknown) as React.MouseEvent)
    ).toBeTruthy();
  });

  it('can use hook useImperativeContextMenuCallback', async () => {
    let contextMenuCb: ImperativeContextMenuOpenFunc<unknown>;
    let getOpenCallback: (callback: ImperativeContextMenuOpenFunc<unknown>) => void;

    const Display = function Display() {
      const [internalContextMenuCb, internalGetOpenCallback] = useImperativeContextMenuCallback(
        undefined
      );
      contextMenuCb = internalContextMenuCb;
      getOpenCallback = internalGetOpenCallback;
      return <div />;
    };

    let container: RenderHookResult<JSX.Element, unknown>;
    await waitFor(() => {
      container = renderHook(Display);
    });

    expect(getOpenCallback).toBeDefined();
    expect(contextMenuCb).toBeUndefined();

    const func = jest.fn();
    getOpenCallback(func);
    expect(func).not.toHaveBeenCalled();

    await waitFor(() => {
      container.rerender(<Display />);
    });

    contextMenuCb(new MouseEvent('contextmenu'));
    expect(func).toHaveBeenCalledTimes(1);
  });
});
