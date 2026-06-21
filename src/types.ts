export type ToolId =
  | 'pdf-compress'
  | 'jpeg-compress'
  | 'image-resize'
  | 'image-enhance'
  | 'jpeg-to-pdf'
  | 'word-to-pdf'
  | 'excel-to-pdf'
  | 'pdf-to-image'
  | 'pdf-to-word'
  | 'merge-pdf'
  | 'split-pdf'
  | 'home';

export type ToolCategory = 'pdf' | 'image' | 'convert' | 'all';

export interface ToolMetadata {
  id: ToolId;
  name: string;
  description: string;
  icon: string; // Lucide icon name or React component key
  category: ToolCategory;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number; // 0 to 100
  statusText: string;
  error: string | null;
}

export interface CompressionResult {
  originalName: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  downloadUrl: string;
  downloadName: string;
}

export interface ReorderableFile {
  id: string;
  file: File;
  previewUrl?: string; // used for JPEG to PDF thumbnail list
  size: number;
  name: string;
  isPasted?: boolean; // added for clipboard pasted badge
}

export interface HistoryEntry {
  id: string;
  tool: ToolId;
  toolLabel: string;
  toolIcon: string;
  inputFilename: string;
  inputSize: number;
  inputFile: File | null;
  outputFilename: string;
  outputSize: number;
  outputBlob: Blob | null;
  settings: any;
  settingsLabel: string;
  elapsed: string;
  timestamp: number;
  status: 'success' | 'error';
  errorMessage: string | null;
  isBatch: boolean;
  batchCount: number;
  batchEntries?: Omit<HistoryEntry, 'id' | 'timestamp'>[];
  clearedDueToMemory?: boolean;
}

export interface SessionHistory {
  entries: HistoryEntry[];
  sessionStart: number;
  totalProcessed: number;
  totalInputSize: number;
  totalOutputSize: number;
  totalTimeSaved: number;
}

