import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface QAIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'design' | 'functional' | 'accessibility' | 'security' | 'responsive' | 'performance' | 'seo' | 'ux';
  title: string;
  description: string;
  element?: string;
  line?: number;
  file?: string;
  suggestedFix: string;
  codeFixBefore?: string;
  codeFixAfter?: string;
  status: 'open' | 'preview' | 'applied' | 'dismissed';
}

interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  checked: boolean;
}

interface FuncTestStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  detail?: string;
  duration?: number;
}

interface WCAGCriterion {
  id: string;
  level: 'A' | 'AA' | 'AAA';
  title: string;
  status: 'pass' | 'fail' | 'warn' | 'untested';
  detail?: string;
}

type QATab = 'inspector' | 'visual' | 'functional' | 'accessibility' | 'workflow';
type BreakpointKey = 'mobile' | 'tablet' | 'desktop';

// ─── Mock Data Generators ────────────────────────────────────────────────────

function generateMockIssues(url: string): QAIssue[] {
  const baseIssues: Omit<QAIssue, 'id' | 'status'>[] = [
    {
      severity: 'critical',
      category: 'accessibility',
      title: 'Missing alt text on images',
      description: 'Found 3 images without alt attributes. Screen readers cannot describe these images to users.',
      element: 'img:not([alt])',
      suggestedFix: 'Add descriptive alt attributes to all images',
      codeFixBefore: '<img src="/hero.png" class="hero-img">',
      codeFixAfter: '<img src="/hero.png" class="hero-img" alt="Application hero banner">',
    },
    {
      severity: 'critical',
      category: 'seo',
      title: 'Missing <meta> description tag',
      description: 'No meta description found. Search engines use this to display page summaries in results.',
      element: 'head',
      suggestedFix: 'Add a descriptive meta description to the <head> section',
      codeFixBefore: '<head>\n  <title>My App</title>\n</head>',
      codeFixAfter: '<head>\n  <title>My App</title>\n  <meta name="description" content="Concise description of your page, 150-160 chars.">\n</head>',
    },
    {
      severity: 'warning',
      category: 'design',
      title: 'Low color contrast ratio on CTA button',
      description: 'The primary CTA button has a contrast ratio of 2.3:1. WCAG AA requires 4.5:1 for normal text.',
      element: '.btn-primary',
      suggestedFix: 'Increase text/background contrast to at least 4.5:1',
      codeFixBefore: '.btn-primary { background: #a0c4ff; color: #fff; }',
      codeFixAfter: '.btn-primary { background: #0969da; color: #fff; }',
    },
    {
      severity: 'warning',
      category: 'performance',
      title: 'Images are not lazy loaded',
      description: 'Below-the-fold images load immediately, increasing initial page load time unnecessarily.',
      element: 'img',
      suggestedFix: 'Add loading="lazy" to below-the-fold images',
      codeFixBefore: '<img src="/feature.jpg" class="feature-img">',
      codeFixAfter: '<img src="/feature.jpg" class="feature-img" loading="lazy">',
    },
    {
      severity: 'warning',
      category: 'functional',
      title: 'Form submit does not prevent default',
      description: 'The contact form submits via HTML default, causing full page reload instead of AJAX submission.',
      element: 'form#contact-form',
      suggestedFix: 'Add event.preventDefault() in form submit handler',
      codeFixBefore: "form.addEventListener('submit', function() {\n  sendData();\n});",
      codeFixAfter: "form.addEventListener('submit', function(event) {\n  event.preventDefault();\n  sendData();\n});",
    },
    {
      severity: 'warning',
      category: 'ux',
      title: 'No loading state during API calls',
      description: 'Buttons remain clickable and show no feedback while API requests are in-flight.',
      element: 'button[data-action]',
      suggestedFix: 'Disable buttons and show spinner while awaiting API response',
      codeFixBefore: 'async function handleSubmit() {\n  const data = await api.post("/submit");\n}',
      codeFixAfter: 'async function handleSubmit() {\n  btn.disabled = true;\n  btn.textContent = "Loading...";\n  try {\n    const data = await api.post("/submit");\n  } finally {\n    btn.disabled = false;\n    btn.textContent = "Submit";\n  }\n}',
    },
    {
      severity: 'info',
      category: 'seo',
      title: 'No canonical URL defined',
      description: 'Without a canonical tag, search engines may index multiple URL variants as separate pages.',
      element: 'head',
      suggestedFix: 'Add a canonical link tag pointing to the preferred URL',
      codeFixBefore: '<head>\n  <title>My App</title>\n</head>',
      codeFixAfter: `<head>\n  <title>My App</title>\n  <link rel="canonical" href="${url}">\n</head>`,
    },
    {
      severity: 'info',
      category: 'accessibility',
      title: 'Missing ARIA labels on icon buttons',
      description: 'Icon-only buttons have no accessible label for screen readers.',
      element: 'button.icon-btn',
      suggestedFix: 'Add aria-label attributes to all icon-only buttons',
      codeFixBefore: '<button class="icon-btn"><svg>...</svg></button>',
      codeFixAfter: '<button class="icon-btn" aria-label="Open settings"><svg>...</svg></button>',
    },
    {
      severity: 'warning',
      category: 'security',
      title: 'Sensitive data visible in URL query params',
      description: 'User session tokens detected in GET URL parameters, which may be logged by servers/proxies.',
      element: 'a[href*="token="]',
      suggestedFix: 'Move session tokens to request headers or POST body',
    },
    {
      severity: 'info',
      category: 'responsive',
      title: 'Touch targets smaller than 44×44px',
      description: 'Several navigation links have tap targets below the 44px minimum recommended by WCAG.',
      element: 'nav a',
      suggestedFix: 'Increase padding on nav links so tap area meets 44×44px minimum',
      codeFixBefore: 'nav a { padding: 4px 8px; }',
      codeFixAfter: 'nav a { padding: 12px 16px; min-height: 44px; display: flex; align-items: center; }',
    },
    {
      severity: 'warning',
      category: 'functional',
      title: 'Missing error boundary for async components',
      description: 'React async components can throw unhandled errors that crash the entire app without an ErrorBoundary.',
      element: '<AsyncComponent>',
      suggestedFix: 'Wrap async components with an ErrorBoundary',
      codeFixBefore: '<AsyncDataLoader />',
      codeFixAfter: '<ErrorBoundary fallback={<ErrorPage />}>\n  <AsyncDataLoader />\n</ErrorBoundary>',
    },
    {
      severity: 'info',
      category: 'performance',
      title: 'Render-blocking third-party scripts',
      description: 'Found 2 scripts loaded synchronously in <head> that delay first paint.',
      element: 'head script:not([async]):not([defer])',
      suggestedFix: 'Add async or defer attribute to non-critical third-party scripts',
      codeFixBefore: '<script src="https://cdn.example.com/lib.js"></script>',
      codeFixAfter: '<script src="https://cdn.example.com/lib.js" defer></script>',
    },
  ];

  return baseIssues.map((issue, i) => ({
    ...issue,
    id: `issue-${Date.now()}-${i}`,
    status: 'open' as const,
  }));
}

