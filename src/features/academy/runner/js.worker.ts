import { runJsSource } from './jsCore'

// Runs one program at a time; the page terminates this worker if a run takes too long.
self.postMessage({ type: 'ready' })
self.onmessage = (e: MessageEvent<{ type: 'run'; id: number; code: string }>) => {
  if (e.data.type === 'run') self.postMessage({ type: 'result', id: e.data.id, ...runJsSource(e.data.code) })
}
