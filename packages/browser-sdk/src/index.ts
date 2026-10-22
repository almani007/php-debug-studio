import { setupFetchInterceptor, generateTraceId, generateSpanId } from './interceptor';
import { setupErrorCapture, CapturedBrowserError } from './errors';

export interface BrowserSDKOptions {
  projectId: string;
  endpoint?: string;
  captureErrors?: boolean;
}

export class BrowserDebugStudio {
  private static instance: BrowserDebugStudio | null = null;
  private projectId: string;
  private endpoint: string;

  constructor(options: BrowserSDKOptions) {
    this.projectId = options.projectId;
    this.endpoint = (options.endpoint || 'http://127.0.0.1:8765').replace(/\/+$/, '');

    // Setup automatic trace context propagation on all fetch requests
    setupFetchInterceptor((traceId, url) => {
      // Local console correlation aid
      if (console.debug) {
        console.debug(`[PHP Debug Studio] Propagated traceparent: ${traceId} to ${url}`);
      }
    });

    // Optionally capture browser JS errors
    if (options.captureErrors !== false) {
      setupErrorCapture((err: CapturedBrowserError) => {
        this.sendError(err);
      });
    }
  }

  public static init(options: BrowserSDKOptions): BrowserDebugStudio {
    if (!BrowserDebugStudio.instance) {
      BrowserDebugStudio.instance = new BrowserDebugStudio(options);
    }
    return BrowserDebugStudio.instance;
  }

  private sendError(err: CapturedBrowserError): void {
    const payload = {
      project_id: this.projectId,
      errors: [
        {
          class: 'JavaScript Error',
          message_masked: err.message,
          severity: 'error',
          first_seen: err.timestamp,
          last_seen: err.timestamp,
          count: 1,
          state: 'unresolved',
        },
      ],
    };

    // Use sendBeacon or fail-open fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${this.endpoint}/v1/events/ingest`, JSON.stringify(payload));
    }
  }
}

export { generateTraceId, generateSpanId, setupFetchInterceptor, setupErrorCapture };