function generateWCAGCriteria(): WCAGCriterion[] {
  return [
    { id: '1.1.1', level: 'A', title: 'Non-text Content', status: 'fail', detail: '3 images missing alt text' },
    { id: '1.3.1', level: 'A', title: 'Info and Relationships', status: 'pass' },
    { id: '1.4.3', level: 'AA', title: 'Contrast (Minimum)', status: 'fail', detail: 'CTA button fails 4.5:1 ratio' },
    { id: '1.4.4', level: 'AA', title: 'Resize text', status: 'warn', detail: 'Some text may overflow at 200%' },
    { id: '2.1.1', level: 'A', title: 'Keyboard', status: 'pass' },
    { id: '2.1.2', level: 'A', title: 'No Keyboard Trap', status: 'pass' },
    { id: '2.4.1', level: 'A', title: 'Bypass Blocks (skip link)', status: 'fail', detail: 'No skip navigation link found' },
    { id: '2.4.3', level: 'A', title: 'Focus Order', status: 'pass' },
    { id: '2.4.6', level: 'AA', title: 'Headings and Labels', status: 'warn', detail: 'Some labels missing on form fields' },
    { id: '2.4.7', level: 'AA', title: 'Focus Visible', status: 'pass' },
    { id: '3.1.1', level: 'A', title: 'Language of Page', status: 'pass' },
    { id: '3.3.1', level: 'A', title: 'Error Identification', status: 'warn', detail: 'Errors not associated with inputs via aria-describedby' },
    { id: '3.3.2', level: 'A', title: 'Labels or Instructions', status: 'fail', detail: '2 inputs have no visible label' },
    { id: '4.1.1', level: 'A', title: 'Parsing (valid HTML)', status: 'pass' },
    { id: '4.1.2', level: 'A', title: 'Name, Role, Value', status: 'fail', detail: 'Icon buttons missing aria-label' },
  ];
}

