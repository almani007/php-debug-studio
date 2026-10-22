export function generateTraceId(): string {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * 16)];
  }
  return id;
}

export function generateSpanId(): string {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * 16)];
  }
  return id;
}

export function setupFetchInterceptor(onTraceCreated?: (traceId: string, url: string) => void): void {
  if (typeof window === 'undefined' || !window.fetch) {
    return;
  }

  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const traceparent = `00-${traceId}-${spanId}-01`;

    const modifiedInit = init || {};
    const headers = new Headers(modifiedInit.headers || {});
    headers.set('traceparent', traceparent);
    modifiedInit.headers = headers;

    if (onTraceCreated) {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      onTraceCreated(traceId, urlStr);
    }

    return originalFetch.call(this, input, modifiedInit);
  };
}
