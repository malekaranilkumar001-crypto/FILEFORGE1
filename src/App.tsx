import React, { useState } from 'react';
import { 
  FileText, Image as ImageIcon, RefreshCcw, Home, Menu, X, 
  Lock, CheckCircle2, FileDown, ImageDown, Maximize2, Sliders,
  FileImage, TrendingUp, FileCode, Files, Scissors,
  ShieldAlert, Layers, ArrowRight, HelpCircle, ExternalLink, Sparkles,
  Cloud, Settings, Download, Check
} from 'lucide-react';
import { ToolId, ToolCategory, SessionHistory } from './types';
import { TOOLS_LIST } from './utils/toolsData';
import { SEO_AND_CONTENT_MAP } from './utils/seoAndFaqData';
import { SHORTCUTS_LIST } from './utils/shortcutsData';
import { subscribeToHistory, clearHistory, removeHistoryEntry, sessionHistory } from './utils/sessionHistory';
import { formatFileSize } from './utils/fileHelpers';
import ToolsContainer from './components/ToolsContainer';
import HomepageComparisonTable from './components/HomepageComparisonTable';
import { 
  PwaManager, 
  PwaCacheStatusWidget, 
  PwaInstallNavbarButton, 
  useOnlineStatus,
  openPwaSettings
} from './components/PwaManager';
import { motion, AnimatePresence } from 'motion/react';

