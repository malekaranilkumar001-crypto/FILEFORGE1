import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X, Download, RefreshCw, Settings, Check, HelpCircle, ArrowUpLeft, Share } from 'lucide-react';

let globalDeferredPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    window.dispatchEvent(new Event('pwa-beforeinstallprompt'));
  });
}

// Global hook to access online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

// Global hook to access PWA installation and state utilities
export function usePwaInstallState() {
  const [isInstallable, setIsInstallable] = useState(!!globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    );
    
    const handlePrompt = () => setIsInstallable(true);
    const handleInstalled = () => setIsInstallable(false);
    
    window.addEventListener('pwa-beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    
    return () => {
      window.removeEventListener('pwa-beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!globalDeferredPrompt) return false;
    globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setIsInstallable(false);
      window.dispatchEvent(new Event('appinstalled'));
      return true;
    }
    return false;
  };

  return { isInstallable, isStandalone, triggerInstall };
}

// Icon Cache & Generation
const iconCache: Record<number, string> = {};

export function generateIcon(size: number): string {
  if (iconCache[size]) return iconCache[size];

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Background gradient: Violet (#6C63FF) to Teal (#00D4AA)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#6C63FF');
  gradient.addColorStop(1, '#00D4AA');
  ctx.fillStyle = gradient;
  
  // Rounded rectangle background
  const radius = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  
  // Custom Lightning bolt ⚡ symbol scaled to size
  ctx.fillStyle = 'white';
  const scale = size / 100;
  ctx.beginPath();
  ctx.moveTo(60 * scale, 12 * scale);
  ctx.lineTo(35 * scale, 52 * scale);
  ctx.lineTo(52 * scale, 52 * scale);
  ctx.lineTo(40 * scale, 88 * scale);
  ctx.lineTo(65 * scale, 48 * scale);
  ctx.lineTo(48 * scale, 48 * scale);
  ctx.closePath();
  ctx.fill();
  
  const dataUrl = canvas.toDataURL('image/png');
  iconCache[size] = dataUrl;
  return dataUrl;
}

// iOS Splash Screen Generation
export function generateSplashScreen(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Deep Background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0D0F14');
  gradient.addColorStop(1, '#161A23');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Center logo icon size based on device size
  const iconSize = Math.min(width, height) * 0.25;
  const iconX = (width - iconSize) / 2;
  const iconY = (height - iconSize) / 2 - iconSize * 0.2;
  
  // Custom styled icon background
  const iconGradient = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
  iconGradient.addColorStop(0, '#6C63FF');
  iconGradient.addColorStop(1, '#00D4AA');
  ctx.fillStyle = iconGradient;
  
  const radius = iconSize * 0.22;
  ctx.beginPath();
  ctx.moveTo(iconX + radius, iconY);
  ctx.lineTo(iconX + iconSize - radius, iconY);
  ctx.quadraticCurveTo(iconX + iconSize, iconY, iconX + iconSize, iconY + radius);
  ctx.lineTo(iconX + iconSize, iconY + iconSize - radius);
  ctx.quadraticCurveTo(iconX + iconSize, iconY + iconSize, iconX + iconSize - radius, iconY + iconSize);
  ctx.lineTo(iconX + radius, iconY + iconSize);
  ctx.quadraticCurveTo(iconX, iconY + iconSize, iconX, iconY + iconSize - radius);
  ctx.lineTo(iconX, iconY + radius);
  ctx.quadraticCurveTo(iconX, iconY, iconX + radius, iconY);
  ctx.closePath();
  ctx.fill();
  
  // Lightning symbol
  ctx.fillStyle = 'white';
  const s = iconSize / 100;
  const ox = iconX, oy = iconY;
  ctx.beginPath();
  ctx.moveTo(ox + 60*s, oy + 12*s);
  ctx.lineTo(ox + 35*s, oy + 52*s);
  ctx.lineTo(ox + 52*s, oy + 52*s);
  ctx.lineTo(ox + 40*s, oy + 88*s);
  ctx.lineTo(ox + 65*s, oy + 48*s);
  ctx.lineTo(ox + 48*s, oy + 48*s);
  ctx.closePath();
  ctx.fill();
  
  // App Title
  ctx.fillStyle = '#F0F2F8';
  ctx.font = `bold ${iconSize * 0.22}px 'Plus Jakarta Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('FileForge', width / 2, iconY + iconSize + iconSize * 0.35);
  
  // Tagline
  ctx.fillStyle = '#8892A4';
  ctx.font = `${iconSize * 0.12}px 'Inter', sans-serif`;
  ctx.fillText('Free File Tools · Works Offline', width / 2, iconY + iconSize + iconSize * 0.55);
  
  return canvas.toDataURL('image/png');
}

// Manifest Template
const BASE_MANIFEST = {
  name: "FileForge — Client-Side File Suite",
  short_name: "FileForge",
  description: "Advanced client-side file compression, resizing & format conversion. Works fully offline without servers.",
  start_url: "/",
  display: "standalone",
  orientation: "any",
  background_color: "#0D0F14",
  theme_color: "#6C63FF",
  lang: "en",
  scope: "/",
  categories: ["utilities", "productivity"],
  
  icons: [
    { src: "", sizes: "72x72", type: "image/png", purpose: "any" },
    { src: "", sizes: "96x96", type: "image/png", purpose: "any" },
    { src: "", sizes: "128x128", type: "image/png", purpose: "any" },
    { src: "", sizes: "144x144", type: "image/png", purpose: "any" },
    { src: "", sizes: "152x152", type: "image/png", purpose: "any" },
    { src: "", sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "", sizes: "384x384", type: "image/png", purpose: "any maskable" },
    { src: "", sizes: "512x512", type: "image/png", purpose: "any maskable" }
  ],
  
  shortcuts: [
    {
      name: "Compress PDF",
      short_name: "Compress PDF",
      description: "Reduce PDF physical file size offline",
      url: "/pdf-compressor",
      icons: [{ src: "", sizes: "96x96" }]
    },
    {
      name: "Compress Image",
      short_name: "Compress Image",
      description: "Compress photos and jpeg graphics offline",
      url: "/jpeg-compressor",
      icons: [{ src: "", sizes: "96x96" }]
    },
    {
      name: "Merge PDFs",
      short_name: "Merge PDFs",
      description: "Combine multiple document components offline",
      url: "/merge-pdf",
      icons: [{ src: "", sizes: "96x96" }]
    }
  ],
  screenshots: [
    {
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1280&h=720&q=80",
      sizes: "1280x720",
      type: "image/png",
      form_factor: "wide",
      label: "FileForge High-Performance Workspace"
    }
  ]
};

// Global PWA Setup Helpers
export function setupPwaInfrastructure() {
  if (typeof window === 'undefined') return;
  
  // 1. Injected Manifest via Data URL
  if (!document.querySelector('link[rel="manifest"]')) {
    const iconFiles: Record<number, string> = {};
    [72, 96, 128, 144, 152, 192, 384, 512].forEach(size => {
      iconFiles[size] = generateIcon(size);
    });

    const manifestData = { ...BASE_MANIFEST };
    manifestData.icons = manifestData.icons.map(icon => ({
      ...icon,
      src: iconFiles[parseInt(icon.sizes)] || generateIcon(parseInt(icon.sizes))
    }));
    manifestData.shortcuts = manifestData.shortcuts.map(sh => ({
      ...sh,
      icons: [{ ...sh.icons[0], src: iconFiles[96] || generateIcon(96) }]
    }));

    const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);
  }

  // 2. Apple and Windows headers Setup
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    [57, 60, 72, 76, 114, 120, 144, 152, 180].forEach(size => {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.setAttribute('sizes', `${size}x${size}`);
      link.href = generateIcon(size);
      document.head.appendChild(link);
    });
    
    const defLink = document.createElement('link');
    defLink.rel = 'apple-touch-icon';
    defLink.href = generateIcon(180);
    document.head.appendChild(defLink);
  }

  if (!document.querySelector('meta[name="msapplication-TileImage"]')) {
    const meta = document.createElement('meta');
    meta.name = 'msapplication-TileImage';
    meta.content = generateIcon(144);
    document.head.appendChild(meta);
  }

  // 3. Apple Splash Screens via Request Idle Callback
  if (!document.querySelector('link[rel="apple-touch-startup-image"]')) {
    const generateSplashes = () => {
      const splashSpecs = [
        { w: 2048, h: 2732, media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)' },
        { w: 1668, h: 2388, media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)' },
        { w: 1125, h: 2436, media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
        { w: 1242, h: 2688, media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' },
        { w: 828, h: 1792, media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
        { w: 750, h: 1334, media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' }
      ];
      
      splashSpecs.forEach(({ w, h, media }) => {
        const link = document.createElement('link');
        link.rel = 'apple-touch-startup-image';
        link.href = generateSplashScreen(w, h);
        link.media = media;
        document.head.appendChild(link);
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(generateSplashes);
    } else {
      setTimeout(generateSplashes, 2000);
    }
  }

  // 4. Service Worker Registration via Blob
  const swCode = `
    const CACHE_NAME = 'fileforge-v1';
    const PRECACHE_URLS = [
      '/',
      'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      'https://unpkg.com/docx@8.5.0/build/index.umd.js',
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
    ];

    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
          return Promise.allSettled(
            PRECACHE_URLS.map((url) =>
              cache.add(url).catch((err) => console.warn('Cache error:', url, err))
            )
          );
        }).then(() => self.skipWaiting())
      );
    });

    self.addEventListener('activate', (event) => {
      event.waitUntil(
        caches.keys().then((keys) => {
          return Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
          );
        }).then(() => self.clients.claim())
      );
    });

    self.addEventListener('fetch', (event) => {
      if (event.request.method !== 'GET') return;
      if (!event.request.url.startsWith('http')) return;

      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Background fetch to update cache (stale-while-revalidate)
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
            }).catch(() => {});
            return cachedResponse;
          }

          return fetch(event.request).then((networkResponse) => {
            if (!networkResponse || !networkResponse.ok || networkResponse.type === 'opaque') {
              return networkResponse;
            }
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return networkResponse;
          }).catch(() => {
            return caches.match('/');
          });
        })
      );
    });

    self.addEventListener('message', (event) => {
      if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
      }
    });
  `;

  if ('serviceWorker' in navigator) {
    (async () => {
      try {
        const swBlob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(swBlob);
        const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
        console.log('SW Registered via Blob:', registration.scope);
        
        // Custom updates triggers
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('pwa-update-ready', { detail: registration }));
        }
        
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('pwa-update-ready', { detail: registration }));
              }
            });
          }
        });
        
      } catch (err) {
        console.warn('Blob SW blocked/failed, trying to load sw.js statically: ', err);
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.log('SW statically registered fallback:', registration.scope);
        } catch (staticErr) {
          console.error('Static SW fallback also failed: ', staticErr);
        }
      }
    })();
  }
}

// Global actions to trigger App settings modal
export function openPwaSettings() {
  window.dispatchEvent(new CustomEvent('open-pwa-settings-drawer'));
}

export function PwaManager() {
  const isOnline = useOnlineStatus();
  const { isInstallable, isStandalone, triggerInstall } = usePwaInstallState();
  
  const [installBannerOpen, setInstallBannerOpen] = useState(false);
  const [offlineBannerOpen, setOfflineBannerOpen] = useState(false);
  const [updateBannerOpen, setUpdateBannerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [firefoxModalOpen, setFirefoxModalOpen] = useState(false);
  const [activeWaitingRegistration, setActiveWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info'>('success');
  
  const [calcCacheStr, setCalcCacheStr] = useState<string>('');
  const [isCalculatingCache, setIsCalculatingCache] = useState(false);

  // Show banner under conditions
  useEffect(() => {
    setupPwaInfrastructure();
    
    // Check local storage dismissed
    const dismissedAt = localStorage.getItem('fileforge-install-dismissed');
    const isDismissed = dismissedAt && (Date.now() - parseInt(dismissedAt)) < 7 * 24 * 60 * 60 * 1000;
    
    const triggerBanner = () => {
      if (isInstallable && !isStandalone && !isDismissed) {
        setInstallBannerOpen(true);
      }
    };

    // Trigger 1: 30 seconds timer
    const timer = setTimeout(triggerBanner, 30000);

    // Trigger 2: user processed first file
    const handleFileAdded = () => {
      triggerBanner();
    };

    window.addEventListener('ff-history-added', handleFileAdded);
    
    // SW updates listener
    const handleSwUpdate = (e: Event) => {
      const reg = (e as CustomEvent).detail;
      setActiveWaitingRegistration(reg);
      setUpdateBannerOpen(true);
    };
    window.addEventListener('pwa-update-ready', handleSwUpdate);

    // Settings drawer trigger listener
    const handleOpenSettings = () => {
      setSettingsOpen(true);
    };
    window.addEventListener('open-pwa-settings-drawer', handleOpenSettings);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('ff-history-added', handleFileAdded);
      window.removeEventListener('pwa-update-ready', handleSwUpdate);
      window.removeEventListener('open-pwa-settings-drawer', handleOpenSettings);
    };
  }, [isInstallable, isStandalone]);

  // Online network status sync side-effects
  useEffect(() => {
    if (!isOnline) {
      setOfflineBannerOpen(true);
      document.body.style.paddingTop = '44px';
    } else {
      if (offlineBannerOpen) {
        setOfflineBannerOpen(false);
        document.body.style.paddingTop = '';
        triggerToast('✅ Back online! FileForge is fully connected.', 'success');
      }
    }
    
    return () => {
      document.body.style.paddingTop = '';
    };
  }, [isOnline]);

  // Trigger custom toast alert
  const triggerToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleInstallClick = async () => {
    const success = await triggerInstall();
    if (success) {
      setInstallBannerOpen(false);
      triggerToast('🎉 FileForge installed! Find it on your home screen.', 'success');
    } else {
      // Prompt blocked/fails: fallback guides
      const guides = getInstallInstructions();
      if (guides) {
        setInstallBannerOpen(false);
        if (guides.title.includes('iPhone')) {
          setIosModalOpen(true);
        } else if (guides.title.includes('Firefox')) {
          setFirefoxModalOpen(true);
        }
      }
    }
  };

  const handleDismissBanner = () => {
    setInstallBannerOpen(false);
    localStorage.setItem('fileforge-install-dismissed', Date.now().toString());
  };

  const handleUpdateApp = () => {
    if (activeWaitingRegistration && activeWaitingRegistration.waiting) {
      activeWaitingRegistration.waiting.postMessage('SKIP_WAITING');
      activeWaitingRegistration.waiting.addEventListener('statechange', (e: any) => {
        if (e.target.state === 'activated') {
          window.location.reload();
        }
      });
      // Force reload as safety trigger
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  const handleCalculateCache = async () => {
    setIsCalculatingCache(true);
    try {
      if (!navigator.storage || !navigator.storage.estimate) {
        setCalcCacheStr('Storage Estimation API not supported on this browser.');
        return;
      }
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 1;
      const usedMB = (used / 1024 / 1024).toFixed(2);
      const quotaMB = (quota / 1024 / 1024).toFixed(0);
      const usedPct = ((used / quota) * 100).toFixed(4);
      setCalcCacheStr(`${usedMB} MB used of total browser quota: ${quotaMB} MB (${usedPct}% occupied).`);
    } catch (e) {
      setCalcCacheStr('Failed to query storage status.');
    } finally {
      setIsCalculatingCache(false);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('WARNING: This will clear the cached application bundle and unregister the local service worker. Offline access will be unavailable until you reload the app with an internet connection. Do you wish to continue?')) {
      return;
    }
    
    try {
      // Delete cache
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map(k => caches.delete(k)));
      
      // Unregister workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      
      alert('Local cache reset successfully. Reloading FileForge now...');
      window.location.reload();
    } catch {
      alert('An error occurred while resetting cache.');
    }
  };

  const guides = getInstallInstructions();

  return (
    <>
      {/* 1. TOP OFFLINE BANNER (Slide down) */}
      {offlineBannerOpen && (
        <div 
          id="pwa-offline-topbar"
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 h-11 bg-gradient-to-r from-[#1A1A2E] to-[#16213E] border-b border-[#6C63FF]/30 z-[99] flex items-center justify-center gap-2 px-4 shadow-lg text-white font-sans text-xs sm:text-sm animate-fade-in"
        >
          <WifiOff className="w-4 h-4 text-[#F5A623] shrink-0" />
          <span className="font-medium text-center leading-normal">
            📴 You are offline — FileForge still works! All tools available. Results save to your device.
          </span>
        </div>
      )}

      {/* 2. TOP UPDATE BANNER (Highest priority over offline banner) */}
      {updateBannerOpen && (
        <div 
          id="pwa-update-bar"
          role="alert"
          className="fixed top-0 left-0 right-0 bg-[#6C63FF] text-white flex items-center justify-between px-4 sm:px-6 z-[101] shadow-xl border-b border-white/10"
          style={{ height: '48px' }}
        >
          <div className="flex-1 text-center font-display text-xs sm:text-[13px] font-bold leading-normal text-white">
            ✨ A minor enhancement is ready to deploy! Tap Update to experience latest features offline.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              type="button"
              onClick={handleUpdateApp}
              className="bg-[#1A1D26] hover:text-[#00D4AA] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all"
            >
              Update
            </button>
            <button 
              type="button"
              onClick={() => setUpdateBannerOpen(false)}
              className="text-white hover:opacity-75 transition-opacity px-2 text-xs"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* 3. BOTTOM INSTALL PROMPT BANNER */}
      {installBannerOpen && (
        <div 
          id="pwa-install-banner"
          aria-hidden="false"
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-surface-dark border border-border-dark border-t-[3px] border-t-primary-accent rounded-t-2xl p-5 z-[80] shadow-[0_-8px_32px_rgba(108,99,255,0.2)] animate-bounce-in flex flex-col gap-4 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img 
                src={generateIcon(48)} 
                alt="FileForge App Icon" 
                className="w-12 h-12 rounded-xl shadow-[0_4px_12px_rgba(108,99,255,0.3)] shrink-0 border border-white/5"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="font-display font-bold text-text-light text-[15px] leading-tight">Install FileForge</span>
                <span className="font-sans text-xs text-text-sub mt-0.5 leading-normal">Works offline · Like a native app · Free</span>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleDismissBanner}
              className="text-text-sub hover:text-text-light p-1 rounded-full hover:bg-white/5 transition-all text-lg cursor-pointer leading-none"
              title="Dismiss install banner"
            >
              ×
            </button>
          </div>

          <div className="flex justify-between items-center gap-1.5 mt-0.5">
            <span className="bg-surface-secondary border border-border-dark px-2.5 py-1 rounded-full text-[10px] text-text-sub font-mono shrink-0">📴 Works Offline</span>
            <span className="bg-surface-secondary border border-border-dark px-2.5 py-1 rounded-full text-[10px] text-text-sub font-mono shrink-0">⚡ Instant Load</span>
            <span className="bg-surface-secondary border border-border-dark px-2.5 py-1 rounded-full text-[10px] text-text-sub font-mono shrink-0">🔒 100% Private</span>
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <button 
              type="button"
              onClick={handleInstallClick}
              className="w-full h-11 bg-gradient-to-r from-primary-accent to-secondary-accent text-white font-display font-extrabold text-sm rounded-xl hover:shadow-[0_0_15px_rgba(108,99,255,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
              title="Trigger app installation"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
            <button 
              type="button"
              onClick={handleDismissBanner}
              className="text-center text-text-sub hover:text-text-light text-xs py-1.5 transition-colors cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* 4. APP TOAST NOTIFICATION CONTAINER */}
      {toastMessage && (
        <div 
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-surface-dark border border-secondary-accent/20 text-text-light text-xs sm:text-sm font-sans font-medium px-5 py-3 rounded-full shadow-[0_8px_32px_rgba(0,212,170,0.15)] flex items-center gap-2.5 z-[100] animate-bounce-in"
          role="status"
        >
          <Check className="w-4 h-4 text-secondary-accent" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 5. IOS EXPANDABLE USER GUIDE MODAL */}
      {iosModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-dark border border-border-dark rounded-2xl max-w-sm w-full p-6 text-left shadow-2xl relative space-y-4">
            <button 
              onClick={() => setIosModalOpen(false)}
              className="absolute top-4 right-4 text-text-sub hover:text-text-light text-xl"
            >
              ×
            </button>
            <div className="flex items-center gap-3">
              <Share className="w-6 h-6 text-[#6C63FF]" />
              <h3 className="text-lg font-display font-bold text-text-light">Install on iPhone / iPad</h3>
            </div>
            <p className="text-xs text-text-sub leading-relaxed">
              Safari on iOS does not support fully automated PWA prompt APIs. You can easily install FileForge manually in seconds:
            </p>
            <ol className="list-decimal list-inside space-y-2.5 text-xs text-text-light font-sans pl-1">
              <li>Tap the <span className="text-[#6C63FF] font-semibold">Share button</span> (square with arrow up) inside your Safari toolbar options</li>
              <li>Scroll down the options list and tap <span className="text-[#6C63FF] font-semibold">"Add to Home Screen" (+)</span></li>
              <li>Confirm item details and click <span className="text-secondary-accent font-semibold">"Add"</span> to place the launch icon</li>
              <li>Open FileForge from your local home screen to enjoy standalone offline mode!</li>
            </ol>
            <button 
              type="button"
              onClick={() => setIosModalOpen(false)}
              className="w-full py-2.5 bg-primary-accent text-white rounded-xl text-xs font-bold font-display"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* 6. FIREFOX BOOKMARK ACCESSIBILITY MODAL */}
      {firefoxModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-dark border border-border-dark rounded-2xl max-w-sm w-full p-6 text-left shadow-2xl relative space-y-4">
            <button 
              onClick={() => setFirefoxModalOpen(false)}
              className="absolute top-4 right-4 text-text-sub hover:text-text-light text-xl"
            >
              ×
            </button>
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-[#6C63FF]" />
              <h3 className="text-lg font-display font-bold text-text-light">Use Offline in Firefox</h3>
            </div>
            <p className="text-xs text-text-sub leading-relaxed">
              Firefox does not support standalone desktop application installer flags. But FileForge still works fully offline!
            </p>
            <ol className="list-decimal list-inside space-y-2 text-xs text-text-light font-sans pl-1">
              <li>Bookmark this website (<span className="text-primary-accent font-semibold">Ctrl+D</span> or Tap the Star icon)</li>
              <li>FileForge downloads and packages every single service library automatically</li>
              <li>Whenever you are offline, just open Firefox and click the boomark to load the applet!</li>
            </ol>
            <button 
              type="button"
              onClick={() => setFirefoxModalOpen(false)}
              className="w-full py-2.5 bg-primary-accent text-white rounded-xl text-xs font-bold font-display"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* 7. APP PWA SETTINGS DRAWER / SLIDE OVER */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSettingsOpen(false)}
          ></div>
          
          {/* Main Drawer Body */}
          <div className="relative w-full max-w-[400px] h-full bg-surface-dark border-l border-border-dark p-6 shadow-2xl overflow-y-auto animate-slide-from-right flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border-dark">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary-accent animate-spin-slow" />
                  <span className="font-display font-bold text-text-light text-lg">App Settings</span>
                </div>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className="text-text-sub hover:text-text-light p-1 rounded-full hover:bg-white/5 transition-all outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cache Details Section */}
              <div className="space-y-4">
                <span className="text-[11px] font-mono font-bold text-primary-accent uppercase tracking-wider block">Interactive Cache Manager</span>
                <div className="p-4 bg-surface-secondary border border-border-dark rounded-xl space-y-3 font-sans text-xs">
                  <div className="flex justify-between items-center text-text-sub">
                    <span>Cache Name:</span>
                    <span className="font-mono text-text-light bg-surface-dark px-2 py-0.5 rounded border border-border-dark">fileforge-v1</span>
                  </div>
                  <div className="flex justify-between items-center text-text-sub">
                    <span>Cache Version:</span>
                    <span className="font-mono text-text-light bg-surface-dark px-2 py-0.5 rounded border border-border-dark">1.0.0</span>
                  </div>
                  <div className="flex justify-between items-center text-text-sub">
                    <span>Execution Mode:</span>
                    <span className="font-mono text-secondary-accent font-semibold bg-secondary-accent/5 px-2 py-0.5 rounded border border-secondary-accent/15">
                      {isStandalone ? 'Standalone App' : 'Web Sandbox'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-text-sub text-[11px]">
                    <span>Offline Storage:</span>
                    <span className="text-text-sub font-mono">Quota-managed offline buffer</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1.5">
                  <button 
                    type="button"
                    onClick={handleCalculateCache}
                    disabled={isCalculatingCache}
                    className="h-10 border border-border-dark text-xs font-display font-bold text-text-light rounded-xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-text-sub ${isCalculatingCache ? 'animate-spin' : ''}`} />
                    {isCalculatingCache ? 'Analyzing...' : 'Calculate local cache size'}
                  </button>

                  {calcCacheStr && (
                    <div className="p-3 bg-[#6C63FF]/5 border border-[#6C63FF]/15 rounded-lg text-[11px] font-mono text-text-light mt-1">
                      {calcCacheStr}
                    </div>
                  )}

                  <button 
                    type="button"
                    onClick={handleClearCache}
                    className="h-10 bg-transparent border border-red-500/30 hover:bg-red-500/10 text-xs font-display font-medium text-red-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🗑️ Clear App Cache & Reset
                  </button>
                </div>
              </div>

              {/* Install and Instructions Section */}
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-mono font-bold text-primary-accent uppercase tracking-wider block">PWA Installation Guides</span>
                
                {guides ? (
                  <div className="p-4 border border-[#6C63FF]/15 bg-[#6C63FF]/5 rounded-xl text-left space-y-2">
                    <span className="font-display font-bold text-sm text-text-light flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-primary-accent" />
                      {guides.title}
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-text-light">
                      {guides.steps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div className="p-4 bg-surface-secondary border border-border-dark rounded-xl text-xs space-y-2 text-text-sub">
                    <p className="font-semibold text-text-light">💡 Local Application Installed</p>
                    <p className="leading-relaxed">This device already supports standalone execution or the installer prompt is prepared. Double click home screen launcher to run without loading browser UI address bars.</p>
                    
                    {isInstallable && (
                      <button 
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full mt-2 h-10 bg-[#6C63FF] hover:bg-[#6C63FF]/95 text-white font-display font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Install Application Now
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Privacy footer */}
            <div className="border-t border-border-dark pt-4 text-center">
              <p className="text-[11px] text-text-sub leading-normal">
                FileForge strictly guarantees 100% Client-Only secure data sandboxes. No files ever traverse network bounds.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 8. CACHE STATUS WIDGET Pill Component
export function PwaCacheStatusWidget() {
  const isOnline = useOnlineStatus();
  
  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1 bg-surface-dark border border-border-dark rounded-full text-xs font-mono text-text-sub select-none"
      title="FileForge Local Service Worker Engine Availability"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4AA] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D4AA]"></span>
      </span>
      <span className="text-[#00D4AA] font-semibold text-[11px]">⚡ Offline Mode Available</span>
    </div>
  );
}

// 9. NAVBAR INSTALL BUTTON Component
export function PwaInstallNavbarButton() {
  const { isInstallable, isStandalone } = usePwaInstallState();
  const guides = getInstallInstructions();

  const handleClick = () => {
    if (globalDeferredPrompt) {
      globalDeferredPrompt.prompt();
    } else if (guides) {
      // Trigger modal internally via custom event
      window.dispatchEvent(new CustomEvent('open-pwa-settings-drawer'));
    } else {
      openPwaSettings();
    }
  };

  if (isStandalone) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-mono font-semibold text-[#00D4AA] bg-[#00D4AA]/5 border border-[#00D4AA]/20 px-2.5 py-1 rounded-full shadow-inner select-none transition-all">
        💻 App mode
      </span>
    );
  }

  // Show "Install" or "Get App" anyway for manual guides accessibility
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-bold border rounded-xl cursor-pointer select-none transition-all outline-none focus:ring-1 focus:ring-primary-accent
        ${isInstallable 
          ? 'bg-gradient-to-r from-primary-accent to-secondary-accent text-white border-transparent hover:shadow-[0_0_12px_rgba(108,99,255,0.4)] hover:scale-[1.02]' 
          : 'bg-surface-dark text-text-sub border-border-dark hover:text-text-light hover:border-[#6C63FF]/40'
        }`}
      title="Install FileForge Offline desktop / mobile application app"
    >
      <Download className="w-3.5 h-3.5 animate-bounce-slow" />
      <span className="hidden md:inline">Install App</span>
      <span className="md:hidden">Get App</span>
    </button>
  );
}

// Low-level helper to retrieve browser PWA notes
function getInstallInstructions() {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  
  if (isIOS) {
    return {
      title: "Install on iPhone / iPad",
      steps: [
        "Tap the Share button (square with arrow up) inside your Safari toolbar options.",
        "Scroll down the menu list and tap 'Add to Home Screen' (+).",
        "Give the shortcut a descriptive name and tap 'Add' to place standard launcher icon.",
        "Launch FileForge from your local device home screen to access standalone workspace mode!"
      ]
    };
  }
  
  if (isFirefox) {
    return {
      title: "Use Offline in Firefox",
      steps: [
        "Bookmark this website (press Ctrl+D or tap Star in address bar).",
        "FileForge pre-downloads all essential WebAssembly libraries instantly.",
        "When offline, just open Firefox and click the bookmark to execute tools instantly!"
      ]
    };
  }
  
  return null;
}
