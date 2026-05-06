declare global {
  interface Window {
    acquireVsCodeApi: () => { postMessage: (msg: any) => void; getState: () => any; setState: (s: any) => void };
  }
}
const api = window.acquireVsCodeApi();
export function post(msg: any) { api.postMessage(msg); }
export function getState<T = any>(): T | undefined { return api.getState(); }
export function setState(s: any) { api.setState(s); }