// Icon mapper helper
const getToolIcon = (iconName: string) => {
  switch (iconName) {
    case 'FileDown': return <FileDown className="w-5 h-5" />;
    case 'ImageDown': return <ImageDown className="w-5 h-5" />;
    case 'Maximize2': return <Maximize2 className="w-5 h-5" />;
    case 'Sliders': return <Sliders className="w-5 h-5" />;
    case 'FileImage': return <FileImage className="w-5 h-5" />;
    case 'FileText': return <FileText className="w-5 h-5" />;
    case 'TrendingUp': return <TrendingUp className="w-5 h-5" />;
    case 'FolderImage': return <Layers className="w-5 h-5" />;
    case 'FileCode': return <FileCode className="w-5 h-5" />;
    case 'Files': return <Files className="w-5 h-5" />;
    case 'Scissors': return <Scissors className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const getRelativeTimeString = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const urlToToolMap: Record<string, ToolId | 'privacy' | 'home'> = {
  '/': 'home',
  '/index.html': 'home',
  '/pdf-compressor': 'pdf-compress',
  '/jpeg-compressor': 'jpeg-compress',
  '/image-resizer': 'image-resize',
  '/image-enhancer': 'image-enhance',
  '/jpg-to-pdf': 'jpeg-to-pdf',
  '/word-to-pdf': 'word-to-pdf',
  '/excel-to-pdf': 'excel-to-pdf',
  '/pdf-to-image': 'pdf-to-image',
  '/pdf-to-word': 'pdf-to-word',
  '/merge-pdf': 'merge-pdf',
  '/split-pdf': 'split-pdf',
  '/privacy': 'privacy',
};

const toolToUrlMap: Record<ToolId | 'privacy', string> = {
  'home': '/',
  'pdf-compress': '/pdf-compressor',
  'jpeg-compress': '/jpeg-compressor',
  'image-resize': '/image-resizer',
  'image-enhance': '/image-enhancer',
  'jpeg-to-pdf': '/jpg-to-pdf',
  'word-to-pdf': '/word-to-pdf',
  'excel-to-pdf': '/excel-to-pdf',
  'pdf-to-image': '/pdf-to-image',
  'pdf-to-word': '/pdf-to-word',
  'merge-pdf': '/merge-pdf',
  'split-pdf': '/split-pdf',
  'privacy': '/privacy',
};

function setMeta(name: string, content: string) {
  let el = document.querySelector(
    `meta[name="${name}"], meta[property="${name}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    const attr = name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name';
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function updateStructuredData(data: any) {
  let el = document.getElementById('structured-data') as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = 'structured-data';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function updateSEO(path: string) {
  let cleanPath = path;
  if (cleanPath.endsWith('/') && cleanPath.length > 1) {
    cleanPath = cleanPath.slice(0, -1);
  }
  
  const key = urlToToolMap[cleanPath] || 'home';
  const seoData = SEO_AND_CONTENT_MAP[key];
  if (!seoData) return;
  
  document.title = seoData.title;
  setMeta('description', seoData.description);
  setMeta('keywords', seoData.keywords);
  setLink('canonical', 'https://yoursite.com' + cleanPath);
  setMeta('og:title', seoData.ogTitle);
  setMeta('og:description', seoData.ogDescription);
  setMeta('og:url', 'https://yoursite.com' + cleanPath);
  setMeta('og:type', 'website');
  setMeta('og:image', 'https://yoursite.com/og-image.png');
  setMeta('og:site_name', 'FileForge');
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', seoData.ogTitle);
  setMeta('twitter:description', seoData.ogDescription);
  
  if (key !== 'home' && key !== 'privacy' && seoData.faqs && seoData.faqs.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': seoData.faqs.map(f => ({
        '@type': 'Question',
        'name': f.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': f.answer
        }
      }))
    };
    updateStructuredData([seoData.structuredData, faqSchema]);
  } else {
    updateStructuredData(seoData.structuredData);
  }
}

export default function App() {
  const isOnline = useOnlineStatus();
  const [activeTool, setActiveTool] = useState<ToolId>('home');
  const [is404, setIs404] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // FEATURE: Theme initialization
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('fileforge-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  });

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('fileforge-theme', newTheme);
  };

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: d)'); // dummy to align with schema
    
    // Listen for system theme preference changes
    const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('fileforge-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    systemQuery.addEventListener('change', handleSystemThemeChange);

    const timer = setTimeout(() => {
      document.documentElement.classList.remove('no-transition');
    }, 100);

    return () => {
      clearTimeout(timer);
      systemQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  // FEATURE 1 & 3: Privacy States & responsive measurements
  const [bannerVisible, setBannerVisible] = useState(() => !localStorage.getItem('privacyBannerDismissed'));
  
  // --- SESSION CORE HISTORY STATE & SUBSCRIPTION ---
  const [history, setHistory] = useState<SessionHistory>({ ...sessionHistory });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const touchStartRef = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartRef.current;
    if (diff > 80) { // Swiped right dynamically
      setHistoryOpen(false);
    }
  };

  React.useEffect(() => {
    return subscribeToHistory(() => {
      setHistory({ ...sessionHistory });
    });
  }, []);

  const triggerReprocess = (entry: any) => {
    setHistoryOpen(false); // Side drawer sliding close
    setShortcutsOpen(false);
    
    // Switch tool
    setActiveTool(entry.tool);
    
    // Stagger dispatch so target tool mounts and state updates
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ff-reprocess-entry', { detail: entry }));
    }, 150);
  };

  // --- KEYBOARD SHORTCUTS SYSTEM STATES ---
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [spotlightSelectedIndex, setSpotlightSelectedIndex] = useState(0);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [flashingTool, setFlashingTool] = useState<ToolId | null>(null);
  const [slideTransitionDirection, setSlideTransitionDirection] = useState<'left' | 'right' | null>(null);

  const [discoveredShortcutsCount, setDiscoveredShortcutsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fileforge-shortcuts-used');
      return saved ? JSON.parse(saved).length : 0;
    } catch {
      return 0;
    }
  });

  const [feedbackToast, setFeedbackToast] = useState<{
    keys: string[];
    description: string;
    isUnlockedCelebration?: boolean;
    timestamp: number;
  } | null>(null);

  React.useEffect(() => {
    if (feedbackToast) {
      const timer = setTimeout(() => {
        setFeedbackToast(null);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [feedbackToast?.timestamp]);

  const [showIntroBadge, setShowIntroBadge] = useState(false);
  const [showIntroTooltip, setShowIntroTooltip] = useState(false);

  React.useEffect(() => {
    const status = localStorage.getItem('fileforge-shortcuts-intro');
    if (status === 'shown') return;

    const badgeTimer = setTimeout(() => {
      setShowIntroBadge(true);
    }, 10000);

    const tooltipTimer = setTimeout(() => {
      setShowIntroTooltip(true);
    }, 12000);

    const dismissTooltipTimer = setTimeout(() => {
      setShowIntroTooltip(false);
      localStorage.setItem('fileforge-shortcuts-intro', 'shown');
    }, 18000);

    return () => {
      clearTimeout(badgeTimer);
      clearTimeout(tooltipTimer);
      clearTimeout(dismissTooltipTimer);
    };
  }, []);

  const [toolHistory, setToolHistory] = useState<ToolId[]>(['home']);
  const [toolHistoryIndex, setToolHistoryIndex] = useState<number>(0);
  const skipHistoryRef = React.useRef(false);

  React.useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    if (toolHistory[toolHistoryIndex] === activeTool) return;

    const newHistory = toolHistory.slice(0, toolHistoryIndex + 1);
    newHistory.push(activeTool);
    if (newHistory.length > 20) {
      newHistory.shift();
    }
    setToolHistory(newHistory);
    setToolHistoryIndex(newHistory.length - 1);
  }, [activeTool]);

  const triggerShortcutFeedback = (keysStr: string, description: string) => {
    if (keysStr === '?') return; // Opening panel itself is sufficient feedback
    if (keysStr.toLowerCase().includes('ctrl+z') || keysStr.toLowerCase().includes('ctrl+y')) return; // Undo/redo already has separate toasts

    const enabled = localStorage.getItem('fileforge-shortcut-feedback') !== 'disabled';
    if (!enabled) return;

    const discoveredStr = localStorage.getItem('fileforge-shortcuts-used') || '[]';
    let discovered: string[] = [];
    try {
      discovered = JSON.parse(discoveredStr);
    } catch {
      discovered = [];
    }

    const normalizedKey = keysStr.toLowerCase();
    const isFirstTime = !discovered.includes(normalizedKey);

    if (isFirstTime) {
      discovered.push(normalizedKey);
      localStorage.setItem('fileforge-shortcuts-used', JSON.stringify(discovered));
      setDiscoveredShortcutsCount(discovered.length);

      setFeedbackToast({
        keys: keysStr.split('+'),
        description: `🎉 New shortcut unlocked: ${description}`,
        isUnlockedCelebration: true,
        timestamp: Date.now()
      });
    } else {
      setFeedbackToast({
        keys: keysStr.split('+'),
        description,
        isUnlockedCelebration: false,
        timestamp: Date.now()
      });
    }
  };

  const dismissIntroSOP = () => {
    setShowIntroBadge(false);
    setShowIntroTooltip(false);
    localStorage.setItem('fileforge-shortcuts-intro', 'shown');
  };

  const toggleShortcutsPanel = () => {
    dismissIntroSOP();
    setShortcutsOpen(prev => !prev);
  };

  const triggerResetShortcuts = () => {
    window.dispatchEvent(new CustomEvent('ff-shortcut-reset'));
    setShowResetConfirmation(false);
  };

  const triggerToolSwitchWithHistory = (toolId: ToolId) => {
    setFlashingTool(toolId);
    setActiveTool(toolId);
    setTimeout(() => {
      setFlashingTool(null);
    }, 400);
  };

  const handleGoBackInHistory = () => {
    if (toolHistoryIndex > 0) {
      const prevIndex = toolHistoryIndex - 1;
      const prevTool = toolHistory[prevIndex];
      skipHistoryRef.current = true;
      setToolHistoryIndex(prevIndex);
      setActiveTool(prevTool);

      const toolName = prevTool === 'home' ? 'Control Hub' : TOOLS_LIST.find(t => t.id === prevTool)?.name || prevTool;
      triggerShortcutFeedback('Alt+←', `Back to ${toolName}`);
      
      setSlideTransitionDirection('left');
      setTimeout(() => setSlideTransitionDirection(null), 300);
    }
  };

  const handleGoForwardInHistory = () => {
    if (toolHistoryIndex < toolHistory.length - 1) {
      const nextIndex = toolHistoryIndex + 1;
      const nextTool = toolHistory[nextIndex];
      skipHistoryRef.current = true;
      setToolHistoryIndex(nextIndex);
      setActiveTool(nextTool);

      const toolName = nextTool === 'home' ? 'Control Hub' : TOOLS_LIST.find(t => t.id === nextTool)?.name || nextTool;
      triggerShortcutFeedback('Alt+→', `Forward to ${toolName}`);

      setSlideTransitionDirection('right');
      setTimeout(() => setSlideTransitionDirection(null), 300);
    }
  };

  const handleEscapeKey = () => {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    if (spotlightOpen) {
      setSpotlightOpen(false);
      return;
    }
    if (shortcutsOpen) {
      setShortcutsOpen(false);
      return;
    }
    if (privacyOpen) {
      setPrivacyOpen(false);
      return;
    }
    if (showResetConfirmation) {
      setShowResetConfirmation(false);
      return;
    }
    window.dispatchEvent(new CustomEvent('ff-shortcut-escape'));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const [isBannerClosing, setIsBannerClosing] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Hook up sync effect for History URL tracking
  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      let cleanPath = path;
      if (cleanPath.endsWith('/') && cleanPath.length > 1) {
        cleanPath = cleanPath.slice(0, -1);
      }
      
      const mapped = urlToToolMap[cleanPath];
      if (mapped === 'privacy') {
        setPrivacyOpen(true);
        setActiveTool('home');
        setIs404(false);
      } else if (mapped === 'home') {
        setPrivacyOpen(false);
        setActiveTool('home');
        setIs404(false);
      } else if (mapped) {
        setPrivacyOpen(false);
        setActiveTool(mapped as ToolId);
        setIs404(false);
      } else {
        if (cleanPath === '' || cleanPath === '/') {
          setPrivacyOpen(false);
          setActiveTool('home');
          setIs404(false);
        } else {
          setPrivacyOpen(false);
          setActiveTool('home');
          setIs404(true);
        }
      }
      updateSEO(cleanPath);
    };

    window.addEventListener('popstate', handlePopState);
    
    const handleDataNavClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('[data-navigate]');
      if (link) {
        e.preventDefault();
        const path = link.getAttribute('data-navigate');
        if (path) {
          window.history.pushState({}, '', path);
          handlePopState();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };
    document.addEventListener('click', handleDataNavClick);

    handlePopState();

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDataNavClick);
    };
  }, []);

  // Sync state changes back to url
  React.useEffect(() => {
    let expectedPath = '/';
    if (is404) {
      expectedPath = window.location.pathname;
    } else if (privacyOpen) {
      expectedPath = '/privacy';
    } else if (activeTool && activeTool !== 'home') {
      expectedPath = toolToUrlMap[activeTool] || '/';
    }

    if (window.location.pathname !== expectedPath && !is404) {
      window.history.pushState({}, '', expectedPath);
      updateSEO(expectedPath);
    }
  }, [activeTool, privacyOpen, is404]);

  // Homepage paste toast states
  const [homepageToast, setHomepageToast] = useState<{ visible: boolean; text: string } | null>(null);

  React.useEffect(() => {
    if (activeTool !== 'home') return;
    const handlePaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable);
      if (isTyping) return;
      
      setHomepageToast({ visible: true, text: "📋 Select a tool first to paste your image" });
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeTool]);

  React.useEffect(() => {
    if (homepageToast?.visible) {
      const timer = setTimeout(() => {
        setHomepageToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [homepageToast?.visible]);

  const TOOL_KEYS: Record<string, string> = {
    'pdf-compress': '1',
    'jpeg-compress': '2',
    'image-resize': '3',
    'image-enhance': '4',
    'jpeg-to-pdf': '5',
    'word-to-pdf': '6',
    'excel-to-pdf': '7',
    'pdf-to-image': '8',
    'pdf-to-word': '9',
    'merge-pdf': '0',
    'split-pdf': '-'
  };

  const KEY_TO_TOOL_MAP: Record<string, ToolId> = {
    '1': 'pdf-compress',
    '2': 'jpeg-compress',
    '3': 'image-resize',
    '4': 'image-enhance',
    '5': 'jpeg-to-pdf',
    '6': 'word-to-pdf',
    '7': 'excel-to-pdf',
    '8': 'pdf-to-image',
    '9': 'pdf-to-word',
    '0': 'merge-pdf',
    '-': 'split-pdf'
  };

  // Spotlight search source generation
  const getRecentTools = () => {
    const uniques: ToolId[] = [];
    for (let i = toolHistoryIndex; i >= 0; i--) {
      const tool = toolHistory[i];
      if (tool && tool !== 'home' && !uniques.includes(tool)) {
        uniques.push(tool);
        if (uniques.length === 3) break;
      }
    }
    const fallbacks: ToolId[] = ['pdf-compress', 'jpeg-compress', 'image-enhance'];
    for (const fb of fallbacks) {
      if (uniques.length < 3 && fb !== activeTool && !uniques.includes(fb)) {
        uniques.push(fb);
      }
    }
    return uniques;
  };

  const toolsResults = TOOLS_LIST.filter(t => 
    t.name.toLowerCase().includes(spotlightQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(spotlightQuery.toLowerCase())
  ).map(t => ({
    type: 'tool' as const,
    id: t.id,
    name: t.name,
    description: t.description || '',
    badgeText: `Press ${TOOL_KEYS[t.id]}`,
    categoryName: t.category === 'pdf' ? 'PDF Tools' : t.category === 'image' ? 'Image Tools' : 'Converters',
    action: () => triggerToolSwitchWithHistory(t.id)
  }));

  const actionsList = [
    {
      name: 'Compress / Execute Active Tool',
      shortcut: 'Ctrl+Enter',
      keywords: 'compress process execute convert merge split resize run click stitch',
      action: () => window.dispatchEvent(new CustomEvent('ff-shortcut-process'))
    },
    {
      name: 'Download Processed Result',
      shortcut: 'Ctrl+D',
      keywords: 'download save export file result zip image clear',
      action: () => window.dispatchEvent(new CustomEvent('ff-shortcut-download'))
    },
    {
      name: 'Download All results as ZIP',
      shortcut: 'Ctrl+Shift+D',
      keywords: 'download all zip archive export batch list save',
      action: () => window.dispatchEvent(new CustomEvent('ff-shortcut-download-all'))
    },
    {
      name: 'Reset Current Tool / Start Over',
      shortcut: 'Ctrl+R',
      keywords: 'reset clear start over remove files clean delete purge trash',
      action: () => triggerResetShortcuts()
    },
    {
      name: 'Auto Enhance Image Details',
      shortcut: 'A',
      keywords: 'auto enhance clarify brighten image sharp contrast enhancer boost optimize',
      action: () => window.dispatchEvent(new CustomEvent('ff-shortcut-auto-enhance'))
    },
    {
      name: 'Toggle Dark / Light Theme Mode',
      shortcut: 'Ctrl+Shift+D',
      keywords: 'dark light theme mode toggle contrast color gray background styles white black custom desktop mobile',
      action: () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
      }
    },
    {
      name: 'Show Keyboard Shortcuts Reference',
      shortcut: '?',
      keywords: 'help shortcuts keys cheatsheet panel questions instructions binds commands keymaps dashboard list helpful hints info',
      action: () => { setShortcutsOpen(true); }
    },
    {
      name: 'Toggle Fullscreen Mode',
      shortcut: 'F11',
      keywords: 'fullscreen expand screen wide maximize focus desktop window layout space',
      action: () => toggleFullscreen()
    }
  ];

  const actionsResults = actionsList.filter(a => 
    a.name.toLowerCase().includes(spotlightQuery.toLowerCase()) ||
    a.keywords.toLowerCase().includes(spotlightQuery.toLowerCase())
  ).map(a => ({
    type: 'action' as const,
    id: `action-${a.name}`,
    name: a.name,
    description: a.shortcut,
    badgeText: a.shortcut,
    action: a.action
  }));

  const shortcutResultsList = SHORTCUTS_LIST.filter(s => 
    s.description.toLowerCase().includes(spotlightQuery.toLowerCase()) ||
    s.keys.toLowerCase().includes(spotlightQuery.toLowerCase())
  ).map(s => ({
    type: 'shortcut' as const,
    id: `shortcut-${s.keys}-${s.description}`,
    name: s.description,
    description: s.contextTag || 'Global',
    badgeText: s.keys,
    action: () => {
      if (s.context !== 'global') {
        let targetTool: ToolId | undefined;
        if (s.context === 'image-enhance') targetTool = 'image-enhance';
        else if (s.context === 'merge-pdf') targetTool = 'merge-pdf';
        else if (s.context === 'pdf') targetTool = 'pdf-compress';
        else if (s.context === 'batch') targetTool = 'pdf-compress';
        
        if (targetTool) {
          triggerToolSwitchWithHistory(targetTool);
          triggerShortcutFeedback('Ctrl+K', `Switched to ${TOOLS_LIST.find(t=>t.id===targetTool)?.name} to use shortcut`);
          return;
        }
      }
      triggerShortcutFeedback('Ctrl+K', `Shortcut: ${s.description}`);
    }
  }));

  const spotlightResults = [...toolsResults, ...actionsResults, ...shortcutResultsList];

  const highlightText = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="text-[var(--accent)] font-bold bg-[var(--accent)]/15 px-1 rounded">{part}</span>
            : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping = active && (
        (active.tagName === 'INPUT' && (active as HTMLInputElement).type !== 'range') ||
        active.tagName === 'TEXTAREA' ||
        (active as HTMLElement).isContentEditable
      );

      if (e.key === 'Escape') {
        e.preventDefault();
        handleEscapeKey();
        return;
      }

      if (isTyping) return;

      const keyUpper = e.key.toUpperCase();
      const keyLower = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;
      const isShift = e.shiftKey;

      if (e.key === '?' || (e.key === '/' && isShift)) {
        e.preventDefault();
        toggleShortcutsPanel();
        return;
      }

      if (keyLower === 'h' && isShift) {
        e.preventDefault();
        setHistoryOpen(prev => !prev);
        triggerShortcutFeedback('Shift+H', !historyOpen ? 'Opened history' : 'Closed history');
        return;
      }

      if (isCtrl && keyLower === 'k') {
        e.preventDefault();
        setSpotlightOpen(prev => {
          const next = !prev;
          if (next) {
            setSpotlightQuery('');
            setSpotlightSelectedIndex(0);
            dismissIntroSOP();
          }
          return next;
        });
        triggerShortcutFeedback('Ctrl+K', spotlightOpen ? 'Closed search' : 'Opened search');
        return;
      }

      if (spotlightOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSpotlightSelectedIndex(prev => (prev + 1) % Math.max(1, spotlightResults.length));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSpotlightSelectedIndex(prev => (prev - 1 + spotlightResults.length) % Math.max(1, spotlightResults.length));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const selected = spotlightResults[spotlightSelectedIndex];
          if (selected) {
            selected.action();
            setSpotlightOpen(false);
          }
          return;
        }
      }

      if (isCtrl && e.key === ',') {
        e.preventDefault();
        setHomepageToast({ visible: true, text: "⚙ Settings & Core Keymaps — Coming Soon in next release" });
        triggerShortcutFeedback('Ctrl+,', 'Settings panel loaded');
        return;
      }

      if (e.key === 'F11') {
        triggerShortcutFeedback('F11', 'Toggled Fullscreen View');
        return;
      }

      if (isCtrl && isShift && keyLower === 'd') {
        const hasResult = document.body.hasAttribute('data-result-ready');
        const isBatch = document.body.hasAttribute('data-batch-mode');
        
        if (hasResult && isBatch) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-download-all'));
          triggerShortcutFeedback('Ctrl+Shift+D', 'Downloading all as ZIP');
          return;
        }

        e.preventDefault();
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        triggerShortcutFeedback('Ctrl+Shift+D', `Theme switched to ${nextTheme}`);
        return;
      }

      if (isAlt && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBackInHistory();
        return;
      }
      if (isAlt && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForwardInHistory();
        return;
      }

      if (e.key === 'Tab' && !isCtrl && !isAlt && !isShift) {
        const isPanelOpen = shortcutsOpen || spotlightOpen || showResetConfirmation || privacyOpen;
        if (!isPanelOpen) {
          e.preventDefault();
          const sequence: ToolId[] = [
            'home', 'pdf-compress', 'jpeg-compress', 'image-resize', 'image-enhance',
            'jpeg-to-pdf', 'word-to-pdf', 'excel-to-pdf', 'pdf-to-image', 'pdf-to-word',
            'merge-pdf', 'split-pdf'
          ];
          const currentIndex = sequence.indexOf(activeTool);
          const nextIndex = (currentIndex + 1) % sequence.length;
          triggerToolSwitchWithHistory(sequence[nextIndex]);
          
          const nextName = sequence[nextIndex] === 'home' ? 'Control Hub' : TOOLS_LIST.find(t=>t.id===sequence[nextIndex])?.name || sequence[nextIndex];
          triggerShortcutFeedback('Tab', `Selected: ${nextName}`);
          return;
        }
      }

      const isPanelOpen = shortcutsOpen || spotlightOpen || showResetConfirmation || privacyOpen;
      if (!isPanelOpen && KEY_TO_TOOL_MAP[e.key] !== undefined) {
        e.preventDefault();
        const targetTool = KEY_TO_TOOL_MAP[e.key];
        triggerToolSwitchWithHistory(targetTool);
        
        const toolName = TOOLS_LIST.find(t=>t.id===targetTool)?.name || targetTool;
        triggerShortcutFeedback(e.key, `Switched to ${toolName}`);
        return;
      }

      if (isCtrl && keyLower === 'o') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('ff-shortcut-browse'));
        triggerShortcutFeedback('Ctrl+O', 'Opening file selector');
        return;
      }

      if (isCtrl && keyLower === 'd') {
        const hasResult = document.body.hasAttribute('data-result-ready');
        if (hasResult) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-download'));
          triggerShortcutFeedback('Ctrl+D', 'Downloading processed files');
        }
        return;
      }

      if (isCtrl && keyLower === 'r') {
        const hasFiles = document.body.hasAttribute('data-has-files');
        if (hasFiles) {
          e.preventDefault();
          setShowResetConfirmation(true);
          triggerShortcutFeedback('Ctrl+R', 'Reset confirmation required');
          return;
        }
      }

      if (isCtrl && e.key === 'Enter') {
        const hasFiles = document.body.hasAttribute('data-has-files');
        if (hasFiles) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-process'));
          triggerShortcutFeedback('Ctrl+Enter', 'Stitching and executing tool');
          return;
        }
      }

      if (e.key === 'Delete') {
        const hasFiles = document.body.hasAttribute('data-has-files');
        if (hasFiles) {
          window.dispatchEvent(new CustomEvent('ff-shortcut-delete'));
          triggerShortcutFeedback('Delete', 'Removing file from queue');
          return;
        }
      }

      if (isCtrl && keyLower === 'a') {
        const hasFiles = document.body.hasAttribute('data-has-files');
        const isBatch = document.body.hasAttribute('data-batch-mode');
        if (hasFiles && isBatch) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-select-all'));
          triggerShortcutFeedback('Ctrl+A', 'Selected all file items');
          return;
        }
      }

      if (isCtrl && isShift && keyLower === 'a') {
        const hasFiles = document.body.hasAttribute('data-has-files');
        const isBatch = document.body.hasAttribute('data-batch-mode');
        if (hasFiles && isBatch) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-deselect-all'));
          triggerShortcutFeedback('Ctrl+Shift+A', 'Deselected all file items');
          return;
        }
      }

      const isPdfTool = ['pdf-compress', 'pdf-to-image', 'merge-pdf', 'split-pdf'].includes(activeTool);
      if (isPdfTool) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-zoom-in'));
          triggerShortcutFeedback('+', 'Zoom in PDF preview');
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-zoom-out'));
          triggerShortcutFeedback('-', 'Zoom out PDF preview');
          return;
        }
        if ((isCtrl && e.key === '0') || e.key === '0') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-zoom-reset'));
          triggerShortcutFeedback(e.key === '0' ? '0' : 'Ctrl+0', 'Reset PDF zoom to fit');
          return;
        }
        if (isCtrl && e.key === 'ArrowLeft') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-prev-page'));
          triggerShortcutFeedback('Ctrl+←', 'Previous Page Preview');
          return;
        }
        if (isCtrl && e.key === 'ArrowRight') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-next-page'));
          triggerShortcutFeedback('Ctrl+→', 'Next Page Preview');
          return;
        }
      }

      if (activeTool === 'merge-pdf') {
        if (isCtrl && e.key === 'ArrowUp') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-move-up'));
          triggerShortcutFeedback('Ctrl+↑', 'Moved selected PDF item up');
          return;
        }
        if (isCtrl && e.key === 'ArrowDown') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-move-down'));
          triggerShortcutFeedback('Ctrl+↓', 'Moved selected PDF item down');
          return;
        }
        if (isCtrl && e.key === 'Home') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-move-top'));
          triggerShortcutFeedback('Ctrl+Home', 'Moved selected PDF item to top');
          return;
        }
        if (isCtrl && e.key === 'End') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-move-bottom'));
          triggerShortcutFeedback('Ctrl+End', 'Moved selected PDF item to bottom');
          return;
        }
      }

      if (activeTool === 'image-enhance') {
        const sliderKeys = ['b', 'c', 's', 'n'];
        if (sliderKeys.includes(keyLower)) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-slider-focus', { detail: { slider: keyLower } }));
          const sliderNames: Record<string, string> = { b: 'Brightness', c: 'Clarity', s: 'Sharpness', n: 'Noise Reduction' };
          triggerShortcutFeedback(keyUpper, `Focused: ${sliderNames[keyLower]}`);
          return;
        }

        if (e.key === '[' || e.key === ']') {
          e.preventDefault();
          const direction = e.key === ']' ? 'increase' : 'decrease';
          const amount = isShift ? 1 : 5;
          window.dispatchEvent(new CustomEvent('ff-shortcut-slider-adjust', { detail: { direction, amount } }));
          const comboStr = isShift ? `Shift+${e.key}` : e.key;
          const descStr = direction === 'increase' ? `Accent increased by +${amount}%` : `Accent decreased by -${amount}%`;
          triggerShortcutFeedback(comboStr, descStr);
          return;
        }

        if (keyLower === 'h') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-toggle-history'));
          triggerShortcutFeedback('H', 'Toggled enhancements history');
          return;
        }

        if (keyLower === 'a') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-auto-enhance'));
          triggerShortcutFeedback('A', 'Applying AI Auto enhancement');
          return;
        }

        if (isCtrl && keyLower === 's') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ff-shortcut-download'));
          triggerShortcutFeedback('Ctrl+S', 'Downloading enhanced image');
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTool,
    theme,
    shortcutsOpen,
    spotlightOpen,
    spotlightSelectedIndex,
    showResetConfirmation,
    privacyOpen,
    toolHistory,
    toolHistoryIndex
  ]);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleDismissBanner = () => {
    setIsBannerClosing(true);
    setTimeout(() => {
      setBannerVisible(false);
      localStorage.setItem('privacyBannerDismissed', 'true');
    }, 250);
  };

  const bannerHeightValue = bannerVisible && !isBannerClosing 
    ? (windowWidth < 640 ? '48px' : '40px') 
    : '0px';

  // Dynamic filter supporting category selection and dynamic search matching
  const filteredTools = TOOLS_LIST.filter(t => {
    const matchesCategory = activeCategoryFilter === 'all' || t.category === activeCategoryFilter;
    const matchesQuery = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Grouped lists for Sidebar categories
  const pdfTools = TOOLS_LIST.filter(t => t.category === 'pdf');
  const imageTools = TOOLS_LIST.filter(t => t.category === 'image');
  const converterTools = TOOLS_LIST.filter(t => t.category === 'convert');

  return (
    <div 
      style={{ '--banner-height': bannerHeightValue } as React.CSSProperties}
      className={`min-h-screen bg-bg-dark text-text-light flex flex-col font-sans select-text selection:bg-primary-accent/30 transition-all duration-300 ${
        bannerVisible && !isBannerClosing ? 'pt-[48px] sm:pt-[40px]' : 'pt-0'
      }`}
    >
      {/* FEATURE 1: Sticky Privacy Banner */}
      {bannerVisible && (
        <div 
          className={`fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-primary-accent to-secondary-accent text-white flex items-center justify-between px-4 sm:px-6 transition-all duration-250 ease-in-out ${
            isBannerClosing ? '-translate-y-full opacity-0 h-0 overflow-hidden' : 'h-[48px] sm:h-[40px] opacity-100'
          }`}
        >
          <div className="flex-1 text-center font-sans text-[13px] font-medium leading-normal pr-8 pl-4">
            🔒 Your files never leave your device — All processing happens 100% in your browser. No uploads. No servers. Ever.
          </div>
          <button
            type="button"
            onClick={handleDismissBanner}
            className="text-white text-xl opacity-70 hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 font-bold cursor-pointer h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10"
            title="Dismiss privacy notice"
          >
            ×
          </button>
        </div>
      )}
      
      {/* HEADER BAR (Sticky top for mobile navigation triggers & identity) */}
      <header 
        style={{ top: 'var(--banner-height)' }}
        className="sticky z-50 bg-[#121620]/90 backdrop-blur border-b border-border-dark px-4 sm:px-6 h-16 flex items-center justify-between transition-all duration-300"
      >
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setActiveTool('home'); setActiveCategoryFilter('all'); setSearchQuery(''); }}>
          <div className="w-9 h-9 bg-gradient-to-tr from-primary-accent to-secondary-accent rounded-lg flex items-center justify-center font-display font-extrabold text-[#0D0F14] shadow-[0_0_15px_rgba(108,99,255,0.4)]">
            FF
          </div>
          <span className="font-display font-black text-xl tracking-tight text-text-light font-bold">
            File<span className="text-primary-accent">Forge</span>
          </span>
        </div>

        {/* Sophisticated Dark premium Search Bar */}
        <div className="hidden sm:flex flex-1 max-w-sm mx-4 items-center gap-2 bg-surface-dark border border-border-dark focus-within:border-[#6C63FF]/70 rounded-xl px-4 py-1.5 transition-all text-sm shadow-inner group">
          <span className="text-[#8892A4] text-xs font-mono select-none">🔍</span>
          <input
            type="text"
            placeholder="Search for tools (e.g. compress, merge)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTool !== 'home') {
                setActiveTool('home');
              }
            }}
            className="bg-transparent text-[#F0F2F8] text-xs outline-none w-full placeholder-[#8892A4]"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); setSearchQuery(''); }} 
              className="text-text-sub hover:text-text-light transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Client-Side Engine Version Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-text-sub font-mono">
            <span>Client-Side Engine:</span>
            <span className="text-[#00D4AA] font-mono font-semibold bg-[#00D4AA]/5 px-2 py-0.5 rounded border border-[#00D4AA]/15">V.2.4</span>
          </div>

          {/* Browser Security indicator badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#00D4AA]/5 text-secondary-accent text-xs font-mono font-medium rounded-full border border-secondary-accent/15">
            <Lock className="w-3.5 h-3.5 text-secondary-accent/70" />
            <span>Local execution</span>
          </div>

          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); setPrivacyOpen(true); }}
            className="hidden sm:inline-flex text-xs text-text-sub hover:text-primary-accent transition-colors bg-transparent border-none p-0 cursor-pointer hover:underline"
          >
            Privacy Policy
          </button>

          <PwaInstallNavbarButton />

          {/* Theme Toggle Capsule Slider */}
          <div className="flex items-center">
            <button
              type="button"
              role="switch"
              id="theme-toggle-switch"
              aria-checked={theme === 'dark' ? 'true' : 'false'}
              aria-label="Toggle dark/light mode"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-[72px] md:w-[120px] h-[36px] bg-surface-dark border border-border-dark rounded-full relative flex items-center p-[2px] select-none cursor-pointer transition-colors duration-200 outline-none focus:ring-2 focus:ring-primary-accent focus:ring-offset-2 active:scale-[0.96]"
              style={{
                backgroundColor: theme === 'dark' ? '#252A36' : '#EEF0F7',
                borderColor: theme === 'dark' ? '#252A36' : '#DDE0EC',
              }}
            >
              <div 
                className={`absolute top-[2px] bottom-[2px] rounded-full transition-all duration-[250ms] cubic-[bezier(0.4,0,0.2,1)]
                  ${theme === 'dark' 
                    ? 'left-[2px] w-[34px] md:w-[58px] bg-[#6C63FF]' 
                    : 'left-[36px] md:left-[60px] w-[34px] md:w-[58px] bg-[#5A52E0]'
                  }`}
              />

              <div className={`w-[34px] md:w-[58px] h-full flex items-center justify-center gap-1.5 z-10 transition-colors duration-200 ${theme === 'dark' ? 'text-white' : 'text-[#6B7385]'}`}>
                <MoonIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[12px] font-sans font-medium">Dark</span>
              </div>

              <div className={`w-[34px] md:w-[58px] h-full flex items-center justify-center gap-1.5 z-10 transition-colors duration-200 ${theme === 'light' ? 'text-white' : 'text-[#8892A4]'}`}>
                <SunIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[12px] font-sans font-medium">Light</span>
              </div>
            </button>
            
            {/* Accessibility live-announcement region */}
            <div aria-live="polite" className="sr-only absolute left-[-9999px]">
              {theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
            </div>
          </div>

          {/* Shortcuts Panel Activation button */}
          <div className="relative shrink-0">
            <button
              id="btn-shortcuts-hint"
              type="button"
              onClick={(e) => { e.preventDefault(); toggleShortcutsPanel(); }}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium text-text-sub hover:text-primary-accent bg-surface-dark/40 hover:bg-[#1C202E] border border-border-dark rounded-xl transition-all cursor-pointer select-none active:scale-95"
              title="Open keyboard shortcuts guide"
            >
              <span>⌨ Shortcuts</span>
              {showIntroBadge && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6C63FF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#6C63FF]"></span>
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {showIntroTooltip && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  id="intro-shortcuts-tooltip"
                  className="absolute top-[calc(100%+12px)] right-0 z-[101] bg-[#161A23] border border-[#6C63FF] text-[#F0F2F8] rounded-xl p-3 shadow-2xl overflow-hidden animate-bounce-in min-w-[210px]"
                >
                  <div className="flex flex-col gap-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-[#00D4AA] uppercase tracking-wider">Discovery Guide</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); dismissIntroSOP(); }} 
                        className="text-text-sub hover:text-white text-[10px] p-0.5"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs font-sans leading-relaxed text-text-sub">
                      Press <kbd className="bg-bg-dark border border-border-dark rounded px-1.5 py-0.5 font-mono text-[11px] text-white shadow-[0_1px_0_var(--border)] font-bold">?</kbd> anywhere to open the cheatsheet!
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-2 h-2 bg-[#6C63FF] rounded-bl-full" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* History Panel Activation button */}
          <div className="relative shrink-0">
            <button
              id="btn-history-toggle"
              type="button"
              onClick={(e) => { e.preventDefault(); setHistoryOpen(!historyOpen); }}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium text-text-sub hover:text-[#00D4AA] bg-surface-dark/40 hover:bg-[#1C202E] border border-border-dark rounded-xl transition-all cursor-pointer select-none active:scale-95"
              title="Open session processing history (Shift+H)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>History</span>
              {history.entries.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00D4AA] text-[#0D0F14] text-[10px] font-bold px-1 shrink-0 select-none">
                  {history.entries.length}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Sidebar Hamburger */}
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); setMobileMenuOpen(!mobileMenuOpen); }}
            className="md:hidden p-2 text-text-sub hover:text-text-light hover:bg-[#1C202E] rounded-lg transition-colors border border-transparent hover:border-border-dark"
            aria-label="Toggle navigation drawer menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE SPLIT BLOCK */}
      <div className="flex-1 flex relative">

        {/* DESKTOP SIDEBAR PANEL */}
        <aside 
          style={{ top: 'calc(4rem + var(--banner-height))', height: 'calc(100vh - 4rem - var(--banner-height))' }}
          className="hidden md:flex flex-col w-64 bg-surface-dark border-r border-border-dark p-6 shrink-0 sticky overflow-y-auto transition-all duration-300"
        >
          {/* Dashboard menu triggers */}
          <button
            type="button"
            data-navigate="/"
            onClick={(e) => { e.preventDefault(); setActiveTool('home'); setActiveCategoryFilter('all'); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-display font-semibold transition-all cursor-pointer mb-6 ${
              activeTool === 'home'
                ? 'bg-primary-accent/15 text-[#6C63FF] border border-primary-accent/20'
                : 'text-text-sub hover:text-text-light hover:bg-[#1E2333]/40 border border-transparent'
            }`}
          >
            <Home className="w-5 h-5" />
            Control Hub
          </button>

          {/* Catalog Categories */}
          <div className="space-y-6 flex-1">
            
            {/* 1. PDF Tools */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-widest font-mono text-secondary-accent px-4 font-bold block mb-2">
                PDF Tools
              </span>
              {pdfTools.map(t => (
                <button
                  key={t.id}
                  type="button"
                  data-navigate={toolToUrlMap[t.id]}
                  onClick={(e) => { e.preventDefault(); setActiveTool(t.id); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                    activeTool === t.id
                      ? 'bg-primary-accent text-text-light font-semibold shadow-[0_4px_12px_rgba(108,99,255,0.25)] border-primary-accent'
                      : 'text-text-sub hover:text-text-light hover:bg-[#181D2A] border-transparent'
                  }`}
                >
                  {getToolIcon(t.icon)}
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>

            {/* 2. Image Tools */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-widest font-mono text-secondary-accent px-4 font-bold block mb-2">
                Image Tools
              </span>
              {imageTools.map(t => (
                <button
                  key={t.id}
                  type="button"
                  data-navigate={toolToUrlMap[t.id]}
                  onClick={(e) => { e.preventDefault(); setActiveTool(t.id); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                    activeTool === t.id
                      ? 'bg-primary-accent text-text-light font-semibold shadow-[0_4px_12px_rgba(108,99,255,0.25)] border-primary-accent'
                      : 'text-text-sub hover:text-text-light hover:bg-[#181D2A] border-transparent'
                  }`}
                >
                  {getToolIcon(t.icon)}
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>

            {/* 3. Converters */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-widest font-mono text-secondary-accent px-4 font-bold block mb-2">
                Converters
              </span>
              {converterTools.map(t => (
                <button
                  key={t.id}
                  type="button"
                  data-navigate={toolToUrlMap[t.id]}
                  onClick={(e) => { e.preventDefault(); setActiveTool(t.id); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                    activeTool === t.id
                      ? 'bg-primary-accent text-text-light font-semibold shadow-[0_4px_12px_rgba(108,99,255,0.25)] border-primary-accent'
                      : 'text-text-sub hover:text-text-light hover:bg-[#181D2A] border-transparent'
                  }`}
                >
                  {getToolIcon(t.icon)}
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>

            {/* 4. Session History Link */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] uppercase tracking-widest font-mono text-secondary-accent px-4 font-bold block mb-2">
                Session History
              </span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setHistoryOpen(!historyOpen); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                  historyOpen
                    ? 'bg-[#00D4AA]/10 text-[#00D4AA] font-semibold border-[#00D4AA]/20'
                    : 'text-text-sub hover:text-text-light hover:bg-[#181D2A] border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>History Logger</span>
                </div>
                {history.entries.length > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00D4AA] text-[#0D0F14] text-[10px] font-bold px-1.5">
                    {history.entries.length}
                  </span>
                )}
              </button>
            </div>

          </div>

          {/* Locked Client badge */}
          <div className="mt-auto border-t border-border-dark pt-4 text-center">
            <span className="text-[10px] text-text-sub font-mono leading-relaxed block">
              v1.2 Secure Sandboxed
            </span>
          </div>
        </aside>

        {/* MOBILE DRAMA OVERLAY MENU PRESETS (hamburger responsive sidebar) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-[#05060A]/85 backdrop-blur flex justify-end">
            <div className="w-72 bg-surface-dark h-full p-6 border-l border-border-dark overflow-y-auto flex flex-col pt-20">
              <button
                type="button"
                data-navigate="/"
                onClick={(e) => { e.preventDefault(); setActiveTool('home'); setActiveCategoryFilter('all'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-display font-semibold mb-6 border ${
                  activeTool === 'home' ? 'bg-primary-accent/15 text-[#6C63FF] border-primary-accent/20' : 'text-text-sub hover:text-text-light border-transparent bg-[#11141E]'
                }`}
              >
                <Home className="w-5 h-5" />
                Control Hub Landing
              </button>

              <div className="space-y-6 flex-1">
                {/* PDF */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-secondary-accent px-3 font-bold block mb-1">PDF Tools</span>
                  {pdfTools.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      data-navigate={toolToUrlMap[t.id]}
                      onClick={(e) => { e.preventDefault(); setActiveTool(t.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs ${
                        activeTool === t.id ? 'bg-primary-accent text-text-light font-semibold' : 'text-text-sub'
                      }`}
                    >
                      {getToolIcon(t.icon)}
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>

                {/* Images */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-secondary-accent px-3 font-bold block mb-1">Image Tools</span>
                  {imageTools.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      data-navigate={toolToUrlMap[t.id]}
                      onClick={(e) => { e.preventDefault(); setActiveTool(t.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs ${
                        activeTool === t.id ? 'bg-primary-accent text-text-light font-semibold' : 'text-text-sub'
                      }`}
                    >
                      {getToolIcon(t.icon)}
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>

                {/* Converters */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-secondary-accent px-3 font-bold block mb-1">Converters</span>
                  {converterTools.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      data-navigate={toolToUrlMap[t.id]}
                      onClick={(e) => { e.preventDefault(); setActiveTool(t.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs ${
                        activeTool === t.id ? 'bg-primary-accent text-text-light font-semibold' : 'text-text-sub'
                      }`}
                    >
                      {getToolIcon(t.icon)}
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>

                {/* Mobile Session History Trigger */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-secondary-accent px-3 font-bold block mb-1">Session History</span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setHistoryOpen(true); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs ${
                      historyOpen ? 'bg-[#00D4AA]/10 text-[#00D4AA] font-semibold' : 'text-text-sub'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>History Logger</span>
                    </div>
                    {history.entries.length > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00D4AA] text-[#0D0F14] text-[10px] font-bold px-1.5">
                        {history.entries.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTAINER VIEWPORTS */}
        <main 
          style={{ height: windowWidth < 768 ? 'calc(100vh - 4rem - 3.5rem - var(--banner-height))' : 'calc(100vh - 4rem - var(--banner-height))' }}
          className="flex-1 p-4 sm:p-8 bg-bg-dark overflow-y-auto pb-24 md:pb-8 flex flex-col justify-between transition-all duration-300"
        >
          
          <div className="my-auto py-4">
            {is404 ? (
              
              /* 404 PAGE - Invalid URL */
              <div className="max-w-md mx-auto text-center py-16 space-y-6 animate-fade-in">
                <h1 className="text-8xl font-display font-extrabold text-[#6C63FF] leading-none drop-shadow-md">
                  404
                </h1>
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-text-light">
                    Utility tool not found
                  </h2>
                  <p className="text-sm text-text-sub font-display max-w-sm mx-auto leading-relaxed">
                    The URL path seems to have dissolved into the void. All FileForge tools execute entirely inside your local safe sandbox.
                  </p>
                </div>
                <button
                  type="button"
                  data-navigate="/"
                  onClick={(e) => { e.preventDefault(); setActiveTool('home'); setIs404(false); }}
                  className="px-6 py-3 bg-primary-accent hover:bg-primary-accent/90 text-text-light font-display font-medium rounded-xl transition-all shadow-lg hover:shadow-primary-accent/20 cursor-pointer inline-flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go to Control Hub
                </button>
              </div>
            ) : activeTool === 'home' ? (
              
              /* HOMEPAGE / LANDING HERO & QUICK GRID ROUTER */
              <div className="space-y-12 max-w-5xl mx-auto text-center">
                
                {/* Hero Headline section */}
                <div className="space-y-4 max-w-3xl mx-auto">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#6C63FF]/10 text-primary-accent text-xs font-mono font-semibold rounded-full border border-primary-accent/25 animate-bounce">
                     🔐 Fully Local On-Device Sandbox Built for Speed
                  </span>
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-text-light leading-none mt-4">
                    Every file tool you need. <br />
                    <span className="bg-gradient-to-r from-primary-accent to-secondary-accent text-transparent bg-clip-text">
                      Fast. Free. Private.
                    </span>
                  </h1>
                  
                  <p className="text-base sm:text-lg text-text-sub leading-relaxed max-w-xl mx-auto pt-2 font-display">
                    All processing happens entirely in your browser. Your confidential files never upload or leave your local device.
                  </p>
                </div>

                {/* FEATURE 2: How It Works Section */}
                <HowItWorksSection />

                {/* Categories Tab selectors */}
                <div className="flex border-b border-border-dark justify-center gap-1 max-w-xl mx-auto">
                  {(['all', 'pdf', 'image', 'convert'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={(e) => { e.preventDefault(); setActiveCategoryFilter(cat); }}
                      className={`py-2 px-4 text-xs sm:text-sm font-display font-bold border-b-2 capitalize transition-all cursor-pointer ${
                        activeCategoryFilter === cat
                          ? 'border-primary-accent text-primary-accent'
                          : 'border-transparent text-text-sub hover:text-text-light'
                      }`}
                    >
                      {cat === 'all' ? 'All utilities' : cat === 'pdf' ? 'PDF Suite' : cat === 'image' ? 'Image Lab' : 'Converters'}
                    </button>
                  ))}
                </div>

                {/* Real-time Search feedback bar */}
                {searchQuery && (
                  <div className="text-xs sm:text-sm font-mono text-text-sub flex items-center justify-center gap-2 animate-fade-in">
                    <span>Found</span>
                    <span className="text-[#00D4AA] font-semibold">{filteredTools.length}</span>
                    <span>{filteredTools.length === 1 ? 'utility' : 'utilities'} matching "{searchQuery}"</span>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setSearchQuery(''); }}
                      className="text-xs text-primary-accent hover:underline focus:outline-none ml-1 transition-colors"
                    >
                      (Clear)
                    </button>
                  </div>
                )}

                {/* Dynamic 3x4 layout card grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 text-left">
                  {filteredTools.map((t) => (
                    <div
                      key={t.id}
                      data-navigate={toolToUrlMap[t.id]}
                      onClick={() => {
                        setActiveTool(t.id);
                        setSearchQuery(''); // clear on enter tool workspace
                      }}
                      className={`group bg-surface-dark border p-6 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between hover:shadow-[0_4px_30px_rgba(108,99,255,0.15)] focus-within:ring-2 focus-within:ring-primary-accent ${
                        t.id === 'pdf-compress'
                          ? 'active-pulse'
                          : 'border-border-dark hover:border-[#6C63FF]/50'
                      }`}
                      id={`tool-card-${t.id}`}
                    >
                      {/* Gradient Hover backdrop signature */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-accent/0 to-secondary-accent/0 group-hover:from-primary-accent/[0.04] group-hover:to-secondary-accent/[0.03] transition-all duration-300 pointer-events-none"></div>

                      {/* Works Offline Badge */}
                      {!isOnline && (
                        <div 
                          style={{
                            background: 'rgba(245,166,35,0.15)',
                            border: '1px solid rgba(245,166,35,0.4)',
                            color: '#F5A623'
                          }}
                          className="absolute top-4 right-4 text-[11px] font-sans font-medium rounded-full px-2.5 py-0.5 z-10 select-none animate-fade-in"
                        >
                          📴 Works Offline
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Color-coded Category icon badges matching active-pulse / Sophisticated style guide */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border ${
                          t.category === 'pdf'
                            ? 'bg-[#6C63FF]/10 text-primary-accent border-[#6C63FF]/15 group-hover:bg-[#6C63FF]/20'
                            : t.category === 'image'
                            ? 'bg-[#00D4AA]/10 text-secondary-accent border-[#00D4AA]/15 group-hover:bg-[#00D4AA]/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15 group-hover:bg-indigo-500/20'
                        }`}>
                          {getToolIcon(t.icon)}
                        </div>

                        <div>
                          <h3 className="text-lg font-display font-bold text-text-light tracking-tight group-hover:text-primary-accent transition-colors">
                            {t.name}
                          </h3>
                          <p className="text-xs text-text-sub leading-relaxed mt-1 font-display">
                            {t.description}
                          </p>
                        </div>
                      </div>

                      {/* Launch direct arrow */}
                      <div className="mt-5 flex items-center justify-between text-[11px] font-mono text-[#00D4AA] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span>Launch Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty State for query filter matches */}
                {filteredTools.length === 0 && (
                  <div className="p-12 border border-dashed border-border-dark bg-surface-dark/30 rounded-2xl max-w-xl mx-auto space-y-3 text-center my-6 animate-fade-in">
                    <p className="text-text-sub text-sm">No local utilities match your sandbox search filter.</p>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setSearchQuery(''); setActiveCategoryFilter('all'); }}
                      className="text-xs bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20 px-4 py-2 rounded-lg hover:bg-[#6C63FF]/20 transition-all font-mono font-bold"
                    >
                      Reset active search
                    </button>
                  </div>
                )}

                {/* Immersive security showcase */}
                <div className="border border-border-dark rounded-2xl p-6 max-w-3xl mx-auto bg-surface-dark/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-6 h-6 text-secondary-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-text-light font-display">Client-Only WebAssembly</p>
                      <p className="text-xs text-text-sub mt-1 leading-relaxed">No network connections required. PDF and Image parsing libraries execute exclusively inside local browser sandbox environments.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-6 h-6 text-secondary-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-text-light font-display">Infinite File Limits</p>
                      <p className="text-xs text-text-sub mt-1 leading-relaxed">Free of constraints. Processing speed is limited only by device memory and chip processing capacity.</p>
                    </div>
                  </div>
                </div>

                {/* HOMEPAGE COMPARISON TABLE */}
                <HomepageComparisonTable />

              </div>
            ) : (
              
              /* DISPATCH ACTIVE COMPONENT IF SET */
              <div className="animate-fade-in py-2">
                <ToolsContainer activeTool={activeTool} />
              </div>
            )}
          </div>

          {/* SHARED STELLAR FOOTER */}
          <footer className="mt-16 pt-8 border-t border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4 text-text-sub shrink-0 max-w-5xl mx-auto w-full text-xs sm:text-sm font-display">
            <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center gap-3">
              <span>FileForge © 2025 — Your files stay private, always.</span>
              <PwaCacheStatusWidget />
            </div>
            <div className="flex items-center gap-5 text-xs font-mono font-medium">
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setPrivacyOpen(true); }} 
                className="hover:text-primary-accent text-text-sub transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-border-dark">·</span>
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setActiveTool('home'); }} 
                className="hover:text-primary-accent text-text-sub transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                About
              </button>
              <span className="text-border-dark">·</span>
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); setActiveTool('home'); }} 
                className="hover:text-primary-accent text-text-sub transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                All Tools
              </button>
              <span className="text-border-dark">·</span>
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); toggleShortcutsPanel(); }} 
                className="hover:text-primary-accent text-text-sub transition-colors bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
                title="Keyboard Shortcuts Cheatsheet Panel"
              >
                ⌨ Shortcuts
              </button>
              <span className="text-border-dark">·</span>
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); openPwaSettings(); }} 
                className="hover:text-primary-accent text-text-sub transition-colors bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
                title="Application Cache Settings"
              >
                ⚙️ App Settings
              </button>
            </div>
          </footer>

        </main>

        {/* MOBILE STICKY NAVIGATION BOTTOM TAB BAR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface-dark/95 backdrop-blur border-t border-border-dark grid grid-cols-4 z-40 px-2 shadow-xl">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setActiveTool('home'); setActiveCategoryFilter('all'); }}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all outline-none ${
              activeTool === 'home' ? 'text-primary-accent' : 'text-text-sub hover:text-text-light'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] uppercase font-display font-bold">Hub</span>
          </button>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setActiveTool('home'); setActiveCategoryFilter('pdf'); }}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all outline-none ${
              activeTool !== 'home' ? 'text-text-sub' : activeCategoryFilter === 'pdf' ? 'text-primary-accent' : 'text-text-sub hover:text-text-light'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] uppercase font-display font-bold">PDFs</span>
          </button>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setActiveTool('home'); setActiveCategoryFilter('image'); }}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all outline-none ${
              activeTool !== 'home' ? 'text-text-sub' : activeCategoryFilter === 'image' ? 'text-primary-accent' : 'text-text-sub hover:text-text-light'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-[10px] uppercase font-display font-bold">Images</span>
          </button>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setActiveTool('home'); setActiveCategoryFilter('convert'); }}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all outline-none ${
              activeTool !== 'home' ? 'text-text-sub' : activeCategoryFilter === 'convert' ? 'text-primary-accent' : 'text-text-sub hover:text-text-light'
            }`}
          >
            <RefreshCcw className="w-5 h-5" />
            <span className="text-[10px] uppercase font-display font-bold">Convert</span>
          </button>
        </nav>

        {/* FEATURE 3: Privacy Policy Slide-In Drawer */}
        <PrivacyPolicyDrawer open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

        {/* Progressive Web App Managers */}
        <PwaManager />

        {/* --- SESSION HISTORY SIDEBAR PANEL --- */}
        <AnimatePresence>
          {historyOpen && (
            <>
              {/* Dark backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setHistoryOpen(false)}
                className="fixed inset-0 bg-black z-[150] md:z-[90]"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="fixed right-0 top-0 bottom-0 w-full sm:max-w-[460px] bg-[#161A23] border-l border-[#252A36] z-[160] md:z-[95] shadow-2xl flex flex-col pt-16"
              >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-[#252A36] text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-display font-semibold text-white">Session History</h3>
                      <p className="text-[11px] text-[#8892A4] mt-0.5">Sandbox file activity (Clears on tab close)</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {history.entries.length > 0 && (
                        <div className="relative">
                          {!showClearHistoryConfirm ? (
                            <button
                              type="button"
                              onClick={() => setShowClearHistoryConfirm(true)}
                              className="text-xs text-[#FF5B5B] hover:bg-[#FF5B5B]/10 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                            >
                              Clear All
                            </button>
                          ) : (
                            <div className="bg-[#11141D] border border-[#252A36] rounded-xl p-2.5 absolute right-0 top-full mt-2 w-56 z-[180] shadow-xl text-xs space-y-2">
                              <p className="text-white font-medium">Release all memory?</p>
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setShowClearHistoryConfirm(false)}
                                  className="px-2 py-1 text-[#8892A4] hover:text-white"
                                >
                                  No
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Revoke blob URLs to release memory
                                    history.entries.forEach(entry => {
                                      if (entry.outputBlob) {
                                        try {
                                          URL.revokeObjectURL(URL.createObjectURL(entry.outputBlob));
                                        } catch (e) {}
                                      }
                                      if (entry.batchEntries) {
                                        entry.batchEntries.forEach(sub => {
                                          if (sub.outputBlob) {
                                            try {
                                              URL.revokeObjectURL(URL.createObjectURL(sub.outputBlob));
                                            } catch (e) {}
                                          }
                                        });
                                      }
                                    });
                                    clearHistory();
                                    setShowClearHistoryConfirm(false);
                                  }}
                                  className="px-2.5 py-1 bg-[#FF5B5B] hover:bg-[#FF5B5B]/90 text-white rounded font-semibold"
                                >
                                  Yes, Clear
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => setHistoryOpen(false)}
                        className="text-[#8892A4] hover:text-white p-1 rounded-lg hover:bg-[#1E2333]"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3.5 bg-[#6C63FF]/5 border border-[#6C63FF]/15 rounded-xl p-2.5 text-[11px] text-[#8892A4] flex items-center gap-2">
                    <span>🔒</span>
                    <span>Your output files are processed locally & stored only in browser memory.</span>
                  </div>
                </div>

                {/* Dashboard stats panel */}
                {history.entries.length > 0 && (
                  <div className="grid grid-cols-4 border-b border-[#252A36]">
                    <div className="p-3 text-center border-r border-[#252A36]">
                      <span className="text-[10px] text-[#8892A4] block uppercase tracking-wider font-mono">Processed</span>
                      <span className="font-display font-semibold text-white text-base mt-1 block">
                        {history.totalProcessed}
                      </span>
                    </div>
                    <div className="p-3 text-center border-r border-[#252A36]">
                      <span className="text-[10px] text-[#8892A4] block uppercase tracking-wider font-mono">In Raw</span>
                      <span className="font-display font-semibold text-[#8892A4] text-xs mt-1.5 block">
                        {formatFileSize(history.totalInputSize)}
                      </span>
                    </div>
                    <div className="p-3 text-center border-r border-[#252A36]">
                      <span className="text-[10px] text-[#8892A4] block uppercase tracking-wider font-mono">Out Size</span>
                      <span className="font-display font-semibold text-[#8892A4] text-xs mt-1.5 block">
                        {formatFileSize(history.totalOutputSize)}
                      </span>
                    </div>
                    <div className="p-3 text-center text-xs">
                      <span className="text-[10px] text-[#8892A4] block uppercase tracking-wider font-mono">Saved</span>
                      <span className="font-display font-semibold text-[#00D4AA] text-xs mt-1.5 block">
                        {formatFileSize(Math.max(0, history.totalInputSize - history.totalOutputSize))}
                      </span>
                    </div>
                  </div>
                )}

                {/* List scrollbox container */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left">
                  {history.entries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3.5 opacity-60 py-12">
                      <div className="w-12 h-12 rounded-full border border-dashed border-[#8892A4] flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#8892A4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9"/>
                          <path d="M12 7v5l3 3"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm">No files processed in this session yet</h4>
                        <p className="text-xs text-[#8892A4] mt-1 max-w-[260px] mx-auto">Upload or paste files to get started with automatic workspace logging</p>
                      </div>
                    </div>
                  ) : (
                    history.entries.map((entry) => {
                      const isExpanded = expandedGroupIds[entry.id];
                      
                      // Theme-colored icon holder for category
                      let toolColorClass = 'bg-[#6C63FF]/15 text-[#6C63FF] border-[#6C63FF]/25'; // Default violet
                      const foundTool = TOOLS_LIST.find(t => t.id === (entry.isBatch ? entry.batchEntries?.[0]?.tool : entry.tool));
                      if (foundTool?.category === 'pdf') {
                        toolColorClass = 'bg-[#FF5B5B]/15 text-[#FF5B5B] border-[#FF5B5B]/25'; // Red PDF
                      } else if (foundTool?.category === 'convert') {
                        toolColorClass = 'bg-[#00D4AA]/15 text-[#00D4AA] border-[#00D4AA]/25'; // Teal Converter
                      }

                      if (entry.isBatch) {
                        // Collapsible Group row
                        return (
                          <div 
                            key={entry.id}
                            className="bg-[#1C202E] border border-[#252A36] rounded-xl overflow-hidden shadow-md flex flex-col"
                          >
                            {/* Group Card Header */}
                            <button
                              type="button"
                              onClick={() => setExpandedGroupIds(prev => ({ ...prev, [entry.id]: !isExpanded }))}
                              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#252A36]/30 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg border border-[#6C63FF]/25 bg-[#6C63FF]/10 flex items-center justify-center shrink-0">
                                  <svg className="w-5 h-5 text-[#6C63FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 22h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2z"/>
                                    <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M16 13H8M16 17H8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                                <div className="pr-2 max-w-[180px]">
                                  <h4 className="text-white font-semibold text-xs leading-normal truncate">Batch: {entry.toolLabel.replace('Batch: ', '')}</h4>
                                  <p className="text-[11px] text-[#8892A4] mt-0.5 leading-none">{entry.batchCount} files processed</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="text-[10px] text-[#8892A4] block leading-none select-none font-mono">Reduction</span>
                                  <span className="text-xs text-[#00D4AA] font-bold mt-1 block">
                                    {formatFileSize(entry.inputSize)} → {formatFileSize(entry.outputSize)}
                                  </span>
                                </div>
                                <svg 
                                  className={`w-4 h-4 text-[#8892A4] transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`} 
                                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                >
                                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </button>

                            {/* Sub items expansion row */}
                            {isExpanded && (
                              <div className="border-t border-[#252A36] bg-[#11141D]/90 p-3.5 space-y-3 animate-fade-in divide-y divide-[#252A36]/60">
                                {entry.batchEntries?.map((sub, idx) => (
                                  <div key={idx} className={`pt-2.5 ${idx === 0 ? 'pt-0 border-none' : ''} text-xs flex flex-col gap-1.5`}>
                                    <div className="flex justify-between items-start gap-3">
                                      <span className="text-white font-sans font-medium line-clamp-1 flex-1 break-all select-all">{sub.inputFilename}</span>
                                      <span className="text-[11px] text-[#8892A4] select-none font-sans whitespace-nowrap">{sub.elapsed}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                      <div className="text-[#8892A4] flex items-center gap-1 flex-wrap">
                                        <span>Size:</span>
                                        <span className="font-semibold text-white">{formatFileSize(sub.inputSize)}</span>
                                        <span className="text-[#8892A4]/60">→</span>
                                        <span className="text-[#00D4AA] font-bold">{formatFileSize(sub.outputSize)}</span>
                                        {sub.inputSize > sub.outputSize && (
                                          <span className="text-primary-accent bg-primary-accent/10 px-1 rounded text-[10px]">
                                            -{Math.round(((sub.inputSize - sub.outputSize) / sub.inputSize) * 100)}%
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex gap-2 shrink-0">
                                        {sub.outputBlob && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const url = URL.createObjectURL(sub.outputBlob!);
                                              const link = document.createElement('a');
                                              link.href = url;
                                              link.download = sub.outputFilename;
                                              link.click();
                                              setTimeout(() => URL.revokeObjectURL(url), 100);
                                            }}
                                            className="text-[#00D4AA] hover:underline font-semibold text-[11px] cursor-pointer"
                                          >
                                            Download
                                          </button>
                                        )}
                                        {sub.inputFile && (
                                          <button
                                            type="button"
                                            onClick={() => triggerReprocess(sub)}
                                            className="text-[#6C63FF] hover:underline font-semibold text-[11px] cursor-pointer"
                                          >
                                            Reprocess
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Single entry row
                      const reductionPct = entry.inputSize > entry.outputSize 
                        ? Math.round(((entry.inputSize - entry.outputSize) / entry.inputSize) * 100)
                        : 0;
                        
                      return (
                        <div 
                          key={entry.id}
                          className="bg-[#1C202E] border border-[#252A36] rounded-xl p-4 shadow-md space-y-3 hover:border-border-dark transition-all"
                        >
                          {/* Row 1 (Header) */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center shrink-0 ${toolColorClass}`}>
                                {getToolIcon(entry.toolIcon)}
                              </div>
                              <div>
                                <h4 className="text-white font-semibold text-xs leading-none">{entry.toolLabel}</h4>
                                <span className="text-[10px] text-[#8892A4] mt-1 inline-flex items-center gap-1 font-mono">
                                  {getRelativeTimeString(entry.timestamp)} · <span className="text-[#00D4AA] font-sans font-semibold">Done</span>
                                </span>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => removeHistoryEntry(entry.id)}
                              className="text-[#8892A4] hover:text-[#FF5B5B] transition-colors p-1"
                              title="Delete log"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Row 2 & Row 3 (Input & Output files specs) */}
                          <div className="text-[11px] space-y-1.5 border-t border-b border-[#252A36]/60 py-2 font-mono">
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-[#8892A4] flex items-center gap-1 select-none shrink-0">
                                📥 In:
                              </span>
                              <span className="text-white line-clamp-1 break-all select-all flex-1 text-right">{entry.inputFilename}</span>
                              <span className="text-[#8892A4] shrink-0 font-bold">{formatFileSize(entry.inputSize)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-[#8892A4] flex items-center gap-1 select-none shrink-0">
                                📤 Out:
                              </span>
                              <span className="text-white line-clamp-1 break-all select-all flex-1 text-right">{entry.outputFilename}</span>
                              <span className="text-[#00D4AA] font-bold shrink-0">{formatFileSize(entry.outputSize)}</span>
                            </div>
                          </div>

                          {/* Row 4 (Footer Actions) */}
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                            <div className="flex items-center gap-1.5 max-w-[50%]">
                              {reductionPct > 0 && (
                                <span className="text-[10px] bg-[#00D4AA]/8 text-[#00D4AA] px-1.5 py-0.5 rounded border border-[#00D4AA]/15 select-none font-bold shrink-0">
                                  Saved {reductionPct}%
                                </span>
                              )}
                              <span className="text-[10px] text-[#8892A4] select-none font-sans truncate" title={entry.settingsLabel}>
                                {entry.settingsLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 ml-auto shrink-0">
                              {entry.inputFile && (
                                <button
                                  type="button"
                                  onClick={() => triggerReprocess(entry)}
                                  className="text-xs text-white hover:text-white bg-[#6C63FF]/15 hover:bg-[#6C63FF] border border-[#6C63FF]/30 px-2.5 py-1 rounded transition-all font-semibold font-sans cursor-pointer"
                                >
                                  ↺ Reprocess
                                </button>
                              )}
                              
                              {entry.outputBlob && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = URL.createObjectURL(entry.outputBlob!);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = entry.outputFilename;
                                    link.click();
                                    setTimeout(() => URL.revokeObjectURL(url), 100);
                                  }}
                                  className="text-xs text-[#0D0F14] bg-[#00D4AA] hover:bg-[#00D4AA]/90 px-2.5 py-1 rounded transition-all font-bold font-sans cursor-pointer"
                                >
                                  ⬇ Download
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* --- KEYBOARD SHORTCUTS SYSTEM MODALS & PRESET OVERLAYS --- */}

        {/* 1. Global Cheatsheet Panel */}
        <AnimatePresence>
          {shortcutsOpen && (
            <motion.div 
              id="shortcuts-cheatsheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShortcutsOpen(false)}
              className="fixed inset-0 bg-[#0D0F14]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            >
              <motion.div 
                id="shortcuts-cheatsheet-backdrop"
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl bg-[#161A23] border border-[#252A36] rounded-2.5xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left relative"
              >
                {/* Close Button */}
                <button 
                  type="button"
                  onClick={() => setShortcutsOpen(false)}
                  className="absolute top-6 right-6 text-text-sub hover:text-white transition-colors p-2 hover:bg-surface-dark/60 rounded-xl border border-transparent hover:border-border-dark cursor-pointer"
                  title="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="space-y-2 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-10">
                    <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
                      <span>⌨</span> Keyboard Shortcuts Binds
                    </h2>
                    <span className="text-[11px] font-mono shrink-0 px-2.5 py-1 rounded bg-[#00D4AA]/5 text-[#00D4AA] border border-[#00D4AA]/15">
                      Interactive sandbox maps
                    </span>
                  </div>
                  <p className="text-xs text-text-sub leading-normal font-sans max-w-xl">
                    Accelerate your workflow with specialized keystrokes. Binds are local-only and dynamically adjust to your active tool workspace.
                  </p>
                </div>

                {/* Gamified Discovery Goal Board */}
                <div className="bg-[#6C63FF]/5 border border-[#6C63FF]/15 px-5 py-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>🏆</span> Level up your speed limit: {discoveredShortcutsCount} / 19 unlocked
                    </div>
                    <p className="text-[11px] text-text-sub font-medium">
                      {discoveredShortcutsCount === 19 
                        ? '🎉 Master level achieved! You have mastered every workflow shortcut.'
                        : 'Discover and utilize all shortcuts to earn the Core Operator achievement badging!'}
                    </p>
                  </div>
                  <div className="w-full md:max-w-[240px] shrink-0">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-text-sub mb-1">
                      <span>Operator Rank</span>
                      <span>{Math.round((discoveredShortcutsCount / 19) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-bg-dark rounded-full overflow-hidden border border-[#252A36]">
                      <div 
                        className="h-full bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(discoveredShortcutsCount / 19) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Shortcuts categories grid container */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-8 mb-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0 text-xs">
                  
                  {/* Category A: Core System Binds */}
                  <div className="space-y-3.5">
                    <h3 className="text-sm font-bold text-[#6C63FF] uppercase tracking-wider font-display border-b border-border-dark pb-1.5">
                      System Binds
                    </h3>
                    <div className="space-y-3">
                      {SHORTCUTS_LIST.filter(s => s.category === 'global' || s.category === 'navigation').map((s, idx) => (
                        <div key={`${s.keys}-${s.description}-${idx}`} className="flex justify-between items-center gap-4 bg-surface-dark/40 p-2.5 rounded-xl border border-border-dark hover:border-[#6C63FF]/30 transition-colors">
                          <span className="text-[#F0F2F8] font-medium font-sans">{s.description}</span>
                          <kbd className="shrink-0 bg-bg-dark border border-border-dark rounded-lg px-2 py-1 font-mono text-[11px] font-bold text-[#00D4AA] shadow-[0_1.5px_0_rgba(0,212,170,0.25)] tracking-wider">
                            {s.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category B: Queue & Batch Operations */}
                  <div className="space-y-3.5">
                    <h3 className="text-sm font-bold text-[#00D4AA] uppercase tracking-wider font-display border-b border-border-dark pb-1.5">
                      Queue & Batch Actions
                    </h3>
                    <div className="space-y-3">
                      {SHORTCUTS_LIST.filter(s => s.category === 'files' || s.category === 'batch').map((s, idx) => (
                        <div key={`${s.keys}-${s.description}-${idx}`} className="flex justify-between items-center gap-4 bg-surface-dark/40 p-2.5 rounded-xl border border-border-dark hover:border-[#00D4AA]/30 transition-colors">
                          <span className="text-[#F0F2F8] font-medium font-sans">{s.description}</span>
                          <kbd className="shrink-0 bg-bg-dark border border-border-dark rounded-lg px-2 py-1 font-mono text-[11px] font-bold text-[#6C63FF] shadow-[0_1.5px_0_rgba(108,99,255,0.25)] tracking-wider">
                            {s.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category C: Active Workspace Tools Controls */}
                  <div className="space-y-3.5 md:col-span-2 pt-4">
                    <h3 className="text-sm font-bold text-[#00D4AA] uppercase tracking-wider font-display border-b border-border-dark pb-1.5 flex justify-between items-center">
                      <span>Active Workspace Controls</span>
                      <span className="text-[10px] lowercase font-normal text-text-sub font-sans">binds load on selecting relevant tool workspace</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1.5">
                      {/* Image Enhancer Actions */}
                      <div className="space-y-3 bg-[#6C63FF]/4 border border-[#6C63FF]/10 p-4 rounded-2xl">
                        <span className="text-xs font-bold text-white block mb-1">✨ Image Enhancer Workspace</span>
                        <div className="space-y-2">
                          {SHORTCUTS_LIST.filter(s => s.context === 'image-enhance').map((s, idx) => (
                            <div key={`${s.keys}-${s.description}-${idx}`} className="flex justify-between items-center gap-3 text-[11px]">
                              <span className="text-text-sub font-medium">{s.description}</span>
                              <kbd className="shrink-0 bg-[#0D0F14] border border-border-dark rounded px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                {s.keys}
                              </kbd>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* PDF Tools Actions */}
                      <div className="space-y-3 bg-[#00D4AA]/4 border border-[#00D4AA]/10 p-4 rounded-2xl">
                        <span className="text-xs font-bold text-white block mb-1">📄 PDF Workspace Controls</span>
                        <div className="space-y-2">
                          {SHORTCUTS_LIST.filter(s => s.context === 'pdf' || s.context === 'merge-pdf').map((s, idx) => (
                            <div key={`${s.keys}-${s.description}-${idx}`} className="flex justify-between items-center gap-3 text-[11px]">
                              <span className="text-text-sub font-medium">{s.description}</span>
                              <kbd className="shrink-0 bg-[#0D0F14] border border-border-dark rounded px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                {s.keys}
                              </kbd>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Footer Configuration options */}
                <div className="border-t border-border-dark pt-4 sm:pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 text-text-sub">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        defaultChecked={localStorage.getItem('fileforge-shortcut-feedback') !== 'disabled'}
                        onChange={(e) => {
                          localStorage.setItem('fileforge-shortcut-feedback', e.target.checked ? 'enabled' : 'disabled');
                        }}
                        className="rounded border-border-dark text-[#6C63FF] focus:ring-[#6C63FF] bg-bg-dark cursor-pointer h-4 w-4"
                      />
                      <span className="text-[11px] font-sans font-medium text-text-sub">Show visual feedback toasts on shortcut keys</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('fileforge-shortcuts-used');
                        setDiscoveredShortcutsCount(0);
                      }}
                      className="text-[10px] font-mono tracking-wider uppercase border border-border-dark bg-transparent hover:bg-[#FF5B5B]/10 hover:border-[#FF5B5B] hover:text-[#FF5B5B] text-text-sub px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-[0.97]"
                    >
                      Reset Learned Progress
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShortcutsOpen(false)}
                      className="bg-[#6C63FF] hover:bg-[#5A52E0] text-white text-xs font-bold py-2 px-5 rounded-xl cursor-pointer shadow-lg hover:shadow-[#6C63FF]/20 transition-all select-none duration-150 active:scale-95"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Search & Command Spotlight Panel */}
        <AnimatePresence>
          {spotlightOpen && (
            <motion.div 
              id="shortcuts-spotlight-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSpotlightOpen(false)}
              className="fixed inset-0 bg-[#0D0F14]/80 backdrop-blur-sm z-[201] flex items-start justify-center p-4 pt-[12vh]"
            >
              <motion.div 
                id="shortcuts-spotlight-backdrop"
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl bg-[#161A23] border border-[#252A36] rounded-2.5xl shadow-2xl overflow-hidden flex flex-col text-left font-sans"
              >
                {/* Search Bar Row */}
                <div className="flex items-center gap-3 p-4 border-b border-border-dark relative">
                  <span className="text-xl text-[#8892A4] select-none pl-1">🔍</span>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search tools, commands, or shortcut bindings..."
                    value={spotlightQuery}
                    onChange={(e) => {
                      setSpotlightQuery(e.target.value);
                      setSpotlightSelectedIndex(0);
                    }}
                    className="flex-1 bg-transparent text-[#F0F2F8] text-sm outline-none placeholder-[#8892A4] py-1 border-none focus:ring-0"
                  />
                  <kbd className="bg-bg-dark border border-border-dark rounded px-2 py-1 font-mono text-[10px] text-text-sub">ESC</kbd>
                </div>

                {/* Core Match results list */}
                <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
                  {spotlightResults.length === 0 ? (
                    <div className="py-12 text-center text-text-sub space-y-1.5 leading-normal">
                      <p className="text-sm font-bold text-white">No actions or tools matched</p>
                      <p className="text-xs">Try searching for simple words like <code className="bg-bg-dark px-1.5 py-0.5 rounded text-[11px] font-mono">compress</code>, <code className="bg-bg-dark px-1.5 py-0.5 rounded text-[11px] font-mono">zoom</code> or <code className="bg-bg-dark px-1.5 py-0.5 rounded text-[11px] font-mono">dark</code></p>
                    </div>
                  ) : (
                    <>
                      {/* Section label when querying is active */}
                      {spotlightQuery ? (
                        <div className="text-[10px] font-bold text-text-sub uppercase tracking-wider px-3.5 py-1.5">
                          Matching results ({spotlightResults.length})
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider px-3.5 py-1.5">
                          ⭐ Recent & Quick Launcher
                        </div>
                      )}

                      {spotlightResults.map((item, index) => {
                        const isSelected = index === spotlightSelectedIndex;
                        return (
                          <div
                            key={item.id}
                            id={`spotlight-item-${index}`}
                            onClick={() => {
                              item.action();
                              setSpotlightOpen(false);
                            }}
                            onMouseEnter={() => setSpotlightSelectedIndex(index)}
                            className={`flex items-center justify-between gap-4 p-3 rounded-xl cursor-pointer transition-colors duration-150 select-none ${
                              isSelected 
                                ? 'bg-[#6C63FF]/15 border border-[#6C63FF]/30 text-white' 
                                : 'bg-transparent border border-transparent text-text-sub hover:bg-surface-dark/40'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-base">
                                {item.type === 'tool' ? '🛠️' : item.type === 'action' ? '⚡' : '⌨'}
                              </span>
                              <div className="min-w-0">
                                <span className={`text-xs block font-semibold ${isSelected ? 'text-white font-medium' : 'text-text-primary'}`}>
                                  {highlightText(item.name, spotlightQuery)}
                                </span>
                                {item.description && (
                                  <span className="text-[10px] block opacity-75 truncate max-w-[280px]">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-[10px]">
                              {item.type === 'tool' && (
                                <span className="bg-[#00D4AA]/10 text-[#00D4AA] px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider mr-1">
                                  {(item as any).categoryName}
                                </span>
                              )}
                              <kbd className={`px-2 py-0.5 rounded border text-[10px] ${
                                isSelected 
                                  ? 'bg-[#6C63FF]/20 border-[#6C63FF]/40 text-[#6C63FF] font-semibold' 
                                  : 'bg-bg-dark border-border-dark text-[#8892A4]'
                              }`}>
                                {item.badgeText}
                              </kbd>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Action Guidelines Footer */}
                <div className="border-t border-border-dark p-3.5 bg-surface-dark/40 flex items-center justify-between text-[11px] text-text-sub font-mono">
                  <div className="flex items-center gap-3.5">
                    <span className="flex items-center gap-1">
                      <span className="text-sm">↑↓</span> Move active cursor
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-sm">↵</span> Switch / Execute
                    </span>
                  </div>
                  <div>
                    <span>Ctrl + K to close</span>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Global Reset Confirmation Modals Overlay */}
        <AnimatePresence>
          {showResetConfirmation && (
            <motion.div 
              id="shortcuts-reset-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirmation(false)}
              className="fixed inset-0 bg-[#0D0F14]/90 backdrop-blur-md z-[202] flex items-center justify-center p-4 animate-fade-in"
            >
              <motion.div 
                id="shortcuts-reset-backdrop"
                key="reset-confirmer"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#161A23] border border-[#FF5B5B]/30 rounded-2.5xl p-6 shadow-2xl text-center flex flex-col gap-5 text-left relative"
              >
                <div className="mx-auto w-12 h-12 bg-[#FF5B5B]/10 rounded-full flex items-center justify-center border border-[#FF5B5B]/20 shrink-0">
                  <span className="text-xl text-[#FF5B5B] leading-none">⚠️</span>
                </div>
                <div className="space-y-2 text-center">
                  <h3 className="text-lg font-bold font-display text-white">Reset Tool Workspace?</h3>
                  <p className="text-xs text-text-sub leading-normal font-sans px-2">
                    You are about to purge all current document items and slider progress. This action is irreversible. All queue files will be cleared.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowResetConfirmation(false)}
                    className="flex-1 max-w-[120px] bg-transparent hover:bg-surface-dark/65 border border-border-dark text-text-sub hover:text-white py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer select-none transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={triggerResetShortcuts}
                    className="flex-1 max-w-[150px] bg-[#FF5B5B] hover:bg-[#E03B3B] text-white py-2 px-4 rounded-xl text-xs font-bold shadow-lg shadow-[#FF5B5B]/10 cursor-pointer select-none transition-all active:scale-[0.96]"
                  >
                    Purge All Items
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Global Shortcuts Feedback Toasts Banner */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed bottom-24 right-6 z-[250] flex flex-col pointer-events-none select-none"
            >
              <div className={`p-3 rounded-2xl border flex items-center gap-3 shadow-2xl relative overflow-hidden backdrop-blur-md ${
                feedbackToast.isUnlockedCelebration
                  ? 'bg-gradient-to-r from-[#161A23]/90 to-[#6C63FF]/20 border-[#6C63FF] border-l-[3px] border-l-[#6C63FF]'
                  : 'bg-[#161A23]/95 border-border-dark border-l-[3px] border-l-[#00D4AA]'
              }`}>
                {/* Visual Accent Badge */}
                <div className="flex gap-1 shrink-0">
                  {feedbackToast.keys.map((k, i) => (
                    <kbd 
                      key={k + '-' + i} 
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        feedbackToast.isUnlockedCelebration
                          ? 'bg-[#6C63FF]/30 border-[#6C63FF]/50 text-white shadow-[0_1px_0_var(--accent)]'
                          : 'bg-[#00D4AA]/20 border-[#00D4AA]/40 text-[#00D4AA]'
                      }`}
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
                
                {/* Text explanation */}
                <span className={`text-[11px] font-sans font-medium select-none ${
                  feedbackToast.isUnlockedCelebration 
                    ? 'text-white' 
                    : 'text-text-primary'
                }`}>
                  {feedbackToast.description}
                </span>

                {/* Unlocked Sparkles indicator */}
                {feedbackToast.isUnlockedCelebration && (
                  <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                    <span className="absolute text-[9px] text-[#00D4AA] rotate-12 -top-1 -right-0.5">✨</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Homepage dynamic toast notifications */}
        <AnimatePresence>
          {homepageToast && homepageToast.visible && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              id="homepage-paste-toast"
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[10px] bg-[#161A23] border border-[#252A36]/85 border-l-[3px] border-l-[#6C63FF] flex items-center gap-2 font-sans font-medium text-[13px] text-[#F0F2F8] shadow-2xl"
            >
              <span className="text-[#6C63FF] text-base font-semibold leading-none">📋</span>
              <span>{homepageToast.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// FEATURE 2: How It Works Section
function HowItWorksSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="w-full bg-[#12151D] py-16 -mx-4 sm:-mx-8 px-4 sm:px-8 border-y border-border-dark/30 mt-6"
    >
      <div className="max-w-[900px] mx-auto text-center space-y-12">
        {/* Section title & subtitle */}
        <div className="space-y-3">
          <span className="text-primary-accent uppercase text-[11px] font-mono tracking-[0.15em] font-bold block mb-1">
            THE FILEFORGE DIFFERENCE
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-light tracking-tight">
            How FileForge Works
          </h2>
          <p className="text-sm sm:text-base text-text-sub leading-relaxed max-w-xl mx-auto">
            No accounts. No uploads. No waiting. Just instant results.
          </p>
        </div>

        {/* Steps container */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 md:gap-4 select-none relative">
          
          {/* Step 1 */}
          <div 
            className={`flex-1 bg-surface-dark border border-border-dark p-6 rounded-2xl flex flex-col items-center text-center space-y-4 transition-all duration-700 transform ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '0ms' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-accent/15 flex items-center justify-center text-primary-accent border border-primary-accent/10">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-light font-display">
                Upload Your File
              </h3>
              <p className="text-xs text-text-sub leading-relaxed mt-2">
                Select or drag any file from your device. It loads directly into your browser — nothing is sent anywhere.
              </p>
            </div>
          </div>

          {/* Connector Arrow 1 */}
          <div className="hidden md:flex items-center justify-center text-text-sub text-2xl font-bold font-sans">
            →
          </div>

          {/* Step 2 (Highlighted) */}
          <div 
            className={`flex-1 bg-[#191D28] border border-primary-accent/50 shadow-[0_0_20px_rgba(108,99,255,0.2)] p-6 rounded-2xl flex flex-col items-center text-center space-y-4 relative overflow-hidden transition-all duration-700 transform ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="absolute top-0 right-0 bg-secondary-accent/10 text-secondary-accent text-[9px] font-mono font-bold px-2.5 py-1 rounded-bl-xl border-l border-b border-secondary-accent/20 uppercase">
              Secure sandbox
            </div>
            <div className="w-12 h-12 rounded-2xl bg-secondary-accent/15 flex items-center justify-center text-secondary-accent border border-secondary-accent/10">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-light font-display">
                Processed Instantly
              </h3>
              <p className="text-xs text-text-sub leading-relaxed mt-2">
                Your file is compressed, converted, or edited entirely inside your browser using your own device's processing power.
              </p>
            </div>
          </div>

          {/* Connector Arrow 2 */}
          <div className="hidden md:flex items-center justify-center text-text-sub text-2xl font-bold font-sans">
            →
          </div>

          {/* Step 3 */}
          <div 
            className={`flex-1 bg-surface-dark border border-border-dark p-6 rounded-2xl flex flex-col items-center text-center space-y-4 transition-all duration-700 transform ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-accent/15 flex items-center justify-center text-primary-accent border border-primary-accent/10">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-light font-display">
                Download Result
              </h3>
              <p className="text-xs text-text-sub leading-relaxed mt-2">
                Get your processed file instantly. No email required. No account needed. Your original file is never stored anywhere.
              </p>
            </div>
          </div>

        </div>

        {/* Trust Stats Row */}
        <div 
          className={`grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-border-dark/30 transition-all duration-500 transform ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ transitionDelay: '500ms' }}
        >
          <div className="text-center space-y-1">
            <div className="text-2xl font-extrabold text-secondary-accent font-display tracking-tight">100% Private</div>
            <div className="text-xs text-text-sub">Files stay on your device</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-extrabold text-primary-accent font-display tracking-tight">0 Servers</div>
            <div className="text-xs text-text-sub">No upload infrastructure</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-extrabold text-secondary-accent font-display tracking-tight">0 Accounts</div>
            <div className="text-xs text-text-sub">No sign-up ever required</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// FEATURE 3: Privacy Policy Slide-In Drawer
interface PrivacyPolicyDrawerProps {
  open: boolean;
  onClose: () => void;
}

function PrivacyPolicyDrawer({ open, onClose }: PrivacyPolicyDrawerProps) {
  // Listen for Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div 
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Dark Overlay */}
      <div 
        className="absolute inset-0 bg-black/75 cursor-pointer backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Sliding Drawer Panel */}
      <div 
        className={`fixed bg-surface-dark border-[#252A36] flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          /* Desktop behavior */
          md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-[560px] md:h-full md:border-l
          /* Mobile behavior */
          top-auto bottom-0 right-0 left-0 h-[85vh] w-full rounded-t-2xl border-t
          ${open 
            ? 'translate-y-0 md:translate-x-0 md:translate-y-0' 
            : 'translate-y-full md:translate-x-full md:translate-y-0'
          }
        `}
      >
        {/* Drawer Header */}
        <div className="p-6 md:p-8 border-b border-border-dark/60 flex items-center justify-between shrink-0">
          <div>
            <span className="text-secondary-accent text-[10px] font-mono font-bold tracking-widest uppercase">
              LEGAL
            </span>
            <h2 className="text-xl md:text-2xl font-display font-extrabold text-[#F0F2F8] mt-1">
              Privacy Policy
            </h2>
            <p className="text-[11px] text-text-sub font-mono mt-1">
              Last updated: January 2025
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white bg-[#1F2433] hover:bg-[#2A3145] p-2 rounded-xl transition-all font-bold cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 opacity-70 hover:opacity-100" />
          </button>
        </div>

        {/* Scrollable Content inside Drawer */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 select-text">
          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-primary-accent">
              Section 1 — The Short Version
            </h3>
            <p className="text-sm text-[#F0F2F8] leading-[1.7]">
              FileForge is a <strong>100% client-side</strong> file utility tool. This means every file you upload is processed entirely within your web browser on your own device. Your files are never transmitted to our servers — because we don't have any file-processing servers.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-primary-accent">
              Section 2 — What We DO NOT Collect
            </h3>
            <ul className="space-y-2.5 text-sm text-[#F0F2F8]">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-secondary-accent shrink-0 mt-0.5" />
                <span>Your files or their contents</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-secondary-accent shrink-0 mt-0.5" />
                <span>Your name, email, or any personal information</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-secondary-accent shrink-0 mt-0.5" />
                <span>Your IP address linked to file usage</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-secondary-accent shrink-0 mt-0.5" />
                <span>Cookies related to file processing</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-secondary-accent shrink-0 mt-0.5" />
                <span>Any usage data about which files you process</span>
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-primary-accent">
              Section 3 — What We DO Collect
            </h3>
            <div className="space-y-2 text-sm text-[#F0F2F8] leading-[1.7]">
              <p>
                • Anonymous page view counts via Google Analytics (if applicable) — this does not include any file data.
              </p>
              <p>
                • Google AdSense may use cookies to show relevant ads. See Google's privacy policy for details.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-primary-accent">
              Section 4 — How File Processing Works
            </h3>
            <p className="text-sm text-[#F0F2F8] leading-[1.7]">
              When you select a file, your browser reads it using the JavaScript File API. All compression, conversion, and editing happens using your device's CPU and memory. The processed file is generated as a downloadable blob URL — a temporary link that exists only in your browser tab and disappears when you close it.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-primary-accent">
              Section 5 — Third Party Libraries
            </h3>
            <p className="text-sm text-[#F0F2F8] leading-[1.7]">
              FileForge uses open-source JavaScript libraries (pdf-lib, PDF.js, mammoth.js, etc.) loaded from public CDNs. These libraries run locally in your browser and do not transmit your file data.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-primary-accent">
              Section 6 — Contact
            </h3>
            <p className="text-sm text-[#F0F2F8] leading-[1.7]">
              Questions about privacy? Contact us at:{' '}
              <a 
                href="mailto:malekaranilkumar001@gmail.com" 
                className="text-secondary-accent hover:underline font-mono"
              >
                malekaranilkumar001@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
