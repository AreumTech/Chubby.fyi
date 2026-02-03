import React, { useState, useEffect } from 'react';
import { logger, LogEntry, LogLevel } from '@/utils/logger';
import { H2, BodyBase, Caption, MonoSmall } from '@/components/ui/Typography';

interface DebugLogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  trace: 'text-gray-400',
  debug: 'text-blue-600',
  info: 'text-green-600',
  warn: 'text-yellow-600',
  error: 'text-red-600'
};

const LOG_LEVEL_BADGES: Record<LogLevel, string> = {
  trace: 'bg-gray-100 text-gray-600',
  debug: 'bg-blue-100 text-blue-700',
  info: 'bg-green-100 text-green-700',
  warn: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700'
};

export const DebugLogViewer: React.FC<DebugLogViewerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true);

  // Update logs from buffer
  const updateLogs = () => {
    const allLogs = logger.getLogs();
    setLogs([...allLogs]);

    // Apply filters
    let filtered = allLogs;

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(log => log.category === categoryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(term) ||
        log.category.toLowerCase().includes(term) ||
        log.level.toLowerCase().includes(term)
      );
    }

    setFilteredLogs([...filtered]);
  };

  useEffect(() => {
    if (!isOpen) return;

    updateLogs();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(updateLogs, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, searchTerm, levelFilter, categoryFilter, autoRefresh]);

  // Auto-scroll to bottom when following
  useEffect(() => {
    if (isFollowing && filteredLogs.length > 0) {
      const logContainer = document.getElementById('log-container');
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }, [filteredLogs, isFollowing]);

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
    setFilteredLogs([]);
  };

  const exportLogs = () => {
    logger.exportLogs();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatArgs = (args: any[]) => {
    if (args.length === 0) return '';
    return args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
  };

  // Get unique categories for filter
  const availableCategories = Array.from(new Set(logs.map(log => log.category))).sort();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95%] h-[90%] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex justify-between items-center">
            <H2 color="primary">Enhanced Debug Log Viewer</H2>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <BodyBase>Auto-refresh</BodyBase>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFollowing}
                  onChange={(e) => setIsFollowing(e.target.checked)}
                />
                <BodyBase>Follow</BodyBase>
              </label>
              <button
                onClick={clearLogs}
                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                <BodyBase color="inverse">Clear</BodyBase>
              </button>
              <button
                onClick={exportLogs}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <BodyBase color="inverse">Export</BodyBase>
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                <BodyBase color="inverse">Close</BodyBase>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded"
            />

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
              className="p-2 border rounded"
            >
              <option value="all">All Levels</option>
              <option value="trace">Trace</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <BodyBase color="secondary">
            Showing {filteredLogs.length} of {logs.length} entries • Buffer: {logs.length}/2000
          </BodyBase>
        </div>

        {/* Log Display */}
        <div
          id="log-container"
          className="flex-1 overflow-auto p-4 bg-gray-900"
        >
          {filteredLogs.length > 0 ? (
            <div className="space-y-1">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-3 py-1 hover:bg-gray-800 rounded px-2">
                  <MonoSmall color="tertiary" className="shrink-0 w-20">
                    {formatTimestamp(log.timestamp)}
                  </MonoSmall>
                  <Caption weight="semibold" className={`shrink-0 px-2 py-0.5 rounded ${LOG_LEVEL_BADGES[log.level]}`}>
                    {log.level.toUpperCase()}
                  </Caption>
                  <MonoSmall color="info" className="shrink-0 w-16">
                    {log.category}
                  </MonoSmall>
                  <MonoSmall className="flex-1 break-words">
                    <span className="text-gray-100">{log.message}</span>
                    {log.args.length > 0 && (
                      <span className="text-gray-300 ml-2">{formatArgs(log.args)}</span>
                    )}
                  </MonoSmall>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center mt-8">
              <BodyBase color="tertiary" as="div">No logs found.</BodyBase>
              {searchTerm && <BodyBase color="tertiary" as="div">No matches for "{searchTerm}".</BodyBase>}
              {logs.length === 0 && (
                <BodyBase color="tertiary" className="mt-2" as="div">Start using the application to see logs here.</BodyBase>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <Caption color="secondary">Enhanced logging system with persistent buffer</Caption>
            <Caption color="secondary">Try console commands: setLogLevel("debug"), logStats(), logRecent()</Caption>
          </div>
        </div>
      </div>
    </div>
  );
};