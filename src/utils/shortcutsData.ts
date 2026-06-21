export interface ShortcutItem {
  keys: string;
  description: string;
  category: 'global' | 'files' | 'navigation' | 'image' | 'batch' | 'pdf' | 'merge';
  contextTag?: string;
  context: 'global' | 'image-enhance' | 'pdf' | 'batch' | 'merge-pdf';
  isGlobalColumn: boolean; // Left column (Global) vs Right column (Tool-specific)
}

export const SHORTCUTS_LIST: ShortcutItem[] = [
  // CATEGORY 1 — GLOBAL
  {
    keys: '?',
    description: 'Open/close shortcuts panel',
    category: 'global',
    contextTag: 'All tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Ctrl+K',
    description: 'Open tool search (spotlight-style)',
    category: 'global',
    contextTag: 'All tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Escape',
    description: 'Close any open panel/modal/drawer',
    category: 'global',
    contextTag: 'All tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Tab',
    description: 'Navigate between tools in sidebar',
    category: 'global',
    contextTag: 'All tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Ctrl+,',
    description: 'Open settings/preferences (Coming Soon)',
    category: 'global',
    contextTag: 'All tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'F11',
    description: 'Toggle fullscreen mode',
    category: 'global',
    contextTag: 'All tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Ctrl+Shift+D',
    description: 'Toggle dark/light mode',
    category: 'global',
    contextTag: 'All tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Shift+H',
    description: 'Toggle session history panel',
    category: 'global',
    contextTag: 'All tools',
    context: 'global',
    isGlobalColumn: true
  },

  // CATEGORY 2 — FILE OPERATIONS
  {
    keys: 'Ctrl+O',
    description: 'Open file browser for active tool',
    category: 'files',
    contextTag: 'Active tool',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Ctrl+V',
    description: 'Paste image from clipboard',
    category: 'files',
    contextTag: 'Image tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Ctrl+D',
    description: 'Download result (when ready)',
    category: 'files',
    contextTag: 'Active tool',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Ctrl+Shift+D',
    description: 'Download all as ZIP (batch mode)',
    category: 'files',
    contextTag: 'Batch mode',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Ctrl+R',
    description: 'Reset current tool / start over',
    category: 'files',
    contextTag: 'Active tool',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Delete',
    description: 'Remove selected file from queue',
    category: 'files',
    contextTag: 'Batch tools',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Ctrl+A',
    description: 'Select all files in batch queue',
    category: 'files',
    contextTag: 'Batch tools',
    context: 'global',
    isGlobalColumn: true
  },

  // CATEGORY 3 — TOOL NAVIGATION
  {
    keys: '1 - 9, 0, -',
    description: 'Switch between specific tools',
    category: 'navigation',
    contextTag: 'Sidebar navigation',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Alt+←',
    description: 'Go to previously used tool',
    category: 'navigation',
    contextTag: 'Navigation history',
    context: 'global',
    isGlobalColumn: true
  },
  {
    keys: 'Alt+→',
    description: 'Go to next tool in history',
    category: 'navigation',
    contextTag: 'Navigation history',
    context: 'global',
    isGlobalColumn: true
  },

  // CATEGORY 4 — IMAGE ENHANCER
  {
    keys: 'Ctrl+Z / Cmd+Z',
    description: 'Undo last adjustment',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'Ctrl+Y / Ctrl+Shift+Z',
    description: 'Redo last adjustment',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'Ctrl+Shift+R',
    description: 'Reset all enhancements to original',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'A',
    description: 'Auto Enhance image details',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'B',
    description: 'Focus Brightness slider',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'C',
    description: 'Focus Clarity slider',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'S',
    description: 'Focus Sharpness slider',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'N',
    description: 'Focus Noise Reduction slider',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: '[ / ]',
    description: 'Adjust active slider value (5%)',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'Shift+[ / Shift+]',
    description: 'Fine adjust active slider (1%)',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'H',
    description: 'Toggle enhancement history panel',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },
  {
    keys: 'Ctrl+S',
    description: 'Save/download enhanced image',
    category: 'image',
    contextTag: 'Image Enhancer',
    context: 'image-enhance',
    isGlobalColumn: false
  },

  // CATEGORY 5 — BATCH PROCESSING
  {
    keys: 'Ctrl+A',
    description: 'Select all files in batch mode',
    category: 'batch',
    contextTag: 'Batch processes',
    context: 'batch',
    isGlobalColumn: false
  },
  {
    keys: 'Shift+Click',
    description: 'Select range of files',
    category: 'batch',
    contextTag: 'Batch processes',
    context: 'batch',
    isGlobalColumn: false
  },
  {
    keys: 'Delete',
    description: 'Remove selected files from batch',
    category: 'batch',
    contextTag: 'Batch processes',
    context: 'batch',
    isGlobalColumn: false
  },
  {
    keys: 'Ctrl+Enter',
    description: 'Start processing all files',
    category: 'batch',
    contextTag: 'Batch processes',
    context: 'batch',
    isGlobalColumn: false
  },
  {
    keys: 'Escape',
    description: 'Cancel processing (if running)',
    category: 'batch',
    contextTag: 'Batch processes',
    context: 'batch',
    isGlobalColumn: false
  },
  {
    keys: 'Ctrl+Shift+A',
    description: 'Deselect all files',
    category: 'batch',
    contextTag: 'Batch processes',
    context: 'batch',
    isGlobalColumn: false
  },

  // CATEGORY 6 — PDF TOOLS
  {
    keys: 'Ctrl+Enter',
    description: 'Start processing/compress/convert',
    category: 'pdf',
    contextTag: 'PDF tools',
    context: 'pdf',
    isGlobalColumn: false
  },
  {
    keys: 'Ctrl+← / Ctrl+→',
    description: 'Prev / Next page preview',
    category: 'pdf',
    contextTag: 'PDF previewer',
    context: 'pdf',
    isGlobalColumn: false
  },
  {
    keys: '+ / -',
    description: 'Zoom in / Zoom out preview',
    category: 'pdf',
    contextTag: 'PDF previewer',
    context: 'pdf',
    isGlobalColumn: false
  },
  {
    keys: 'Ctrl+0 / 0',
    description: 'Reset zoom to fit container',
    category: 'pdf',
    contextTag: 'PDF previewer',
    context: 'pdf',
    isGlobalColumn: false
  },

  // CATEGORY 7 — MERGE PDF / REORDER:
  {
    keys: 'Ctrl+↑ / Ctrl+↓',
    description: 'Move selected file up / down',
    category: 'merge',
    contextTag: 'Merge PDF',
    context: 'merge-pdf',
    isGlobalColumn: false
  },
  {
    keys: 'Ctrl+Home / Ctrl+End',
    description: 'Move selected file to top / bottom',
    category: 'merge',
    contextTag: 'Merge PDF',
    context: 'merge-pdf',
    isGlobalColumn: false
  }
];