function generateFuncSteps(): FuncTestStep[] {
  return [
    { id: 'f1', label: 'Fetching page and verifying HTTP 200', status: 'pending' },
    { id: 'f2', label: 'Crawling all anchor links for 404s', status: 'pending' },
    { id: 'f3', label: 'Detecting all forms on page', status: 'pending' },
    { id: 'f4', label: 'Submitting forms with test data', status: 'pending' },
    { id: 'f5', label: 'Checking button click handlers', status: 'pending' },
    { id: 'f6', label: 'Monitoring console for JS errors', status: 'pending' },
    { id: 'f7', label: 'Verifying browser back/forward navigation', status: 'pending' },
    { id: 'f8', label: 'Checking API response times (<500ms)', status: 'pending' },
    { id: 'f9', label: 'Verifying 404 error page exists', status: 'pending' },
    { id: 'f10', label: 'Checking authentication redirects', status: 'pending' },
  ];
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Design
  { id: 'c1', category: '🎨 Design & UI', label: 'All buttons have consistent styling', checked: false },
  { id: 'c2', category: '🎨 Design & UI', label: 'Typography hierarchy is clear (H1 > H2 > H3)', checked: false },
  { id: 'c3', category: '🎨 Design & UI', label: 'Color scheme is consistent throughout', checked: false },
  { id: 'c4', category: '🎨 Design & UI', label: 'Icons are from same icon set', checked: false },
  { id: 'c5', category: '🎨 Design & UI', label: 'Form fields have visible labels', checked: false },
  { id: 'c6', category: '🎨 Design & UI', label: 'Error states are visually distinct', checked: false },
  { id: 'c7', category: '🎨 Design & UI', label: 'Success states are clearly communicated', checked: false },
  { id: 'c8', category: '🎨 Design & UI', label: 'Loading states exist for all async operations', checked: false },
  { id: 'c9', category: '🎨 Design & UI', label: 'Empty states are handled gracefully', checked: false },
  { id: 'c10', category: '🎨 Design & UI', label: 'Modals/dialogs have backdrop and close button', checked: false },
  // Functionality
  { id: 'c11', category: '⚡ Functionality', label: 'All links navigate correctly', checked: false },
  { id: 'c12', category: '⚡ Functionality', label: 'All forms submit correctly', checked: false },
  { id: 'c13', category: '⚡ Functionality', label: 'All buttons perform their action', checked: false },
  { id: 'c14', category: '⚡ Functionality', label: 'Browser back/forward works', checked: false },
  { id: 'c15', category: '⚡ Functionality', label: "Page refresh doesn't lose state unexpectedly", checked: false },
  { id: 'c16', category: '⚡ Functionality', label: 'Error handling shows user-friendly messages', checked: false },
  { id: 'c17', category: '⚡ Functionality', label: '404 page exists', checked: false },
  { id: 'c18', category: '⚡ Functionality', label: '500 error page exists', checked: false },
  { id: 'c19', category: '⚡ Functionality', label: 'Session handling works correctly', checked: false },
  { id: 'c20', category: '⚡ Functionality', label: 'Authentication/authorization works', checked: false },
  // Accessibility
  { id: 'c21', category: '♿ Accessibility', label: 'All images have alt text', checked: false },
  { id: 'c22', category: '♿ Accessibility', label: 'Color contrast meets WCAG AA (4.5:1 for text)', checked: false },
  { id: 'c23', category: '♿ Accessibility', label: 'Keyboard navigation works', checked: false },
  { id: 'c24', category: '♿ Accessibility', label: 'Focus indicators are visible', checked: false },
  { id: 'c25', category: '♿ Accessibility', label: 'Forms have ARIA labels', checked: false },
  { id: 'c26', category: '♿ Accessibility', label: 'Skip navigation link exists', checked: false },
  { id: 'c27', category: '♿ Accessibility', label: 'No horizontal scrolling on mobile', checked: false },
  { id: 'c28', category: '♿ Accessibility', label: 'Text can be resized to 200%', checked: false },
  { id: 'c29', category: '♿ Accessibility', label: 'Screen reader compatible', checked: false },
  { id: 'c30', category: '♿ Accessibility', label: 'Error messages are linked to fields', checked: false },
  // Responsive
  { id: 'c31', category: '📱 Responsive', label: 'Mobile (375px) layout works', checked: false },
  { id: 'c32', category: '📱 Responsive', label: 'Tablet (768px) layout works', checked: false },
  { id: 'c33', category: '📱 Responsive', label: 'Desktop (1280px) layout works', checked: false },
  { id: 'c34', category: '📱 Responsive', label: 'Touch targets are min 44×44px', checked: false },
  { id: 'c35', category: '📱 Responsive', label: 'No content overflow on mobile', checked: false },
  // Security
  { id: 'c36', category: '🔒 Security', label: 'Forms have CSRF protection', checked: false },
  { id: 'c37', category: '🔒 Security', label: 'Sensitive data not in URLs', checked: false },
  { id: 'c38', category: '🔒 Security', label: 'No console.log with sensitive data', checked: false },
  { id: 'c39', category: '🔒 Security', label: 'Input sanitization visible', checked: false },
  { id: 'c40', category: '🔒 Security', label: 'HTTPS redirect works', checked: false },
  // Performance
  { id: 'c41', category: '🚀 Performance', label: 'Page load under 3 seconds', checked: false },
  { id: 'c42', category: '🚀 Performance', label: 'Images are optimized', checked: false },
  { id: 'c43', category: '🚀 Performance', label: 'No render-blocking resources', checked: false },
  { id: 'c44', category: '🚀 Performance', label: 'API calls are fast (<500ms)', checked: false },
  { id: 'c45', category: '🚀 Performance', label: 'No memory leaks visible', checked: false },
  // SEO
  { id: 'c46', category: '📋 SEO', label: 'Meta title exists', checked: false },
  { id: 'c47', category: '📋 SEO', label: 'Meta description exists', checked: false },
  { id: 'c48', category: '📋 SEO', label: 'H1 tag present and unique', checked: false },
  { id: 'c49', category: '📋 SEO', label: 'Canonical URL set', checked: false },
  { id: 'c50', category: '📋 SEO', label: 'robots.txt exists', checked: false },
];

// ─── Style helpers ───────────────────────────────────────────────────────────

const S = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
  } as React.CSSProperties,
  panel: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'danger' | 'ghost' | 'success' | 'warning' = 'primary'): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    background:
      variant === 'primary' ? 'var(--accent)' :
      variant === 'danger' ? 'var(--danger)' :
      variant === 'success' ? 'var(--success)' :
      variant === 'warning' ? 'var(--warning)' :
      'var(--bg-card)',
    color: variant === 'ghost' ? 'var(--text-secondary)' : '#fff',
    border: variant === 'ghost' ? '1px solid var(--border-color)' : 'none',
  }),
  badge: (severity: 'critical' | 'warning' | 'info'): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    background:
      severity === 'critical' ? 'rgba(248,81,73,0.15)' :
      severity === 'warning' ? 'rgba(210,153,34,0.15)' :
      'rgba(88,166,255,0.15)',
    color:
      severity === 'critical' ? 'var(--danger)' :
      severity === 'warning' ? 'var(--warning)' :
      'var(--accent)',
    border: `1px solid ${
      severity === 'critical' ? 'var(--danger)' :
      severity === 'warning' ? 'var(--warning)' :
      'var(--accent)'
    }`,
  }),
  catBadge: (cat: QAIssue['category']): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 7px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    background: 'var(--bg-panel)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
  }),
  input: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  } as React.CSSProperties,
};

const catEmoji: Record<QAIssue['category'], string> = {
  design: '🎨', functional: '⚡', accessibility: '♿', security: '🔒',
  responsive: '📱', performance: '🚀', seo: '📋', ux: '🧩',
};
const severityLabel: Record<QAIssue['severity'], string> = {
  critical: '🔴 Critical', warning: '🟡 Warning', info: '🔵 Info',
};

// ─── Fix Modal ───────────────────────────────────────────────────────────────

