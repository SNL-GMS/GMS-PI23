import { IS_NODE_ENV_DEVELOPMENT, IS_NODE_ENV_PRODUCTION, NODE_ENV } from '@gms/common-util';
import { getElectron, getElectronEnhancer, UILogger } from '@gms/ui-util';
import { configureStore } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import {
  createStateSyncMiddleware,
  initStateWithPrevTab,
  withReduxStateSync
} from 'redux-state-sync';
import type { ThunkMiddleware } from 'redux-thunk';
import thunk from 'redux-thunk';

import {
  eventManagerApiSlice,
  processingConfigurationApiSlice,
  processingStationApiSlice,
  signalEnhancementConfigurationApiSlice,
  sohAceiApiSlice,
  ssamControlApiSlice,
  stationDefinitionSlice,
  systemEventGatewayApiSlice,
  systemMessageDefinitionApiSlice,
  userManagerApiSlice,
  workflowApiSlice
} from './api';
import { reducer } from './reducer';
import { userSessionActions } from './state';
import { waveformSlice } from './state/waveform';
import {
  establishWsConnection,
  registerConnectionStatusCallback
} from './subscription/subscription';

const logger = UILogger.create('GMS_LOG_REDUX_STORE', process.env.GMS_LOG_REDUX_STORE || 'info');

const thunkMiddleware: ThunkMiddleware = thunk;

const buildStore = () => {
  const DISABLE_REDUX_STATE_SYNC = process.env.GMS_DISABLE_REDUX_STATE_SYNC === 'true';

  logger.info(
    `Configuring Redux store with the following properties: ` +
      `NODE_ENV:${NODE_ENV} ` +
      `GMS_ENABLE_REDUX_LOGGER:${process.env.GMS_ENABLE_REDUX_LOGGER} ` +
      `GMS_DISABLE_REDUX_IMMUTABLE_CHECK:${process.env.GMS_DISABLE_REDUX_IMMUTABLE_CHECK} ` +
      `GMS_DISABLE_REDUX_SERIALIZABLE_CHECK:${process.env.GMS_DISABLE_REDUX_SERIALIZABLE_CHECK} ` +
      `DISABLE_REDUX_STATE_SYNC:${DISABLE_REDUX_STATE_SYNC} `
  );

  const store = configureStore({
    reducer: !DISABLE_REDUX_STATE_SYNC ? withReduxStateSync(reducer) : reducer,
    devTools:
      !IS_NODE_ENV_PRODUCTION &&
      process.env.GMS_DISABLE_REDUX_DEV_TOOLS?.toLocaleLowerCase() !== 'true'
        ? {
            trace: true,
            actionsDenylist: [
              waveformSlice.actions.incrementLoadingTotal.name,
              waveformSlice.actions.incrementLoadingCompleted.name
            ]
          }
        : false,
    middleware: getDefaultMiddleware => {
      const middlewares = getDefaultMiddleware({
        thunk: true,
        immutableCheck:
          IS_NODE_ENV_DEVELOPMENT &&
          process.env.GMS_DISABLE_REDUX_IMMUTABLE_CHECK?.toLocaleLowerCase() !== 'true',
        serializableCheck:
          IS_NODE_ENV_DEVELOPMENT &&
          process.env.GMS_DISABLE_REDUX_SERIALIZABLE_CHECK?.toLocaleLowerCase() !== 'true'
      })
        .concat(thunkMiddleware)
        .concat(systemEventGatewayApiSlice.middleware)
        .concat(eventManagerApiSlice.middleware)
        .concat(processingConfigurationApiSlice.middleware)
        .concat(processingStationApiSlice.middleware)
        .concat(signalEnhancementConfigurationApiSlice.middleware)
        .concat(sohAceiApiSlice.middleware)
        .concat(ssamControlApiSlice.middleware)
        .concat(stationDefinitionSlice.middleware)
        .concat(systemMessageDefinitionApiSlice.middleware)
        .concat(userManagerApiSlice.middleware)
        .concat(workflowApiSlice.middleware);

      if (!DISABLE_REDUX_STATE_SYNC) {
        middlewares.push(createStateSyncMiddleware());
      }

      // ! the logger should always be the last middleware added
      // enable the Redux logger only if `GMS_ENABLE_REDUX_LOGGER` is set to true
      if (process.env.GMS_ENABLE_REDUX_LOGGER?.toLocaleLowerCase() === 'true') {
        const reduxLogger = createLogger({
          collapsed: true,
          duration: true,
          timestamp: false,
          level: 'info',
          logger: console,
          logErrors: true,
          diff: false
        });
        middlewares.push(reduxLogger);
      }
      return middlewares;
    },
    enhancers:
      getElectron() && getElectronEnhancer()
        ? [
            // must be placed after the enhancers which dispatch
            // their own actions such as redux-thunk or redux-saga
            getElectronEnhancer()({
              dispatchProxy: a => store.dispatch(a)
            })
          ]
        : []
  });

  // initialize state using any previous state from other tabs
  if (!DISABLE_REDUX_STATE_SYNC) {
    initStateWithPrevTab(store);
  }

  // store is created connect to System Event gateway and set callback to set connection status
  establishWsConnection();
  const updateConnectionStatus = (connected: boolean): void => {
    if (store) {
      store.dispatch(userSessionActions.setConnected(connected));
    }
  };
  registerConnectionStatusCallback(updateConnectionStatus, store.getState().app.userSession);

  return store;
};

type ReduxStoreType = ReturnType<typeof buildStore>;

export interface GMSWindow extends Window {
  ReduxStore: ReduxStoreType;
}

const getGmsStore = (): ReturnType<typeof buildStore> => {
  const gmsWindow = (window as unknown) as GMSWindow;
  // ! ensure that only one Redux store instance is created
  if (gmsWindow.ReduxStore == null) {
    gmsWindow.ReduxStore = buildStore();
  }
  return gmsWindow.ReduxStore;
};

/**
 * Creates the Redux application store, which is stored on the window object in order to avoid any chance for
 * multiple stores to be created (if multiple copies of the module are included in the bundle, for example).
 *
 * @returns the Redux store for the application
 */
export const getStore = (): ReduxStoreType => getGmsStore();

/**
 * Returns the dispatch function of the Redux store/
 *
 * @returns the Redux dispatch function
 */
export const getDispatch = () => getGmsStore().dispatch;

/**
 * The application state.
 * Infer the `AppState` types from the store itself
 */
export type AppState = ReturnType<typeof reducer>;

/**
 * The application dispatched (typed).
 * Infer the `AppDispatch` types from the store itself
 */
export type AppDispatch = ReturnType<typeof getDispatch>;
