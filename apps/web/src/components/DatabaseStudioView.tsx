import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import {
  Database,
  Table as TableIcon,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  FileCode,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Copy,
  Layers,
  Activity,
  Cpu,
  Key,
  Link as LinkIcon,
  Sparkles,
  Shield,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Terminal,
  Settings,
  Zap,
  BarChart2,
  GitBranch,
  Edit2,
  ExternalLink,
  Info
} from 'lucide-react';

interface DatabaseStudioViewProps {
  selectedProjectId: string;
  activeProject?: any;
  onNavigateToTrace?: (traceId: string) => void;
}

interface QueryTab {
  id: string;
  title: string;
  sql: string;
  result: any | null;
  error: string | null;
  loading: boolean;
  history: string[];
}

export const DatabaseStudioView: React.FC<DatabaseStudioViewProps> = ({
  selectedProjectId,
  activeProject,
  onNavigateToTrace
}) => {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<
    'grid' | 'structure' | 'console' | 'erd' | 'explain' | 'advisor' | 'analytics' | 'maintenance' | 'connections'
  >('grid');

  // Connections state
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string>('default');
  const [loadingConns, setLoadingConns] = useState<boolean>(false);

  // New Connection Modal
  const [showNewConnModal, setShowNewConnModal] = useState<boolean>(false);
  const [newConnName, setNewConnName] = useState<string>('');
  const [newConnDriver, setNewConnDriver] = useState<string>('sqlite');
  const [newConnHost, setNewConnHost] = useState<string>('127.0.0.1');
  const [newConnPort, setNewConnPort] = useState<string>('3306');
  const [newConnDatabase, setNewConnDatabase] = useState<string>('');
  const [newConnUser, setNewConnUser] = useState<string>('root');
  const [newConnPassword, setNewConnPassword] = useState<string>('');
  const [newConnPath, setNewConnPath] = useState<string>('./debug_studio.sqlite');
  const [newConnReadonly, setNewConnReadonly] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testingConn, setTestingConn] = useState<boolean>(false);

  // Schema state
  const [schema, setSchema] = useState<any | null>(null);
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);
  const [objectFilter, setObjectFilter] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');

  // Table Data Grid state
  const [tableData, setTableData] = useState<any | null>(null);
  const [loadingTableData, setLoadingTableData] = useState<boolean>(false);
  const [tablePage, setTablePage] = useState<number>(1);
  const [tablePageSize, setTablePageSize] = useState<number>(50);
  const [tableSortCol, setTableSortCol] = useState<string>('');
  const [tableSortDir, setTableSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [tableFilter, setTableFilter] = useState<string>('');

  // Editing cell state
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colName: string; val: any } | null>(null);
  const [cellEditVal, setCellEditVal] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  // Insert Row Modal
  const [showInsertModal, setShowInsertModal] = useState<boolean>(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});

  // Table Structure & DDL state
  const [structureSubTab, setStructureSubTab] = useState<'columns' | 'indexes' | 'fks' | 'ddl'>('columns');
  const [tableDDL, setTableDDL] = useState<string>('');
  const [loadingDDL, setLoadingDDL] = useState<boolean>(false);

  // ERD state
  const [erdData, setErdData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [loadingErd, setLoadingErd] = useState<boolean>(false);

  // Multi-Tab SQL Console
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([
    {
      id: 'tab-1',
      title: 'Query 1',
      sql: 'SELECT * FROM traces ORDER BY started_at DESC LIMIT 25;',
      result: null,
      error: null,
      loading: false,
      history: []
    }
  ]);
  const [activeQueryTabId, setActiveQueryTabId] = useState<string>('tab-1');
  const [safeMode, setSafeMode] = useState<boolean>(true);
  const [queryHistory, setQueryHistory] = useState<
    Array<{ sql: string; time: string; duration_ms: number; rows: number; status: 'SUCCESS' | 'ERROR' }>
  >([]);

  // EXPLAIN Plan State
  const [explainSql, setExplainSql] = useState<string>('SELECT * FROM orders WHERE status = "pending" ORDER BY created_at DESC;');
  const [explainResult, setExplainResult] = useState<any | null>(null);
  const [explainLoading, setExplainLoading] = useState<boolean>(false);

  // Solution Advisor State
  const [findings, setFindings] = useState<any[]>([]);
  const [advisorLoading, setAdvisorLoading] = useState<boolean>(false);

  // Trace SQL Analytics State
  const [sqlAnalytics, setSqlAnalytics] = useState<any[]>([]);
  const [analyticsFilter, setAnalyticsFilter] = useState<'all' | 'slow' | 'frequent'>('all');
  const [analyticsSearch, setAnalyticsSearch] = useState<string>('');

  // Maintenance & Stats State
  const [dbStats, setDbStats] = useState<any | null>(null);
  const [activeProcesses, setActiveProcesses] = useState<any[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState<boolean>(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>('');

  // 1. Initial Load of Connections and Analytics
  useEffect(() => {
    loadConnections();
    loadAnalytics();
    loadAdvisorFindings();
  }, [selectedProjectId]);

  // 2. Load schema when connection changes
  useEffect(() => {
    loadSchema(selectedConnId);
    loadStats(selectedConnId);
  }, [selectedConnId]);

  // 3. Load table data when selected table changes
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedConnId, selectedTable, 1);
      loadTableDDL(selectedConnId, selectedTable);
    }
  }, [selectedTable, selectedConnId]);

  const loadConnections = async () => {
    setLoadingConns(true);
    try {
      const conns = await api.getDBConnections(selectedProjectId);
      setConnections(conns || []);
    } catch (err: any) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoadingConns(false);
    }
  };

  const loadSchema = async (connId: string) => {
    setLoadingSchema(true);
    try {
      const data = await api.getDBSchema(connId);
      setSchema(data);
      if (data?.tables && data.tables.length > 0 && !selectedTable) {
        setSelectedTable(data.tables[0].name);
      }
    } catch (err: any) {
      console.error('Failed to introspect schema:', err);
    } finally {
      setLoadingSchema(false);
    }
  };

  const loadTableData = async (
    connId: string,
    tableName: string,
    page = tablePage,
    size = tablePageSize,
    sortCol = tableSortCol,
    sortDir = tableSortDir,
    filter = tableFilter
  ) => {
    if (!tableName) return;
    setLoadingTableData(true);
    try {
      const res = await api.getTableData(connId, tableName, page, size, sortCol, sortDir, filter);
      setTableData(res ? { ...res, rows: res.rows || [], columns: res.columns || [] } : null);
      setTablePage(page);
    } catch (err: any) {
      console.error(`Failed to load table data: ${err.message}`);
    } finally {
      setLoadingTableData(false);
    }
  };

  const loadTableDDL = async (connId: string, tableName: string) => {
    if (!tableName) return;
    setLoadingDDL(true);
    try {
      const res = await api.getTableDDL(connId, tableName);
      setTableDDL(res.ddl);
    } catch (err: any) {
      setTableDDL(`-- Failed to extract DDL: ${err.message}`);
    } finally {
      setLoadingDDL(false);
    }
  };

  const loadERD = async (connId: string) => {
    setLoadingErd(true);
    try {
      const res = await api.getDatabaseRelations(connId);
      setErdData(res);
    } catch (err: any) {
      console.error('Failed to load ERD:', err);
    } finally {
      setLoadingErd(false);
    }
  };

  const loadStats = async (connId: string) => {
    try {
      const stats = await api.getDatabaseStats(connId);
      setDbStats(stats);
      const procs = await api.getActiveProcesses(connId);
      setActiveProcesses(procs || []);
    } catch (err: any) {
      console.error('Failed to load db stats:', err);
    }
  };

  const loadAnalytics = async () => {
    if (!selectedProjectId) return;
    try {
      const data = await api.getSQLAnalytics(selectedProjectId);
      setSqlAnalytics(data || []);
    } catch (err: any) {
      console.error('Failed to load SQL analytics:', err);
    }
  };

  const loadAdvisorFindings = async () => {
    if (!selectedProjectId) return;
    try {
      const data = await api.getDBFindings(selectedProjectId);
      setFindings(data || []);
    } catch (err: any) {
      console.error('Failed to load DB findings:', err);
    }
  };

  // Connection Testing
  const handleTestRawConnection = async () => {
    setTestingConn(true);
    setTestResult(null);
    try {
      let configJson = '{}';
      if (newConnDriver === 'sqlite') {
        configJson = JSON.stringify({ path: newConnPath });
      } else {
        configJson = JSON.stringify({
          host: newConnHost,
          port: parseInt(newConnPort) || 3306,
          database: newConnDatabase,
          user: newConnUser,
          password: newConnPassword
        });
      }

      const res = await api.testRawDBConnection({
        name: newConnName || 'Test Connection',
        driver: newConnDriver,
        config_json: configJson,
        readonly: newConnReadonly
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestingConn(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnName.trim()) {
      alert('Please enter a connection alias.');
      return;
    }

    let configJson = '{}';
    if (newConnDriver === 'sqlite') {
      configJson = JSON.stringify({ path: newConnPath });
    } else {
      configJson = JSON.stringify({
        host: newConnHost,
        port: parseInt(newConnPort) || (newConnDriver === 'postgres' ? 5432 : 3306),
        database: newConnDatabase,
        user: newConnUser,
        password: newConnPassword
      });
    }

    try {
      const created = await api.createDBConnection({
        project_id: selectedProjectId,
        name: newConnName,
        driver: newConnDriver,
        config_json: configJson,
        readonly: newConnReadonly
      });
      await loadConnections();
      setSelectedConnId(created.id);
      setShowNewConnModal(false);
      setNewConnName('');
      setTestResult(null);
    } catch (err: any) {
      alert(`Failed to save connection: ${err.message}`);
    }
  };

  const handleDeleteConnection = async (id: string, name: string) => {
    if (!confirm(`Delete connection profile "${name}"?`)) return;
    try {
      await api.deleteDBConnection(id);
      if (selectedConnId === id) {
        setSelectedConnId('default');
      }
      loadConnections();
    } catch (err: any) {
      alert(`Failed to delete connection: ${err.message}`);
    }
  };

  // Data Grid Cell Update
  const handleCommitCellEdit = async () => {
    if (!editingCell || !tableData) return;
    const pkCol = tableData.primary_key;
    if (!pkCol) {
      alert('Cannot update row: Table has no recognized primary key.');
      setEditingCell(null);
      return;
    }

    const row = tableData.rows[editingCell.rowIdx];
    const pkVal = row[pkCol];

    try {
      await api.updateTableRow(selectedConnId, selectedTable, pkCol, pkVal, {
        [editingCell.colName]: cellEditVal
      });
      // Update local state directly for snappy response
      row[editingCell.colName] = cellEditVal;
      setEditingCell(null);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Insert Row
  const handleInsertRow = async () => {
    try {
      await api.insertTableRow(selectedConnId, selectedTable, newRowData);
      setShowInsertModal(false);
      setNewRowData({});
      loadTableData(selectedConnId, selectedTable, tablePage);
    } catch (err: any) {
      alert(`Insert failed: ${err.message}`);
    }
  };

  // Delete Row
  const handleDeleteSelectedRow = async () => {
    if (!selectedRow || !tableData?.primary_key) {
      alert('Please select a row to delete.');
      return;
    }
    const pkCol = tableData.primary_key;
    const pkVal = selectedRow[pkCol];
    if (!confirm(`Are you sure you want to delete row where ${pkCol} = "${pkVal}"?`)) return;

    try {
      await api.deleteTableRow(selectedConnId, selectedTable, pkCol, pkVal);
      setSelectedRow(null);
      loadTableData(selectedConnId, selectedTable, tablePage);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Truncate Table
  const handleTruncateTable = async () => {
    if (!confirm(`⚠️ DANGER: Are you sure you want to TRUNCATE table "${selectedTable}"? All rows will be permanently erased.`)) {
      return;
    }
    try {
      await api.truncateTable(selectedConnId, selectedTable);
      alert(`Table "${selectedTable}" truncated successfully.`);
      loadTableData(selectedConnId, selectedTable, 1);
    } catch (err: any) {
      alert(`Truncate failed: ${err.message}`);
    }
  };

  // Drop Table
  const handleDropTable = async () => {
    const confirmation = prompt(`⚠️ CRITICAL ACTION: To drop table "${selectedTable}", type its name below:`);
    if (confirmation !== selectedTable) {
      if (confirmation !== null) alert('Table name did not match. Action cancelled.');
      return;
    }
    try {
      await api.dropTable(selectedConnId, selectedTable);
      alert(`Table "${selectedTable}" has been dropped.`);
      setSelectedTable('');
      loadSchema(selectedConnId);
    } catch (err: any) {
      alert(`Drop table failed: ${err.message}`);
    }
  };

  // Export Table Data
  const exportTableData = (format: 'csv' | 'json' | 'sql' | 'md') => {
    if (!tableData || !tableData.rows || tableData.rows.length === 0) {
      alert('No data available to export.');
      return;
    }

    let content = '';
    const filename = `${selectedTable}_export_${new Date().toISOString().slice(0, 10)}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(tableData.rows, null, 2);
    } else if (format === 'csv') {
      const headers = tableData.columns.join(',');
      const rows = tableData.rows.map((r: any) =>
        tableData.columns.map((c: string) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
      );
      content = [headers, ...rows].join('\n');
    } else if (format === 'sql') {
      const inserts = tableData.rows.map((r: any) => {
        const cols = tableData.columns.map((c: string) => `\`${c}\``).join(', ');
        const vals = tableData.columns.map((c: string) => {
          const v = r[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          return `'${String(v).replace(/'/g, "''")}'`;
        }).join(', ');
        return `INSERT INTO \`${selectedTable}\` (${cols}) VALUES (${vals});`;
      });
      content = inserts.join('\n');
    } else if (format === 'md') {
      const headers = `| ${tableData.columns.join(' | ')} |`;
      const separator = `| ${tableData.columns.map(() => '---').join(' | ')} |`;
      const rows = tableData.rows.map((r: any) =>
        `| ${tableData.columns.map((c: string) => String(r[c] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`
      );
      content = [headers, separator, ...rows].join('\n');
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Console Execution
  const activeTabObj = queryTabs.find((t) => t.id === activeQueryTabId) || queryTabs[0];

  const updateActiveTabSql = (sql: string) => {
    setQueryTabs((prev) =>
      prev.map((t) => (t.id === activeQueryTabId ? { ...t, sql } : t))
    );
  };

  const handleExecuteQuery = async () => {
    const tab = activeTabObj;
    if (!tab || !tab.sql.trim()) return;

    setQueryTabs((prev) =>
      prev.map((t) => (t.id === tab.id ? { ...t, loading: true, error: null } : t))
    );

    const start = performance.now();
    try {
      const res = await api.executeDBQuery(selectedConnId, tab.sql, 200, !safeMode);
      const safeResult = res ? { ...res, rows: res.rows || [], columns: res.columns || [] } : null;
      const duration = performance.now() - start;

      setQueryTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? {
                ...t,
                result: safeResult,
                loading: false,
                history: [tab.sql, ...t.history.slice(0, 19)]
              }
            : t
        )
      );

      setQueryHistory((prev) => [
        {
          sql: tab.sql,
          time: new Date().toLocaleTimeString(),
          duration_ms: Math.round(duration),
          rows: res.row_count || res.affected_rows || 0,
          status: 'SUCCESS'
        },
        ...prev.slice(0, 49)
      ]);
    } catch (err: any) {
      setQueryTabs((prev) =>
        prev.map((t) => (t.id === tab.id ? { ...t, error: err.message, loading: false } : t))
      );
      setQueryHistory((prev) => [
        {
          sql: tab.sql,
          time: new Date().toLocaleTimeString(),
          duration_ms: 0,
          rows: 0,
          status: 'ERROR'
        },
        ...prev.slice(0, 49)
      ]);
    }
  };

  // SQL Prettifier
  const formatSQL = (sqlText: string) => {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
      'JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO',
      'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
      'UNION ALL', 'UNION', 'AND', 'OR', 'ASC', 'DESC'
    ];
    let formatted = sqlText;
    keywords.forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(regex, kw);
    });
    return formatted;
  };

  // Safe EXPLAIN Execution
  const handleRunExplain = async (customSql?: string) => {
    const sqlToExplain = customSql || explainSql;
    setExplainLoading(true);
    try {
      const activeConn = connections.find((c) => c.id === selectedConnId);
      const driver = activeConn ? activeConn.driver : 'mysql';
      const res = await api.explainSQL(sqlToExplain, driver);
      setExplainResult(res);
    } catch (err: any) {
      alert(`EXPLAIN failed: ${err.message}`);
    } finally {
      setExplainLoading(false);
    }
  };

  // Workload Advisor Execution
  const handleRunAdvisor = async () => {
    setAdvisorLoading(true);
    try {
      const res = await api.analyzeDB(selectedProjectId);
      setFindings(res || []);
    } catch (err: any) {
      alert(`Advisor analysis failed: ${err.message}`);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Maintenance Vacuum / Optimize
  const handleRunOptimize = async () => {
    setMaintenanceLoading(true);
    setMaintenanceMsg('');
    try {
      const res = await api.optimizeDatabase(selectedConnId, selectedTable);
      setMaintenanceMsg(res.message);
      loadStats(selectedConnId);
    } catch (err: any) {
      alert(`Optimization failed: ${err.message}`);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  // Filtered Objects in Sidebar
  const filteredTables = useMemo(() => {
    if (!schema?.tables) return [];
    if (!objectFilter.trim()) return schema.tables;
    return schema.tables.filter((t: any) =>
      t.name.toLowerCase().includes(objectFilter.toLowerCase())
    );
  }, [schema, objectFilter]);

  const activeConn = useMemo(() => {
    if (selectedConnId === 'default') {
      return { id: 'default', name: 'Default SQLite Studio Database', driver: 'sqlite', readonly: false };
    }
    return connections.find((c) => c.id === selectedConnId) || { id: selectedConnId, name: 'Unknown', driver: 'sqlite' };
  }, [connections, selectedConnId]);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>
      {/* =========================================================================
          LEFT SIDEBAR: NAVICAT-STYLE CONNECTION & SCHEMA OBJECT TREE
      ========================================================================= */}
      <div
        style={{
          width: '280px',
          borderRight: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        {/* Sidebar Header & Connection Switcher */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
              DATABASE CONNECTIONS
            </span>
            <button
              onClick={() => setShowNewConnModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Add New Connection (Navicat Style)"
            >
              <Plus size={12} /> New
            </button>
          </div>

          {/* Connection Dropdown */}
          <select
            value={selectedConnId}
            onChange={(e) => setSelectedConnId(e.target.value)}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-main)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <option value="default">🗄️ Default Studio SQLite</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.driver === 'mysql' ? '🐬' : c.driver === 'postgres' ? '🐘' : '📁'} {c.name} ({c.driver})
              </option>
            ))}
          </select>

          {/* Active Connection Status Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)'
                }}
              />
              <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                {activeConn.driver} • {dbStats ? dbStats.version : 'Connected'}
              </span>
            </div>
            <button
              onClick={() => {
                loadSchema(selectedConnId);
                loadStats(selectedConnId);
              }}
              disabled={loadingSchema}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
              title="Refresh Schema Objects"
            >
              <RefreshCw size={12} className={loadingSchema ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search tables & views..."
              value={objectFilter}
              onChange={(e) => setObjectFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px 4px 26px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-primary)',
                fontSize: '11px'
              }}
            />
          </div>
        </div>

        {/* Object Tree List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', padding: '6px 8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>TABLES ({filteredTables.length})</span>
            {loadingSchema && <span>Loading...</span>}
          </div>

          {filteredTables.map((tbl: any) => {
            const isSelected = selectedTable === tbl.name;
            return (
              <div
                key={tbl.name}
                onClick={() => {
                  setSelectedTable(tbl.name);
                  if (activeTab !== 'grid' && activeTab !== 'structure') {
                    setActiveTab('grid');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '12px',
                  marginBottom: '1px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <TableIcon size={13} style={{ flexShrink: 0, opacity: isSelected ? 1 : 0.6 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tbl.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-secondary)',
                    flexShrink: 0
                  }}
                >
                  {tbl.estimated_rows}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Sidebar Quick Actions */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <button
            onClick={() => {
              setActiveTab('connections');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Settings size={12} /> Manage Connections ({connections.length + 1})
          </button>
        </div>
      </div>

      {/* =========================================================================
          RIGHT MAIN WORKSPACE
      ========================================================================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Suite Tab Navigation */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          {/* Main Tabs */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
            {[
              { id: 'grid', label: `🗄️ Data Grid ${selectedTable ? `(${selectedTable})` : ''}`, icon: TableIcon },
              { id: 'structure', label: '📐 Structure & DDL', icon: Layers },
              { id: 'console', label: '⚡ SQL Console', icon: Terminal },
              { id: 'erd', label: '🌳 Visual ERD', icon: GitBranch },
              { id: 'explain', label: '🔍 Safe EXPLAIN', icon: Zap },
              { id: 'advisor', label: `💡 Solution Advisor (${findings.length})`, icon: Sparkles },
              { id: 'analytics', label: `📊 Live Traces (${sqlAnalytics.length})`, icon: BarChart2 },
              { id: 'maintenance', label: '🛠️ Maintenance & Ops', icon: Activity },
              { id: 'connections', label: '🔌 Connections', icon: Database },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'erd' && !erdData) {
                    loadERD(selectedConnId);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                  backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Info & Safe Mode Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                if (safeMode) {
                  if (confirm('Disable Safe Mode? This allows executing destructive queries (INSERT, UPDATE, DELETE, DROP, TRUNCATE).')) {
                    setSafeMode(false);
                  }
                } else {
                  setSafeMode(true);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: safeMode ? 'var(--success)' : 'var(--danger)',
                backgroundColor: safeMode ? 'rgba(63, 185, 80, 0.12)' : 'rgba(248, 81, 73, 0.12)',
                color: safeMode ? 'var(--success)' : 'var(--danger)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title={safeMode ? 'Safe Mode ON: Data mutation queries are blocked' : 'Safe Mode OFF: Full read-write mutations enabled'}
            >
              {safeMode ? <Shield size={12} /> : <ShieldAlert size={12} />}
              {safeMode ? '🔒 Safe Mode: ON' : '🔓 Unrestricted'}
            </button>
          </div>
        </div>

        {/* Tab Content Container */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          {/* =========================================================================
              TAB 1: INTERACTIVE DATA GRID & TABLE SPREADSHEET VIEWER (NAVICAT STYLE)
          ========================================================================= */}
          {activeTab === 'grid' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
              {/* Grid Control Toolbar */}
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                {/* Left: Table Title & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>
                    {selectedTable ? `Table: ${selectedTable}` : 'Select a table'}
                  </span>
                  {tableData && (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      ({(tableData.total_rows ?? 0).toLocaleString()} total rows)
                    </span>
                  )}

                  <button
                    onClick={() => {
                      if (!selectedTable) return;
                      // Prepare empty row data with default column keys
                      const initRow: Record<string, string> = {};
                      tableData?.columns?.forEach((c: string) => {
                        initRow[c] = '';
                      });
                      setNewRowData(initRow);
                      setShowInsertModal(true);
                    }}
                    disabled={safeMode || !selectedTable}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: safeMode ? 'var(--bg-main)' : 'var(--accent)',
                      color: safeMode ? 'var(--text-secondary)' : '#fff',
                      border: '1px solid var(--border-color)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: safeMode ? 'not-allowed' : 'pointer'
                    }}
                    title={safeMode ? 'Unlock Safe Mode to insert rows' : 'Insert New Row'}
                  >
                    <Plus size={12} /> Add Row
                  </button>

                  <button
                    onClick={handleDeleteSelectedRow}
                    disabled={safeMode || !selectedRow}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      color: selectedRow && !safeMode ? 'var(--danger)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '11px',
                      cursor: selectedRow && !safeMode ? 'pointer' : 'not-allowed'
                    }}
                    title="Delete Selected Row"
                  >
                    <Trash2 size={12} /> Delete
                  </button>

                  <button
                    onClick={() => loadTableData(selectedConnId, selectedTable, tablePage)}
                    disabled={loadingTableData}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={12} className={loadingTableData ? 'spin' : ''} /> Refresh
                  </button>
                </div>

                {/* Right: Search, Page Size & Export */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Search rows..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        loadTableData(selectedConnId, selectedTable, 1);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      width: '150px'
                    }}
                  />

                  {/* Export format dropdown */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        exportTableData(e.target.value as any);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>📥 Export...</option>
                    <option value="csv">Export as CSV</option>
                    <option value="json">Export as JSON</option>
                    <option value="sql">Export as SQL INSERTs</option>
                    <option value="md">Export as Markdown</option>
                  </select>

                  {/* Danger operations dropdown */}
                  {!safeMode && (
                    <select
                      onChange={(e) => {
                        if (e.target.value === 'truncate') handleTruncateTable();
                        if (e.target.value === 'drop') handleDropTable();
                        e.target.value = '';
                      }}
                      defaultValue=""
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--danger)',
                        backgroundColor: 'rgba(248, 81, 73, 0.1)',
                        color: 'var(--danger)',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="" disabled>⚠️ Dangerous Ops</option>
                      <option value="truncate">Truncate Table</option>
                      <option value="drop">Drop Table</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  overflow: 'auto',
                  position: 'relative'
                }}
              >
                {!tableData || !tableData.rows || tableData.rows.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {loadingTableData ? 'Loading table rows...' : 'No records found in this table.'}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '6px 8px', width: '35px', textAlign: 'center', color: 'var(--text-secondary)' }}>#</th>
                        {(tableData.columns || []).map((col: string, idx: number) => {
                          const isPK = col === tableData.primary_key;
                          const colType = tableData.column_types?.[idx];
                          return (
                            <th
                              key={col}
                              onClick={() => {
                                const newDir = tableSortCol === col && tableSortDir === 'ASC' ? 'DESC' : 'ASC';
                                setTableSortCol(col);
                                setTableSortDir(newDir);
                                loadTableData(selectedConnId, selectedTable, tablePage, tablePageSize, col, newDir);
                              }}
                              style={{
                                padding: '6px 10px',
                                textAlign: 'left',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isPK && <Key size={11} style={{ color: 'var(--accent)' }} />}
                                <span>{col}</span>
                                {colType && (
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                                    ({colType})
                                  </span>
                                )}
                                {tableSortCol === col && (
                                  <span style={{ color: 'var(--accent)' }}>{tableSortDir === 'ASC' ? '▲' : '▼'}</span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(tableData.rows || []).map((row: any, rIdx: number) => {
                        const isRowSelected = selectedRow === row;
                        return (
                          <tr
                            key={rIdx}
                            onClick={() => setSelectedRow(row)}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isRowSelected ? 'rgba(88, 166, 255, 0.12)' : 'transparent'
                            }}
                          >
                            <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'monospace' }}>
                              {(tablePage - 1) * tablePageSize + rIdx + 1}
                            </td>
                            {(tableData.columns || []).map((col: string) => {
                              const cellValue = row[col];
                              const isEditing = editingCell?.rowIdx === rIdx && editingCell?.colName === col;

                              return (
                                <td
                                  key={col}
                                  onDoubleClick={() => {
                                    if (safeMode) {
                                      alert('Unlock Safe Mode to edit cells directly.');
                                      return;
                                    }
                                    setEditingCell({ rowIdx: rIdx, colName: col, val: cellValue });
                                    setCellEditVal(cellValue === null || cellValue === undefined ? '' : String(cellValue));
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    fontFamily: 'monospace',
                                    maxWidth: '300px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    cursor: safeMode ? 'default' : 'cell'
                                  }}
                                  title={safeMode ? String(cellValue) : 'Double click to edit cell'}
                                >
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={cellEditVal}
                                      onChange={(e) => setCellEditVal(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCommitCellEdit();
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      onBlur={handleCommitCellEdit}
                                      style={{
                                        width: '100%',
                                        padding: '2px 4px',
                                        fontSize: '11px',
                                        fontFamily: 'monospace',
                                        border: '1px solid var(--accent)',
                                        borderRadius: '3px',
                                        backgroundColor: 'var(--bg-main)',
                                        color: 'var(--text-primary)'
                                      }}
                                    />
                                  ) : cellValue === null || cellValue === undefined ? (
                                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>NULL</span>
                                  ) : typeof cellValue === 'boolean' ? (
                                    <span style={{ color: cellValue ? 'var(--success)' : 'var(--danger)' }}>{String(cellValue)}</span>
                                  ) : (
                                    String(cellValue)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Grid Pagination Footer Bar */}
              {tableData && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px'
                  }}
                >
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Showing page {tableData.page || 1} of {tableData.total_pages || 1} ({(tableData.total_rows ?? 0).toLocaleString()} total rows) • Query: {tableData.duration_ms != null ? tableData.duration_ms.toFixed(1) : '0'}ms
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={tablePageSize}
                      onChange={(e) => {
                        const newSize = parseInt(e.target.value);
                        setTablePageSize(newSize);
                        loadTableData(selectedConnId, selectedTable, 1, newSize);
                      }}
                      style={{
                        padding: '3px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '11px'
                      }}
                    >
                      <option value="25">25 / page</option>
                      <option value="50">50 / page</option>
                      <option value="100">100 / page</option>
                      <option value="250">250 / page</option>
                    </select>

                    <button
                      onClick={() => loadTableData(selectedConnId, selectedTable, tablePage - 1)}
                      disabled={tablePage <= 1}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        cursor: tablePage <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ◀ Previous
                    </button>
                    <span>Page {tablePage}</span>
                    <button
                      onClick={() => loadTableData(selectedConnId, selectedTable, tablePage + 1)}
                      disabled={tablePage >= tableData.total_pages}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        cursor: tablePage >= tableData.total_pages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next ▶
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 2: TABLE STRUCTURE & SCHEMA DESIGNER (NAVICAT DESIGN TABLE)
          ========================================================================= */}
          {activeTab === 'structure' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
              {/* Structure Sub-Tabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'columns', label: 'Columns & Types' },
                    { id: 'indexes', label: 'Indexes' },
                    { id: 'fks', label: 'Foreign Keys' },
                    { id: 'ddl', label: 'CREATE TABLE (DDL)' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStructureSubTab(st.id as any)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: structureSubTab === st.id ? 'var(--accent)' : 'var(--bg-card)',
                        color: structureSubTab === st.id ? '#fff' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '12px', fontWeight: 600 }}>
                  Design: <span style={{ color: 'var(--accent)' }}>{selectedTable}</span>
                </div>
              </div>

              {/* Sub-Tab 1: Columns */}
              {structureSubTab === 'columns' && (
                <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'auto' }}>
                  {(() => {
                    const currentTbl = schema?.tables?.find((t: any) => t.name === selectedTable);
                    if (!currentTbl) return <div style={{ padding: '24px', textAlign: 'center' }}>No table selected</div>;

                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>Column Name</th>
                            <th style={{ padding: '8px 12px' }}>Data Type</th>
                            <th style={{ padding: '8px 12px' }}>Nullable</th>
                            <th style={{ padding: '8px 12px' }}>Default Value</th>
                            <th style={{ padding: '8px 12px' }}>Primary Key</th>
                            <th style={{ padding: '8px 12px' }}>Extra</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTbl.columns.map((col: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                                {col.name}
                              </td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--accent)' }}>
                                {col.type}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {col.nullable ? 'YES' : <span style={{ color: 'var(--danger)', fontWeight: 600 }}>NO</span>}
                              </td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                {col.default_value || <span style={{ fontStyle: 'italic' }}>None</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {col.is_primary_key ? (
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(88, 166, 255, 0.2)', color: 'var(--accent)', fontWeight: 600, fontSize: '11px' }}>
                                    PRIMARY
                                  </span>
                                ) : '-'}
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {col.extra || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {/* Sub-Tab 2: Indexes */}
              {structureSubTab === 'indexes' && (
                <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'auto' }}>
                  {(() => {
                    const currentTbl = schema?.tables?.find((t: any) => t.name === selectedTable);
                    if (!currentTbl || !currentTbl.indexes || currentTbl.indexes.length === 0) {
                      return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No indexes defined on this table.</div>;
                    }

                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>Index Name</th>
                            <th style={{ padding: '8px 12px' }}>Type</th>
                            <th style={{ padding: '8px 12px' }}>Indexed Columns</th>
                            <th style={{ padding: '8px 12px' }}>Unique</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTbl.indexes.map((idx: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{idx.name}</td>
                              <td style={{ padding: '8px 12px' }}>{idx.type || 'BTREE'}</td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--accent)' }}>
                                {idx.columns ? idx.columns.join(', ') : '-'}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {idx.unique ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>UNIQUE</span> : 'INDEX'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {/* Sub-Tab 3: Foreign Keys */}
              {structureSubTab === 'fks' && (
                <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'auto' }}>
                  {(() => {
                    const currentTbl = schema?.tables?.find((t: any) => t.name === selectedTable);
                    if (!currentTbl || !currentTbl.foreign_keys || currentTbl.foreign_keys.length === 0) {
                      return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No foreign key constraints defined.</div>;
                    }

                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>Local Column</th>
                            <th style={{ padding: '8px 12px' }}>Referenced Table</th>
                            <th style={{ padding: '8px 12px' }}>Referenced Column</th>
                            <th style={{ padding: '8px 12px' }}>On Update</th>
                            <th style={{ padding: '8px 12px' }}>On Delete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTbl.foreign_keys.map((fk: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{fk.column}</td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--accent)' }}>{fk.referenced_table}</td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{fk.referenced_column}</td>
                              <td style={{ padding: '8px 12px', fontSize: '11px' }}>{fk.on_update || 'NO ACTION'}</td>
                              <td style={{ padding: '8px 12px', fontSize: '11px' }}>{fk.on_delete || 'NO ACTION'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {/* Sub-Tab 4: DDL */}
              {structureSubTab === 'ddl' && (
                <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Generated CREATE TABLE Statement</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tableDDL);
                        alert('DDL copied to clipboard!');
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Copy size={12} /> Copy DDL
                    </button>
                  </div>
                  <pre style={{ flex: 1, margin: 0, padding: '16px', overflow: 'auto', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-main)' }}>
                    {tableDDL || 'Loading DDL...'}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 3: MULTI-TAB SQL CONSOLE & QUERY WORKSPACE
          ========================================================================= */}
          {activeTab === 'console' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
              {/* Query Tabs Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                {queryTabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => setActiveQueryTabId(tab.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: activeQueryTabId === tab.id ? 'var(--bg-card)' : 'transparent',
                      border: '1px solid',
                      borderColor: activeQueryTabId === tab.id ? 'var(--border-color)' : 'transparent',
                      color: activeQueryTabId === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{tab.title}</span>
                    {queryTabs.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          const rem = queryTabs.filter((t) => t.id !== tab.id);
                          setQueryTabs(rem);
                          if (activeQueryTabId === tab.id) setActiveQueryTabId(rem[0].id);
                        }}
                        style={{ fontSize: '10px', opacity: 0.6 }}
                      >
                        ✕
                      </span>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newId = `tab-${queryTabs.length + 1}`;
                    setQueryTabs([
                      ...queryTabs,
                      {
                        id: newId,
                        title: `Query ${queryTabs.length + 1}`,
                        sql: 'SELECT * FROM ',
                        result: null,
                        error: null,
                        loading: false,
                        history: []
                      }
                    ]);
                    setActiveQueryTabId(newId);
                  }}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  title="New Query Tab"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* SQL Textarea Editor Card */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>SQL Statement</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          updateActiveTabSql(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px'
                      }}
                    >
                      <option value="" disabled>⚡ Snippets...</option>
                      <option value="SELECT * FROM table_name LIMIT 50;">SELECT * FROM ... LIMIT 50</option>
                      <option value="INSERT INTO table_name (col1, col2) VALUES ('val1', 'val2');">INSERT INTO ... VALUES</option>
                      <option value="UPDATE table_name SET col1 = 'val' WHERE id = 1;">UPDATE ... WHERE</option>
                      <option value="DELETE FROM table_name WHERE id = 1;">DELETE FROM ... WHERE</option>
                      <option value="CREATE INDEX idx_name ON table_name (column_name);">CREATE INDEX</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => updateActiveTabSql(formatSQL(activeTabObj.sql))}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      title="Format SQL Keywords"
                    >
                      ✨ Prettify
                    </button>
                    <button
                      onClick={handleExecuteQuery}
                      disabled={activeTabObj.loading}
                      style={{
                        padding: '4px 14px',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Play size={12} /> {activeTabObj.loading ? 'Running...' : 'Run Query (Cmd+Enter)'}
                    </button>
                  </div>
                </div>

                <textarea
                  value={activeTabObj.sql}
                  onChange={(e) => updateActiveTabSql(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleExecuteQuery();
                    }
                  }}
                  rows={4}
                  placeholder="SELECT * FROM table WHERE ... (Press Cmd+Enter to execute)"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Error Message Banner */}
              {activeTabObj.error && (
                <div style={{ padding: '10px', borderRadius: '4px', backgroundColor: 'rgba(248, 81, 73, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={14} />
                  <span>{activeTabObj.error}</span>
                </div>
              )}

              {/* Query Results Data Grid */}
              {activeTabObj.result && (
                <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 600 }}>
                        {activeTabObj.result.row_count ?? (activeTabObj.result.rows?.length || 0)} rows returned
                        {activeTabObj.result.affected_rows ? ` • ${activeTabObj.result.affected_rows} rows affected` : ''}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ⏱ {activeTabObj.result.duration_ms != null ? activeTabObj.result.duration_ms.toFixed(2) : '0.00'} ms
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          const cols = activeTabObj.result.columns || [];
                          const rowsList = activeTabObj.result.rows || [];
                          const headers = cols.join(',');
                          const rows = rowsList.map((r: any) =>
                            cols.map((c: string) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
                          );
                          const csv = [headers, ...rows].join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'query_results.csv';
                          a.click();
                        }}
                        style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        📥 CSV
                      </button>
                      <button
                        onClick={() => {
                          const json = JSON.stringify(activeTabObj.result.rows || [], null, 2);
                          const blob = new Blob([json], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'query_results.json';
                          a.click();
                        }}
                        style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        📥 JSON
                      </button>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '6px 8px', width: '35px', textAlign: 'center', color: 'var(--text-secondary)' }}>#</th>
                          {(activeTabObj.result.columns || []).map((c: string, idx: number) => (
                            <th key={idx} style={{ padding: '6px 10px', color: 'var(--text-primary)' }}>
                              {c}
                              {activeTabObj.result.column_types?.[idx] && (
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px', fontWeight: 'normal' }}>
                                  ({activeTabObj.result.column_types[idx]})
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {!activeTabObj.result.rows || activeTabObj.result.rows.length === 0 ? (
                          <tr>
                            <td colSpan={(activeTabObj.result.columns?.length || 0) + 1} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No rows returned by this query.
                            </td>
                          </tr>
                        ) : (
                          activeTabObj.result.rows.map((r: any, rIdx: number) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'monospace' }}>
                                {rIdx + 1}
                              </td>
                              {(activeTabObj.result.columns || []).map((c: string) => {
                                const val = r[c];
                                return (
                                  <td key={c} style={{ padding: '6px 10px', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {val === null || val === undefined ? (
                                      <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>NULL</span>
                                    ) : typeof val === 'boolean' ? (
                                      <span style={{ color: val ? 'var(--success)' : 'var(--danger)' }}>{String(val)}</span>
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 4: VISUAL ERD & RELATIONSHIP MAP
          ========================================================================= */}
          {activeTab === 'erd' && (
            <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Visual Entity-Relationship Map (ERD)</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Automatic foreign key relationship map across database tables
                  </span>
                </div>
                <button
                  onClick={() => loadERD(selectedConnId)}
                  disabled={loadingErd}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--accent)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={11} className={loadingErd ? 'spin' : ''} /> Reload Map
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {(!erdData || !erdData.nodes || erdData.nodes.length === 0) ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', gridColumn: '1/-1' }}>
                    {loadingErd ? 'Mapping database relationships...' : 'No tables available for ERD mapping.'}
                  </div>
                ) : (
                  erdData.nodes.map((node) => {
                    const edges = erdData.edges || [];
                    const outgoing = edges.filter((e: any) => (e.source || e.Source) === node.name);
                    return (
                      <div
                        key={node.id}
                        style={{
                          backgroundColor: 'var(--bg-main)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          overflow: 'hidden',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ padding: '8px 12px', backgroundColor: 'rgba(88, 166, 255, 0.1)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent)' }}>{node.name}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{node.columns?.length || 0} cols</span>
                        </div>

                        <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '6px' }}>
                          {(node.columns || []).map((c: any, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 6px', fontFamily: 'monospace' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {c.is_primary_key && <Key size={10} style={{ color: 'var(--accent)' }} />}
                                <span>{c.name}</span>
                              </span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{c.type}</span>
                            </div>
                          ))}
                        </div>

                        {outgoing.length > 0 && (
                          <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>RELATIONS:</div>
                            {outgoing.map((edge: any, idx: number) => {
                              const sCol = edge.source_col || edge.SourceCol;
                              const tgt = edge.target || edge.Target;
                              const tCol = edge.target_col || edge.TargetCol;
                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
                                  <LinkIcon size={10} />
                                  <span>{sCol} ➔ {tgt}.{tCol}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 5: SAFE EXPLAIN OPTIMIZER
          ========================================================================= */}
          {activeTab === 'explain' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', overflowY: 'auto' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>SQL EXPLAIN Plan Analyzer</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={explainSql}
                    onChange={(e) => setExplainSql(e.target.value)}
                    placeholder="Enter query to inspect execution plan..."
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontSize: '12px'
                    }}
                  />
                  <button
                    onClick={() => handleRunExplain()}
                    disabled={explainLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {explainLoading ? 'Analyzing...' : '🔍 Analyze Plan'}
                  </button>
                </div>
              </div>

              {explainResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>ACCESS TYPE</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: explainResult.plan_type === 'ALL' ? 'var(--danger)' : 'var(--success)', marginTop: '4px' }}>
                        {explainResult.plan_type}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>ESTIMATED ROWS</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                        {explainResult.rows_examined?.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>INDEX USED</div>
                      <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, marginTop: '6px' }}>
                        {explainResult.key_used || 'NONE'}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>ESTIMATED COST</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                        {explainResult.cost?.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Remediation & Index Recommendations */}
                  {(explainResult.proposed_index_sql || explainResult.proposed_migration_php) && (
                    <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)' }}>
                        🚀 RECOMMENDED OPTIMIZATIONS & MIGRATION
                      </div>
                      {explainResult.proposed_index_sql && (
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SQL Index:</span>
                          <pre style={{ margin: '4px 0', padding: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}>
                            {explainResult.proposed_index_sql}
                          </pre>
                        </div>
                      )}
                      {explainResult.proposed_migration_php && (
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Laravel Migration Code:</span>
                          <pre style={{ margin: '4px 0', padding: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}>
                            {explainResult.proposed_migration_php}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 6: SOLUTION ADVISOR (HEURISTICS & AI)
          ========================================================================= */}
          {activeTab === 'advisor' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Automated Workload & Solution Advisor</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Identifies N+1 query loops, missing composite indexes, and lock contentions.
                  </span>
                </div>
                <button
                  onClick={handleRunAdvisor}
                  disabled={advisorLoading}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {advisorLoading ? 'Analyzing Workload...' : '🚀 Run Workload Advisor'}
                </button>
              </div>

              {findings.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  No performance bottlenecks detected. Click "Run Workload Advisor" to analyze recorded SQL executions.
                </div>
              ) : (
                findings.map((f: any) => (
                  <div
                    key={f.id}
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '6px',
                      border: `1px solid ${f.severity === 'critical' ? 'var(--danger)' : 'var(--border-color)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', backgroundColor: f.severity === 'critical' ? 'var(--danger)' : 'var(--warning, #d29922)', color: '#fff' }}>
                          {f.severity?.toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>
                          {f.type === 'n_plus_one' ? 'N+1 Query Loop Detected' : f.type}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Status: <strong>{f.status}</strong>
                      </span>
                    </div>

                    <pre style={{ margin: 0, padding: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', overflow: 'auto' }}>
                      {f.evidence_json}
                    </pre>

                    {f.recommendations && f.recommendations.map((rec: any) => (
                      <div key={rec.id} style={{ padding: '10px', backgroundColor: 'rgba(88, 166, 255, 0.05)', borderRadius: '4px', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>SUGGESTED REFACTOR</div>
                        <div style={{ fontSize: '12px', marginTop: '2px' }}>{rec.rationale}</div>
                        {rec.proposed_code && (
                          <pre style={{ margin: '6px 0 0', padding: '6px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}>
                            {rec.proposed_code}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 7: LIVE TRACE QUERY ANALYTICS
          ========================================================================= */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['all', 'slow', 'frequent'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAnalyticsFilter(filter)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: analyticsFilter === filter ? 'var(--accent)' : 'transparent',
                        color: analyticsFilter === filter ? '#fff' : 'var(--text-secondary)',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      {filter === 'all' ? 'All Executions' : filter === 'slow' ? '⚠ Slow Only (>50ms)' : '🔥 Frequent (>5x)'}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Filter queries..."
                  value={analyticsSearch}
                  onChange={(e) => setAnalyticsSearch(e.target.value)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    width: '180px'
                  }}
                />
              </div>

              <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>SQL Template</th>
                      <th style={{ padding: '8px 12px' }}>Count</th>
                      <th style={{ padding: '8px 12px' }}>Total Time</th>
                      <th style={{ padding: '8px 12px' }}>Max Latency</th>
                      <th style={{ padding: '8px 12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sqlAnalytics
                      .filter((q) => {
                        if (analyticsFilter === 'slow' && !q.is_slow) return false;
                        if (analyticsFilter === 'frequent' && (q.execution_count || 0) < 5) return false;
                        if (analyticsSearch && !(q.sql_template || '').toLowerCase().includes(analyticsSearch.toLowerCase())) return false;
                        return true;
                      })
                      .map((q, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.sql_template}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{q.execution_count}x</td>
                          <td style={{ padding: '8px 12px' }}>{Math.round(q.total_duration_us / 1000)} ms</td>
                          <td style={{ padding: '8px 12px', color: q.is_slow ? 'var(--danger)' : 'inherit', fontWeight: q.is_slow ? 600 : 'normal' }}>
                            {Math.round(q.max_duration_us / 1000)} ms
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  setExplainSql(q.sql_template);
                                  setActiveTab('explain');
                                  handleRunExplain(q.sql_template);
                                }}
                                style={{ padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer' }}
                              >
                                🔍 Plan
                              </button>
                              <button
                                onClick={() => {
                                  updateActiveTabSql(q.sql_template);
                                  setActiveTab('console');
                                }}
                                style={{ padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}
                              >
                                ⚡ Console
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 8: MAINTENANCE & PROCESSLIST
          ========================================================================= */}
          {activeTab === 'maintenance' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', overflowY: 'auto' }}>
              {/* Stat Cards */}
              {dbStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>DATABASE SIZE</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{dbStats.size_formatted}</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>TABLE COUNT</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{dbStats.table_count} tables</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL ROWS</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{dbStats.total_rows != null ? dbStats.total_rows.toLocaleString() : '0'}</div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>ENGINE VERSION</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px', fontFamily: 'monospace' }}>{dbStats.version}</div>
                  </div>
                </div>
              )}

              {/* Maintenance Tools */}
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Database Optimization & Maintenance</span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                  Performs VACUUM, schema defragmentation, and query planner statistical analysis.
                </p>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={handleRunOptimize}
                    disabled={maintenanceLoading || safeMode}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: safeMode ? 'var(--bg-main)' : 'var(--accent)',
                      color: safeMode ? 'var(--text-secondary)' : '#fff',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: safeMode ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {maintenanceLoading ? 'Optimizing...' : '🧹 Run VACUUM & OPTIMIZE'}
                  </button>
                  {maintenanceMsg && (
                    <span style={{ fontSize: '12px', color: 'var(--success)' }}>✔ {maintenanceMsg}</span>
                  )}
                </div>
              </div>

              {/* Active Processlist */}
              <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600 }}>
                  ACTIVE THREADS & PROCESSES ({activeProcesses.length})
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px' }}>ID</th>
                        <th style={{ padding: '6px 10px' }}>User</th>
                        <th style={{ padding: '6px 10px' }}>Host</th>
                        <th style={{ padding: '6px 10px' }}>Database</th>
                        <th style={{ padding: '6px 10px' }}>State</th>
                        <th style={{ padding: '6px 10px' }}>Query / Command</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeProcesses.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{p.id}</td>
                          <td style={{ padding: '6px 10px' }}>{p.user}</td>
                          <td style={{ padding: '6px 10px' }}>{p.host}</td>
                          <td style={{ padding: '6px 10px' }}>{p.database || '-'}</td>
                          <td style={{ padding: '6px 10px' }}>{p.state || p.command}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{p.query || p.command}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 9: CONNECTION PROFILES MANAGEMENT
          ========================================================================= */}
          {activeTab === 'connections' && (
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '12px', height: '100%' }}>
              {/* Form */}
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Register Database Profile</span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                  Supports simultaneous SQLite, MySQL, MariaDB, and PostgreSQL connections like Navicat.
                </p>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    CONNECTION ALIAS
                  </label>
                  <input
                    type="text"
                    value={newConnName}
                    onChange={(e) => setNewConnName(e.target.value)}
                    placeholder="e.g. Docker MySQL Dev"
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    DATABASE ENGINE
                  </label>
                  <select
                    value={newConnDriver}
                    onChange={(e) => {
                      const d = e.target.value;
                      setNewConnDriver(d);
                      if (d === 'postgres') setNewConnPort('5432');
                      else if (d === 'mysql') setNewConnPort('3306');
                    }}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                  >
                    <option value="sqlite">📁 SQLite File</option>
                    <option value="mysql">🐬 MySQL / MariaDB</option>
                    <option value="postgres">🐘 PostgreSQL</option>
                  </select>
                </div>

                {newConnDriver === 'sqlite' ? (
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      SQLITE FILE PATH
                    </label>
                    <input
                      type="text"
                      value={newConnPath}
                      onChange={(e) => setNewConnPath(e.target.value)}
                      placeholder="./debug_studio.sqlite"
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          HOST
                        </label>
                        <input
                          type="text"
                          value={newConnHost}
                          onChange={(e) => setNewConnHost(e.target.value)}
                          placeholder="127.0.0.1"
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          PORT
                        </label>
                        <input
                          type="text"
                          value={newConnPort}
                          onChange={(e) => setNewConnPort(e.target.value)}
                          placeholder="3306"
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        DATABASE NAME
                      </label>
                      <input
                        type="text"
                        value={newConnDatabase}
                        onChange={(e) => setNewConnDatabase(e.target.value)}
                        placeholder="laravel_db"
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          USER
                        </label>
                        <input
                          type="text"
                          value={newConnUser}
                          onChange={(e) => setNewConnUser(e.target.value)}
                          placeholder="root"
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          PASSWORD
                        </label>
                        <input
                          type="password"
                          value={newConnPassword}
                          onChange={(e) => setNewConnPassword(e.target.value)}
                          placeholder="••••••••"
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Test Feedback */}
                {testResult && (
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: testResult.success ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
                      border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}`,
                      fontSize: '11px',
                      color: testResult.success ? 'var(--success)' : 'var(--danger)'
                    }}
                  >
                    {testResult.success ? `✔ Ping Latency: ${testResult.latency_ms?.toFixed(1)}ms | Version: ${testResult.version}` : `✖ ${testResult.message}`}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleTestRawConnection}
                    disabled={testingConn}
                    style={{ flex: 1, padding: '6px', backgroundColor: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {testingConn ? 'Testing...' : '⚡ Test Connection'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConnection}
                    style={{ flex: 1, padding: '6px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save Connection
                  </button>
                </div>
              </div>

              {/* Profiles List */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600 }}>
                  ACTIVE CONNECTIONS ({connections.length + 1})
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Default SQLite Profile */}
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '3px', backgroundColor: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 700 }}>SQLITE</span>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>Default SQLite Studio Database</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(Built-in)</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        ./debug_studio.sqlite • Read-Write Supported
                      </div>
                    </div>
                    {selectedConnId === 'default' ? (
                      <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>Active</span>
                    ) : (
                      <button
                        onClick={() => setSelectedConnId('default')}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-primary)', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Select
                      </button>
                    )}
                  </div>

                  {/* Registered Connections */}
                  {connections.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--bg-main)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '3px', backgroundColor: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                            {c.driver}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{c.name}</span>
                          {c.readonly && <span style={{ fontSize: '10px', color: 'var(--success)' }}>🔒 Read-Only</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'monospace' }}>
                          {c.config_json}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {selectedConnId === c.id ? (
                          <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600, padding: '4px 8px' }}>Active</span>
                        ) : (
                          <button
                            onClick={() => setSelectedConnId(c.id)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-primary)', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Select
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteConnection(c.id, c.name)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--danger)', background: 'none', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADD ROW DIALOG
      ========================================================================= */}
      {showInsertModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              width: '460px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '80vh'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Insert Row into `{selectedTable}`</span>
              <button
                onClick={() => setShowInsertModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tableData?.columns?.map((col: string) => {
                const isPK = col === tableData.primary_key;
                return (
                  <div key={col}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>{col}</span>
                      {isPK && <span style={{ color: 'var(--accent)' }}>PRIMARY KEY</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={isPK ? '(Auto-generated if empty)' : 'Value...'}
                      value={newRowData[col] || ''}
                      onChange={(e) => setNewRowData({ ...newRowData, [col]: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <button
                onClick={() => setShowInsertModal(false)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleInsertRow}
                style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', backgroundColor: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW CONNECTION (NAVICAT STYLE)
      ========================================================================= */}
      {showNewConnModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              width: '480px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>New Database Connection</span>
              <button
                onClick={() => setShowNewConnModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                  CONNECTION NAME
                </label>
                <input
                  type="text"
                  value={newConnName}
                  onChange={(e) => setNewConnName(e.target.value)}
                  placeholder="e.g. Production MySQL Replica"
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                  ENGINE
                </label>
                <select
                  value={newConnDriver}
                  onChange={(e) => {
                    const d = e.target.value;
                    setNewConnDriver(d);
                    if (d === 'postgres') setNewConnPort('5432');
                    else if (d === 'mysql') setNewConnPort('3306');
                  }}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                >
                  <option value="sqlite">📁 SQLite File</option>
                  <option value="mysql">🐬 MySQL / MariaDB</option>
                  <option value="postgres">🐘 PostgreSQL</option>
                </select>
              </div>

              {newConnDriver === 'sqlite' ? (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                    SQLITE PATH
                  </label>
                  <input
                    type="text"
                    value={newConnPath}
                    onChange={(e) => setNewConnPath(e.target.value)}
                    placeholder="./debug_studio.sqlite"
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                        HOST
                      </label>
                      <input
                        type="text"
                        value={newConnHost}
                        onChange={(e) => setNewConnHost(e.target.value)}
                        placeholder="127.0.0.1"
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                        PORT
                      </label>
                      <input
                        type="text"
                        value={newConnPort}
                        onChange={(e) => setNewConnPort(e.target.value)}
                        placeholder="3306"
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                      DATABASE
                    </label>
                    <input
                      type="text"
                      value={newConnDatabase}
                      onChange={(e) => setNewConnDatabase(e.target.value)}
                      placeholder="app_database"
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                        USERNAME
                      </label>
                      <input
                        type="text"
                        value={newConnUser}
                        onChange={(e) => setNewConnUser(e.target.value)}
                        placeholder="root"
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                        PASSWORD
                      </label>
                      <input
                        type="password"
                        value={newConnPassword}
                        onChange={(e) => setNewConnPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Test Connection Output */}
              {testResult && (
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: testResult.success ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
                    border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}`,
                    fontSize: '11px',
                    color: testResult.success ? 'var(--success)' : 'var(--danger)'
                  }}
                >
                  {testResult.success ? `✔ Ping Latency: ${testResult.latency_ms?.toFixed(1)}ms | Version: ${testResult.version}` : `✖ ${testResult.message}`}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={handleTestRawConnection}
                disabled={testingConn}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {testingConn ? 'Testing...' : '⚡ Test Connection'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewConnModal(false)}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConnection}
                  style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', backgroundColor: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
