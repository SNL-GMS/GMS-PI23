import { RpcProvider } from 'worker-rpc';

export const waveformWorker = new Worker(new URL('./waveform-worker', import.meta.url));
export const waveformWorkerRpc = new RpcProvider((message, transfer) => {
  waveformWorker.postMessage(message, transfer);
});
waveformWorker.onmessage = e => {
  waveformWorkerRpc.dispatch(e.data);
};
