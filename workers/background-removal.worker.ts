// Web Worker for background removal using @imgly/background-removal
// This worker runs off the main thread to keep UI responsive

import { removeBackground } from '@imgly/background-removal';

interface WorkerMessage {
  blob: Blob;
  id: string;
}

interface WorkerResponse {
  id: string;
  result?: Blob;
  error?: string;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { blob, id } = event.data;

  try {
    const resultBlob = await removeBackground(blob, {
      // Use the public folder assets path for WASM/models
      publicPath: `${self.location.origin}/_next/static/chunks/`,
    });

    const response: WorkerResponse = { id, result: resultBlob };
    (self as unknown as Worker).postMessage(response, []);
  } catch (err) {
    const response: WorkerResponse = {
      id,
      error: err instanceof Error ? err.message : 'Background removal failed',
    };
    (self as unknown as Worker).postMessage(response);
  }
};
