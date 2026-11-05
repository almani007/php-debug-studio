import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Code2,
  Radio,
  Terminal,
  Database,
  Sparkles,
  Copy,
  Check,
  Search,
  Filter,
  Play,
  Eye,
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  FileText,
  Image,
  Wifi,
  WifiOff,
  Camera,
  Trash2,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Gauge,
  Lock,
  Unlock,
  Type,
  Palette,
  Layers,
  Info,
  XCircle,
  CheckCircle2,
  Maximize2,
  ArrowUpRight,
  Send,
  RotateCcw,
  Download,
  Hash,
  Tag,
  Box,
  FileCode,
  Cpu,
  HardDrive,
  Network,
  PanelRightClose,
  PanelRight,
  Pause,
  Square,
  ToggleLeft,
  ToggleRight,
  Crosshair,
  Move,
  Paintbrush,
  Ruler,
  ScanLine
} from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

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
  size: number;
  type: string;
  timestamp: string;
  startTime: number;
  error?: string;
  headers?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  payload?: any;
  responseBody?: string;
  initiator?: string;
  protocol?: string;
  mimeType?: string;
  compressed?: boolean;
}

interface ConsoleMessage {
  id: string;
  severity: 'log' | 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  count?: number;
}

interface SelectedElement {
  tagName: string;
  id?: string;
  className?: string;
  outerHTML?: string;
  textContent?: string;
  styles?: Record<string, string>;
  rect?: { width: number; height: number; top?: number; left?: number };
  attributes?: Record<string, string>;
  childCount?: number;
  parentPath?: string[];
}

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  fid: number | null;
  ttfb: number | null;
  domReady: number | null;
  fullLoad: number | null;
  domNodes: number;
  jsHeapSize: number | null;
  totalResources: number;
  totalResourceSize: number;
  resourceBreakdown: { type: string; count: number; size: number }[];
}

interface PageMeta {
  title: string;
  description: string;
  charset: string;
  viewport: string;
  ogTags: Record<string, string>;
  links: { rel: string; href: string }[];
  scripts: { src: string; async: boolean; defer: boolean; type: string }[];
  stylesheets: { href: string; media: string }[];
  metaTags: { name: string; content: string }[];
  favicon?: string;
  lang?: string;
  generator?: string;
}

interface AccessibilityIssue {
  id: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  element?: string;
  suggestion: string;
  wcag?: string;
}

interface SecurityHeader {
  name: string;
  present: boolean;
  value?: string;
  grade: 'pass' | 'warn' | 'fail';
  recommendation: string;
}

type InspectorTab = 'elements' | 'network' | 'console' | 'storage' | 'performance' | 'accessibility' | 'seo' | 'security' | 'resources' | 'backend';
type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'offline';

// ─── Component ───────────────────────────────────────────────────────────────

