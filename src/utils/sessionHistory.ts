import { HistoryEntry, SessionHistory, ToolId } from '../types';

export const sessionHistory: SessionHistory = {
  entries: [],
  sessionStart: Date.now(),
  totalProcessed: 0,
  totalInputSize: 0,
  totalOutputSize: 0,
  totalTimeSaved: 0,
};

const listeners = new Set<() => void>();

export function subscribeToHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyListeners() {
  listeners.forEach(l => {
    try {
      l();
    } catch (e) {
      console.error('History listener error', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ff-history-updated'));
  }
}

export function checkMemoryUsage() {
  let totalBlobSize = 0;
  sessionHistory.entries.forEach(e => {
    if (e.outputBlob) totalBlobSize += e.outputSize;
  });
  
  const LIMIT = 200 * 1024 * 1024; // 200MB
  if (totalBlobSize > LIMIT) {
    // Clear oldest blobs one by one until below limit
    const activeBlobs = [...sessionHistory.entries]
      .filter(e => e.outputBlob)
      .sort((a, b) => a.timestamp - b.timestamp);
      
    for (const item of activeBlobs) {
      if (totalBlobSize <= LIMIT) break;
      totalBlobSize -= item.outputSize;
      item.outputBlob = null;
      item.clearedDueToMemory = true;
    }
  }
}

export function addHistoryEntry(data: Omit<HistoryEntry, 'id' | 'timestamp'>) {
  const entry: HistoryEntry = {
    id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    ...data,
    timestamp: Date.now()
  };
  
  sessionHistory.entries.unshift(entry); // newest first
  sessionHistory.totalProcessed += data.isBatch ? data.batchCount : 1;
  sessionHistory.totalInputSize += data.inputSize;
  sessionHistory.totalOutputSize += data.outputSize;
  sessionHistory.totalTimeSaved += (data.inputSize - data.outputSize);
  
  // Max 50 entries per session
  if (sessionHistory.entries.length > 50) {
    const removed = sessionHistory.entries.pop();
    if (removed) {
      removed.outputBlob = null;
      removed.inputFile = null;
    }
  }
  
  checkMemoryUsage();
  notifyListeners();
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ff-history-added', { detail: entry }));
  }
}

export function clearHistory() {
  sessionHistory.entries.forEach(e => {
    e.outputBlob = null;
    e.inputFile = null;
  });
  sessionHistory.entries = [];
  sessionHistory.totalProcessed = 0;
  sessionHistory.totalInputSize = 0;
  sessionHistory.totalOutputSize = 0;
  sessionHistory.totalTimeSaved = 0;
  notifyListeners();
}

export function removeHistoryEntry(id: string) {
  const idx = sessionHistory.entries.findIndex(e => e.id === id);
  if (idx !== -1) {
    const removed = sessionHistory.entries[idx];
    removed.outputBlob = null;
    removed.inputFile = null;
    sessionHistory.entries.splice(idx, 1);
    notifyListeners();
  }
}
