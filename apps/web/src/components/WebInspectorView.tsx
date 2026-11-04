import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  Laptop,
  Maximize2,
  Minimize2,
  Code2,
  Radio,
  FileCode,
  Terminal,
  Database,
  Layers,
  Sparkles,
  Copy,
  Check,
  Search,
  Filter,
  Play,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Bug,
  Activity,
  Sliders,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock
} from 'lucide-react';

interface WebInspectorViewProps {
  activeProject?: any;
  projects?: any[];
  onSelectProject?: (projectId: string) => void;
  onSendToApiStudio?: (method: string, url: string, headers?: any) => void;
  onNavigateTab?: (tab: string) => void;
  onSendToAI?: (prompt: string, context?: any) => void;
}

interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  type: string;
  timestamp: string;
  error?: string;
  headers?: Record<string, string>;
  payload?: any;
}

interface ConsoleMessage {
  id: string;
  severity: 'log' | 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  stack?: string;
  filename?: string;
  lineno?: number;
}

interface SelectedElement {
  tagName: string;
  id?: string;
  className?: string;
  outerHTML?: string;
  textContent?: string;
  styles?: Record<string, string>;
  rect?: { width: number; height: number };
}

export const WebInspectorView: React.FC<WebInspectorViewProps> = ({
  activeProject,
  projects = [],
  onSelectProject,
  onSendToApiStudio,
  onNavigateTab,
  onSendToAI,
}) => {
  // Navigation & URL state
  const defaultUrl = activeProject?.app_url || 'http://localhost:8084';
  const [urlInput, setUrlInput] = useState<string>(defaultUrl);
  const [currentUrl, setCurrentUrl] = useState<string>(defaultUrl);
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [pageTitle, setPageTitle] = useState<string>('Live Preview');
  const [domCount, setDomCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Device & Layout modes
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'laptop' | 'tablet' | 'mobile'>('desktop');
  const [layoutMode, setLayoutMode] = useState<'split' | 'browser-only' | 'inspector-only'>('split');
  const [inspectModeEnabled, setInspectModeEnabled] = useState<boolean>(false);

  // Inspector Sub-tabs
  const [inspectorTab, setInspectorTab] = useState<'elements' | 'network' | 'console' | 'storage' | 'backend' | 'performance'>('elements');

  // Inspected Element state
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>({
    tagName: 'div',
    className: 'container mx-auto px-4 py-8',
    textContent: 'Welcome to Application Cockpit',
    styles: {
      display: 'flex',
      position: 'relative',
      width: '1200px',
      height: 'auto',
      color: '#f8fafc',
      backgroundColor: '#0f172a',
      fontSize: '16px',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '400',
      margin: '0px auto',
      padding: '32px 16px',
      border: '1px solid #1e293b',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lineHeight: '1.5',
      textAlign: 'left',
    },
    rect: { width: 1200, height: 420 },
  });

  // Custom live CSS injection
  const [customCSS, setCustomCSS] = useState<string>('/* Enter CSS rules here to tweak preview in real-time */\n');

  // Network logs
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([
    {
      id: 'net-1',
      method: 'GET',
      url: currentUrl,
      status: 200,
      duration: 42,
      type: 'document',
      timestamp: new Date().toLocaleTimeString(),
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Powered-By': 'PHP/8.5.12' },
    },
    {
      id: 'net-2',
      method: 'POST',
      url: `${currentUrl}/api/auth/login`,
      status: 200,
      duration: 118,
      type: 'fetch',
      timestamp: new Date().toLocaleTimeString(),
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    },
  ]);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkRequest | null>(networkRequests[0]);
  const [networkFilter, setNetworkFilter] = useState<'all' | 'fetch' | 'error'>('all');

  // Console messages
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([
    {
      id: 'msg-1',
      severity: 'info',
      message: `[PHP Debug Studio] Attached live inspector to ${currentUrl}`,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'msg-2',
      severity: 'log',
      message: 'Laravel Reverb WebSocket connected on 127.0.0.1:8080 (GroceryOS / POS)',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [consoleSeverityFilter, setConsoleSeverityFilter] = useState<string>('all');
  const [consoleSearch, setConsoleSearch] = useState<string>('');

  // Storage / Cookies
  const [cookiesList, setCookiesList] = useState<Array<{ name: string; value: string; domain: string; path: string; secure: boolean; httpOnly: boolean }>>([
    {
      name: 'XSRF-TOKEN',
      value: 'eyJpdiI6IjFUSllrVytWc1hGQ1k5MkVDVVg5U1E9PSIsInZhbHVlIjoiNXVlR0xycXBDVzE4Rjl6Z3ozSXpjM0gyZFlHbFI4cFdwV0J5STNzQU9OSTV3VVFXSVlKWGxhNjlKS0xoR3FqSis3VE1xNnNTMWZ0ZUZ6L09namVPdldJbEE0MTU4WWNsTk9Rb2VmTm1tL3dPQ2RGTmZiQTRXSC83Z3U4dDNkdUkiLCJtYWMiOiIzNTVhNTVhMTRmZGVjOTBmYTc5YTA0YjgxYjc5ODdiNThjNWJmYzJhMDgwNGMyZWJlMzlhZmMwMTYwYzk0OTZjIiwidGFnIjoiIn0=',
      domain: 'localhost',
      path: '/',
      secure: false,
      httpOnly: false,
    },
    {
      name: 'grocery_o_s_session',
      value: 'eyJpdiI6IlNEcHJYYnh3K1N4TzFTOU56RXAxVmc9PSIsInZhbHVlIjoiNVdqbXd2Um9ldjkwQXVQaGIvUlF4SFhmYUFPYzRHN0pJYlROZS9KV2lEcnJGVTltb21zRXp4Q3BqdVhkNkRzUGF4cVVUc211ZDV2M3FqR2NDaTRQQ3VUL1VoMzZDMCtBQ0NIZWlxMTBvMG1iVGNsTUZtOHpxRnpia2lrOTUrTkkiLCJtYWMiOiIzMWI5YjA4NGIyNjY2MWZlNjcyZDBlOWM1OTc3NmQ5ODdiMDY3MjBmZGEwZTYzZjNjNmRjZjgxMjVjNDcyZWQ1IiwidGFnIjoiIn0=',
      domain: 'localhost',
      path: '/',
      secure: false,
      httpOnly: true,
    },
  ]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Sync project app_url when activeProject changes
  useEffect(() => {
    if (activeProject?.app_url) {
      setUrlInput(activeProject.app_url);
      setCurrentUrl(activeProject.app_url);
    }
  }, [activeProject?.id]);

  // Handle postMessage events from the proxied iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const data = event.data;

      if (data.type === 'PDS_PAGE_LOADED') {
        setIsLoading(false);
        if (data.title) setPageTitle(data.title);
        if (data.domElementsCount) setDomCount(data.domElementsCount);
      } else if (data.type === 'PDS_BROWSER_CONSOLE') {
        const sev: 'log' | 'info' | 'warning' | 'error' =
          data.severity === 'error' ? 'error' :
          data.severity === 'warning' ? 'warning' :
          data.severity === 'info' ? 'info' : 'log';
        setConsoleMessages((prev) => [
          {
            id: `c-${Date.now()}-${Math.random()}`,
            severity: sev,
            message: data.message,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 300));
      } else if (data.type === 'PDS_BROWSER_ERROR') {
        const errMsg: ConsoleMessage = {
          id: `err-${Date.now()}`,
          severity: 'error',
          message: data.message,
          stack: data.stack,
          filename: data.filename,
          lineno: data.lineno,
          timestamp: new Date().toLocaleTimeString(),
        };
        setConsoleMessages((prev) => [errMsg, ...prev].slice(0, 300));
      } else if (data.type === 'PDS_BROWSER_NETWORK') {
        const req: NetworkRequest = {
          id: `net-${Date.now()}-${Math.random()}`,
          method: data.method || 'GET',
          url: data.url,
          status: data.status || 0,
          duration: data.duration || 0,
          type: data.type_group || 'fetch',
          timestamp: new Date().toLocaleTimeString(),
          error: data.error,
        };
        setNetworkRequests((prev) => [req, ...prev].slice(0, 300));
      } else if (data.type === 'PDS_ELEMENT_SELECTED') {
        setSelectedElement({
          tagName: data.tagName,
          id: data.id,
          className: data.className,
          outerHTML: data.outerHTML,
          textContent: data.textContent,
          styles: data.styles,
          rect: data.rect,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Toggle Inspect Mode inside iframe
  const toggleInspectMode = () => {
    const nextState = !inspectModeEnabled;
    setInspectModeEnabled(nextState);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'PDS_SET_INSPECT_MODE', enabled: nextState },
        '*'
      );
    }
  };

  // Inject CSS into iframe
  const handleApplyCSS = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'PDS_INJECT_CSS', css: customCSS },
        '*'
      );
    }
  };

  const handleNavigate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let url = urlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    setUrlInput(url);
    setCurrentUrl(url);
    setIsLoading(true);

    // Add document request to network waterfall
    setNetworkRequests((prev) => [
      {
        id: `doc-${Date.now()}`,
        method: 'GET',
        url: url,
        status: 200,
        duration: Math.floor(Math.random() * 30) + 15,
        type: 'document',
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = getIframeSrc();
    }
  };

  const getIframeSrc = () => {
    if (!useProxy) return currentUrl;
    return `http://127.0.0.1:8765/v1/browser/proxy?url=${encodeURIComponent(currentUrl)}`;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filtered network requests
  const filteredNetwork = networkRequests.filter((n) => {
    if (networkFilter === 'fetch') return n.type === 'fetch' || n.type === 'xhr';
    if (networkFilter === 'error') return n.status >= 400 || n.status === 0;
    return true;
  });

  // Filtered console messages
  const filteredConsole = consoleMessages.filter((m) => {
    if (consoleSeverityFilter !== 'all' && m.severity !== consoleSeverityFilter) return false;
    if (consoleSearch && !m.message.toLowerCase().includes(consoleSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* Top Browser Control & Address Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', gap: '12px', flexWrap: 'wrap' }}>
        {/* Nav Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => handleReload()}
            title="Reload Page"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Quick App Preset Switchers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '3px 6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>PRESETS:</span>
            <button
              onClick={() => { setUrlInput('http://localhost:8084'); setCurrentUrl('http://localhost:8084'); }}
              style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '5px',
                border: 'none',
                background: currentUrl.includes('8084') ? 'var(--accent)' : 'transparent',
                color: currentUrl.includes('8084') ? '#000' : 'var(--text-secondary)',
                fontWeight: currentUrl.includes('8084') ? 600 : 500,
              }}
            >
              GroceryOS (8084)
            </button>
            <button
              onClick={() => { setUrlInput('http://localhost:8087'); setCurrentUrl('http://localhost:8087'); }}
              style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '5px',
                border: 'none',
                background: currentUrl.includes('8087') ? 'var(--accent)' : 'transparent',
                color: currentUrl.includes('8087') ? '#000' : 'var(--text-secondary)',
                fontWeight: currentUrl.includes('8087') ? 600 : 500,
              }}
            >
              Brixel POS (8087)
            </button>
            <button
              onClick={() => { setUrlInput('http://localhost:8085'); setCurrentUrl('http://localhost:8085'); }}
              style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '5px',
                border: 'none',
                background: currentUrl.includes('8085') ? 'var(--accent)' : 'transparent',
                color: currentUrl.includes('8085') ? '#000' : 'var(--text-secondary)',
                fontWeight: currentUrl.includes('8085') ? 600 : 500,
              }}
            >
              Pharmacy (8085)
            </button>
          </div>
        </div>

        {/* Address Input Bar */}
        <form onSubmit={handleNavigate} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '320px', maxWidth: '640px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '10px', display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
            <Globe size={15} />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter web application URL (e.g. http://localhost:8084)"
            style={{
              width: '100%',
              padding: '7px 70px 7px 32px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              position: 'absolute',
              right: '4px',
              top: '4px',
              bottom: '4px',
              padding: '0 12px',
              backgroundColor: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Go
          </button>
        </form>

        {/* Device Viewport Presets & Inspect Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Element Picker / Inspect Mode Toggle */}
          <button
            onClick={toggleInspectMode}
            title={inspectModeEnabled ? 'Exit Element Inspect Mode' : 'Click to Inspect Elements on Screen'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: inspectModeEnabled ? 'var(--accent)' : 'var(--bg-card)',
              color: inspectModeEnabled ? '#000' : 'var(--text-primary)',
              border: '1px solid ' + (inspectModeEnabled ? 'var(--accent)' : 'var(--border-color)'),
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Eye size={14} />
            {inspectModeEnabled ? 'Inspecting...' : 'Inspect'}
          </button>

          {/* Viewport device buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '2px' }}>
            <button
              onClick={() => setDeviceMode('desktop')}
              title="Desktop 100%"
              style={{
                padding: '5px 8px',
                borderRadius: '4px',
                border: 'none',
                background: deviceMode === 'desktop' ? 'var(--accent)' : 'transparent',
                color: deviceMode === 'desktop' ? '#000' : 'var(--text-secondary)',
              }}
            >
              <Monitor size={15} />
            </button>
            <button
              onClick={() => setDeviceMode('laptop')}
              title="Laptop 1280px"
              style={{
                padding: '5px 8px',
                borderRadius: '4px',
                border: 'none',
                background: deviceMode === 'laptop' ? 'var(--accent)' : 'transparent',
                color: deviceMode === 'laptop' ? '#000' : 'var(--text-secondary)',
              }}
            >
              <Laptop size={15} />
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              title="Tablet 768px"
              style={{
                padding: '5px 8px',
                borderRadius: '4px',
                border: 'none',
                background: deviceMode === 'tablet' ? 'var(--accent)' : 'transparent',
                color: deviceMode === 'tablet' ? '#000' : 'var(--text-secondary)',
              }}
            >
              <Tablet size={15} />
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              title="Mobile iPhone 390px"
              style={{
                padding: '5px 8px',
                borderRadius: '4px',
                border: 'none',
                background: deviceMode === 'mobile' ? 'var(--accent)' : 'transparent',
                color: deviceMode === 'mobile' ? '#000' : 'var(--text-secondary)',
              }}
            >
              <Smartphone size={15} />
            </button>
          </div>

          {/* Layout Split Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '2px' }}>
            <button
              onClick={() => setLayoutMode('split')}
              title="Split View"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                background: layoutMode === 'split' ? 'var(--accent)' : 'transparent',
                color: layoutMode === 'split' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              Split
            </button>
            <button
              onClick={() => setLayoutMode('browser-only')}
              title="Browser Only"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                background: layoutMode === 'browser-only' ? 'var(--accent)' : 'transparent',
                color: layoutMode === 'browser-only' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              Browser
            </button>
            <button
              onClick={() => setLayoutMode('inspector-only')}
              title="Inspector Only"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                background: layoutMode === 'inspector-only' ? 'var(--accent)' : 'transparent',
                color: layoutMode === 'inspector-only' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              DevTools
            </button>
          </div>

          {/* Open External */}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new browser tab"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', textDecoration: 'none' }}
          >
            <ExternalLink size={15} />
          </a>
        </div>
      </div>

      {/* Main Content Area: Browser Frame + DevTools Panels */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100% - 53px)', overflow: 'hidden' }}>
        {/* Left / Top: Interactive Live Browser Frame */}
        {layoutMode !== 'inspector-only' && (
          <div
            style={{
              flex: layoutMode === 'split' ? 6 : 12,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0a0d14',
              borderRight: layoutMode === 'split' ? '1px solid var(--border-color)' : 'none',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Browser Window Title Bar & Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pageTitle}</span>
                <span style={{ color: 'var(--text-muted)' }}>— {currentUrl}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>DOM Nodes: <strong style={{ color: 'var(--text-primary)' }}>{domCount || 428}</strong></span>
                <span>Mode: <strong style={{ color: 'var(--accent)' }}>Proxy & Instrumented</strong></span>
              </div>
            </div>

            {/* Viewport Frame Container */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: deviceMode === 'desktop' ? '0' : '16px' }}>
              <div
                className={`device-frame-${deviceMode}`}
                style={{
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  width: deviceMode === 'desktop' ? '100%' : deviceMode === 'laptop' ? '1280px' : deviceMode === 'tablet' ? '768px' : '390px',
                  height: deviceMode === 'desktop' ? '100%' : deviceMode === 'laptop' ? '800px' : deviceMode === 'tablet' ? '980px' : '820px',
                }}
              >
                <iframe
                  ref={iframeRef}
                  src={getIframeSrc()}
                  title="App Web Preview"
                  style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
                  onLoad={() => setIsLoading(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right / Bottom: Built-in DevTools & Live Inspector Panels */}
        {layoutMode !== 'browser-only' && (
          <div
            style={{
              flex: layoutMode === 'split' ? 6 : 12,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-panel)',
              overflow: 'hidden',
            }}
          >
            {/* DevTools Tab Bar */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', padding: '0 8px', overflowX: 'auto' }}>
              <button
                onClick={() => setInspectorTab('elements')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '12px',
                  fontWeight: inspectorTab === 'elements' ? 600 : 500,
                  border: 'none',
                  borderBottom: inspectorTab === 'elements' ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent',
                  color: inspectorTab === 'elements' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Code2 size={14} /> Elements & Styles
              </button>
              <button
                onClick={() => setInspectorTab('network')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '12px',
                  fontWeight: inspectorTab === 'network' ? 600 : 500,
                  border: 'none',
                  borderBottom: inspectorTab === 'network' ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent',
                  color: inspectorTab === 'network' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Activity size={14} /> Network ({networkRequests.length})
              </button>
              <button
                onClick={() => setInspectorTab('console')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '12px',
                  fontWeight: inspectorTab === 'console' ? 600 : 500,
                  border: 'none',
                  borderBottom: inspectorTab === 'console' ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent',
                  color: inspectorTab === 'console' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Terminal size={14} /> Console ({consoleMessages.length})
              </button>
              <button
                onClick={() => setInspectorTab('storage')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '12px',
                  fontWeight: inspectorTab === 'storage' ? 600 : 500,
                  border: 'none',
                  borderBottom: inspectorTab === 'storage' ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent',
                  color: inspectorTab === 'storage' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Database size={14} /> Cookies & Tokens ({cookiesList.length})
              </button>
              <button
                onClick={() => setInspectorTab('backend')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '12px',
                  fontWeight: inspectorTab === 'backend' ? 600 : 500,
                  border: 'none',
                  borderBottom: inspectorTab === 'backend' ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent',
                  color: inspectorTab === 'backend' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Radio size={14} /> Backend Correlation
              </button>
            </div>

            {/* Inspector Tab 1: Elements & Styles */}
            {inspectorTab === 'elements' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>&lt;{selectedElement?.tagName || 'div'}&gt;</span>
                    {selectedElement?.id && <span style={{ color: 'var(--purple)' }}>#{selectedElement.id}</span>}
                    {selectedElement?.className && <span style={{ color: 'var(--text-muted)' }}>.{selectedElement.className.split(' ').slice(0, 3).join('.')}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => copyToClipboard(selectedElement?.outerHTML || '', 'elem-html')}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      {copiedText === 'elem-html' ? 'Copied HTML!' : 'Copy HTML'}
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  {/* Left: DOM Tree Viewer */}
                  <div style={{ flex: 1, padding: '12px', overflowY: 'auto', borderRight: '1px solid var(--border-color)', fontSize: '12px', fontFamily: 'monospace' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>&lt;!DOCTYPE html&gt;</div>
                    <div style={{ paddingLeft: '8px', color: 'var(--text-secondary)' }}>&lt;html lang="en"&gt;</div>
                    <div style={{ paddingLeft: '16px', color: 'var(--text-muted)' }}>&lt;head&gt; ... &lt;/head&gt;</div>
                    <div style={{ paddingLeft: '16px', color: 'var(--text-secondary)' }}>&lt;body&gt;</div>

                    {/* Interactive DOM Nodes */}
                    <div
                      onClick={() => setSelectedElement({
                        tagName: 'div',
                        id: 'app',
                        className: 'min-h-screen bg-slate-900',
                        styles: { display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#0f172a' },
                        rect: { width: 1440, height: 900 }
                      })}
                      style={{ paddingLeft: '24px', cursor: 'pointer', padding: '3px 24px', borderRadius: '4px', background: selectedElement?.id === 'app' ? 'rgba(56, 189, 248, 0.15)' : 'transparent' }}
                    >
                      <span style={{ color: 'var(--accent)' }}>&lt;div</span> <span style={{ color: 'var(--purple)' }}>id="app"</span> <span style={{ color: 'var(--text-muted)' }}>class="min-h-screen bg-slate-900"</span><span style={{ color: 'var(--accent)' }}>&gt;</span>
                    </div>

                    <div
                      onClick={() => setSelectedElement({
                        tagName: 'header',
                        className: 'navbar sticky top-0 z-50 bg-slate-800 border-b',
                        styles: { display: 'flex', width: '100%', height: '64px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' },
                        rect: { width: 1440, height: 64 }
                      })}
                      style={{ paddingLeft: '32px', cursor: 'pointer', padding: '3px 32px', borderRadius: '4px', background: selectedElement?.tagName === 'header' ? 'rgba(56, 189, 248, 0.15)' : 'transparent' }}
                    >
                      <span style={{ color: 'var(--accent)' }}>&lt;header</span> <span style={{ color: 'var(--text-muted)' }}>class="navbar sticky top-0"</span><span style={{ color: 'var(--accent)' }}>&gt;</span> ... <span style={{ color: 'var(--accent)' }}>&lt;/header&gt;</span>
                    </div>

                    <div
                      onClick={() => setSelectedElement({
                        tagName: 'main',
                        className: 'container mx-auto px-4 py-8',
                        styles: { display: 'block', maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' },
                        rect: { width: 1280, height: 650 }
                      })}
                      style={{ paddingLeft: '32px', cursor: 'pointer', padding: '3px 32px', borderRadius: '4px', background: selectedElement?.tagName === 'main' ? 'rgba(56, 189, 248, 0.15)' : 'transparent' }}
                    >
                      <span style={{ color: 'var(--accent)' }}>&lt;main</span> <span style={{ color: 'var(--text-muted)' }}>class="container mx-auto"</span><span style={{ color: 'var(--accent)' }}>&gt;</span>
                    </div>

                    <div
                      onClick={() => setSelectedElement({
                        tagName: 'button',
                        id: 'btn-checkout',
                        className: 'btn btn-primary px-6 py-2 rounded-lg bg-blue-600',
                        textContent: 'Complete Order ($48.50)',
                        styles: { display: 'inline-flex', padding: '8px 24px', backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '8px', fontWeight: '600', fontSize: '14px' },
                        rect: { width: 195, height: 40 }
                      })}
                      style={{ paddingLeft: '48px', cursor: 'pointer', padding: '3px 48px', borderRadius: '4px', background: selectedElement?.tagName === 'button' ? 'rgba(56, 189, 248, 0.15)' : 'transparent' }}
                    >
                      <span style={{ color: 'var(--accent)' }}>&lt;button</span> <span style={{ color: 'var(--purple)' }}>id="btn-checkout"</span><span style={{ color: 'var(--accent)' }}>&gt;</span> Complete Order <span style={{ color: 'var(--accent)' }}>&lt;/button&gt;</span>
                    </div>

                    <div style={{ paddingLeft: '32px', color: 'var(--accent)' }}>&lt;/main&gt;</div>
                    <div style={{ paddingLeft: '24px', color: 'var(--accent)' }}>&lt;/div&gt;</div>
                    <div style={{ paddingLeft: '16px', color: 'var(--text-secondary)' }}>&lt;/body&gt;</div>
                    <div style={{ paddingLeft: '8px', color: 'var(--text-secondary)' }}>&lt;/html&gt;</div>
                  </div>

                  {/* Right: Computed Styles & CSS Box Model */}
                  <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Visual Box Model */}
                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>CSS Box Model</div>
                      <div style={{ border: '1px dashed #f59e0b', padding: '10px', textAlign: 'center', fontSize: '10px', color: '#f59e0b', borderRadius: '4px' }}>
                        margin: {selectedElement?.styles?.margin || '0px'}
                        <div style={{ border: '1px solid #3b82f6', padding: '10px', margin: '6px 0', color: '#3b82f6', borderRadius: '4px' }}>
                          border: {selectedElement?.styles?.border || '1px'}
                          <div style={{ border: '1px dashed #10b981', padding: '10px', margin: '6px 0', color: '#10b981', borderRadius: '4px' }}>
                            padding: {selectedElement?.styles?.padding || '16px'}
                            <div style={{ background: 'var(--bg-card)', padding: '8px', margin: '4px 0', color: 'var(--text-primary)', fontWeight: 600, borderRadius: '4px' }}>
                              {selectedElement?.rect?.width || 1200} × {selectedElement?.rect?.height || 420}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Computed Styles Table */}
                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        COMPUTED STYLES
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
                        {selectedElement?.styles ? Object.entries(selectedElement.styles).map(([prop, val]) => (
                          <div key={prop} style={{ display: 'flex', padding: '4px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: 'var(--text-secondary)', width: '130px' }}>{prop}:</span>
                            <span style={{ color: 'var(--accent)', flex: 1 }}>{val}</span>
                          </div>
                        )) : (
                          <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center' }}>Click an element in the DOM tree or on the preview to inspect styles</div>
                        )}
                      </div>
                    </div>

                    {/* Live CSS Tweak Editor */}
                    <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>LIVE CSS INJECTOR</span>
                        <button
                          onClick={handleApplyCSS}
                          style={{ fontSize: '11px', padding: '3px 10px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600 }}
                        >
                          Apply Live
                        </button>
                      </div>
                      <textarea
                        value={customCSS}
                        onChange={(e) => setCustomCSS(e.target.value)}
                        rows={3}
                        style={{ width: '100%', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '11px', padding: '8px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inspector Tab 2: Network Waterfall */}
            {inspectorTab === 'network' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Filter bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setNetworkFilter('all')}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: 'none', background: networkFilter === 'all' ? 'var(--accent)' : 'var(--bg-card)', color: networkFilter === 'all' ? '#000' : 'var(--text-secondary)' }}
                    >
                      All ({networkRequests.length})
                    </button>
                    <button
                      onClick={() => setNetworkFilter('fetch')}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: 'none', background: networkFilter === 'fetch' ? 'var(--accent)' : 'var(--bg-card)', color: networkFilter === 'fetch' ? '#000' : 'var(--text-secondary)' }}
                    >
                      Fetch / XHR
                    </button>
                    <button
                      onClick={() => setNetworkFilter('error')}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: 'none', background: networkFilter === 'error' ? 'var(--danger)' : 'var(--bg-card)', color: networkFilter === 'error' ? '#fff' : 'var(--text-secondary)' }}
                    >
                      Errors
                    </button>
                  </div>
                  <button
                    onClick={() => setNetworkRequests([])}
                    style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
                  >
                    Clear Network
                  </button>
                </div>

                {/* Network Table & Detail Split */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '6px 10px' }}>Method</th>
                          <th style={{ padding: '6px 10px' }}>Status</th>
                          <th style={{ padding: '6px 10px' }}>Path</th>
                          <th style={{ padding: '6px 10px' }}>Type</th>
                          <th style={{ padding: '6px 10px' }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNetwork.map((req) => (
                          <tr
                            key={req.id}
                            onClick={() => setSelectedNetwork(req)}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              backgroundColor: selectedNetwork?.id === req.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                              cursor: 'pointer',
                            }}
                          >
                            <td style={{ padding: '6px 10px', fontWeight: 600, color: req.method === 'GET' ? 'var(--accent)' : req.method === 'POST' ? 'var(--success)' : 'var(--warning)' }}>
                              {req.method}
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: req.status === 200 || req.status === 201 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: req.status === 200 || req.status === 201 ? 'var(--success)' : 'var(--danger)',
                              }}>
                                {req.status || 'ERR'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-primary)', fontFamily: 'monospace', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {req.url.replace(/^https?:\/\/[^\/]+/, '') || '/'}
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{req.type}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{req.duration}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Network Request Detail Drawer */}
                  {selectedNetwork && (
                    <div style={{ width: '280px', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Request Details</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{selectedNetwork.timestamp}</span>
                      </div>

                      <div style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <strong>{selectedNetwork.method}</strong> {selectedNetwork.url}
                      </div>

                      {/* 1-Click Send to API Studio Button */}
                      <button
                        onClick={() => {
                          if (onSendToApiStudio) {
                            onSendToApiStudio(selectedNetwork.method, selectedNetwork.url, selectedNetwork.headers);
                          }
                          if (onNavigateTab) {
                            onNavigateTab('api');
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          backgroundColor: 'var(--accent)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <Play size={13} /> Replay in API Studio
                      </button>

                      <div style={{ fontSize: '11px' }}>
                        <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>RESPONSE HEADERS</div>
                        <pre style={{ backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {JSON.stringify(selectedNetwork.headers || { 'Content-Type': 'application/json', 'Server': 'nginx' }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inspector Tab 3: Console & Errors */}
            {inspectorTab === 'console' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['all', 'error', 'warning', 'info'].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setConsoleSeverityFilter(sev)}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          background: consoleSeverityFilter === sev ? 'var(--accent)' : 'var(--bg-card)',
                          color: consoleSeverityFilter === sev ? '#000' : 'var(--text-secondary)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Filter console..."
                    value={consoleSearch}
                    onChange={(e) => setConsoleSearch(e.target.value)}
                    style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', width: '140px' }}
                  />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredConsole.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: msg.severity === 'error' ? 'rgba(239, 68, 68, 0.1)' : msg.severity === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-card)',
                        borderLeft: `3px solid ${msg.severity === 'error' ? 'var(--danger)' : msg.severity === 'warning' ? 'var(--warning)' : 'var(--accent)'}`,
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: msg.severity === 'error' ? 'var(--danger)' : msg.severity === 'warning' ? 'var(--warning)' : 'var(--text-primary)' }}>
                          {msg.message}
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{msg.timestamp}</span>
                      </div>
                      {msg.stack && (
                        <pre style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {msg.stack}
                        </pre>
                      )}
                      {msg.severity === 'error' && (
                        <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              if (onSendToAI) {
                                onSendToAI(`Please analyze and provide a fix for this frontend JavaScript error:\n${msg.message}\n${msg.stack || ''}`);
                              }
                              if (onNavigateTab) {
                                onNavigateTab('ai');
                              }
                            }}
                            style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              background: 'var(--purple)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Sparkles size={11} /> Diagnose with AI
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inspector Tab 4: Cookies & Tokens */}
            {inspectorTab === 'storage' && (
              <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Active Session Cookies ({cookiesList.length})</span>
                  <button
                    onClick={() => setCookiesList([])}
                    style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '4px' }}
                  >
                    Clear Cookies
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cookiesList.map((c) => (
                    <div key={c.name} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ color: 'var(--accent)' }}>{c.name}</strong>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {c.httpOnly && <span style={{ padding: '1px 5px', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--purple)', fontSize: '9px' }}>HttpOnly</span>}
                          <button
                            onClick={() => copyToClipboard(c.value, c.name)}
                            style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '3px' }}
                          >
                            {copiedText === c.name ? 'Copied!' : 'Copy Value'}
                          </button>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all', backgroundColor: 'var(--bg-panel)', padding: '6px', borderRadius: '4px' }}>
                        {c.value.slice(0, 120)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inspector Tab 5: Backend Correlation */}
            {inspectorTab === 'backend' && (
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Radio size={16} color="var(--accent)" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Matched Backend Route</span>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontSize: '11px', fontWeight: 700 }}>
                      200 OK
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '11px' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Framework Action</span>
                      <strong style={{ color: 'var(--text-primary)' }}>Grocery\Presentation\Http\Controllers\HomeController@index</strong>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PHP Execution Time</span>
                      <strong style={{ color: 'var(--success)' }}>18.4 ms</strong>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Database Queries</span>
                      <strong style={{ color: 'var(--accent)' }}>4 queries (2.1 ms)</strong>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Peak Memory</span>
                      <strong style={{ color: 'var(--purple)' }}>14.2 MB</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onNavigateTab && onNavigateTab('traces')}
                      style={{ flex: 1, padding: '7px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--accent)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Activity size={13} /> View Full Distributed Trace
                    </button>
                    <button
                      onClick={() => onNavigateTab && onNavigateTab('sql')}
                      style={{ flex: 1, padding: '7px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Database size={13} /> View SQL Queries (4)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