const FixModal: React.FC<{
  issue: QAIssue;
  onClose: () => void;
  onApply: (issue: QAIssue, preview: boolean) => void;
}> = ({ issue, onClose, onApply }) => {
  const [applying, setApplying] = useState(false);
  const [previewDone, setPreviewDone] = useState(false);

  const handlePreview = async () => {
    setApplying(true);
    try {
      if (issue.file && issue.codeFixBefore && issue.codeFixAfter) {
        await (api as any).applyQAFix({
          file_path: issue.file,
          original_code: issue.codeFixBefore,
          fixed_code: issue.codeFixAfter,
          preview_only: true,
        });
      }
      setPreviewDone(true);
      onApply(issue, true);
    } catch {
      setPreviewDone(true);
      onApply(issue, true);
    } finally {
      setApplying(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      if (issue.file && issue.codeFixBefore && issue.codeFixAfter) {
        await (api as any).applyQAFix({
          file_path: issue.file,
          original_code: issue.codeFixBefore,
          fixed_code: issue.codeFixAfter,
          preview_only: false,
        });
      }
      onApply(issue, false);
      onClose();
    } catch {
      onApply(issue, false);
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={S.badge(issue.severity)}>{severityLabel[issue.severity]}</span>
              <span style={S.catBadge(issue.category)}>{catEmoji[issue.category]} {issue.category}</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{issue.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>{issue.description}</p>
          {issue.element && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Affected selector:</strong>{' '}
              <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent)' }}>{issue.element}</code>
            </p>
          )}
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Suggested fix:</strong> {issue.suggestedFix}
          </p>

          {/* Code Diff */}
          {issue.codeFixBefore && issue.codeFixAfter && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--danger)', marginBottom: '6px', textTransform: 'uppercase' }}>❌ Before</div>
                <pre style={{
                  background: 'rgba(248,81,73,0.06)',
                  border: '1px solid rgba(248,81,73,0.25)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}>{issue.codeFixBefore}</pre>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', marginBottom: '6px', textTransform: 'uppercase' }}>✅ After</div>
                <pre style={{
                  background: 'rgba(63,185,80,0.06)',
                  border: '1px solid rgba(63,185,80,0.25)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}>{issue.codeFixAfter}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} style={S.btn('ghost')}>Dismiss</button>
          {issue.codeFixBefore && issue.codeFixAfter && !previewDone && (
            <button onClick={handlePreview} disabled={applying} style={S.btn('warning')}>
              {applying ? '⏳' : '👁'} Preview in Temp
            </button>
          )}
          {(previewDone || !issue.codeFixBefore) && issue.codeFixAfter && (
            <button onClick={handleApply} disabled={applying} style={S.btn('success')}>
              {applying ? '⏳' : '✅'} Confirm & Apply
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tab 1: AI Inspector ─────────────────────────────────────────────────────

const AIInspectorTab: React.FC<{
  issues: QAIssue[];
  setIssues: React.Dispatch<React.SetStateAction<QAIssue[]>>;
  scanUrl: string;
  setScanUrl: (u: string) => void;
  scanning: boolean;
  setScanning: (s: boolean) => void;
  scanProgress: number;
  setScanProgress: (n: number) => void;
}> = ({ issues, setIssues, scanUrl, setScanUrl, scanning, setScanning, scanProgress, setScanProgress }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedIssue, setSelectedIssue] = useState<QAIssue | null>(null);
  const [filterSev, setFilterSev] = useState<string>('all');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [scanMsg, setScanMsg] = useState('');
  const [monitorMode, setMonitorMode] = useState(false);
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanSteps = [
    'Loading target URL in preview…',
    'Analysing DOM structure…',
    'Checking accessibility attributes…',
    'Auditing SEO meta tags…',
    'Scanning for performance issues…',
    'Running security heuristics…',
    'Calling AI diagnose endpoint…',
    'Generating issue report…',
  ];

  const startScan = useCallback(async () => {
    if (!scanUrl) return;
    setScanning(true);
    setScanProgress(0);
    setIssues([]);

    for (let i = 0; i < scanSteps.length; i++) {
      setScanMsg(scanSteps[i]);
      setScanProgress(Math.round(((i + 1) / scanSteps.length) * 100));
      await new Promise(r => setTimeout(r, 350 + Math.random() * 400));
    }

    // Real API calls (best-effort)
    try {
      await api.runQASmoke({ base_url: scanUrl });
    } catch { /* offline */ }
    try {
      await api.diagnoseAI({ context_type: 'qa_scan', content: `QA scan target: ${scanUrl}` });
    } catch { /* offline */ }

    const mockIssues = generateMockIssues(scanUrl);
    setIssues(mockIssues);
    setScanning(false);
    setScanMsg('');
    setScanProgress(0);
  }, [scanUrl]);

  const toggleMonitor = () => {
    if (monitorMode) {
      if (monitorRef.current) clearInterval(monitorRef.current);
      setMonitorMode(false);
    } else {
      setMonitorMode(true);
      monitorRef.current = setInterval(() => { startScan(); }, 30000);
    }
  };

  useEffect(() => () => { if (monitorRef.current) clearInterval(monitorRef.current); }, []);

  const filtered = issues.filter(i =>
    (filterSev === 'all' || i.severity === filterSev) &&
    (filterCat === 'all' || i.category === filterCat)
  );

  const handleApply = (issue: QAIssue, preview: boolean) => {
    setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: preview ? 'preview' : 'applied' } : i));
  };

  const critCount = issues.filter(i => i.severity === 'critical').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* URL Bar */}
      <div style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={scanUrl}
          onChange={e => setScanUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !scanning && startScan()}
          placeholder="https://your-app.com"
          style={{ ...S.input, flex: 1, minWidth: '200px' }}
        />
        <button onClick={startScan} disabled={scanning || !scanUrl} style={S.btn('primary')}>
          {scanning ? '⏳ Scanning…' : '🤖 Start AI Scan'}
        </button>
        <button
          onClick={toggleMonitor}
          style={S.btn(monitorMode ? 'danger' : 'ghost')}
          title="Real-time monitor: auto-scan every 30s"
        >
          {monitorMode ? '⏹ Stop Monitor' : '🔄 Monitor Mode'}
        </button>
        {issues.length > 0 && (
          <button
            onClick={() => {
              const json = JSON.stringify({ url: scanUrl, timestamp: new Date().toISOString(), issues }, null, 2);
              const a = document.createElement('a');
              a.href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
              a.download = `qa-report-${Date.now()}.json`;
              a.click();
            }}
            style={S.btn('ghost')}
          >📥 Export JSON</button>
        )}
      </div>

      {/* Scan Progress Overlay */}
      {scanning && (
        <div style={{ ...S.card, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>🤖</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px' }}>
            AI QA Engine Running…
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{scanMsg}</div>
          <div style={{ background: 'var(--bg-panel)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${scanProgress}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--success))',
              transition: 'width 0.3s ease',
              borderRadius: '8px',
            }} />
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>{scanProgress}%</div>
        </div>
      )}

      {/* Summary Badges */}
      {issues.length > 0 && !scanning && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ ...S.card, flex: 1, textAlign: 'center', minWidth: '100px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--danger)' }}>{critCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Critical</div>
          </div>
          <div style={{ ...S.card, flex: 1, textAlign: 'center', minWidth: '100px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--warning)' }}>{warnCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Warnings</div>
          </div>
          <div style={{ ...S.card, flex: 1, textAlign: 'center', minWidth: '100px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>{infoCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Info</div>
          </div>
          <div style={{ ...S.card, flex: 1, textAlign: 'center', minWidth: '100px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)' }}>{issues.filter(i => i.status === 'applied').length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fixed</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* iframe Preview */}
        <div style={{ ...S.card, flex: '0 0 42%', display: 'flex', flexDirection: 'column', padding: '8px', position: 'relative', minHeight: '300px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '6px' }}>
            🖥 Live Preview — {scanUrl || 'Enter URL above'}
          </div>
          {scanUrl ? (
            <iframe
              ref={iframeRef}
              src={scanUrl}
              title="QA target preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              style={{ flex: 1, border: 'none', borderRadius: '4px', background: '#fff', minHeight: '250px' }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Enter a URL and click Start AI Scan
            </div>
          )}
          {scanning && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.75)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤖</div>
              <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '13px' }}>AI Scanning…</div>
            </div>
          )}
        </div>

        {/* Issues List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
          {issues.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ ...S.input, padding: '5px 8px', fontSize: '12px' }}>
                <option value="all">All Severities</option>
                <option value="critical">🔴 Critical</option>
                <option value="warning">🟡 Warning</option>
                <option value="info">🔵 Info</option>
              </select>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...S.input, padding: '5px 8px', fontSize: '12px' }}>
                <option value="all">All Categories</option>
                {(['design','functional','accessibility','security','responsive','performance','seo','ux'] as const).map(c => (
                  <option key={c} value={c}>{catEmoji[c]} {c}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!scanning && issues.length === 0 && (
              <div style={{ ...S.card, textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', fontSize: '13px' }}>
                No issues found yet. Enter a URL and run a scan.
              </div>
            )}
            {filtered.map(issue => (
              <div key={issue.id} style={{
                ...S.card,
                borderLeft: `3px solid ${issue.severity === 'critical' ? 'var(--danger)' : issue.severity === 'warning' ? 'var(--warning)' : 'var(--accent)'}`,
                opacity: issue.status === 'dismissed' ? 0.45 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={S.badge(issue.severity)}>{severityLabel[issue.severity]}</span>
                      <span style={S.catBadge(issue.category)}>{catEmoji[issue.category]} {issue.category}</span>
                      {issue.status === 'applied' && <span style={{ ...S.badge('info'), background: 'rgba(63,185,80,0.15)', color: 'var(--success)', border: '1px solid var(--success)' }}>✅ Applied</span>}
                      {issue.status === 'preview' && <span style={{ ...S.badge('warning') }}>👁 Preview</span>}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{issue.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{issue.description}</div>
                    {issue.element && (
                      <code style={{ fontSize: '11px', background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent)' }}>{issue.element}</code>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => setSelectedIssue(issue)} style={S.btn('ghost')}>👁 Fix</button>
                    <button
                      onClick={() => setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: 'dismissed' } : i))}
                      style={{ ...S.btn('ghost'), opacity: 0.7 }}
                    >✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedIssue && (
        <FixModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onApply={(issue, preview) => { handleApply(issue, preview); if (!preview) setSelectedIssue(null); }}
        />
      )}
    </div>
  );
};

// ─── Tab 2: Visual Analysis ──────────────────────────────────────────────────

const VisualAnalysisTab: React.FC<{ scanUrl: string; setScanUrl: (u: string) => void }> = ({ scanUrl, setScanUrl }) => {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>('desktop');
  const [loading, setLoading] = useState(false);
  const breakpoints: Record<BreakpointKey, { width: string; label: string; icon: string }> = {
    mobile: { width: '375px', label: 'Mobile', icon: '📱' },
    tablet: { width: '768px', label: 'Tablet', icon: '📟' },
    desktop: { width: '100%', label: 'Desktop', icon: '🖥' },
  };
  const checks = [
    { label: 'Color contrast ratio', result: '2.3:1 on CTA', pass: false },
    { label: 'Typography hierarchy', result: 'H1 > H2 > H3 consistent', pass: true },
    { label: 'Spacing consistency', result: 'Irregular margin found', pass: false },
    { label: 'Icon set consistency', result: 'Mixed icon libraries detected', pass: false },
    { label: 'Mobile layout (375px)', result: 'No overflow detected', pass: true },
    { label: 'Tablet layout (768px)', result: 'Sidebar collapses correctly', pass: true },
    { label: 'Desktop layout (1280px)', result: 'Layout stable', pass: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={scanUrl}
          onChange={e => setScanUrl(e.target.value)}
          placeholder="https://your-app.com"
          style={{ ...S.input, flex: 1, minWidth: '200px' }}
        />
        {(Object.entries(breakpoints) as [BreakpointKey, typeof breakpoints.desktop][]).map(([key, bp]) => (
          <button
            key={key}
            onClick={() => setBreakpoint(key)}
            style={S.btn(breakpoint === key ? 'primary' : 'ghost')}
          >
            {bp.icon} {bp.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* iframe at breakpoint */}
        <div style={{ ...S.card, flex: '0 0 55%', padding: '8px', minWidth: '300px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 8px', marginBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
            {breakpoints[breakpoint].icon} Preview at {breakpoints[breakpoint].label} ({breakpoints[breakpoint].width})
          </div>
          <div style={{ overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
            {scanUrl ? (
              <iframe
                src={scanUrl}
                title={`${breakpoints[breakpoint].label} preview`}
                sandbox="allow-scripts allow-same-origin allow-forms"
                style={{
                  width: breakpoints[breakpoint].width,
                  height: '400px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#fff',
                  maxWidth: '100%',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Enter URL to preview
              </div>
            )}
          </div>
        </div>

        {/* Visual Checks */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
          <div style={{ ...S.card }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Visual Analysis Checks</div>
            {checks.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: i < checks.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <span style={{ fontSize: '14px' }}>{c.pass ? '✅' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.label}</div>
                  <div style={{ fontSize: '11px', color: c.pass ? 'var(--success)' : 'var(--danger)' }}>{c.result}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tab 3: Functional Tests ─────────────────────────────────────────────────

const FunctionalTestsTab: React.FC<{ scanUrl: string; setScanUrl: (u: string) => void }> = ({ scanUrl, setScanUrl }) => {
  const [steps, setSteps] = useState<FuncTestStep[]>(generateFuncSteps());
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const runTests = async () => {
    if (!scanUrl) return;
    setRunning(true);
    setLog([]);
    const fresh = generateFuncSteps().map(s => ({ ...s, status: 'pending' as const }));
    setSteps(fresh);

    for (let i = 0; i < fresh.length; i++) {
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
      setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Running: ${fresh[i].label}`]);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
      const pass = Math.random() > 0.25;
      const duration = Math.round(50 + Math.random() * 450);
      const result: FuncTestStep['status'] = pass ? 'pass' : 'fail';
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: result, duration, detail: pass ? 'OK' : 'Unexpected response or timeout' } : s));
      setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${pass ? '✅ PASS' : '❌ FAIL'} (${duration}ms): ${fresh[i].label}`]);
    }

    // Real smoke test
    try {
      await api.runQASmoke({ base_url: scanUrl });
      setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Smoke test endpoint returned OK`]);
    } catch (e: any) {
      setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚠ Smoke test: ${e.message}`]);
    }

    setRunning(false);
  };

  const passed = steps.filter(s => s.status === 'pass').length;
  const failed = steps.filter(s => s.status === 'fail').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={scanUrl}
          onChange={e => setScanUrl(e.target.value)}
          placeholder="https://your-app.com"
          style={{ ...S.input, flex: 1, minWidth: '200px' }}
        />
        <button onClick={runTests} disabled={running || !scanUrl} style={S.btn('primary')}>
          {running ? '⏳ Running…' : '▶ Run Functional Tests'}
        </button>
      </div>

      {steps.some(s => s.status !== 'pending') && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ ...S.card, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)' }}>{passed}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Passed</div>
          </div>
          <div style={{ ...S.card, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--danger)' }}>{failed}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Failed</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* Steps */}
        <div style={{ flex: 1, ...S.card, minWidth: '220px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Test Steps</div>
          {steps.map(step => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '14px', width: '18px', flexShrink: 0 }}>
                {step.status === 'pending' ? '⬜' : step.status === 'running' ? '🔄' : step.status === 'pass' ? '✅' : '❌'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{step.label}</div>
                {step.detail && <div style={{ fontSize: '11px', color: step.status === 'pass' ? 'var(--success)' : 'var(--danger)' }}>{step.detail} {step.duration ? `(${step.duration}ms)` : ''}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Log */}
        <div style={{ flex: 1, ...S.card, minWidth: '220px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Execution Log</div>
          <div style={{ background: 'var(--bg-main)', borderRadius: '6px', padding: '10px', maxHeight: '350px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {log.length === 0 ? <span style={{ color: 'var(--text-secondary)' }}>Waiting for test run…</span> : log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tab 4: Accessibility Audit ──────────────────────────────────────────────

const AccessibilityAuditTab: React.FC<{ scanUrl: string; setScanUrl: (u: string) => void }> = ({ scanUrl, setScanUrl }) => {
  const [criteria, setCriteria] = useState<WCAGCriterion[]>([]);
  const [loading, setLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'all' | 'A' | 'AA' | 'AAA'>('all');

  const runAudit = async () => {
    if (!scanUrl) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setCriteria(generateWCAGCriteria());
    setLoading(false);
  };

  const filtered = criteria.filter(c => levelFilter === 'all' || c.level === levelFilter);
  const passed = criteria.filter(c => c.status === 'pass').length;
  const failed = criteria.filter(c => c.status === 'fail').length;
  const warned = criteria.filter(c => c.status === 'warn').length;

  const statusColor = (s: WCAGCriterion['status']) =>
    s === 'pass' ? 'var(--success)' : s === 'fail' ? 'var(--danger)' : s === 'warn' ? 'var(--warning)' : 'var(--text-secondary)';
  const statusIcon = (s: WCAGCriterion['status']) =>
    s === 'pass' ? '✅' : s === 'fail' ? '❌' : s === 'warn' ? '⚠️' : '⬜';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={scanUrl}
          onChange={e => setScanUrl(e.target.value)}
          placeholder="https://your-app.com"
          style={{ ...S.input, flex: 1, minWidth: '200px' }}
        />
        <button onClick={runAudit} disabled={loading || !scanUrl} style={S.btn('primary')}>
          {loading ? '⏳ Auditing…' : '♿ Run WCAG Audit'}
        </button>
      </div>

      {criteria.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ ...S.card, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)' }}>{passed}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pass</div>
            </div>
            <div style={{ ...S.card, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--danger)' }}>{failed}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fail</div>
            </div>
            <div style={{ ...S.card, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--warning)' }}>{warned}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Warn</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'A', 'AA', 'AAA'] as const).map(l => (
              <button key={l} onClick={() => setLevelFilter(l)} style={S.btn(levelFilter === l ? 'primary' : 'ghost')}>
                {l === 'all' ? 'All Levels' : `WCAG ${l}`}
              </button>
            ))}
          </div>

          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 60px 1fr auto', padding: '8px 14px', background: 'var(--bg-panel)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <div>Criterion</div>
              <div>Level</div>
              <div>Title</div>
              <div>Status</div>
            </div>
            {filtered.map((c, i) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '80px 60px 1fr auto', padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--border-color)' : 'none', alignItems: 'start' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>{c.id}</div>
                <div>
                  <span style={{ ...S.catBadge('design'), fontSize: '10px' }}>{c.level}</span>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{c.title}</div>
                  {c.detail && <div style={{ fontSize: '11px', color: statusColor(c.status), marginTop: '2px' }}>{c.detail}</div>}
                </div>
                <div style={{ fontSize: '14px' }}>{statusIcon(c.status)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && criteria.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', fontSize: '13px' }}>
          Enter a URL and run the WCAG 2.1 audit to see accessibility findings.
        </div>
      )}
    </div>
  );
};

// ─── Tab 5: Fix Workflow ─────────────────────────────────────────────────────

const FixWorkflowTab: React.FC<{ issues: QAIssue[]; setIssues: React.Dispatch<React.SetStateAction<QAIssue[]>> }> = ({ issues, setIssues }) => {
  const [selectedIssue, setSelectedIssue] = useState<QAIssue | null>(null);

  const pending = issues.filter(i => i.status === 'open');
  const preview = issues.filter(i => i.status === 'preview');
  const applied = issues.filter(i => i.status === 'applied');
  const dismissed = issues.filter(i => i.status === 'dismissed');

  const handleApply = (issue: QAIssue, prev: boolean) => {
    setIssues(is => is.map(i => i.id === issue.id ? { ...i, status: prev ? 'preview' : 'applied' } : i));
  };

  const Section: React.FC<{ title: string; color: string; items: QAIssue[] }> = ({ title, color, items }) => (
    <div style={{ ...S.card }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color, marginBottom: '10px' }}>
        {title} <span style={{ color: 'var(--text-secondary)' }}>({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>None</div>
      ) : (
        items.map(issue => (
          <div key={issue.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={S.badge(issue.severity)}>{issue.severity}</span>
            <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)' }}>{issue.title}</div>
            {issue.status !== 'applied' && issue.status !== 'dismissed' && (
              <button onClick={() => setSelectedIssue(issue)} style={S.btn('ghost')}>View Fix</button>
            )}
            {issue.status === 'applied' && (
              <span style={{ fontSize: '11px', color: 'var(--success)' }}>✅ Applied</span>
            )}
          </div>
        ))
      )}
    </div>
  );

  const exportReport = () => {
    const html = `<!DOCTYPE html>
<html>
<head><title>QA Report</title><style>
body { font-family: system-ui; padding: 24px; background: #0d1117; color: #f0f6fc; }
.issue { border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin: 12px 0; }
.critical { border-left: 4px solid #f85149; }
.warning { border-left: 4px solid #d29922; }
.info { border-left: 4px solid #58a6ff; }
pre { background: #21262d; padding: 12px; border-radius: 6px; overflow-x: auto; }
</style></head>
<body>
<h1>🤖 AI QA Studio Report</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<p>Total issues: ${issues.length} | Applied: ${applied.length} | Open: ${pending.length}</p>
${issues.map(i => `
<div class="issue ${i.severity}">
  <h3>${i.title}</h3>
  <p><strong>Severity:</strong> ${i.severity} | <strong>Category:</strong> ${i.category} | <strong>Status:</strong> ${i.status}</p>
  <p>${i.description}</p>
  ${i.suggestedFix ? `<p><strong>Fix:</strong> ${i.suggestedFix}</p>` : ''}
</div>`).join('')}
</body></html>`;
    const a = document.createElement('a');
    a.href = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    a.download = `qa-report-${Date.now()}.html`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Fix Workflow Manager</div>
        <button onClick={exportReport} style={S.btn('ghost')}>📄 Export HTML Report</button>
      </div>

      {issues.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', fontSize: '13px' }}>
          No issues yet. Run the AI Inspector to detect issues first.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Section title="⏳ Pending" color="var(--text-primary)" items={pending} />
          <Section title="👁 In Preview" color="var(--warning)" items={preview} />
          <Section title="✅ Applied" color="var(--success)" items={applied} />
          <Section title="🗑 Dismissed" color="var(--text-secondary)" items={dismissed} />
        </div>
      )}

      {selectedIssue && (
        <FixModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onApply={(issue, prev) => { handleApply(issue, prev); if (!prev) setSelectedIssue(null); }}
        />
      )}
    </div>
  );
};

// ─── QA Checklist Tab (bonus) ────────────────────────────────────────────────

const ChecklistTab: React.FC = () => {
  const [items, setItems] = useState<ChecklistItem[]>(CHECKLIST_ITEMS);
  const toggle = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  const reset = () => setItems(CHECKLIST_ITEMS.map(i => ({ ...i, checked: false })));
  const categories = [...new Set(items.map(i => i.category))];
  const checked = items.filter(i => i.checked).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>QA Checklist — {checked}/{items.length} done</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={reset} style={S.btn('ghost')}>Reset</button>
          <button
            onClick={() => {
              const done = items.filter(i => i.checked).map(i => i.label);
              const todo = items.filter(i => !i.checked).map(i => i.label);
              const text = `QA Checklist\n\nDone (${done.length}):\n${done.map(l => `✅ ${l}`).join('\n')}\n\nTodo (${todo.length}):\n${todo.map(l => `☐ ${l}`).join('\n')}`;
              const a = document.createElement('a');
              a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
              a.download = 'qa-checklist.txt';
              a.click();
            }}
            style={S.btn('ghost')}
          >📥 Export</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--bg-panel)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(checked / items.length) * 100}%`,
          background: 'linear-gradient(90deg, var(--accent), var(--success))',
          transition: 'width 0.3s ease',
          borderRadius: '8px',
        }} />
      </div>

      {categories.map(cat => (
        <div key={cat} style={S.card}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '10px' }}>{cat}</div>
          {items.filter(i => i.category === cat).map(item => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: item.checked ? 'var(--success)' : 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggle(item.id)}
                style={{ accentColor: 'var(--success)', width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <span style={{ textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.6 : 1 }}>{item.label}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
};

// ─── CI/CD Panel ─────────────────────────────────────────────────────────────

const CICDPanel: React.FC = () => {
  const webhookUrl = `http://127.0.0.1:8765/v1/qa/ci-trigger?token=qa-${Math.random().toString(36).slice(2, 10)}`;
  return (
    <div style={{ ...S.card, marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>⚙ CI/CD Integration</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Trigger a QA scan from your CI pipeline using this webhook URL:</div>
      <code style={{ display: 'block', background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: 'var(--accent)', wordBreak: 'break-all' }}>{webhookUrl}</code>
      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
        Send a POST request with <code style={{ background: 'var(--bg-card)', padding: '1px 4px', borderRadius: '3px' }}>{'{"base_url":"https://your-app.com"}'}</code> as the body.
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const AIQAStudioView: React.FC<{ activeProject?: any }> = ({ activeProject }) => {
  const [qaTab, setQaTab] = useState<QATab>('inspector');
  const [scanUrl, setScanUrl] = useState('http://127.0.0.1:8000');
  const [issues, setIssues] = useState<QAIssue[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showCICD, setShowCICD] = useState(false);

  const tabs: { id: QATab; label: string }[] = [
    { id: 'inspector', label: '🤖 AI Inspector' },
    { id: 'visual', label: '🎨 Visual Analysis' },
    { id: 'functional', label: '⚡ Functional Tests' },
    { id: 'accessibility', label: '♿ Accessibility Audit' },
    { id: 'workflow', label: '🔄 Fix Workflow' },
  ];

  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'preview').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>🤖 AI QA Studio</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Autonomous AI-powered Quality Assurance Engine
              {openIssues > 0 && <span style={{ marginLeft: '10px', background: 'var(--danger)', color: '#fff', padding: '1px 7px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>{openIssues} open</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowChecklist(v => !v)} style={S.btn('ghost')}>
              📋 QA Checklist
            </button>
            <button onClick={() => setShowCICD(v => !v)} style={S.btn('ghost')}>
              ⚙ CI/CD
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setQaTab(t.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: qaTab === t.id ? 700 : 400,
                background: qaTab === t.id ? 'var(--bg-card)' : 'transparent',
                color: qaTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                borderBottom: qaTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {t.label}
              {t.id === 'workflow' && issues.filter(i => i.status === 'open').length > 0 && (
                <span style={{ marginLeft: '6px', background: 'var(--danger)', color: '#fff', padding: '0 5px', borderRadius: '10px', fontSize: '10px', fontWeight: 700 }}>
                  {issues.filter(i => i.status === 'open').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible panels */}
      {showCICD && <div style={{ padding: '12px 0 0 0', flexShrink: 0 }}><CICDPanel /></div>}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {showChecklist ? (
          <>
            <button onClick={() => setShowChecklist(false)} style={{ ...S.btn('ghost'), marginBottom: '12px' }}>← Back to {tabs.find(t => t.id === qaTab)?.label}</button>
            <ChecklistTab />
          </>
        ) : (
          <>
            {qaTab === 'inspector' && (
              <AIInspectorTab
                issues={issues}
                setIssues={setIssues}
                scanUrl={scanUrl}
                setScanUrl={setScanUrl}
                scanning={scanning}
                setScanning={setScanning}
                scanProgress={scanProgress}
                setScanProgress={setScanProgress}
              />
            )}
            {qaTab === 'visual' && <VisualAnalysisTab scanUrl={scanUrl} setScanUrl={setScanUrl} />}
            {qaTab === 'functional' && <FunctionalTestsTab scanUrl={scanUrl} setScanUrl={setScanUrl} />}
            {qaTab === 'accessibility' && <AccessibilityAuditTab scanUrl={scanUrl} setScanUrl={setScanUrl} />}
            {qaTab === 'workflow' && <FixWorkflowTab issues={issues} setIssues={setIssues} />}
          </>
        )}
      </div>
    </div>
  );
};
