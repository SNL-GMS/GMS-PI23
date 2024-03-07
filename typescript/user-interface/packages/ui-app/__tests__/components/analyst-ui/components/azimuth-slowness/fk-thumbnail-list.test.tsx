import Adapter from '@cfaester/enzyme-adapter-react-18';
import type { EventTypes } from '@gms/common-model';
import { signalDetectionsData } from '@gms/common-model/__tests__/__data__';
import type { ReactWrapper } from 'enzyme';
import Immutable from 'immutable';
import React from 'react';

import type { FkThumbnailListProps } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-thumbnail-list/fk-thumbnail-list';
import { FkThumbnailList } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/components/fk-thumbnail-list/fk-thumbnail-list';
import type { FkUnits } from '../../../../../src/ts/components/analyst-ui/components/azimuth-slowness/types';

// set up window alert and open so we don't see errors
window.alert = jest.fn();
window.open = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Enzyme = require('enzyme');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
/* eslint-disable import/first */
/* eslint-disable import/no-extraneous-dependencies */
import * as util from 'util';

Object.defineProperty(window, 'TextEncoder', {
  writable: true,
  value: util.TextEncoder
});
Object.defineProperty(window, 'TextDecoder', {
  writable: true,
  value: util.TextDecoder
});
Object.defineProperty(global, 'TextEncoder', {
  writable: true,
  value: util.TextEncoder
});
Object.defineProperty(global, 'TextDecoder', {
  writable: true,
  value: util.TextDecoder
});

// TODO the file name .redo. makes the tests skip everything in here, the tests need to be redone
describe('FK thumbnails tests', () => {
  // enzyme needs a new adapter for each configuration
  beforeEach(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  const mockProps: Partial<FkThumbnailListProps> = {
    sortedSignalDetections: signalDetectionsData,
    signalDetectionIdsToFeaturePrediction: Immutable.Map<string, EventTypes.FeaturePrediction[]>(),
    thumbnailSizePx: 300,
    selectedSdIds: [signalDetectionsData[1].id],
    unassociatedSdIds: [signalDetectionsData[2].id],
    arrivalTimeMovieSpectrumIndex: 0,
    fkUnitsForEachSdId: Immutable.Map<string, FkUnits>(),
    displayedSignalDetection: signalDetectionsData[1],
    markFksForSdIdsAsReviewed: () => {
      /** empty */
    },
    showFkThumbnailContextMenu: () => {
      /** empty */
    },
    setSelectedSdIds: () => {
      /** empty */
    },
    setDisplayedSignalDetection: () => {
      /** empty */
    }
  };

  // Mounting enzyme into the DOM
  // Using a testing DOM not real DOM
  // So a few things will be missing window.fetch, or alert etc...
  const wrapper: ReactWrapper = Enzyme.mount(
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FkThumbnailList {...(mockProps as any)} />
  );

  const instance: FkThumbnailList = wrapper.find(FkThumbnailList).instance() as FkThumbnailList;
  const anyInstance: any = instance;
  // Fix setSelectedSdIds and setDisplayedSignalDetection methods
  anyInstance.props = {
    ...anyInstance.props,
    setSelectedSdIds: sdIdList => {
      anyInstance.selectedSdIds = sdIdList;
    },
    setDisplayedSignalDetection: sd => {
      anyInstance.displayedSignalDetection = sd;
    }
  };

  // eslint-disable-next-line jest/no-done-callback
  it('renders a snapshot', (done: jest.DoneCallback) => {
    setTimeout(() => {
      wrapper.update();

      expect(wrapper.find(FkThumbnailList)).toMatchSnapshot();

      done();
    }, 0);
  });

  it('componentDidUpdate', () => {
    expect(() => instance.componentDidUpdate()).not.toThrow();
  });

  it('onThumbnailClick', () => {
    const keyboardEvent: Partial<React.KeyboardEvent<HTMLDivElement>> = {
      preventDefault: jest.fn(),
      shiftKey: true,
      metaKey: false,
      stopPropagation: jest.fn(() => true)
    };
    // Multi select (call buildMultiSelectedIds)
    expect(() =>
      anyInstance.onThumbnailClick(keyboardEvent, signalDetectionsData[0].id)
    ).not.toThrow();
    // Remove from selected list
    keyboardEvent.metaKey = true;
    keyboardEvent.shiftKey = false;
    expect(() =>
      anyInstance.onThumbnailClick(keyboardEvent, signalDetectionsData[0].id)
    ).not.toThrow();
    // Add to selected list
    expect(() =>
      anyInstance.onThumbnailClick(keyboardEvent, signalDetectionsData[0].id)
    ).not.toThrow();
  });

  it('onKeyDown', () => {
    const keyboardEvent: Partial<React.KeyboardEvent<HTMLDivElement>> = {
      repeat: true,
      preventDefault: jest.fn(),
      shiftKey: false,
      altKey: false,
      stopPropagation: jest.fn(() => true)
    };
    // Repeat
    expect(() => anyInstance.onKeyDown(keyboardEvent)).not.toThrow();

    // Add all to selected
    keyboardEvent.repeat = false;
    keyboardEvent.shiftKey = true;
    keyboardEvent.metaKey = true;
    keyboardEvent.key = 'A';
    expect(() => anyInstance.onKeyDown(keyboardEvent)).not.toThrow();

    // Add all to selected
    keyboardEvent.shiftKey = false;
    keyboardEvent.metaKey = true;
    keyboardEvent.key = 'A';
    expect(() => anyInstance.onKeyDown(keyboardEvent)).not.toThrow();

    // Clear all selected
    keyboardEvent.metaKey = false;
    keyboardEvent.key = 'Escape';
    expect(() => anyInstance.onKeyDown(keyboardEvent)).not.toThrow();
  });

  it('setSelectedThumbnail', () => {
    // Clear the displayedSignalDetection
    anyInstance.props.displayedSignalDetection = undefined;
    expect(() => anyInstance.setSelectedThumbnail()).not.toThrow();
  });
});
