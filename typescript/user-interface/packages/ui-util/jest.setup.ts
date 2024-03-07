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

import Adapter from '@cfaester/enzyme-adapter-react-18';
/* Jest Setup Configuration */
import crypto from 'crypto';
/* Jest Setup Configuration */
import Enzyme, { mount, render, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';

/**
 * This is needed to pass the pipeline, currently.
 */
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (algorithm: AlgorithmIdentifier, msg: Uint8Array) =>
        (crypto.webcrypto as any).subtle.digest(algorithm, msg) as Promise<any>
    }
  }
});

const globalAny: any = global;

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
require('jest-canvas-mock');

// React Enzyme adapter
Enzyme.configure({ adapter: new Adapter() });

// Make Enzyme functions available in all test files without importing
globalAny.shallow = shallow;
globalAny.render = render;
globalAny.mount = mount;
globalAny.toJson = toJson;
