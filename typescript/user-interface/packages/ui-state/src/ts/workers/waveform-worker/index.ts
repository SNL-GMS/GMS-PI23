import { Timer } from '@gms/common-util';
import { UILogger } from '@gms/ui-util';
import { RpcProvider } from 'worker-rpc';

import { cancelWorkerRequests } from './operations/cancel-worker-requests';
import { clearWaveforms } from './operations/clear-waveforms';
import { exportChannelSegmentsWithFilterAssociations } from './operations/export-channel-segments';
import { fetchChannelSegmentsByChannel } from './operations/fetch-channel-segments-by-channel';
import { fetchChannelsByNamesTimeRange } from './operations/fetch-channels-by-names-timerange';
import { fetchDefaultFilterDefinitionByUsageForChannelSegments } from './operations/fetch-default-filter-definition-by-usage-for-channel-segments';
import { fetchDefaultFilterDefinitionsForSignalDetectionHypotheses } from './operations/fetch-default-filter-definitions-for-signal-detection-hypotheses';
import { fetchEventsAndDetectionsWithSegments } from './operations/fetch-events-detections-segments-by-time';
import { fetchFilterDefinitionsForSignalDetections } from './operations/fetch-filter-definitions-for-signal-detections';
import { fetchSignalDetectionsWithSegments } from './operations/fetch-signal-detections-segments-by-stations-time';
import { getBoundaries } from './operations/get-boundaries';
import { getWaveform } from './operations/get-waveform';
import { WorkerOperations } from './operations/operations';
import { designFilter, filterChannelSegments } from './operations/ui-filter-processor';

const logger = UILogger.create('GMS_LOG_RPC_PROVIDER', process.env.GMS_LOG_RPC_PROVIDER);

/**
 * Set this to true to use transfer objects (this will cause the worker to lose access to that data).
 * Not yet supported.
 */
const SHOULD_USE_TRANSFER = false;

/**
 * Create the rpcProvider and tell it how to send messages.
 */
const rpcProvider = new RpcProvider((message, transfer: any[]) => {
  Timer.end('[Waveform worker]', 1000);

  // Get the reference to self so that we can post messages to the main thread
  const workerSelf = globalThis as typeof globalThis & {
    postMessage: (message: RpcProvider.Message, transfer?: any[]) => void;
  };

  if (SHOULD_USE_TRANSFER && ArrayBuffer.isView(message.payload)) {
    // We can only use transferObjects for ArrayBuffers and their Views (such as Float32Array)
    workerSelf.postMessage(message, [message.payload.buffer]);
  } else {
    // Copy message data via structured cloning
    workerSelf.postMessage(message, transfer);
  }
});

/**
 * Handle the message passed to the worker. Dispatch the requested operation.
 */
onmessage = e => {
  Timer.start('[Waveform worker]');
  rpcProvider.dispatch(e.data);
};

/**
 * The error event is dispatched if there is either a local or remote communication error (timeout, invalid id, etc.)
 * This will also catch if you forgot to register the worker operation :)
 */
rpcProvider.error.addHandler(err => {
  logger.error(err.message);
});

/** RPC Handler Registration */
rpcProvider.registerRpcHandler(
  WorkerOperations.FETCH_SIGNAL_DETECTIONS_WITH_SEGMENTS_BY_STATIONS_TIME,
  fetchSignalDetectionsWithSegments
);
rpcProvider.registerRpcHandler(
  WorkerOperations.FETCH_CHANNEL_SEGMENTS_BY_CHANNEL,
  fetchChannelSegmentsByChannel
);
rpcProvider.registerRpcHandler(
  WorkerOperations.FETCH_EVENTS_WITH_DETECTIONS_AND_SEGMENTS_BY_TIME,
  fetchEventsAndDetectionsWithSegments
);
rpcProvider.registerRpcHandler(WorkerOperations.GET_WAVEFORM, getWaveform);
rpcProvider.registerRpcHandler(WorkerOperations.GET_BOUNDARIES, getBoundaries);
rpcProvider.registerRpcHandler(WorkerOperations.CLEAR_WAVEFORMS, clearWaveforms);
rpcProvider.registerRpcHandler(WorkerOperations.CANCEL_WORKER_REQUESTS, cancelWorkerRequests);
rpcProvider.registerRpcHandler(WorkerOperations.FILTER_CHANNEL_SEGMENTS, filterChannelSegments);
rpcProvider.registerRpcHandler(WorkerOperations.DESIGN_FILTER, designFilter);
rpcProvider.registerRpcHandler(
  WorkerOperations.EXPORT_CHANNEL_SEGMENTS,
  exportChannelSegmentsWithFilterAssociations
);
rpcProvider.registerRpcHandler(
  WorkerOperations.FETCH_CHANNELS_BY_NAMES_TIME_RANGE,
  fetchChannelsByNamesTimeRange
);
rpcProvider.registerRpcHandler(
  WorkerOperations.FETCH_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTIONS,
  fetchFilterDefinitionsForSignalDetections
);
rpcProvider.registerRpcHandler(
  WorkerOperations.FETCH_DEFAULT_FILTER_DEFINITIONS_FOR_SIGNAL_DETECTION_HYPOTHESES,
  fetchDefaultFilterDefinitionsForSignalDetectionHypotheses
);
rpcProvider.registerRpcHandler(
  WorkerOperations.FETCH_DEFAULT_FILTER_DEFINITION_BY_USAGE_FOR_CHANNEL_SEGMENTS,
  fetchDefaultFilterDefinitionByUsageForChannelSegments
);
