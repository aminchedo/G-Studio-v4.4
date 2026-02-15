// Typed IPC contracts shared between Electron main, preload, and renderer
// This is a scaffold; wire these types into electron/main.cjs and preload.cjs via contextBridge

export type IpcRequestMap = {
  'fs:readFile': { params: { path: string; encoding?: BufferEncoding }; result: string };
  'fs:writeFile': { params: { path: string; data: string; encoding?: BufferEncoding }; result: void };
  'speech:start': { params: { model: string; deviceId?: string }; result: { sessionId: string } };
  'speech:stop': { params: { sessionId: string }; result: void };
};

export type IpcEventMap = {
  'speech:data': { sessionId: string; text: string; isFinal: boolean };
  'fs:progress': { operation: 'read' | 'write'; path: string; bytes: number };
};

// Renderer-side API shape exposed by preload via contextBridge
export interface RendererIpcApi {
  invoke<K extends keyof IpcRequestMap>(channel: K, params: IpcRequestMap[K]['params']): Promise<IpcRequestMap[K]['result']>;
  on<K extends keyof IpcEventMap>(channel: K, listener: (event: IpcEventMap[K]) => void): () => void;
}