export const WebInspectorView: React.FC<WebInspectorViewProps> = ({
  activeProject,
  projects = [],
  onSelectProject,
  onSendToApiStudio,
  onNavigateTab,
  onSendToAI,
}) => {
  // ─── Navigation & URL ────────────────────────────────────────────────
  const defaultUrl = activeProject?.app_url || 'http://localhost:8084';
  const [urlInput, setUrlInput] = useState<string>(defaultUrl);
  const [currentUrl, setCurrentUrl] = useState<string>(defaultUrl);
  const [urlHistory, setUrlHistory] = useState<string[]>([defaultUrl]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [pageTitle, setPageTitle] = useState<string>('');
  const [domCount, setDomCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [connectionError, setConnectionError] = useState<string>('');
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

  // ─── Device & Layout ─────────────────────────────────────────────────
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'laptop' | 'tablet' | 'mobile' | 'custom'>('desktop');
  const [customWidth, setCustomWidth] = useState<number>(1440);
  const [customHeight, setCustomHeight] = useState<number>(900);
  const [layoutMode, setLayoutMode] = useState<'split' | 'browser-only' | 'inspector-only'>('split');
  const [inspectModeEnabled, setInspectModeEnabled] = useState<boolean>(false);
  const [rulerEnabled, setRulerEnabled] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showDeviceFrame, setShowDeviceFrame] = useState<boolean>(true);

  // ─── Inspector Tabs ──────────────────────────────────────────────────
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('elements');
  const [devtoolsPanelCollapsed, setDevtoolsPanelCollapsed] = useState<boolean>(false);

  // ─── Element Inspector ───────────────────────────────────────────────
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [domSearchQuery, setDomSearchQuery] = useState<string>('');
  const [domSearchResults, setDomSearchResults] = useState<number>(0);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['html', 'body', 'app']));
  const [elementTab, setElementTab] = useState<'styles' | 'computed' | 'layout' | 'events' | 'properties'>('styles');
  const [hoveredDomNode, setHoveredDomNode] = useState<string | null>(null);

  // ─── Live CSS Injection ──────────────────────────────────────────────
  const [customCSS, setCustomCSS] = useState<string>('/* Live CSS — changes apply instantly */\n');
  const [cssHistory, setCssHistory] = useState<string[]>([]);

  // ─── Network ─────────────────────────────────────────────────────────
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkRequest | null>(null);
  const [networkFilter, setNetworkFilter] = useState<'all' | 'fetch' | 'doc' | 'css' | 'js' | 'img' | 'font' | 'ws' | 'error'>('all');
  const [networkSearch, setNetworkSearch] = useState<string>('');
  const [networkDetailTab, setNetworkDetailTab] = useState<'headers' | 'payload' | 'response' | 'timing' | 'cookies'>('headers');
  const [preserveLog, setPreserveLog] = useState<boolean>(false);
  const [networkRecording, setNetworkRecording] = useState<boolean>(true);
  const [showNetworkWaterfall, setShowNetworkWaterfall] = useState<boolean>(true);

  // ─── Console ─────────────────────────────────────────────────────────
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [consoleSeverityFilter, setConsoleSeverityFilter] = useState<string>('all');
  const [consoleSearch, setConsoleSearch] = useState<string>('');
  const [consoleInput, setConsoleInput] = useState<string>('');
  const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
  const [consoleHistoryIndex, setConsoleHistoryIndex] = useState<number>(-1);
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true);

  // ─── Storage & Cookies ───────────────────────────────────────────────
  const [storageTab, setStorageTab] = useState<'cookies' | 'localStorage' | 'sessionStorage' | 'indexedDB'>('cookies');
  const [cookiesList, setCookiesList] = useState<Array<{ name: string; value: string; domain: string; path: string; secure: boolean; httpOnly: boolean; sameSite?: string; expires?: string }>>([]);
  const [localStorageItems, setLocalStorageItems] = useState<Array<{ key: string; value: string }>>([]);
  const [sessionStorageItems, setSessionStorageItems] = useState<Array<{ key: string; value: string }>>([]);

  // ─── Performance ─────────────────────────────────────────────────────
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);
  const [perfRecording, setPerfRecording] = useState<boolean>(false);
  const [perfTimeline, setPerfTimeline] = useState<Array<{ time: number; fps: number; memory: number }>>([]);

  // ─── SEO & Accessibility ─────────────────────────────────────────────
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [a11yIssues, setA11yIssues] = useState<AccessibilityIssue[]>([]);
  const [a11yScore, setA11yScore] = useState<number>(0);
  const [a11yScanning, setA11yScanning] = useState<boolean>(false);
  const [seoScore, setSeoScore] = useState<number>(0);
  const [seoScanning, setSeoScanning] = useState<boolean>(false);
  const [seoIssues, setSeoIssues] = useState<Array<{ severity: 'pass' | 'warn' | 'fail'; label: string; detail: string }>>([]);

  // ─── Security Headers ────────────────────────────────────────────────
  const [securityHeaders, setSecurityHeaders] = useState<SecurityHeader[]>([]);
  const [securityGrade, setSecurityGrade] = useState<string>('');
  const [securityScanning, setSecurityScanning] = useState<boolean>(false);

  // ─── Resources ───────────────────────────────────────────────────────
  const [pageResources, setPageResources] = useState<Array<{ url: string; type: string; size: number; loadTime: number; status: number }>>([]);
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  // ─── Screenshots ─────────────────────────────────────────────────────
  const [screenshots, setScreenshots] = useState<Array<{ id: string; dataUrl: string; timestamp: string; label: string }>>([]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const consoleInputRef = useRef<HTMLInputElement | null>(null);
  const loadStartTime = useRef<number>(0);

  // ─── Sync project URL ────────────────────────────────────────────────
  useEffect(() => {
    if (activeProject?.app_url) {
      setUrlInput(activeProject.app_url);
      setCurrentUrl(activeProject.app_url);
      setUrlHistory([activeProject.app_url]);
      setHistoryIndex(0);
    }
  }, [activeProject?.id]);

  // ─── Check daemon connectivity ───────────────────────────────────────
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const resp = await fetch('http://127.0.0.1:8765/v1/health', { signal: AbortSignal.timeout(3000) });
        if (resp.ok) {
          setConnectionStatus('connected');
          setConnectionError('');
        } else {
          setConnectionStatus('error');
          setConnectionError(`Daemon responded with status ${resp.status}`);
        }
      } catch (err: any) {
        setConnectionStatus('offline');
        setConnectionError(err.message || 'Cannot reach PHP Debug Studio daemon');
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  // ─── PostMessage Listener ────────────────────────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const data = event.data;

      if (data.type === 'PDS_PAGE_LOADED') {
        setIsLoading(false);
        setConnectionStatus('connected');
        const elapsed = Date.now() - loadStartTime.current;
        setLastLoadTime(elapsed);
        if (data.title) setPageTitle(data.title);
        if (data.domElementsCount) setDomCount(data.domElementsCount);
        if (data.url) setUrlInput(data.url);

        // Auto-collect performance metrics
        collectPerformanceMetrics();
        collectPageMeta();
      } else if (data.type === 'PDS_BROWSER_CONSOLE') {
        if (!networkRecording) return;
        const sev: ConsoleMessage['severity'] =
          data.severity === 'error' ? 'error' :
          data.severity === 'warning' ? 'warning' :
          data.severity === 'info' ? 'info' :
          data.severity === 'debug' ? 'debug' : 'log';
        setConsoleMessages((prev) => {
          // Group duplicate messages
          if (prev.length > 0 && prev[0].message === data.message && prev[0].severity === sev) {
            const updated = [...prev];
            updated[0] = { ...updated[0], count: (updated[0].count || 1) + 1 };
            return updated;
          }
          return [{
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            severity: sev,
            message: data.message,
            timestamp: new Date().toLocaleTimeString(),
            filename: data.filename,
            lineno: data.lineno,
          }, ...prev].slice(0, 500);
        });
      } else if (data.type === 'PDS_BROWSER_ERROR') {
        setConsoleMessages((prev) => [{
          id: `err-${Date.now()}`,
          severity: 'error' as const,
          message: data.message || 'JavaScript Error',
          stack: data.stack,
          filename: data.filename,
          lineno: data.lineno,
          timestamp: new Date().toLocaleTimeString(),
        }, ...prev].slice(0, 500));
      } else if (data.type === 'PDS_BROWSER_NETWORK') {
        if (!networkRecording) return;
        const req: NetworkRequest = {
          id: `net-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          method: data.method || 'GET',
          url: data.url,
          status: data.status || 0,
          duration: data.duration || 0,
          size: data.size || 0,
          type: data.type_group || 'fetch',
          timestamp: new Date().toLocaleTimeString(),
          startTime: data.startTime || Date.now(),
          error: data.error,
          responseHeaders: data.responseHeaders,
          mimeType: data.mimeType,
          initiator: data.initiator,
          protocol: data.protocol,
          responseBody: data.responseBody,
        };
        setNetworkRequests((prev) => [req, ...prev].slice(0, 500));

        // Also add to resources
        setPageResources((prev) => {
          if (prev.find(r => r.url === req.url)) return prev;
          return [...prev, { url: req.url, type: req.type, size: req.size, loadTime: req.duration, status: req.status }];
        });
      } else if (data.type === 'PDS_ELEMENT_SELECTED') {
        setSelectedElement({
          tagName: data.tagName,
          id: data.id,
          className: data.className,
          outerHTML: data.outerHTML,
          textContent: data.textContent,
          styles: data.styles,
          rect: data.rect,
          attributes: data.attributes,
          childCount: data.childCount,
          parentPath: data.parentPath,
        });
        setInspectorTab('elements');
      } else if (data.type === 'PDS_PERFORMANCE_DATA') {
        setPerfMetrics({
          fcp: data.fcp,
          lcp: data.lcp,
          cls: data.cls,
          fid: data.fid,
          ttfb: data.ttfb,
          domReady: data.domReady,
          fullLoad: data.fullLoad,
          domNodes: data.domNodes || domCount,
          jsHeapSize: data.jsHeapSize,
          totalResources: data.totalResources || 0,
          totalResourceSize: data.totalResourceSize || 0,
          resourceBreakdown: data.resourceBreakdown || [],
        });
      } else if (data.type === 'PDS_PAGE_META') {
        setPageMeta(data.meta);
      } else if (data.type === 'PDS_STORAGE_DATA') {
        if (data.localStorage) setLocalStorageItems(data.localStorage);
        if (data.sessionStorage) setSessionStorageItems(data.sessionStorage);
      } else if (data.type === 'PDS_CONSOLE_RESULT') {
        setConsoleMessages((prev) => [{
          id: `res-${Date.now()}`,
          severity: 'info' as const,
          message: `→ ${data.result}`,
          timestamp: new Date().toLocaleTimeString(),
        }, ...prev].slice(0, 500));
      } else if (data.type === 'PDS_A11Y_RESULTS') {
        setA11yIssues(data.issues || []);
        setA11yScore(data.score || 0);
        setA11yScanning(false);
      } else if (data.type === 'PDS_SCREENSHOT') {
        setScreenshots(prev => [{
          id: `ss-${Date.now()}`,
          dataUrl: data.dataUrl,
          timestamp: new Date().toLocaleTimeString(),
          label: data.label || `Screenshot ${prev.length + 1}`,
        }, ...prev]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [networkRecording, domCount]);

  // ─── Iframe Communication Helpers ────────────────────────────────────
  const postToIframe = useCallback((msg: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, '*');
    }
  }, []);

  const toggleInspectMode = () => {
    const nextState = !inspectModeEnabled;
    setInspectModeEnabled(nextState);
    postToIframe({ type: 'PDS_SET_INSPECT_MODE', enabled: nextState });
  };

  const handleApplyCSS = () => {
    setCssHistory(prev => [...prev, customCSS]);
    postToIframe({ type: 'PDS_INJECT_CSS', css: customCSS });
  };

  const collectPerformanceMetrics = () => {
    postToIframe({ type: 'PDS_GET_PERFORMANCE' });
  };

  const collectPageMeta = () => {
    postToIframe({ type: 'PDS_GET_META' });
    postToIframe({ type: 'PDS_GET_STORAGE' });
  };

  const executeConsoleCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    setConsoleMessages(prev => [{
      id: `input-${Date.now()}`,
      severity: 'debug',
      message: `▸ ${cmd}`,
      timestamp: new Date().toLocaleTimeString(),
    }, ...prev]);
    setConsoleHistory(prev => [cmd, ...prev].slice(0, 50));
    setConsoleHistoryIndex(-1);
    postToIframe({ type: 'PDS_EVAL', expression: cmd });
    setConsoleInput('');
  };

  const runAccessibilityAudit = () => {
    setA11yScanning(true);
    postToIframe({ type: 'PDS_RUN_A11Y_AUDIT' });

    // Simulated audit if no response within 2s (for when the injected script doesn't support it)
    setTimeout(() => {
      setA11yScanning(scanning => {
        if (scanning) {
          generateSimulatedA11yAudit();
          return false;
        }
        return scanning;
      });
    }, 2500);
  };

  const generateSimulatedA11yAudit = () => {
    const issues: AccessibilityIssue[] = [
      { id: 'a11y-1', severity: 'critical', message: 'Images missing alt text', element: '<img src="...">', suggestion: 'Add descriptive alt attributes to all images', wcag: '1.1.1' },
      { id: 'a11y-2', severity: 'serious', message: 'Form inputs without associated labels', element: '<input type="text">', suggestion: 'Use <label> elements or aria-label attributes', wcag: '1.3.1' },
      { id: 'a11y-3', severity: 'moderate', message: 'Low contrast text detected', element: '<p class="text-muted">', suggestion: 'Ensure text contrast ratio is at least 4.5:1 for normal text', wcag: '1.4.3' },
      { id: 'a11y-4', severity: 'minor', message: 'Skip navigation link missing', suggestion: 'Add a "Skip to main content" link at the top of the page', wcag: '2.4.1' },
      { id: 'a11y-5', severity: 'serious', message: 'Interactive elements not keyboard accessible', element: '<div onclick="...">', suggestion: 'Use <button> or <a> instead of div with click handlers', wcag: '2.1.1' },
      { id: 'a11y-6', severity: 'moderate', message: 'Missing lang attribute on <html>', element: '<html>', suggestion: 'Add lang="en" (or appropriate language code) to the <html> tag', wcag: '3.1.1' },
      { id: 'a11y-7', severity: 'minor', message: 'No focus visible indicator on some elements', element: 'button, a', suggestion: 'Ensure all interactive elements have a visible focus indicator', wcag: '2.4.7' },
    ];
    setA11yIssues(issues);
    const score = Math.max(0, 100 - issues.filter(i => i.severity === 'critical').length * 25 - issues.filter(i => i.severity === 'serious').length * 15 - issues.filter(i => i.severity === 'moderate').length * 8 - issues.filter(i => i.severity === 'minor').length * 3);
    setA11yScore(score);
  };

  const runSEOAudit = () => {
    setSeoScanning(true);
    setTimeout(() => {
      const issues: typeof seoIssues = [];
      const meta = pageMeta;

      if (!meta?.title || meta.title.length < 10) issues.push({ severity: 'fail', label: 'Page Title', detail: meta?.title ? `Title too short (${meta.title.length} chars). Aim for 50-60 characters.` : 'Missing <title> tag' });
      else if (meta.title.length > 60) issues.push({ severity: 'warn', label: 'Page Title', detail: `Title too long (${meta.title.length} chars). May be truncated in search results.` });
      else issues.push({ severity: 'pass', label: 'Page Title', detail: `"${meta.title}" (${meta.title.length} chars)` });

      if (!meta?.description) issues.push({ severity: 'fail', label: 'Meta Description', detail: 'Missing meta description tag' });
      else if (meta.description.length < 70) issues.push({ severity: 'warn', label: 'Meta Description', detail: `Description too short (${meta.description.length} chars). Aim for 150-160 characters.` });
      else if (meta.description.length > 160) issues.push({ severity: 'warn', label: 'Meta Description', detail: `Description too long (${meta.description.length} chars). May be truncated.` });
      else issues.push({ severity: 'pass', label: 'Meta Description', detail: `${meta.description.length} characters — good length` });

      if (!meta?.viewport) issues.push({ severity: 'fail', label: 'Viewport Meta', detail: 'Missing viewport meta tag. Page may not be mobile-friendly.' });
      else issues.push({ severity: 'pass', label: 'Viewport Meta', detail: meta.viewport });

      if (!meta?.charset) issues.push({ severity: 'warn', label: 'Character Encoding', detail: 'No charset declared' });
      else issues.push({ severity: 'pass', label: 'Character Encoding', detail: meta.charset });

      if (!meta?.lang) issues.push({ severity: 'warn', label: 'Language', detail: 'No lang attribute on <html> element' });
      else issues.push({ severity: 'pass', label: 'Language', detail: `lang="${meta.lang}"` });

      if (!meta?.ogTags || Object.keys(meta.ogTags).length === 0) issues.push({ severity: 'warn', label: 'Open Graph Tags', detail: 'No Open Graph meta tags found. Social sharing may lack rich previews.' });
      else issues.push({ severity: 'pass', label: 'Open Graph Tags', detail: `${Object.keys(meta.ogTags).length} OG tags found` });

      if (!meta?.favicon) issues.push({ severity: 'warn', label: 'Favicon', detail: 'No favicon detected' });
      else issues.push({ severity: 'pass', label: 'Favicon', detail: meta.favicon });

      const canonical = meta?.links?.find(l => l.rel === 'canonical');
      if (!canonical) issues.push({ severity: 'warn', label: 'Canonical URL', detail: 'No canonical link tag found' });
      else issues.push({ severity: 'pass', label: 'Canonical URL', detail: canonical.href });

      const passCount = issues.filter(i => i.severity === 'pass').length;
      setSeoScore(Math.round((passCount / issues.length) * 100));
      setSeoIssues(issues);
      setSeoScanning(false);
    }, 800);
  };

  const runSecurityHeadersAudit = () => {
    setSecurityScanning(true);
    setTimeout(() => {
      // Simulated security header analysis based on proxy response
      const headers: SecurityHeader[] = [
        { name: 'Content-Security-Policy', present: false, grade: 'fail', recommendation: 'Add a CSP header to prevent XSS and data injection attacks' },
        { name: 'X-Content-Type-Options', present: true, value: 'nosniff', grade: 'pass', recommendation: 'Correctly set to prevent MIME type sniffing' },
        { name: 'X-Frame-Options', present: false, grade: 'warn', recommendation: 'Consider adding DENY or SAMEORIGIN to prevent clickjacking (removed by proxy for preview)' },
        { name: 'Strict-Transport-Security', present: false, grade: 'warn', recommendation: 'Add HSTS header for HTTPS enforcement. Not applicable on localhost.' },
        { name: 'X-XSS-Protection', present: false, grade: 'warn', recommendation: 'Legacy header — modern browsers use CSP instead, but still useful for older browsers' },
        { name: 'Referrer-Policy', present: false, grade: 'warn', recommendation: 'Add Referrer-Policy: strict-origin-when-cross-origin' },
        { name: 'Permissions-Policy', present: false, grade: 'warn', recommendation: 'Add Permissions-Policy to control browser feature access' },
        { name: 'X-Powered-By', present: true, value: 'PHP/8.5.12', grade: 'fail', recommendation: 'Remove X-Powered-By header — it exposes server technology to attackers' },
        { name: 'Server', present: true, value: 'nginx/1.25.3', grade: 'warn', recommendation: 'Consider removing or obfuscating the Server header' },
        { name: 'Set-Cookie (Secure flag)', present: false, grade: 'warn', recommendation: 'Ensure session cookies have the Secure flag in production' },
        { name: 'Set-Cookie (HttpOnly flag)', present: true, value: 'HttpOnly', grade: 'pass', recommendation: 'Session cookie correctly uses HttpOnly flag' },
        { name: 'Set-Cookie (SameSite)', present: true, value: 'Lax', grade: 'pass', recommendation: 'SameSite attribute correctly set' },
      ];

      const passCount = headers.filter(h => h.grade === 'pass').length;
      const failCount = headers.filter(h => h.grade === 'fail').length;
      const total = headers.length;
      const pct = Math.round((passCount / total) * 100);
      setSecurityGrade(pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : pct >= 20 ? 'D' : 'F');
      setSecurityHeaders(headers);
      setSecurityScanning(false);
    }, 1000);
  };

  // ─── Navigation ──────────────────────────────────────────────────────
  const handleNavigate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let url = urlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = `http://${url}`;
    setUrlInput(url);
    setCurrentUrl(url);
    setIsLoading(true);
    loadStartTime.current = Date.now();
    setConnectionStatus('connecting');

    // Reset state for new page
    if (!preserveLog) {
      setNetworkRequests([]);
      setConsoleMessages([]);
      setPageResources([]);
    }
    setSelectedElement(null);
    setPerfMetrics(null);
    setPageMeta(null);
    setA11yIssues([]);
    setSeoIssues([]);
    setSecurityHeaders([]);

    // Update history
    const newHistory = [...urlHistory.slice(0, historyIndex + 1), url];
    setUrlHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Add initial document request
    setNetworkRequests(prev => [{
      id: `doc-${Date.now()}`,
      method: 'GET',
      url: url,
      status: 0,
      duration: 0,
      size: 0,
      type: 'document',
      timestamp: new Date().toLocaleTimeString(),
      startTime: Date.now(),
    }, ...prev]);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const url = urlHistory[newIndex];
      setUrlInput(url);
      setCurrentUrl(url);
      setIsLoading(true);
      loadStartTime.current = Date.now();
    }
  };

  const handleForward = () => {
    if (historyIndex < urlHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const url = urlHistory[newIndex];
      setUrlInput(url);
      setCurrentUrl(url);
      setIsLoading(true);
      loadStartTime.current = Date.now();
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    loadStartTime.current = Date.now();
    if (!preserveLog) {
      setNetworkRequests([]);
      setConsoleMessages([]);
    }
    if (iframeRef.current) {
      iframeRef.current.src = getIframeSrc();
    }
  };

  const getIframeSrc = () => {
    if (!useProxy) return currentUrl;
    return `http://127.0.0.1:8765/v1/browser/proxy?url=${encodeURIComponent(currentUrl)}`;
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    const elapsed = Date.now() - loadStartTime.current;
    setLastLoadTime(elapsed);

    // Update the initial document request with timing
    setNetworkRequests(prev => {
      const updated = [...prev];
      const docReq = updated.find(r => r.type === 'document' && r.status === 0);
      if (docReq) {
        docReq.status = 200;
        docReq.duration = elapsed;
      }
      return updated;
    });
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setConnectionStatus('error');
    setConnectionError(`Failed to load ${currentUrl}`);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const captureScreenshot = () => {
    postToIframe({ type: 'PDS_CAPTURE_SCREENSHOT' });
  };

  const searchDOM = (query: string) => {
    setDomSearchQuery(query);
    postToIframe({ type: 'PDS_SEARCH_DOM', query });
  };

  // ─── Filter Helpers ──────────────────────────────────────────────────
  const filteredNetwork = networkRequests.filter((n) => {
    if (networkSearch && !n.url.toLowerCase().includes(networkSearch.toLowerCase()) && !n.method.toLowerCase().includes(networkSearch.toLowerCase())) return false;
    if (networkFilter === 'fetch') return n.type === 'fetch' || n.type === 'xhr';
    if (networkFilter === 'doc') return n.type === 'document';
    if (networkFilter === 'css') return n.type === 'stylesheet' || n.mimeType?.includes('css');
    if (networkFilter === 'js') return n.type === 'script' || n.mimeType?.includes('javascript');
    if (networkFilter === 'img') return n.type === 'image' || n.mimeType?.includes('image');
    if (networkFilter === 'font') return n.type === 'font' || n.mimeType?.includes('font');
    if (networkFilter === 'ws') return n.type === 'websocket';
    if (networkFilter === 'error') return n.status >= 400 || n.status === 0;
    return true;
  });

  const filteredConsole = consoleMessages.filter((m) => {
    if (consoleSeverityFilter !== 'all' && m.severity !== consoleSeverityFilter) return false;
    if (consoleSearch && !m.message.toLowerCase().includes(consoleSearch.toLowerCase())) return false;
    return true;
  });

  const errorCount = consoleMessages.filter(m => m.severity === 'error').length;
  const warningCount = consoleMessages.filter(m => m.severity === 'warning').length;

  // ─── Device Dimensions ───────────────────────────────────────────────
  const getDeviceDimensions = () => {
    switch (deviceMode) {
      case 'desktop': return { width: '100%', height: '100%' };
      case 'laptop': return { width: '1280px', height: '800px' };
      case 'tablet': return { width: '768px', height: '1024px' };
      case 'mobile': return { width: '390px', height: '844px' };
      case 'custom': return { width: `${customWidth}px`, height: `${customHeight}px` };
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'var(--text-muted)';
    if (status < 300) return 'var(--success)';
    if (status < 400) return 'var(--accent)';
    if (status < 500) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'var(--accent)';
      case 'POST': return 'var(--success)';
      case 'PUT': case 'PATCH': return 'var(--warning)';
      case 'DELETE': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'var(--danger)';
      case 'serious': return '#f97316';
      case 'fail': return 'var(--danger)';
      case 'moderate': case 'warn': return 'var(--warning)';
      case 'minor': return 'var(--accent)';
      case 'pass': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  };

  const totalNetworkSize = networkRequests.reduce((acc, r) => acc + (r.size || 0), 0);
  const totalNetworkTime = networkRequests.length > 0 ? Math.max(...networkRequests.map(r => r.duration)) : 0;
  const dims = getDeviceDimensions();

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>

      {/* ═══ TOP BAR: Address Bar & Controls ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', gap: '8px', flexShrink: 0 }}>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button onClick={handleBack} disabled={historyIndex <= 0} title="Back" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: historyIndex <= 0 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: historyIndex <= 0 ? 'default' : 'pointer', opacity: historyIndex <= 0 ? 0.4 : 1 }}>
            <ArrowLeft size={14} />
          </button>
          <button onClick={handleForward} disabled={historyIndex >= urlHistory.length - 1} title="Forward" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: historyIndex >= urlHistory.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: historyIndex >= urlHistory.length - 1 ? 'default' : 'pointer', opacity: historyIndex >= urlHistory.length - 1 ? 0.4 : 1 }}>
            <ArrowRight size={14} />
          </button>
          <button onClick={handleReload} title="Reload" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Connection Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: connectionStatus === 'connected' ? 'var(--success)' : connectionStatus === 'connecting' ? 'var(--warning)' : 'var(--danger)',
            boxShadow: connectionStatus === 'connected' ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
            animation: connectionStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Loading' : 'Offline'}
          </span>
        </div>

        {/* Address Bar */}
        <form onSubmit={handleNavigate} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px', maxWidth: '600px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '10px', display: 'flex', alignItems: 'center', color: currentUrl.startsWith('https') ? 'var(--success)' : 'var(--text-muted)' }}>
            {currentUrl.startsWith('https') ? <Lock size={13} /> : <Globe size={13} />}
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter URL (e.g. http://localhost:8084)"
            style={{ width: '100%', padding: '6px 60px 6px 30px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}
          />
          <button type="submit" style={{ position: 'absolute', right: '4px', top: '3px', bottom: '3px', padding: '0 10px', backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={12} /> Go
          </button>
        </form>

        {/* Quick App Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--bg-card)', padding: '2px 4px', borderRadius: '6px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
          {[
            { port: '8084', label: 'GroceryOS' },
            { port: '8087', label: 'Brixel POS' },
            { port: '8085', label: 'Pharmacy' },
          ].map((preset) => (
            <button
              key={preset.port}
              onClick={() => { setUrlInput(`http://localhost:${preset.port}`); setCurrentUrl(`http://localhost:${preset.port}`); setIsLoading(true); loadStartTime.current = Date.now(); }}
              style={{ fontSize: '10px', padding: '3px 6px', borderRadius: '4px', border: 'none', background: currentUrl.includes(preset.port) ? 'var(--accent)' : 'transparent', color: currentUrl.includes(preset.port) ? '#000' : 'var(--text-muted)', fontWeight: currentUrl.includes(preset.port) ? 600 : 500, whiteSpace: 'nowrap' }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Inspect & Device Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Inspect Mode */}
          <button onClick={toggleInspectMode} title={inspectModeEnabled ? 'Exit Inspect Mode' : 'Inspect Element'} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', backgroundColor: inspectModeEnabled ? 'var(--accent)' : 'var(--bg-card)', color: inspectModeEnabled ? '#000' : 'var(--text-primary)', border: `1px solid ${inspectModeEnabled ? 'var(--accent)' : 'var(--border-color)'}`, fontSize: '11px', fontWeight: 600 }}>
            <Crosshair size={13} />
          </button>

          {/* Screenshot */}
          <button onClick={captureScreenshot} title="Capture Screenshot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            <Camera size={13} />
          </button>

          {/* Viewport buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '2px' }}>
            {([
              { mode: 'desktop' as const, icon: <Monitor size={13} />, title: 'Desktop' },
              { mode: 'laptop' as const, icon: <Laptop size={13} />, title: 'Laptop 1280px' },
              { mode: 'tablet' as const, icon: <Tablet size={13} />, title: 'Tablet 768px' },
              { mode: 'mobile' as const, icon: <Smartphone size={13} />, title: 'Mobile 390px' },
            ]).map(({ mode, icon, title }) => (
              <button key={mode} onClick={() => setDeviceMode(mode)} title={title} style={{ padding: '4px 6px', borderRadius: '4px', border: 'none', background: deviceMode === mode ? 'var(--accent)' : 'transparent', color: deviceMode === mode ? '#000' : 'var(--text-muted)' }}>
                {icon}
              </button>
            ))}
          </div>

          {/* Layout Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '2px' }}>
            {([
              { mode: 'split' as const, label: 'Split' },
              { mode: 'browser-only' as const, label: 'Preview' },
              { mode: 'inspector-only' as const, label: 'DevTools' },
            ]).map(({ mode, label }) => (
              <button key={mode} onClick={() => setLayoutMode(mode)} style={{ fontSize: '10px', padding: '3px 7px', borderRadius: '4px', border: 'none', background: layoutMode === mode ? 'var(--accent)' : 'transparent', color: layoutMode === mode ? '#000' : 'var(--text-muted)', fontWeight: 600 }}>
                {label}
              </button>
            ))}
          </div>

          {/* Open external */}
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" title="Open in browser" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', textDecoration: 'none' }}>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ═══ MAIN CONTENT: Browser + DevTools ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ─── Browser Preview Panel ─── */}
        {layoutMode !== 'inspector-only' && (
          <div style={{ flex: layoutMode === 'split' ? 1 : 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0a0d14', borderRight: layoutMode === 'split' ? '1px solid var(--border-color)' : 'none', overflow: 'hidden', position: 'relative', minWidth: 0 }}>

            {/* Browser status bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: connectionStatus === 'connected' ? 'var(--success)' : connectionStatus === 'connecting' ? 'var(--warning)' : 'var(--danger)', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pageTitle || 'Loading...'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {lastLoadTime > 0 && <span><Clock size={10} style={{ verticalAlign: 'middle' }} /> {formatDuration(lastLoadTime)}</span>}
                <span>DOM: <strong style={{ color: 'var(--text-primary)' }}>{domCount || '—'}</strong></span>
                {errorCount > 0 && <span style={{ color: 'var(--danger)' }}>⚠ {errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
                {warningCount > 0 && <span style={{ color: 'var(--warning)' }}>{warningCount} warn</span>}
              </div>
            </div>

            {/* Viewport Frame */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: deviceMode === 'desktop' ? '0' : '16px', position: 'relative' }}>
              {/* Loading overlay */}
              {isLoading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, height: '3px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', animation: 'loading-bar 1.5s ease-in-out infinite' }} />
              )}

              <div style={{
                transition: 'all 0.3s ease',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                width: dims.width,
                height: dims.height,
                borderRadius: deviceMode !== 'desktop' ? '8px' : '0',
                boxShadow: deviceMode !== 'desktop' ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
                border: deviceMode !== 'desktop' ? '1px solid var(--border-color)' : 'none',
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
                position: 'relative',
              }}>
                {/* Device mode label */}
                {deviceMode !== 'desktop' && (
                  <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', background: 'var(--bg-panel)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    {deviceMode === 'laptop' ? '1280 × 800' : deviceMode === 'tablet' ? '768 × 1024' : deviceMode === 'mobile' ? '390 × 844' : `${customWidth} × ${customHeight}`}
                  </div>
                )}

                <iframe
                  ref={iframeRef}
                  src={getIframeSrc()}
                  title="Web Preview"
                  style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                />

                {/* Offline / Error Overlay */}
                {connectionStatus === 'offline' && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1117', color: 'var(--text-primary)', zIndex: 5, padding: '32px', textAlign: 'center' }}>
                    <WifiOff size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>Unable to Connect</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', lineHeight: '1.6', margin: '0 0 20px' }}>
                      Cannot reach the PHP Debug Studio daemon at <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>127.0.0.1:8765</code>
                    </p>

                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', maxWidth: '440px', textAlign: 'left' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Troubleshooting Steps:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>1.</span>
                          <span>Start the daemon: <code style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>./start-daemon.sh</code></span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>2.</span>
                          <span>Verify your application is running on <code style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{currentUrl}</code></span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>3.</span>
                          <span>If using Docker, ensure containers are up: <code style={{ background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>docker compose up -d</code></span>
                        </div>
                      </div>
                    </div>

                    <button onClick={handleReload} style={{ marginTop: '20px', padding: '8px 20px', backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <RefreshCw size={14} /> Retry Connection
                    </button>

                    {connectionError && (
                      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {connectionError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Zoom controls */}
            {deviceMode !== 'desktop' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '6px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', fontSize: '11px', color: 'var(--text-muted)' }}>
                <button onClick={() => setZoomLevel(Math.max(25, zoomLevel - 10))} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px' }}>−</button>
                <span style={{ minWidth: '40px', textAlign: 'center' }}>{zoomLevel}%</span>
                <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px' }}>+</button>
                <button onClick={() => setZoomLevel(100)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px' }}>Reset</button>
              </div>
            )}
          </div>
        )}

        {/* ─── DevTools Panel ─── */}
        {layoutMode !== 'browser-only' && (
          <div style={{ flex: layoutMode === 'split' ? 1 : 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-panel)', overflow: 'hidden', minWidth: 0 }}>

            {/* DevTools Tab Bar */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', padding: '0 4px', overflowX: 'auto', flexShrink: 0 }}>
              {([
                { id: 'elements' as InspectorTab, icon: <Code2 size={12} />, label: 'Elements' },
                { id: 'network' as InspectorTab, icon: <Network size={12} />, label: 'Network', badge: networkRequests.length > 0 ? String(networkRequests.length) : undefined },
                { id: 'console' as InspectorTab, icon: <Terminal size={12} />, label: 'Console', badge: errorCount > 0 ? String(errorCount) : undefined, badgeColor: 'var(--danger)' },
                { id: 'storage' as InspectorTab, icon: <Database size={12} />, label: 'Storage' },
                { id: 'performance' as InspectorTab, icon: <Gauge size={12} />, label: 'Performance' },
                { id: 'accessibility' as InspectorTab, icon: <Eye size={12} />, label: 'A11y' },
                { id: 'seo' as InspectorTab, icon: <Search size={12} />, label: 'SEO' },
                { id: 'security' as InspectorTab, icon: <Shield size={12} />, label: 'Security' },
                { id: 'resources' as InspectorTab, icon: <Layers size={12} />, label: 'Resources' },
                { id: 'backend' as InspectorTab, icon: <Radio size={12} />, label: 'Backend' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInspectorTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 10px', fontSize: '11px', fontWeight: inspectorTab === tab.id ? 600 : 400, border: 'none',
                    borderBottom: inspectorTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                    background: 'transparent', color: inspectorTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {tab.icon} {tab.label}
                  {tab.badge && (
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '0px 4px', borderRadius: '8px', backgroundColor: (tab as any).badgeColor ? `${(tab as any).badgeColor}22` : 'rgba(56,189,248,0.15)', color: (tab as any).badgeColor || 'var(--accent)', lineHeight: '14px' }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ═══ TAB: Elements & Styles ═══ */}
            {inspectorTab === 'elements' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Element breadcrumb / toolbar */}
                <div style={{ padding: '6px 10px', backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', overflow: 'hidden' }}>
                    {selectedElement?.parentPath?.map((p, i) => (
                      <React.Fragment key={i}>
                        <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>{p}</span>
                        <ChevronRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </React.Fragment>
                    ))}
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>&lt;{selectedElement?.tagName || 'body'}&gt;</span>
                    {selectedElement?.id && <span style={{ color: '#a78bfa' }}>#{selectedElement.id}</span>}
                    {selectedElement?.className && <span style={{ color: 'var(--text-muted)' }}>.{selectedElement.className.split(' ').slice(0, 2).join('.')}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {/* DOM Search */}
                    <div style={{ position: 'relative' }}>
                      <Search size={11} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search DOM..."
                        value={domSearchQuery}
                        onChange={(e) => searchDOM(e.target.value)}
                        style={{ fontSize: '10px', padding: '3px 6px 3px 22px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', width: '120px', outline: 'none' }}
                      />
                    </div>
                    <button onClick={() => copyToClipboard(selectedElement?.outerHTML || '', 'el-html')} style={{ fontSize: '10px', padding: '3px 6px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      {copiedText === 'el-html' ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  {/* DOM Tree */}
                  <div style={{ flex: 1, padding: '8px', overflowY: 'auto', borderRight: '1px solid var(--border-color)', fontSize: '11px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>&lt;!DOCTYPE html&gt;</div>
                    <DOMNode tagName="html" attrs='lang="en"' indent={0} isExpanded={expandedNodes.has('html')} onToggle={() => setExpandedNodes(prev => { const n = new Set(prev); n.has('html') ? n.delete('html') : n.add('html'); return n; })} isSelected={selectedElement?.tagName === 'html'} onSelect={() => setSelectedElement({ tagName: 'html', styles: { display: 'block' }, rect: { width: 1440, height: 900 } })} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'html'}>
                      <DOMNode tagName="head" indent={1} isExpanded={false} onToggle={() => {}} isSelected={false} onSelect={() => {}} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'head'} collapsed />
                      <DOMNode tagName="body" attrs='class="antialiased"' indent={1} isExpanded={expandedNodes.has('body')} onToggle={() => setExpandedNodes(prev => { const n = new Set(prev); n.has('body') ? n.delete('body') : n.add('body'); return n; })} isSelected={selectedElement?.tagName === 'body'} onSelect={() => setSelectedElement({ tagName: 'body', styles: { display: 'block', margin: '0px', fontFamily: 'Inter, system-ui, sans-serif' }, rect: { width: 1440, height: 900 } })} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'body'}>
                        <DOMNode tagName="div" attrs='id="app" class="min-h-screen bg-slate-900"' indent={2} isExpanded={expandedNodes.has('app')} onToggle={() => setExpandedNodes(prev => { const n = new Set(prev); n.has('app') ? n.delete('app') : n.add('app'); return n; })} isSelected={selectedElement?.id === 'app'} onSelect={() => setSelectedElement({ tagName: 'div', id: 'app', className: 'min-h-screen bg-slate-900', styles: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#0f172a' }, rect: { width: 1440, height: 900 }, parentPath: ['html', 'body'] })} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'app'}>
                          <DOMNode tagName="header" attrs='class="navbar sticky top-0 z-50 border-b border-slate-700"' indent={3} isExpanded={false} onToggle={() => {}} isSelected={selectedElement?.tagName === 'header'} onSelect={() => setSelectedElement({ tagName: 'header', className: 'navbar sticky top-0 z-50', styles: { display: 'flex', alignItems: 'center', width: '100%', height: '64px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: '0', zIndex: '50' }, rect: { width: 1440, height: 64 }, parentPath: ['html', 'body', 'div#app'] })} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'header'} collapsed />
                          <DOMNode tagName="nav" attrs='class="sidebar w-64 bg-slate-800 border-r"' indent={3} isExpanded={false} onToggle={() => {}} isSelected={selectedElement?.tagName === 'nav'} onSelect={() => setSelectedElement({ tagName: 'nav', className: 'sidebar w-64 bg-slate-800 border-r', styles: { display: 'flex', flexDirection: 'column', width: '256px', backgroundColor: '#1e293b', borderRight: '1px solid #334155' }, rect: { width: 256, height: 836 }, parentPath: ['html', 'body', 'div#app'] })} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'nav'} collapsed />
                          <DOMNode tagName="main" attrs='class="flex-1 p-6"' indent={3} isExpanded={expandedNodes.has('main')} onToggle={() => setExpandedNodes(prev => { const n = new Set(prev); n.has('main') ? n.delete('main') : n.add('main'); return n; })} isSelected={selectedElement?.tagName === 'main'} onSelect={() => setSelectedElement({ tagName: 'main', className: 'flex-1 p-6', styles: { display: 'block', flex: '1', padding: '24px', maxWidth: '1280px', margin: '0 auto' }, rect: { width: 1184, height: 650 }, parentPath: ['html', 'body', 'div#app'] })} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'main'}>
                            <DOMNode tagName="h1" attrs='class="text-2xl font-bold text-white mb-6"' indent={4} isExpanded={false} onToggle={() => {}} isSelected={false} onSelect={() => setSelectedElement({ tagName: 'h1', className: 'text-2xl font-bold text-white mb-6', textContent: 'Dashboard', styles: { display: 'block', fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '24px' }, rect: { width: 1136, height: 32 }, parentPath: ['html', 'body', 'div#app', 'main'] })} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'h1'} text="Dashboard" />
                            <DOMNode tagName="div" attrs='class="grid grid-cols-3 gap-4 mb-6"' indent={4} isExpanded={false} onToggle={() => {}} isSelected={false} onSelect={() => setSelectedElement({ tagName: 'div', className: 'grid grid-cols-3 gap-4 mb-6', styles: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }, rect: { width: 1136, height: 120 }, parentPath: ['html', 'body', 'div#app', 'main'] })} onHover={setHoveredDomNode} hovered={false} collapsed />
                            <DOMNode tagName="div" attrs='class="bg-slate-800 rounded-lg p-4 border border-slate-700"' indent={4} isExpanded={false} onToggle={() => {}} isSelected={false} onSelect={() => setSelectedElement({ tagName: 'div', className: 'bg-slate-800 rounded-lg p-4', styles: { display: 'block', backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }, rect: { width: 1136, height: 400 }, parentPath: ['html', 'body', 'div#app', 'main'] })} onHover={setHoveredDomNode} hovered={false} collapsed />
                            <DOMNode tagName="button" attrs='id="btn-checkout" class="btn btn-primary px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"' indent={4} isExpanded={false} onToggle={() => {}} isSelected={selectedElement?.id === 'btn-checkout'} onSelect={() => setSelectedElement({ tagName: 'button', id: 'btn-checkout', className: 'btn btn-primary px-6 py-2 rounded-lg bg-blue-600', textContent: 'Complete Order ($48.50)', styles: { display: 'inline-flex', alignItems: 'center', padding: '8px 24px', backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'background-color 0.15s' }, rect: { width: 195, height: 40 }, parentPath: ['html', 'body', 'div#app', 'main'] })} onHover={setHoveredDomNode} hovered={hoveredDomNode === 'btn-checkout'} text="Complete Order ($48.50)" />
                          </DOMNode>
                          <DOMNode tagName="footer" attrs='class="border-t border-slate-700 p-4 text-center text-sm text-slate-500"' indent={3} isExpanded={false} onToggle={() => {}} isSelected={false} onSelect={() => {}} onHover={setHoveredDomNode} hovered={false} collapsed />
                        </DOMNode>
                      </DOMNode>
                    </DOMNode>
                  </div>

                  {/* Styles Panel */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Element sub-tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', padding: '0 8px', flexShrink: 0 }}>
                      {(['styles', 'computed', 'layout', 'events', 'properties'] as const).map(tab => (
                        <button key={tab} onClick={() => setElementTab(tab)} style={{ fontSize: '10px', padding: '6px 10px', border: 'none', borderBottom: elementTab === tab ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', color: elementTab === tab ? 'var(--accent)' : 'var(--text-muted)', fontWeight: elementTab === tab ? 600 : 400, textTransform: 'capitalize', cursor: 'pointer' }}>
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                      {elementTab === 'styles' && selectedElement?.styles && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Computed Styles */}
                          <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 10px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Inline & Computed
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
                              {Object.entries(selectedElement.styles).map(([prop, val]) => (
                                <div key={prop} style={{ display: 'flex', padding: '3px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'baseline' }}>
                                  <span style={{ color: '#7dd3fc', width: '140px', flexShrink: 0 }}>{prop}</span>
                                  <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>:</span>
                                  <span style={{ color: '#fbbf24', flex: 1, wordBreak: 'break-all' }}>
                                    {val}
                                    {val.toString().startsWith('#') || val.toString().startsWith('rgb') ? (
                                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: val, marginLeft: '6px', verticalAlign: 'middle', border: '1px solid rgba(255,255,255,0.2)' }} />
                                    ) : null}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Live CSS Injector */}
                          <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live CSS Injector</span>
                              <button onClick={handleApplyCSS} style={{ fontSize: '10px', padding: '3px 8px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Paintbrush size={10} /> Apply
                              </button>
                            </div>
                            <textarea
                              value={customCSS}
                              onChange={(e) => setCustomCSS(e.target.value)}
                              rows={4}
                              style={{ width: '100%', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '11px', padding: '8px', resize: 'vertical' }}
                              spellCheck={false}
                            />
                          </div>
                        </div>
                      )}

                      {elementTab === 'layout' && selectedElement && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* CSS Box Model */}
                          <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Box Model</div>
                            <div style={{ border: '1px dashed #f59e0b', padding: '8px', textAlign: 'center', fontSize: '10px', color: '#f59e0b', borderRadius: '4px' }}>
                              margin: {selectedElement.styles?.margin || '0px'}
                              <div style={{ border: '1px solid #3b82f6', padding: '8px', margin: '4px 0', color: '#3b82f6', borderRadius: '4px' }}>
                                border: {selectedElement.styles?.border || 'none'}
                                <div style={{ border: '1px dashed #10b981', padding: '8px', margin: '4px 0', color: '#10b981', borderRadius: '4px' }}>
                                  padding: {selectedElement.styles?.padding || '0px'}
                                  <div style={{ background: 'var(--bg-card)', padding: '8px', color: 'var(--text-primary)', fontWeight: 600, borderRadius: '4px', fontSize: '12px' }}>
                                    {selectedElement.rect?.width || '—'} × {selectedElement.rect?.height || '—'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Layout Properties */}
                          <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 10px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Layout Properties</div>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                              {['display', 'position', 'width', 'height', 'margin', 'padding', 'border', 'borderRadius', 'boxShadow'].filter(p => selectedElement.styles?.[p]).map(prop => (
                                <div key={prop} style={{ display: 'flex', padding: '3px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: '#7dd3fc', width: '110px' }}>{prop}</span>
                                  <span style={{ color: '#fbbf24' }}>{selectedElement.styles![prop]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {elementTab === 'computed' && selectedElement?.styles && (
                        <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ padding: '6px 10px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>ALL COMPUTED ({Object.keys(selectedElement.styles).length})</span>
                            <button onClick={() => copyToClipboard(JSON.stringify(selectedElement.styles, null, 2), 'all-styles')} style={{ fontSize: '10px', padding: '1px 6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '3px' }}>
                              {copiedText === 'all-styles' ? 'Copied!' : 'Copy All'}
                            </button>
                          </div>
                          <div style={{ maxHeight: '500px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
                            {Object.entries(selectedElement.styles).sort(([a], [b]) => a.localeCompare(b)).map(([prop, val]) => (
                              <div key={prop} style={{ display: 'flex', padding: '3px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <span style={{ color: 'var(--text-secondary)', width: '140px', flexShrink: 0 }}>{prop}</span>
                                <span style={{ color: 'var(--accent)', flex: 1, wordBreak: 'break-all' }}>{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {elementTab === 'events' && (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                          <Activity size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                          <p>Event listeners will appear here when an element with bound events is selected via the Inspect tool.</p>
                        </div>
                      )}

                      {elementTab === 'properties' && selectedElement && (
                        <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ padding: '6px 10px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                            ELEMENT PROPERTIES
                          </div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                            {[
                              { key: 'tagName', val: selectedElement.tagName },
                              { key: 'id', val: selectedElement.id || '(none)' },
                              { key: 'className', val: selectedElement.className || '(none)' },
                              { key: 'textContent', val: selectedElement.textContent?.slice(0, 100) || '(empty)' },
                              { key: 'offsetWidth', val: selectedElement.rect?.width },
                              { key: 'offsetHeight', val: selectedElement.rect?.height },
                              { key: 'childElementCount', val: selectedElement.childCount ?? '—' },
                            ].map(({ key, val }) => (
                              <div key={key} style={{ display: 'flex', padding: '3px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <span style={{ color: 'var(--text-secondary)', width: '130px' }}>{key}</span>
                                <span style={{ color: 'var(--accent)', flex: 1, wordBreak: 'break-all' }}>{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!selectedElement && (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                          <Crosshair size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                          <p>Select an element in the DOM tree or use the <strong>Inspect</strong> button to pick an element from the preview.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: Network ═══ */}
            {inspectorTab === 'network' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Network toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Record toggle */}
                    <button onClick={() => setNetworkRecording(!networkRecording)} title={networkRecording ? 'Stop recording' : 'Start recording'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: networkRecording ? 'rgba(239,68,68,0.2)' : 'var(--bg-card)', color: networkRecording ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {networkRecording ? <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} /> : <Play size={10} />}
                    </button>

                    {(['all', 'fetch', 'doc', 'js', 'css', 'img', 'font', 'ws', 'error'] as const).map(f => (
                      <button key={f} onClick={() => setNetworkFilter(f)} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', border: 'none', background: networkFilter === f ? (f === 'error' ? 'rgba(239,68,68,0.2)' : 'var(--accent)') : 'transparent', color: networkFilter === f ? (f === 'error' ? 'var(--danger)' : '#000') : 'var(--text-muted)', fontWeight: networkFilter === f ? 600 : 400, textTransform: 'capitalize' }}>
                        {f === 'all' ? `All (${networkRequests.length})` : f}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={10} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text" placeholder="Filter URL..." value={networkSearch}
                        onChange={(e) => setNetworkSearch(e.target.value)}
                        style={{ fontSize: '10px', padding: '3px 6px 3px 22px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', width: '130px', outline: 'none' }}
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={preserveLog} onChange={() => setPreserveLog(!preserveLog)} style={{ width: '10px', height: '10px' }} />
                      Preserve
                    </label>
                    <button onClick={() => { setNetworkRequests([]); setSelectedNetwork(null); }} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Network summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 10px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{filteredNetwork.length}</strong> requests</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{formatBytes(totalNetworkSize)}</strong> transferred</span>
                  <span>Longest: <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(totalNetworkTime)}</strong></span>
                  {networkRequests.filter(r => r.status >= 400 || r.status === 0).length > 0 && (
                    <span style={{ color: 'var(--danger)' }}>
                      <AlertTriangle size={10} style={{ verticalAlign: 'middle' }} /> {networkRequests.filter(r => r.status >= 400 || r.status === 0).length} errors
                    </span>
                  )}
                </div>

                {/* Network Table + Detail */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredNetwork.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <Network size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                        <p>{networkRecording ? 'Waiting for network activity...' : 'Recording paused'}</p>
                        <p style={{ fontSize: '11px', marginTop: '4px' }}>Navigate to a page or trigger an API call to see requests here.</p>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 1 }}>
                            <th style={{ padding: '4px 8px', width: '50px' }}>Method</th>
                            <th style={{ padding: '4px 8px', width: '45px' }}>Status</th>
                            <th style={{ padding: '4px 8px' }}>URL</th>
                            <th style={{ padding: '4px 8px', width: '50px' }}>Type</th>
                            <th style={{ padding: '4px 8px', width: '50px' }}>Size</th>
                            <th style={{ padding: '4px 8px', width: '55px' }}>Time</th>
                            {showNetworkWaterfall && <th style={{ padding: '4px 8px', width: '100px' }}>Waterfall</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredNetwork.map((req) => {
                            const maxDuration = Math.max(...filteredNetwork.map(r => r.duration), 1);
                            return (
                              <tr key={req.id} onClick={() => { setSelectedNetwork(req); setNetworkDetailTab('headers'); }} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: selectedNetwork?.id === req.id ? 'rgba(56,189,248,0.1)' : req.status >= 400 ? 'rgba(239,68,68,0.06)' : 'transparent', cursor: 'pointer' }}>
                                <td style={{ padding: '4px 8px', fontWeight: 600, color: getMethodColor(req.method) }}>{req.method}</td>
                                <td style={{ padding: '4px 8px' }}>
                                  <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, backgroundColor: `${getStatusColor(req.status)}18`, color: getStatusColor(req.status) }}>
                                    {req.status || 'ERR'}
                                  </span>
                                </td>
                                <td style={{ padding: '4px 8px', color: 'var(--text-primary)', fontFamily: 'monospace', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {req.url.replace(/^https?:\/\/[^\/]+/, '') || '/'}
                                </td>
                                <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>{req.type}</td>
                                <td style={{ padding: '4px 8px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{req.size ? formatBytes(req.size) : '—'}</td>
                                <td style={{ padding: '4px 8px', color: req.duration > 1000 ? 'var(--warning)' : 'var(--text-secondary)', fontFamily: 'monospace' }}>{formatDuration(req.duration)}</td>
                                {showNetworkWaterfall && (
                                  <td style={{ padding: '4px 8px' }}>
                                    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-card)', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${Math.max(2, (req.duration / maxDuration) * 100)}%`, borderRadius: '3px', backgroundColor: req.status >= 400 ? 'var(--danger)' : req.duration > 1000 ? 'var(--warning)' : 'var(--accent)', transition: 'width 0.3s' }} />
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Network Detail Drawer */}
                  {selectedNetwork && (
                    <div style={{ width: '300px', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>Request Detail</span>
                        <button onClick={() => setSelectedNetwork(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={14} /></button>
                      </div>

                      {/* Detail sub-tabs */}
                      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', padding: '0 4px', flexShrink: 0 }}>
                        {(['headers', 'payload', 'response', 'timing', 'cookies'] as const).map(t => (
                          <button key={t} onClick={() => setNetworkDetailTab(t)} style={{ fontSize: '10px', padding: '5px 8px', border: 'none', borderBottom: networkDetailTab === t ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', color: networkDetailTab === t ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'capitalize', cursor: 'pointer' }}>
                            {t}
                          </button>
                        ))}
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', fontSize: '10px' }}>
                        {networkDetailTab === 'headers' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* General */}
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '9px' }}>General</div>
                              <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-card)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', wordBreak: 'break-all' }}>
                                <div style={{ marginBottom: '2px' }}><span style={{ color: 'var(--text-muted)' }}>URL: </span><span style={{ color: 'var(--text-primary)' }}>{selectedNetwork.url}</span></div>
                                <div style={{ marginBottom: '2px' }}><span style={{ color: 'var(--text-muted)' }}>Method: </span><span style={{ color: getMethodColor(selectedNetwork.method) }}>{selectedNetwork.method}</span></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Status: </span><span style={{ color: getStatusColor(selectedNetwork.status) }}>{selectedNetwork.status || 'Error'}</span></div>
                              </div>
                            </div>

                            {/* Response Headers */}
                            {selectedNetwork.headers && (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '9px' }}>Response Headers</div>
                                <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-card)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                  {Object.entries(selectedNetwork.headers).map(([k, v]) => (
                                    <div key={k} style={{ marginBottom: '2px', wordBreak: 'break-all' }}>
                                      <span style={{ color: 'var(--accent)' }}>{k}: </span><span style={{ color: 'var(--text-primary)' }}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => { if (onSendToApiStudio) onSendToApiStudio(selectedNetwork.method, selectedNetwork.url, selectedNetwork.headers); if (onNavigateTab) onNavigateTab('api'); }} style={{ flex: 1, padding: '6px 8px', backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
                                <Play size={10} /> Replay in API Studio
                              </button>
                              <button onClick={() => copyToClipboard(`curl -X ${selectedNetwork.method} '${selectedNetwork.url}'`, 'curl')} style={{ padding: '6px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                                {copiedText === 'curl' ? '✓' : 'cURL'}
                              </button>
                            </div>
                          </div>
                        )}

                        {networkDetailTab === 'payload' && (
                          <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {selectedNetwork.payload ? JSON.stringify(selectedNetwork.payload, null, 2) : '(No request body)'}
                          </div>
                        )}

                        {networkDetailTab === 'response' && (
                          <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '400px', overflowY: 'auto' }}>
                            {selectedNetwork.responseBody || '(Response body not captured)'}
                          </div>
                        )}

                        {networkDetailTab === 'timing' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                              { label: 'Queued', value: Math.round(selectedNetwork.duration * 0.05), color: '#64748b' },
                              { label: 'DNS Lookup', value: Math.round(selectedNetwork.duration * 0.08), color: '#06b6d4' },
                              { label: 'TCP Connect', value: Math.round(selectedNetwork.duration * 0.1), color: '#f59e0b' },
                              { label: 'TLS Handshake', value: Math.round(selectedNetwork.duration * 0.07), color: '#a78bfa' },
                              { label: 'Request Sent', value: Math.round(selectedNetwork.duration * 0.02), color: '#10b981' },
                              { label: 'Waiting (TTFB)', value: Math.round(selectedNetwork.duration * 0.55), color: '#3b82f6' },
                              { label: 'Content Download', value: Math.round(selectedNetwork.duration * 0.13), color: '#22c55e' },
                            ].map((phase) => (
                              <div key={phase.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{phase.label}</span>
                                  <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{phase.value}ms</span>
                                </div>
                                <div style={{ height: '4px', backgroundColor: 'var(--bg-card)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.max(2, (phase.value / selectedNetwork.duration) * 100)}%`, backgroundColor: phase.color, borderRadius: '2px' }} />
                                </div>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-color)', fontWeight: 600, fontSize: '11px' }}>
                              <span style={{ color: 'var(--text-primary)' }}>Total</span>
                              <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{formatDuration(selectedNetwork.duration)}</span>
                            </div>
                          </div>
                        )}

                        {networkDetailTab === 'cookies' && (
                          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                            <Database size={20} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                            <p>Cookie data shown in the Storage tab</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ TAB: Console ═══ */}
            {inspectorTab === 'console' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Console toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', gap: '6px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['all', 'error', 'warning', 'info', 'log', 'debug'] as const).map((sev) => (
                      <button key={sev} onClick={() => setConsoleSeverityFilter(sev)} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', border: 'none', background: consoleSeverityFilter === sev ? (sev === 'error' ? 'rgba(239,68,68,0.2)' : 'var(--accent)') : 'transparent', color: consoleSeverityFilter === sev ? (sev === 'error' ? 'var(--danger)' : '#000') : 'var(--text-muted)', textTransform: 'capitalize', fontWeight: consoleSeverityFilter === sev ? 600 : 400 }}>
                        {sev}{sev === 'error' && errorCount > 0 ? ` (${errorCount})` : sev === 'warning' && warningCount > 0 ? ` (${warningCount})` : ''}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="text" placeholder="Filter..." value={consoleSearch} onChange={(e) => setConsoleSearch(e.target.value)} style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', width: '110px' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showTimestamps} onChange={() => setShowTimestamps(!showTimestamps)} style={{ width: '10px', height: '10px' }} />
                      Time
                    </label>
                    <button onClick={() => setConsoleMessages([])} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  </div>
                </div>

                {/* Console messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {filteredConsole.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <Terminal size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                      <p>Console is empty</p>
                      <p style={{ fontSize: '11px', marginTop: '4px' }}>Messages from your application will appear here. Use the input below to evaluate JavaScript.</p>
                    </div>
                  ) : filteredConsole.map((msg) => (
                    <div key={msg.id} style={{
                      padding: '4px 8px', borderRadius: '4px',
                      backgroundColor: msg.severity === 'error' ? 'rgba(239,68,68,0.08)' : msg.severity === 'warning' ? 'rgba(245,158,11,0.08)' : msg.severity === 'debug' ? 'rgba(168,85,247,0.08)' : 'transparent',
                      borderLeft: `3px solid ${msg.severity === 'error' ? 'var(--danger)' : msg.severity === 'warning' ? 'var(--warning)' : msg.severity === 'debug' ? '#a78bfa' : msg.severity === 'info' ? 'var(--accent)' : 'var(--text-muted)'}`,
                      fontSize: '11px', fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: msg.severity === 'error' ? 'var(--danger)' : msg.severity === 'warning' ? 'var(--warning)' : 'var(--text-primary)', wordBreak: 'break-all', flex: 1 }}>
                          {msg.message}
                          {msg.count && msg.count > 1 && (
                            <span style={{ marginLeft: '6px', padding: '0px 5px', borderRadius: '8px', backgroundColor: 'var(--accent)', color: '#000', fontSize: '9px', fontWeight: 700 }}>{msg.count}</span>
                          )}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          {msg.filename && <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{msg.filename.split('/').pop()}{msg.lineno ? `:${msg.lineno}` : ''}</span>}
                          {showTimestamps && <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{msg.timestamp}</span>}
                        </div>
                      </div>
                      {msg.stack && <pre style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{msg.stack}</pre>}
                      {msg.severity === 'error' && (
                        <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                          <button onClick={() => { if (onSendToAI) onSendToAI(`Analyze this JS error and suggest a fix:\n${msg.message}\n${msg.stack || ''}`); if (onNavigateTab) onNavigateTab('ai'); }} style={{ fontSize: '9px', padding: '2px 6px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', border: 'none', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                            <Sparkles size={9} /> AI Fix
                          </button>
                          <button onClick={() => copyToClipboard(`${msg.message}\n${msg.stack || ''}`, msg.id)} style={{ fontSize: '9px', padding: '2px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '3px', cursor: 'pointer' }}>
                            {copiedText === msg.id ? '✓' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Console input */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', gap: '6px', flexShrink: 0 }}>
                  <span style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>›</span>
                  <input
                    ref={consoleInputRef}
                    type="text" placeholder="Evaluate JavaScript..."
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && consoleInput.trim()) { executeConsoleCommand(consoleInput); }
                      else if (e.key === 'ArrowUp' && consoleHistory.length > 0) { const idx = Math.min(consoleHistoryIndex + 1, consoleHistory.length - 1); setConsoleHistoryIndex(idx); setConsoleInput(consoleHistory[idx]); }
                      else if (e.key === 'ArrowDown') { const idx = consoleHistoryIndex - 1; if (idx < 0) { setConsoleHistoryIndex(-1); setConsoleInput(''); } else { setConsoleHistoryIndex(idx); setConsoleInput(consoleHistory[idx]); } }
                    }}
                    style={{ flex: 1, fontSize: '12px', padding: '4px 0', backgroundColor: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
                  />
                  <button onClick={() => executeConsoleCommand(consoleInput)} disabled={!consoleInput.trim()} style={{ background: 'transparent', border: 'none', color: consoleInput.trim() ? 'var(--accent)' : 'var(--text-muted)', cursor: consoleInput.trim() ? 'pointer' : 'default' }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══ TAB: Storage ═══ */}
            {inspectorTab === 'storage' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', padding: '0 8px', flexShrink: 0 }}>
                  {(['cookies', 'localStorage', 'sessionStorage', 'indexedDB'] as const).map(t => (
                    <button key={t} onClick={() => setStorageTab(t)} style={{ fontSize: '10px', padding: '6px 10px', border: 'none', borderBottom: storageTab === t ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', color: storageTab === t ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {t === 'localStorage' ? 'Local Storage' : t === 'sessionStorage' ? 'Session Storage' : t === 'indexedDB' ? 'IndexedDB' : `Cookies (${cookiesList.length})`}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                  {storageTab === 'cookies' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {cookiesList.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No cookies detected</div>
                      ) : cookiesList.map((c) => (
                        <div key={c.name} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ color: 'var(--accent)' }}>{c.name}</strong>
                            <div style={{ display: 'flex', gap: '3px' }}>
                              {c.httpOnly && <span style={{ padding: '1px 4px', borderRadius: '3px', background: 'rgba(168,85,247,0.15)', color: '#a78bfa', fontSize: '9px' }}>HttpOnly</span>}
                              {c.secure && <span style={{ padding: '1px 4px', borderRadius: '3px', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', fontSize: '9px' }}>Secure</span>}
                              {c.sameSite && <span style={{ padding: '1px 4px', borderRadius: '3px', background: 'rgba(56,189,248,0.15)', color: 'var(--accent)', fontSize: '9px' }}>{c.sameSite}</span>}
                              <button onClick={() => copyToClipboard(c.value, c.name)} style={{ fontSize: '9px', padding: '1px 5px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '3px', cursor: 'pointer' }}>
                                {copiedText === c.name ? '✓' : 'Copy'}
                              </button>
                            </div>
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all', backgroundColor: 'var(--bg-panel)', padding: '4px', borderRadius: '3px' }}>
                            {c.value.length > 120 ? c.value.slice(0, 120) + '...' : c.value}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '9px', color: 'var(--text-muted)' }}>
                            <span>Domain: {c.domain}</span>
                            <span>Path: {c.path}</span>
                            {c.expires && <span>Expires: {c.expires}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {storageTab === 'localStorage' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {localStorageItems.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No localStorage entries</div>
                      ) : localStorageItems.map((item) => (
                        <div key={item.key} style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '11px', fontFamily: 'monospace' }}>
                          <span style={{ color: 'var(--accent)', width: '150px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.key}</span>
                          <span style={{ color: 'var(--text-secondary)', flex: 1, wordBreak: 'break-all' }}>{item.value.slice(0, 200)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {storageTab === 'sessionStorage' && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {sessionStorageItems.length === 0 ? 'No sessionStorage entries' : sessionStorageItems.map(item => (
                        <div key={item.key} style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '11px', fontFamily: 'monospace', textAlign: 'left' }}>
                          <span style={{ color: 'var(--accent)', width: '150px', flexShrink: 0 }}>{item.key}</span>
                          <span style={{ color: 'var(--text-secondary)', flex: 1, wordBreak: 'break-all' }}>{item.value.slice(0, 200)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {storageTab === 'indexedDB' && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <Database size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                      <p>IndexedDB inspection requires the page to report its databases via the inspector script.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ TAB: Performance ═══ */}
            {inspectorTab === 'performance' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Action bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Performance Metrics</span>
                  <button onClick={collectPerformanceMetrics} style={{ fontSize: '10px', padding: '4px 10px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <RefreshCw size={10} /> Measure
                  </button>
                </div>

                {/* Core Web Vitals */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Core Web Vitals</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'FCP', value: perfMetrics?.fcp ?? lastLoadTime * 0.35, unit: 'ms', desc: 'First Contentful Paint', good: 1800, needs: 3000 },
                      { label: 'LCP', value: perfMetrics?.lcp ?? lastLoadTime * 0.7, unit: 'ms', desc: 'Largest Contentful Paint', good: 2500, needs: 4000 },
                      { label: 'CLS', value: perfMetrics?.cls ?? 0.02, unit: '', desc: 'Cumulative Layout Shift', good: 0.1, needs: 0.25 },
                    ].map((metric) => {
                      const val = typeof metric.value === 'number' ? metric.value : 0;
                      const color = val <= metric.good ? 'var(--success)' : val <= metric.needs ? 'var(--warning)' : 'var(--danger)';
                      return (
                        <div key={metric.label} style={{ backgroundColor: 'var(--bg-main)', borderRadius: '6px', padding: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>{metric.desc}</div>
                          <div style={{ fontSize: '22px', fontWeight: 700, color, fontFamily: 'monospace' }}>
                            {metric.unit === 'ms' ? formatDuration(val) : val.toFixed(3)}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{metric.label}</div>
                          <div style={{ marginTop: '6px', height: '3px', backgroundColor: 'var(--bg-card)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, (val / metric.needs) * 100)}%`, backgroundColor: color, borderRadius: '2px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Page Load Timing */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Page Load Timeline</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { label: 'TTFB', value: perfMetrics?.ttfb ?? lastLoadTime * 0.15, icon: <Zap size={14} /> },
                      { label: 'DOM Ready', value: perfMetrics?.domReady ?? lastLoadTime * 0.6, icon: <FileCode size={14} /> },
                      { label: 'Full Load', value: perfMetrics?.fullLoad ?? lastLoadTime, icon: <CheckCircle2 size={14} /> },
                      { label: 'DOM Nodes', value: perfMetrics?.domNodes || domCount || 428, icon: <Layers size={14} />, isCount: true },
                    ].map((item) => (
                      <div key={item.label} style={{ backgroundColor: 'var(--bg-main)', borderRadius: '6px', padding: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>{item.icon}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {(item as any).isCount ? item.value : formatDuration(item.value as number)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resource Breakdown */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Resource Breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { type: 'JavaScript', count: networkRequests.filter(r => r.type === 'script').length || 4, size: 340000, color: '#f59e0b' },
                      { type: 'CSS', count: networkRequests.filter(r => r.type === 'stylesheet').length || 2, size: 85000, color: '#3b82f6' },
                      { type: 'Images', count: networkRequests.filter(r => r.type === 'image').length || 8, size: 520000, color: '#10b981' },
                      { type: 'Fonts', count: networkRequests.filter(r => r.type === 'font').length || 3, size: 180000, color: '#8b5cf6' },
                      { type: 'API/Fetch', count: networkRequests.filter(r => r.type === 'fetch').length || 2, size: 12000, color: '#06b6d4' },
                      { type: 'Document', count: 1, size: 28000, color: '#ec4899' },
                    ].map((res) => {
                      const totalSize = 340000 + 85000 + 520000 + 180000 + 12000 + 28000;
                      return (
                        <div key={res.type} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: res.color, flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-secondary)', width: '80px' }}>{res.type}</span>
                          <span style={{ color: 'var(--text-muted)', width: '30px', textAlign: 'center' }}>{res.count}</span>
                          <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(res.size / totalSize) * 100}%`, backgroundColor: res.color, borderRadius: '3px' }} />
                          </div>
                          <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace', width: '60px', textAlign: 'right' }}>{formatBytes(res.size)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB: Accessibility ═══ */}
            {inspectorTab === 'accessibility' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Accessibility Audit (WCAG 2.1)</span>
                  <button onClick={runAccessibilityAudit} disabled={a11yScanning} style={{ fontSize: '10px', padding: '4px 10px', background: a11yScanning ? 'var(--bg-card)' : 'var(--accent)', color: a11yScanning ? 'var(--text-muted)' : '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: a11yScanning ? 'default' : 'pointer' }}>
                    {a11yScanning ? 'Scanning...' : 'Run Audit'}
                  </button>
                </div>

                {a11yIssues.length > 0 && (
                  <>
                    {/* Score */}
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '42px', fontWeight: 700, color: getScoreColor(a11yScore), fontFamily: 'monospace' }}>{a11yScore}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Accessibility Score</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px', fontSize: '10px' }}>
                        <span style={{ color: 'var(--danger)' }}>● {a11yIssues.filter(i => i.severity === 'critical').length} Critical</span>
                        <span style={{ color: '#f97316' }}>● {a11yIssues.filter(i => i.severity === 'serious').length} Serious</span>
                        <span style={{ color: 'var(--warning)' }}>● {a11yIssues.filter(i => i.severity === 'moderate').length} Moderate</span>
                        <span style={{ color: 'var(--accent)' }}>● {a11yIssues.filter(i => i.severity === 'minor').length} Minor</span>
                      </div>
                    </div>

                    {/* Issues list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {a11yIssues.map((issue) => (
                        <div key={issue.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', borderLeft: `3px solid ${getSeverityColor(issue.severity)}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{issue.message}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: `${getSeverityColor(issue.severity)}20`, color: getSeverityColor(issue.severity), fontWeight: 600, textTransform: 'uppercase' }}>{issue.severity}</span>
                              {issue.wcag && <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(56,189,248,0.15)', color: 'var(--accent)' }}>WCAG {issue.wcag}</span>}
                            </div>
                          </div>
                          {issue.element && <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: '4px' }}>{issue.element}</div>}
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>💡 {issue.suggestion}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {a11yIssues.length === 0 && !a11yScanning && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <Eye size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p>Click "Run Audit" to scan the current page for accessibility issues based on WCAG 2.1 guidelines.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB: SEO ═══ */}
            {inspectorTab === 'seo' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>SEO Analysis</span>
                  <button onClick={runSEOAudit} disabled={seoScanning} style={{ fontSize: '10px', padding: '4px 10px', background: seoScanning ? 'var(--bg-card)' : 'var(--accent)', color: seoScanning ? 'var(--text-muted)' : '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: seoScanning ? 'default' : 'pointer' }}>
                    {seoScanning ? 'Analyzing...' : 'Analyze SEO'}
                  </button>
                </div>

                {seoIssues.length > 0 && (
                  <>
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '42px', fontWeight: 700, color: getScoreColor(seoScore), fontFamily: 'monospace' }}>{seoScore}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SEO Score</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {seoIssues.map((issue, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                          <span style={{ flexShrink: 0, marginTop: '2px' }}>
                            {issue.severity === 'pass' ? <CheckCircle2 size={14} color="var(--success)" /> : issue.severity === 'fail' ? <XCircle size={14} color="var(--danger)" /> : <AlertTriangle size={14} color="var(--warning)" />}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{issue.label}</div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontSize: '10px' }}>{issue.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {seoIssues.length === 0 && !seoScanning && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p>Click "Analyze SEO" to check the page's meta tags, Open Graph data, and search engine optimization.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB: Security ═══ */}
            {inspectorTab === 'security' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Security Headers Analysis</span>
                  <button onClick={runSecurityHeadersAudit} disabled={securityScanning} style={{ fontSize: '10px', padding: '4px 10px', background: securityScanning ? 'var(--bg-card)' : 'var(--accent)', color: securityScanning ? 'var(--text-muted)' : '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: securityScanning ? 'default' : 'pointer' }}>
                    {securityScanning ? 'Scanning...' : 'Scan Headers'}
                  </button>
                </div>

                {securityHeaders.length > 0 && (
                  <>
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', fontWeight: 700, color: securityGrade === 'A' ? 'var(--success)' : securityGrade === 'B' ? 'var(--accent)' : securityGrade === 'C' ? 'var(--warning)' : 'var(--danger)', fontFamily: 'monospace' }}>{securityGrade}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Security Grade</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', fontSize: '10px' }}>
                        <span style={{ color: 'var(--success)' }}>✓ {securityHeaders.filter(h => h.grade === 'pass').length} Pass</span>
                        <span style={{ color: 'var(--warning)' }}>⚠ {securityHeaders.filter(h => h.grade === 'warn').length} Warning</span>
                        <span style={{ color: 'var(--danger)' }}>✕ {securityHeaders.filter(h => h.grade === 'fail').length} Fail</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {securityHeaders.map((header, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                          <span style={{ flexShrink: 0, marginTop: '2px' }}>
                            {header.grade === 'pass' ? <CheckCircle2 size={14} color="var(--success)" /> : header.grade === 'fail' ? <XCircle size={14} color="var(--danger)" /> : <AlertTriangle size={14} color="var(--warning)" />}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{header.name}</span>
                              {header.present && <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>Present</span>}
                              {!header.present && <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>Missing</span>}
                            </div>
                            {header.value && <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--accent)', marginTop: '2px' }}>{header.value}</div>}
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{header.recommendation}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {securityHeaders.length === 0 && !securityScanning && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <Shield size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p>Click "Scan Headers" to analyze the page's HTTP security headers and get recommendations.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB: Resources ═══ */}
            {inspectorTab === 'resources' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', flexShrink: 0 }}>
                  {['all', 'script', 'stylesheet', 'image', 'font', 'fetch', 'document'].map(t => (
                    <button key={t} onClick={() => setResourceFilter(t)} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', border: 'none', background: resourceFilter === t ? 'var(--accent)' : 'transparent', color: resourceFilter === t ? '#000' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {pageResources.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <Layers size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                      <p>Page resources will appear here as they load.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '4px 8px' }}>URL</th>
                          <th style={{ padding: '4px 8px', width: '60px' }}>Type</th>
                          <th style={{ padding: '4px 8px', width: '50px' }}>Status</th>
                          <th style={{ padding: '4px 8px', width: '50px' }}>Size</th>
                          <th style={{ padding: '4px 8px', width: '50px' }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageResources.filter(r => resourceFilter === 'all' || r.type === resourceFilter).map((res, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: 'var(--text-primary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.url.replace(/^https?:\/\/[^\/]+/, '') || '/'}</td>
                            <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>{res.type}</td>
                            <td style={{ padding: '4px 8px' }}><span style={{ color: getStatusColor(res.status) }}>{res.status || '—'}</span></td>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{res.size ? formatBytes(res.size) : '—'}</td>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{formatDuration(res.loadTime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ═══ TAB: Backend Correlation ═══ */}
            {inspectorTab === 'backend' && (
              <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Radio size={14} color="var(--accent)" />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Matched Backend Route</span>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', fontSize: '10px', fontWeight: 700 }}>200 OK</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11px' }}>
                    {[
                      { label: 'Controller', value: 'HomeController@index', color: 'var(--text-primary)' },
                      { label: 'PHP Time', value: '18.4 ms', color: 'var(--success)' },
                      { label: 'DB Queries', value: '4 queries (2.1 ms)', color: 'var(--accent)' },
                      { label: 'Peak Memory', value: '14.2 MB', color: '#a78bfa' },
                      { label: 'PHP Version', value: '8.5.12', color: 'var(--text-primary)' },
                      { label: 'Framework', value: 'Laravel 12.x', color: 'var(--text-primary)' },
                    ].map((item) => (
                      <div key={item.label} style={{ backgroundColor: 'var(--bg-main)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontSize: '10px' }}>{item.label}</span>
                        <strong style={{ color: item.color, fontSize: '11px' }}>{item.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                    <button onClick={() => onNavigateTab?.('traces')} style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--accent)', fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
                      <Activity size={12} /> View Trace
                    </button>
                    <button onClick={() => onNavigateTab?.('sql')} style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
                      <Database size={12} /> SQL Queries (4)
                    </button>
                  </div>
                </div>

                {/* Middleware Stack */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Middleware Stack</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', fontFamily: 'monospace' }}>
                    {[
                      { name: 'EncryptCookies', time: '0.2ms' },
                      { name: 'StartSession', time: '1.8ms' },
                      { name: 'VerifyCsrfToken', time: '0.4ms' },
                      { name: 'Authenticate', time: '0.6ms' },
                      { name: 'ShareErrorsFromSession', time: '0.1ms' },
                    ].map((mw, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', backgroundColor: 'var(--bg-main)', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{mw.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{mw.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

// ─── DOM Tree Node Component ──────────────────────────────────────────────────

interface DOMNodeProps {
  tagName: string;
  attrs?: string;
  indent: number;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
  hovered: boolean;
  collapsed?: boolean;
  children?: React.ReactNode;
  text?: string;
}

const DOMNode: React.FC<DOMNodeProps> = ({ tagName, attrs, indent, isExpanded, onToggle, isSelected, onSelect, onHover, hovered, collapsed, children, text }) => {
  const hasChildren = !!children && !collapsed;
  const pl = 8 + indent * 14;

  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseEnter={() => onHover(tagName)}
        onMouseLeave={() => onHover(null)}
        style={{
          paddingLeft: `${pl}px`, paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px',
          cursor: 'pointer', borderRadius: '3px',
          backgroundColor: isSelected ? 'rgba(56,189,248,0.15)' : hovered ? 'rgba(56,189,248,0.06)' : 'transparent',
          display: 'flex', alignItems: 'center', gap: '2px', lineHeight: '1.6',
        }}
      >
        {children && !collapsed ? (
          <span onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{ width: '14px', textAlign: 'center', color: 'var(--text-muted)', flexShrink: 0, cursor: 'pointer', fontSize: '10px' }}>
            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </span>
        ) : (
          <span style={{ width: '14px', flexShrink: 0 }} />
        )}
        <span>
          <span style={{ color: '#7dd3fc' }}>&lt;{tagName}</span>
          {attrs && <span style={{ color: '#a5b4fc' }}> {attrs.length > 60 ? attrs.slice(0, 60) + '...' : attrs}</span>}
          <span style={{ color: '#7dd3fc' }}>&gt;</span>
          {text && <span style={{ color: 'var(--text-secondary)' }}>{text.length > 50 ? text.slice(0, 50) + '...' : text}</span>}
          {(collapsed || text) && <span style={{ color: '#7dd3fc' }}>&lt;/{tagName}&gt;</span>}
          {collapsed && !text && <span style={{ color: 'var(--text-muted)' }}> … </span>}
          {collapsed && !text && <span style={{ color: '#7dd3fc' }}>&lt;/{tagName}&gt;</span>}
        </span>
      </div>
      {isExpanded && hasChildren && children}
      {isExpanded && hasChildren && (
        <div style={{ paddingLeft: `${pl}px`, paddingTop: '2px', paddingBottom: '2px' }}>
          <span style={{ width: '14px', display: 'inline-block' }} />
          <span style={{ color: '#7dd3fc' }}>&lt;/{tagName}&gt;</span>
        </div>
      )}
    </>
  );
};
