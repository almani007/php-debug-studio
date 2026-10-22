export interface CapturedBrowserError {
  message: string;
  sourceUrl?: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: string;
}

export function setupErrorCapture(onError: (err: CapturedBrowserError) => void): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    onError({
      message: event.message,
      sourceUrl: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    onError({
      message: `Unhandled Promise Rejection: ${event.reason}`,
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
    });
  });
}
