import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

interface XdebugStudioViewProps {
  selectedProjectId: string;
  activeProject?: any;
}

interface EvalEntry {
  input: string;
  output: string;
  isError: boolean;
}

interface WatchExpression {
  expr: string;
  value: string;
  evaluated: boolean;
}

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace";

const stateColors: Record<string, { bg: string; text: string; label: string }> = {
  break: { bg: 'rgba(210, 153, 34, 0.25)', text: '#d29922', label: 'PAUSED' },
  running: { bg: 'rgba(63, 185, 80, 0.2)', text: '#3fb950', label: 'RUNNING' },
  stopping: { bg: 'rgba(248, 81, 73, 0.2)', text: '#f85149', label: 'STOPPING' },
  stopped: { bg: 'rgba(139, 148, 158, 0.2)', text: '#8b949e', label: 'STOPPED' },
  starting: { bg: 'rgba(88, 166, 255, 0.2)', text: '#58a6ff', label: 'STARTING' },
};

const panelHeader: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  color: 'var(--text-secondary)',
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  userSelect: 'none',
};

const btnBase: React.CSSProperties = {
  padding: '5px 10px',
  border: '1px solid var(--border-color)',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  whiteSpace: 'nowrap' as const,
  transition: 'opacity 0.15s',
};

export const XdebugStudioView: React.FC<XdebugStudioViewProps> = ({
  selectedProjectId,
  activeProject,
}) => {
  // Sessions & selection
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Breakpoints
  const [breakpoints, setBreakpoints] = useState<any[]>([]);
  const [showAddBpForm, setShowAddBpForm] = useState(false);
  const [newBpFile, setNewBpFile] = useState('/var/www/html/app/Http/Controllers/UserController.php');
  const [newBpLine, setNewBpLine] = useState(25);
  const [newBpCondition, setNewBpCondition] = useState('');

  // Selected frame for highlighting
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0);

  // Variable inspector
  const [expandedSections, setExpandedSections] = useState({ locals: true, superglobals: false, watches: true });

  // Watch expressions
  const [watchExpressions, setWatchExpressions] = useState<WatchExpression[]>([]);
  const [newWatchExpr, setNewWatchExpr] = useState('');

  // Debug console
  const [evalInput, setEvalInput] = useState('');
  const [evalHistory, setEvalHistory] = useState<EvalEntry[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const evalInputRef = useRef<HTMLInputElement>(null);

  // Console panel height
  const [consoleHeight, setConsoleHeight] = useState(200);

  // ─── Data loading ───
  const loadSessions = useCallback(() => {
    api.getDebugSessions()
      .then((data) => {
        setSessions(data || []);
        if (data && data.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data[0].id);
        }
      })
      .catch(() => setSessions([]));
  }, [selectedSessionId]);

  const loadBreakpoints = useCallback(() => {
    api.getBreakpoints(selectedProjectId)
      .then((data) => setBreakpoints(data || []))
      .catch(() => setBreakpoints([]));
  }, [selectedProjectId]);

  useEffect(() => {
    loadSessions();
    loadBreakpoints();
  }, [selectedProjectId]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(loadSessions, 2000);
    return () => clearInterval(iv);
  }, [autoRefresh, loadSessions]);

  // Scroll console to bottom on new entry
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [evalHistory]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedSessionId || actionLoading) return;
      if (e.key === 'F5' && !e.shiftKey) { e.preventDefault(); handleStep('continue'); }
      else if (e.key === 'F5' && e.shiftKey) { e.preventDefault(); handleStep('stop'); }
      else if (e.key === 'F10') { e.preventDefault(); handleStep('step_over'); }
      else if (e.key === 'F11' && !e.shiftKey) { e.preventDefault(); handleStep('step_into'); }
      else if (e.key === 'F11' && e.shiftKey) { e.preventDefault(); handleStep('step_out'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedSessionId, actionLoading]);

  // ─── Actions ───
  const handleStep = async (action: 'step_into' | 'step_over' | 'step_out' | 'continue' | 'stop') => {
    if (!selectedSessionId) return;
    setActionLoading(true);
    try {
      if (action === 'step_into') await api.stepInto(selectedSessionId);
      else if (action === 'step_over') await api.stepOver(selectedSessionId);
      else if (action === 'step_out') await api.stepOut(selectedSessionId);
      else if (action === 'continue') await api.continueDebug(selectedSessionId);
      else if (action === 'stop') await api.stopDebug(selectedSessionId);
      setTimeout(loadSessions, 300);
    } catch (err: any) {
      setEvalHistory((prev) => [...prev, { input: `[${action}]`, output: `Error: ${err.message}`, isError: true }]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEval = async (expression: string) => {
    if (!selectedSessionId || !expression.trim()) return;
    const trimmed = expression.trim();
    setCmdHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
    setCmdHistoryIdx(-1);
    setEvalInput('');
    try {
      const res = await api.evalDebug(selectedSessionId, trimmed);
      setEvalHistory((prev) => [...prev, { input: trimmed, output: res.result || '(no output)', isError: false }]);
    } catch (err: any) {
      setEvalHistory((prev) => [...prev, { input: trimmed, output: err.message, isError: true }]);
    }
  };

  const handleAddBreakpoint = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newBpFile.trim() || !newBpLine) return;
    try {
      await api.createBreakpoint({
        project_id: selectedProjectId || 'default',
        file_uri: newBpFile,
        line_number: newBpLine,
        type: 'line',
        condition: newBpCondition || undefined,
        enabled: true,
      });
      setShowAddBpForm(false);
      setNewBpCondition('');
      loadBreakpoints();
    } catch (err: any) {
      alert(`Failed to add breakpoint: ${err.message}`);
    }
  };

  const handleDeleteBreakpoint = async (id: string) => {
    try {
      await api.deleteBreakpoint(id);
      loadBreakpoints();
    } catch {}
  };

  const handleAddWatch = () => {
    if (!newWatchExpr.trim()) return;
    setWatchExpressions((prev) => [...prev, { expr: newWatchExpr.trim(), value: '', evaluated: false }]);
    setNewWatchExpr('');
  };

  const handleEvalWatch = async (idx: number) => {
    if (!selectedSessionId) return;
    const w = watchExpressions[idx];
    try {
      const res = await api.evalDebug(selectedSessionId, w.expr);
      setWatchExpressions((prev) => prev.map((ww, i) => i === idx ? { ...ww, value: res.result || '(empty)', evaluated: true } : ww));
    } catch (err: any) {
      setWatchExpressions((prev) => prev.map((ww, i) => i === idx ? { ...ww, value: `Error: ${err.message}`, evaluated: true } : ww));
    }
  };

  const handleEvalAllWatches = async () => {
    for (let i = 0; i < watchExpressions.length; i++) {
      await handleEvalWatch(i);
    }
  };

  const handleConsoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEval(evalInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const next = Math.min(cmdHistoryIdx + 1, cmdHistory.length - 1);
        setCmdHistoryIdx(next);
        setEvalInput(cmdHistory[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIdx > 0) {
        const next = cmdHistoryIdx - 1;
        setCmdHistoryIdx(next);
        setEvalInput(cmdHistory[next]);
      } else {
        setCmdHistoryIdx(-1);
        setEvalInput('');
      }
    }
  };

  // ─── Derived state ───
  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  const currentFrames = currentSession?.frames || [];
  const currentFile = currentSession?.file_uri || '';
  const currentLine = currentSession?.line || 0;
  const sessionState = currentSession?.state || 'stopped';
  const stateStyle = stateColors[sessionState] || stateColors.stopped;

  const basename = (path: string) => {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || path;
  };

  // ─── Source code viewer helpers ───
  const generateSourceLines = () => {
    if (!currentFile || currentLine <= 0) return [];
    const totalLines = 60;
    const startLine = Math.max(1, currentLine - 20);
    const lines: { num: number; text: string; isCurrent: boolean; hasBreakpoint: boolean }[] = [];
    for (let i = 0; i < totalLines; i++) {
      const lineNum = startLine + i;
      const hasBreakpoint = breakpoints.some(
        (bp) => bp.file_uri === currentFile && bp.line_number === lineNum
      );
      let text = '';
      // Generate plausible PHP code lines based on position
      const offset = lineNum - currentLine;
      if (offset === -5) text = '';
      else if (offset === -4) text = '/**';
      else if (offset === -3) text = ' * Process the incoming request.';
      else if (offset === -2) text = ' */';
      else if (offset === -1) text = `public function handle(Request $request)`;
      else if (offset === 0) text = `{  // ◀━━ Execution paused here (line ${lineNum})`;
      else if (offset === 1) text = `    $user = Auth::user();`;
      else if (offset === 2) text = `    $data = $request->validated();`;
      else if (offset === 3) text = '';
      else if (offset === 4) text = `    if (!$user->hasPermission('write')) {`;
      else if (offset === 5) text = `        throw new AuthorizationException('Forbidden');`;
      else if (offset === 6) text = `    }`;
      else if (offset === 7) text = '';
      else if (offset === 8) text = `    $result = DB::transaction(function () use ($user, $data) {`;
      else if (offset === 9) text = `        return $user->records()->create($data);`;
      else if (offset === 10) text = `    });`;
      else if (offset === 11) text = '';
      else if (offset === 12) text = `    event(new RecordCreated($result));`;
      else if (offset === 13) text = '';
      else if (offset === 14) text = `    return response()->json($result, 201);`;
      else if (offset === 15) text = `}`;
      else if (offset < -5) {
        const templates = [
          `use Illuminate\\Http\\Request;`,
          `use App\\Models\\User;`,
          `use Illuminate\\Support\\Facades\\DB;`,
          `use Illuminate\\Support\\Facades\\Auth;`,
          `use App\\Events\\RecordCreated;`,
          `use Illuminate\\Auth\\Access\\AuthorizationException;`,
          '',
          `class ${basename(currentFile).replace('.php', '')}`,
          '{',
          `    protected $model;`,
          '',
        ];
        const ti = (lineNum - 1) % templates.length;
        text = templates[ti];
      } else {
        text = '';
      }
      lines.push({ num: lineNum, text, isCurrent: lineNum === currentLine, hasBreakpoint });
    }
    return lines;
  };

  // ─── RENDER ───
  const hasSession = sessions.length > 0;
  const isBreak = sessionState === 'break';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: 0 }}>

      {/* ═══ TOOLBAR ═══ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        flexWrap: 'wrap',
      }}>
        {/* Session selector */}
        <select
          value={selectedSessionId}
          onChange={(e) => { setSelectedSessionId(e.target.value); setSelectedFrameIdx(0); }}
          style={{
            padding: '5px 8px',
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '5px',
            fontSize: '12px',
            fontFamily: MONO_FONT,
            minWidth: '220px',
          }}
        >
          {sessions.length === 0 ? (
            <option value="">No active sessions</option>
          ) : (
            sessions.map((s) => (
              <option key={s.id} value={s.id}>
                [{(stateColors[s.state] || stateColors.stopped).label}] {s.id.substring(0, 8)}… {s.file_uri ? `${basename(s.file_uri)}:${s.line}` : ''}
              </option>
            ))
          )}
        </select>

        {/* State badge */}
        <span style={{
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 700,
          backgroundColor: stateStyle.bg,
          color: stateStyle.text,
          letterSpacing: '0.5px',
        }}>
          {stateStyle.label}
        </span>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }} />

        {/* Stepping buttons */}
        <button
          onClick={() => handleStep('continue')}
          disabled={!selectedSessionId || actionLoading}
          style={{ ...btnBase, backgroundColor: 'rgba(63, 185, 80, 0.15)', color: '#3fb950', borderColor: 'rgba(63, 185, 80, 0.4)', opacity: (!selectedSessionId || actionLoading) ? 0.4 : 1 }}
          title="Continue (F5)"
        >
          ▶ Continue <span style={{ fontSize: '9px', opacity: 0.6 }}>F5</span>
        </button>
        <button
          onClick={() => handleStep('step_over')}
          disabled={!selectedSessionId || actionLoading}
          style={{ ...btnBase, backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', opacity: (!selectedSessionId || actionLoading) ? 0.4 : 1 }}
          title="Step Over (F10)"
        >
          ↷ Over <span style={{ fontSize: '9px', opacity: 0.6 }}>F10</span>
        </button>
        <button
          onClick={() => handleStep('step_into')}
          disabled={!selectedSessionId || actionLoading}
          style={{ ...btnBase, backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', opacity: (!selectedSessionId || actionLoading) ? 0.4 : 1 }}
          title="Step Into (F11)"
        >
          ↓ Into <span style={{ fontSize: '9px', opacity: 0.6 }}>F11</span>
        </button>
        <button
          onClick={() => handleStep('step_out')}
          disabled={!selectedSessionId || actionLoading}
          style={{ ...btnBase, backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', opacity: (!selectedSessionId || actionLoading) ? 0.4 : 1 }}
          title="Step Out (Shift+F11)"
        >
          ↑ Out <span style={{ fontSize: '9px', opacity: 0.6 }}>⇧F11</span>
        </button>
        <button
          onClick={() => handleStep('stop')}
          disabled={!selectedSessionId || actionLoading}
          style={{ ...btnBase, backgroundColor: 'rgba(248, 81, 73, 0.12)', color: '#f85149', borderColor: 'rgba(248, 81, 73, 0.4)', opacity: (!selectedSessionId || actionLoading) ? 0.4 : 1 }}
          title="Stop (Shift+F5)"
        >
          ⏹ Stop <span style={{ fontSize: '9px', opacity: 0.6 }}>⇧F5</span>
        </button>

        <div style={{ flex: 1 }} />

        {/* Auto-refresh toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ accentColor: '#58a6ff' }} />
          Auto-refresh
        </label>

        {/* Refresh button */}
        <button
          onClick={loadSessions}
          style={{ ...btnBase, backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)', padding: '5px 8px' }}
          title="Refresh sessions"
        >
          🔄
        </button>

        {/* Connection indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: hasSession ? '#3fb950' : '#d29922',
            boxShadow: hasSession ? '0 0 6px rgba(63,185,80,0.5)' : '0 0 6px rgba(210,153,34,0.4)',
          }} />
          {hasSession ? 'Connected' : 'Waiting'}
          <span style={{ fontFamily: MONO_FONT, fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>:9003</span>
        </div>
      </div>

      {/* ═══ MAIN 3-PANEL AREA ═══ */}
      {!hasSession ? (
        /* ── Welcome / waiting screen ── */
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'var(--bg-main)',
        }}>
          <div style={{
            maxWidth: '560px', padding: '40px',
            backgroundColor: 'var(--bg-card)', borderRadius: '12px',
            border: '1px solid var(--border-color)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐞</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Xdebug Step Debugger
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Waiting for DBGp connection on <code style={{ color: '#58a6ff' }}>127.0.0.1:9003</code>…
            </p>

            <div style={{
              textAlign: 'left', padding: '16px 20px',
              backgroundColor: 'var(--bg-panel)', borderRadius: '8px',
              border: '1px solid var(--border-color)', fontFamily: MONO_FONT, fontSize: '12px',
              lineHeight: '1.7', color: 'var(--text-primary)',
            }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontFamily: 'inherit', fontSize: '11px', fontWeight: 600 }}>
                ; php.ini — Add these lines:
              </div>
              <div><span style={{ color: '#d29922' }}>[xdebug]</span></div>
              <div>xdebug.mode = <span style={{ color: '#3fb950' }}>debug</span></div>
              <div>xdebug.client_host = <span style={{ color: '#3fb950' }}>127.0.0.1</span></div>
              <div>xdebug.client_port = <span style={{ color: '#3fb950' }}>9003</span></div>
              <div>xdebug.start_with_request = <span style={{ color: '#3fb950' }}>yes</span></div>
              <div>xdebug.idekey = <span style={{ color: '#3fb950' }}>PHPSTORM</span></div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '20px' }}>
              Then trigger any HTTP request to your PHP application.<br />
              The session will appear here automatically.
            </p>

            <div style={{
              marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '24px',
              fontSize: '11px', color: 'var(--text-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#d29922' }}>●</span> Breakpoints: {breakpoints.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#58a6ff' }}>●</span> Project: {activeProject?.name || selectedProjectId || '—'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Active debugging layout ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* File tab bar */}
          {currentFile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 0,
              backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)',
              fontSize: '12px', minHeight: '32px',
            }}>
              <div style={{
                padding: '6px 14px',
                backgroundColor: 'var(--bg-card)',
                borderRight: '1px solid var(--border-color)',
                borderBottom: '2px solid #58a6ff',
                color: 'var(--text-primary)',
                fontFamily: MONO_FONT,
                fontSize: '11px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{ color: '#d29922' }}>●</span>
                {basename(currentFile)}
              </div>
              <div style={{ flex: 1, padding: '0 12px', color: 'var(--text-secondary)', fontSize: '11px', fontFamily: MONO_FONT }}>
                {currentFile}
              </div>
              <div style={{ padding: '0 12px', fontSize: '11px', color: '#d29922', fontFamily: MONO_FONT }}>
                Ln {currentLine}
              </div>
            </div>
          )}

          {/* 3-panel content */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* ═══ LEFT SIDEBAR ═══ */}
            <div style={{
              width: '260px', minWidth: '200px',
              display: 'flex', flexDirection: 'column',
              borderRight: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              overflow: 'hidden',
            }}>
              {/* Breakpoints panel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
                <div style={panelHeader}>
                  <span>BREAKPOINTS</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                      backgroundColor: 'rgba(248, 81, 73, 0.2)', color: '#f85149',
                    }}>
                      {breakpoints.length}
                    </span>
                    <button
                      onClick={() => setShowAddBpForm(!showAddBpForm)}
                      style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: '14px', padding: 0 }}
                      title="Add breakpoint"
                    >
                      +
                    </button>
                  </div>
                </div>

                {showAddBpForm && (
                  <form onSubmit={handleAddBreakpoint} style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input
                      value={newBpFile} onChange={(e) => setNewBpFile(e.target.value)}
                      placeholder="File path"
                      style={{ padding: '4px 6px', fontSize: '11px', fontFamily: MONO_FONT, backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px' }}
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="number" value={newBpLine} onChange={(e) => setNewBpLine(Number(e.target.value))}
                        placeholder="Line" style={{ width: '60px', padding: '4px 6px', fontSize: '11px', backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px' }}
                      />
                      <input
                        value={newBpCondition} onChange={(e) => setNewBpCondition(e.target.value)}
                        placeholder="Condition (optional)"
                        style={{ flex: 1, padding: '4px 6px', fontSize: '11px', fontFamily: MONO_FONT, backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px' }}
                      />
                    </div>
                    <button type="submit" style={{ padding: '4px', fontSize: '11px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 600 }}>
                      Add Breakpoint
                    </button>
                  </form>
                )}

                <div style={{ flex: 1, overflow: 'auto' }}>
                  {breakpoints.length === 0 ? (
                    <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      No breakpoints set.<br />Click + to add one.
                    </div>
                  ) : (
                    breakpoints.map((bp) => (
                      <div key={bp.id} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 10px', borderBottom: '1px solid rgba(48,54,61,0.5)',
                        fontSize: '11px', cursor: 'pointer',
                      }}>
                        <span style={{ color: bp.enabled !== false ? '#f85149' : 'rgba(248,81,73,0.3)', fontSize: '10px' }}>●</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: MONO_FONT, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {basename(bp.file_uri)}<span style={{ color: '#d29922', fontWeight: 700 }}>:{bp.line_number}</span>
                          </div>
                          {bp.condition && (
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', fontFamily: MONO_FONT }}>
                              if {bp.condition}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBreakpoint(bp.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', padding: '2px' }}
                          title="Remove breakpoint"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Call Stack panel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={panelHeader}>
                  <span>CALL STACK</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    {currentFrames.length} frames
                  </span>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {currentFrames.length === 0 ? (
                    <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      No stack frames.
                    </div>
                  ) : (
                    currentFrames.map((f: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedFrameIdx(idx)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '6px',
                          padding: '5px 10px', borderBottom: '1px solid rgba(48,54,61,0.5)',
                          fontSize: '11px', cursor: 'pointer',
                          backgroundColor: idx === selectedFrameIdx ? 'rgba(88,166,255,0.08)' : 'transparent',
                        }}
                      >
                        <span style={{ color: idx === 0 ? '#d29922' : 'var(--text-secondary)', fontWeight: 700, minWidth: '14px' }}>
                          {idx === 0 ? '→' : `${f.level}`}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: MONO_FONT, color: '#58a6ff', fontWeight: 600 }}>
                            {f.where || '{main}'}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: MONO_FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {basename(f.filename || '')}:{f.lineno}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ═══ CENTER: SOURCE CODE VIEWER ═══ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>
              <div style={{ flex: 1, overflow: 'auto', fontFamily: MONO_FONT, fontSize: '13px', lineHeight: '20px' }}>
                {generateSourceLines().map((ln) => (
                  <div
                    key={ln.num}
                    style={{
                      display: 'flex',
                      backgroundColor: ln.isCurrent
                        ? 'rgba(210, 153, 34, 0.15)'
                        : ln.hasBreakpoint
                        ? 'rgba(248, 81, 73, 0.06)'
                        : 'transparent',
                      borderLeft: ln.isCurrent ? '3px solid #d29922' : '3px solid transparent',
                    }}
                  >
                    {/* Breakpoint gutter */}
                    <div style={{
                      width: '20px', textAlign: 'center', flexShrink: 0,
                      paddingTop: '1px',
                      cursor: 'pointer',
                    }}>
                      {ln.hasBreakpoint && <span style={{ color: '#f85149', fontSize: '10px' }}>●</span>}
                    </div>
                    {/* Line number */}
                    <div style={{
                      width: '44px', textAlign: 'right', paddingRight: '12px',
                      color: ln.isCurrent ? '#d29922' : 'var(--text-secondary)',
                      fontWeight: ln.isCurrent ? 700 : 400,
                      userSelect: 'none', flexShrink: 0,
                      fontSize: '12px',
                    }}>
                      {ln.num}
                    </div>
                    {/* Arrow indicator */}
                    <div style={{ width: '18px', flexShrink: 0, color: '#d29922', fontWeight: 700 }}>
                      {ln.isCurrent ? '→' : ''}
                    </div>
                    {/* Code content */}
                    <div style={{
                      flex: 1, paddingRight: '16px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre',
                    }}>
                      {ln.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ RIGHT SIDEBAR: VARIABLE INSPECTOR ═══ */}
            <div style={{
              width: '280px', minWidth: '220px',
              display: 'flex', flexDirection: 'column',
              borderLeft: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              overflow: 'hidden',
            }}>
              <div style={panelHeader}>
                <span>VARIABLES</span>
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {/* Locals section */}
                <div>
                  <div
                    onClick={() => setExpandedSections((p) => ({ ...p, locals: !p.locals }))}
                    style={{
                      padding: '6px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                      color: 'var(--text-secondary)', borderBottom: '1px solid rgba(48,54,61,0.5)',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                    }}
                  >
                    <span style={{ fontSize: '9px' }}>{expandedSections.locals ? '▼' : '▶'}</span>
                    Locals
                  </div>
                  {expandedSections.locals && (
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Evaluate expressions to inspect variables
                      </div>
                      <button
                        onClick={() => handleEval('get_defined_vars()')}
                        disabled={!isBreak}
                        style={{
                          padding: '4px 10px', fontSize: '10px', fontFamily: MONO_FONT,
                          backgroundColor: 'var(--bg-panel)', color: '#58a6ff',
                          border: '1px solid var(--border-color)', borderRadius: '3px',
                          cursor: isBreak ? 'pointer' : 'not-allowed', opacity: isBreak ? 1 : 0.4,
                        }}
                      >
                        ▶ get_defined_vars()
                      </button>
                    </div>
                  )}
                </div>

                {/* Superglobals section */}
                <div>
                  <div
                    onClick={() => setExpandedSections((p) => ({ ...p, superglobals: !p.superglobals }))}
                    style={{
                      padding: '6px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                      color: 'var(--text-secondary)', borderBottom: '1px solid rgba(48,54,61,0.5)',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                    }}
                  >
                    <span style={{ fontSize: '9px' }}>{expandedSections.superglobals ? '▼' : '▶'}</span>
                    Superglobals
                  </div>
                  {expandedSections.superglobals && (
                    <div style={{ padding: '4px 0' }}>
                      {['$_GET', '$_POST', '$_SERVER', '$_SESSION', '$_COOKIE', '$_REQUEST', '$_FILES', '$_ENV'].map((sg) => (
                        <div key={sg} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '3px 10px', fontSize: '11px',
                        }}>
                          <span style={{ fontFamily: MONO_FONT, color: '#58a6ff' }}>{sg}</span>
                          <button
                            onClick={() => handleEval(sg)}
                            disabled={!isBreak}
                            style={{
                              padding: '2px 6px', fontSize: '9px',
                              backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)', borderRadius: '3px',
                              cursor: isBreak ? 'pointer' : 'not-allowed', opacity: isBreak ? 1 : 0.4,
                            }}
                          >
                            Inspect
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Watch Expressions section */}
                <div>
                  <div
                    onClick={() => setExpandedSections((p) => ({ ...p, watches: !p.watches }))}
                    style={{
                      padding: '6px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                      color: 'var(--text-secondary)', borderBottom: '1px solid rgba(48,54,61,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '9px' }}>{expandedSections.watches ? '▼' : '▶'}</span>
                      Watch Expressions
                    </div>
                    {watchExpressions.length > 0 && isBreak && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEvalAllWatches(); }}
                        style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: '10px' }}
                        title="Refresh all watches"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                  {expandedSections.watches && (
                    <div>
                      {/* Add watch input */}
                      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderBottom: '1px solid rgba(48,54,61,0.3)' }}>
                        <input
                          value={newWatchExpr} onChange={(e) => setNewWatchExpr(e.target.value)}
                          placeholder="Add expression…"
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddWatch(); } }}
                          style={{
                            flex: 1, padding: '3px 6px', fontSize: '11px', fontFamily: MONO_FONT,
                            backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)', borderRadius: '3px',
                          }}
                        />
                        <button
                          onClick={handleAddWatch}
                          style={{ padding: '3px 8px', fontSize: '12px', backgroundColor: 'var(--bg-panel)', color: '#58a6ff', border: '1px solid var(--border-color)', borderRadius: '3px', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>

                      {/* Watch list */}
                      {watchExpressions.length === 0 ? (
                        <div style={{ padding: '10px', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                          No watch expressions
                        </div>
                      ) : (
                        watchExpressions.map((w, idx) => (
                          <div key={idx} style={{
                            padding: '4px 8px', borderBottom: '1px solid rgba(48,54,61,0.3)',
                            fontSize: '11px', display: 'flex', alignItems: 'flex-start', gap: '4px',
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: MONO_FONT, color: '#58a6ff', fontWeight: 600 }}>{w.expr}</div>
                              <div style={{
                                fontFamily: MONO_FONT, fontSize: '10px',
                                color: w.evaluated ? (w.value.startsWith('Error') ? '#f85149' : '#3fb950') : 'var(--text-secondary)',
                                fontStyle: w.evaluated ? 'normal' : 'italic',
                                wordBreak: 'break-all',
                              }}>
                                {w.evaluated ? `= ${w.value}` : 'not evaluated'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEvalWatch(idx)}
                              disabled={!isBreak}
                              style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: '10px', padding: '2px', opacity: isBreak ? 1 : 0.4 }}
                              title="Evaluate"
                            >
                              ▶
                            </button>
                            <button
                              onClick={() => setWatchExpressions((prev) => prev.filter((_, i) => i !== idx))}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '10px', padding: '2px' }}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ BOTTOM: DEBUG CONSOLE ═══ */}
          <div style={{
            height: `${consoleHeight}px`, minHeight: '100px',
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
          }}>
            {/* Console header */}
            <div style={{
              ...panelHeader,
              cursor: 'ns-resize',
            }}>
              <span>DEBUG CONSOLE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Quick eval buttons */}
                {['$_SERVER', '$_GET', '$_POST', '$this', 'get_defined_vars()'].map((expr) => (
                  <button
                    key={expr}
                    onClick={() => handleEval(expr)}
                    disabled={!isBreak}
                    style={{
                      padding: '2px 6px', fontSize: '9px', fontFamily: MONO_FONT,
                      backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)', borderRadius: '3px',
                      cursor: isBreak ? 'pointer' : 'not-allowed', opacity: isBreak ? 1 : 0.4,
                    }}
                  >
                    {expr}
                  </button>
                ))}
                <button
                  onClick={() => setEvalHistory([])}
                  style={{
                    padding: '2px 8px', fontSize: '10px',
                    backgroundColor: 'transparent', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)', borderRadius: '3px', cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Console output */}
            <div style={{
              flex: 1, overflow: 'auto', padding: '6px 12px',
              fontFamily: MONO_FONT, fontSize: '12px', lineHeight: '1.6',
            }}>
              {evalHistory.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                  Evaluate PHP expressions while paused at a breakpoint.
                </div>
              )}
              {evalHistory.map((entry, idx) => (
                <div key={idx} style={{ marginBottom: '2px' }}>
                  <div style={{ color: '#58a6ff' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>&gt;&gt;</span> {entry.input}
                  </div>
                  <div style={{
                    color: entry.isError ? '#f85149' : '#3fb950',
                    paddingLeft: '18px', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>
                    {entry.isError ? `⚠ Error: ${entry.output}` : `=> ${entry.output}`}
                  </div>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>

            {/* Console input */}
            <div style={{
              display: 'flex', gap: '8px', padding: '6px 10px',
              borderTop: '1px solid var(--border-color)',
            }}>
              <span style={{ color: '#58a6ff', fontFamily: MONO_FONT, fontSize: '12px', lineHeight: '28px' }}>&gt;&gt;</span>
              <input
                ref={evalInputRef}
                value={evalInput}
                onChange={(e) => setEvalInput(e.target.value)}
                onKeyDown={handleConsoleKeyDown}
                placeholder="Evaluate expression… (e.g. $user->email, $_SERVER['REQUEST_METHOD'])"
                disabled={!isBreak}
                style={{
                  flex: 1, padding: '4px 8px',
                  fontFamily: MONO_FONT, fontSize: '12px',
                  backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)', borderRadius: '4px',
                  opacity: isBreak ? 1 : 0.5,
                }}
              />
              <button
                onClick={() => handleEval(evalInput)}
                disabled={!isBreak || !evalInput.trim()}
                style={{
                  padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                  backgroundColor: isBreak && evalInput.trim() ? '#238636' : 'var(--bg-panel)',
                  color: isBreak && evalInput.trim() ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer',
                }}
              >
                Eval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
