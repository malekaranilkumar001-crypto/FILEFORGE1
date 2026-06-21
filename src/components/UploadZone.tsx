import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileText, AlertCircle, FolderOpen, Clipboard, AlertTriangle, Info } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (files: File[]) => void;
  acceptedTypes: string[]; // e.g. ['.pdf'], ['.jpg', '.jpeg'], ['.docx', '.xlsx']
  multiple?: boolean;
  instructionText?: string;
  activeTool?: string;
}

export default function UploadZone({
  onFileSelected,
  acceptedTypes,
  multiple = false,
  instructionText = 'PDF, DOCX, XLSX, JPEG, PNG, WEBP',
  activeTool = ''
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clipboard Paste States
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [showPermissionCard, setShowPermissionCard] = useState(false);
  const [showHintBubble, setShowHintBubble] = useState(false);
  const [supportsClipboard, setSupportsClipboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Custom clipboard error state
  const [apiError, setApiError] = useState<{
    type: 'denied' | 'empty' | 'no-image' | 'unsupported' | 'wrong-type' | 'pdf-not-supported';
    formats?: string[];
    detected?: string;
  } | null>(null);

  useEffect(() => {
    // Check mobile state
    setIsMobile(window.innerWidth < 640);
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);

    // Check clipboard functionality support
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    const supports = !!(navigator.clipboard && typeof navigator.clipboard.read === 'function') && !isFirefox;
    setSupportsClipboard(supports);

    // Listener for custom events from parent keyboard triggers
    const handleFlash = () => {
      setIsFlashActive(true);
      const timer = setTimeout(() => setIsFlashActive(false), 150);
      return () => clearTimeout(timer);
    };

    const handleErrorEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.type) {
        setApiError({ type: customEvent.detail.type });
      }
    };

    window.addEventListener('clipboard-paste-flash', handleFlash);
    window.addEventListener('clipboard-paste-error', handleErrorEvent);

    // Initial hint bubble timer (only first-visit, show after 3s)
    let hintShowTimer: NodeJS.Timeout;
    let hintDismissTimer: NodeJS.Timeout;

    const hasSeenHint = localStorage.getItem('fileforge-clipboard-hint-shown');
    // Only show if it is an image tool and not seen yet
    const isImageTool = ['jpeg-compress', 'image-resize', 'image-enhance', 'jpeg-to-pdf'].includes(activeTool);
    if (!hasSeenHint && isImageTool) {
      hintShowTimer = setTimeout(() => {
        setShowHintBubble(true);
      }, 3000);

      hintDismissTimer = setTimeout(() => {
        setShowHintBubble(false);
        localStorage.setItem('fileforge-clipboard-hint-shown', 'true');
      }, 11000); // 3 seconds delay + 8 seconds stay duration
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('clipboard-paste-flash', handleFlash);
      window.removeEventListener('clipboard-paste-error', handleErrorEvent);
      clearTimeout(hintShowTimer);
      clearTimeout(hintDismissTimer);
    };
  }, [activeTool]);

  // Handle escape canceling permission modal
  useEffect(() => {
    if (!showPermissionCard) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPermissionCard(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPermissionCard]);

  // Error Banner dismiss timer
  useEffect(() => {
    if (!apiError) return;
    const timer = setTimeout(() => {
      setApiError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [apiError]);

  const validateFiles = (filesList: File[]): File[] => {
    const valid: File[] = [];
    const lowerAccepted = acceptedTypes.map(t => t.toLowerCase());
    
    for (let i = 0; i < filesList.length; i++) {
      const f = filesList[i];
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      
      let isAccepted = lowerAccepted.includes(ext);
      
      if (!isAccepted) {
        const mime = f.type.toLowerCase();
        isAccepted = lowerAccepted.some(acceptedType => {
          if (acceptedType === '.pdf' && mime === 'application/pdf') return true;
          if ((acceptedType === '.jpg' || acceptedType === '.jpeg') && mime === 'image/jpeg') return true;
          if (acceptedType === '.png' && mime === 'image/png') return true;
          if (acceptedType === '.webp' && mime === 'image/webp') return true;
          if (acceptedType === '.docx' && (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/msword')) return true;
          if (acceptedType === '.xlsx' && (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.ms-excel')) return true;
          return false;
        });
      }

      if (isAccepted) {
        valid.push(f);
      }
    }
    return valid;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMsg(null);
    setApiError(null);

    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    const valid = validateFiles(droppedFiles);

    if (valid.length === 0) {
      triggerError(`Incorrect file format. Accepted extensions: ${acceptedTypes.join(', ')}`);
      return;
    }

    if (!multiple && valid.length > 1) {
      onFileSelected([valid[0]]);
    } else {
      onFileSelected(valid);
    }
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setApiError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files) as File[];
      const valid = validateFiles(selectedFiles);

      if (valid.length === 0) {
        triggerError(`Incorrect file format. Accepted extensions: ${acceptedTypes.join(', ')}`);
        return;
      }

      if (!multiple && valid.length > 1) {
        onFileSelected([valid[0]]);
      } else {
        onFileSelected(valid);
      }
    }
  };

  const handleZoneClick = (e: React.MouseEvent) => {
    // If clicking a child button/modal, don't trigger browse
    if (showPermissionCard) return;
    e.preventDefault();
    fileInputRef.current?.click();
  };

  // Safe helper to normalize pasted PNG -> JPEG inside JPEG Compressor
  const normalizeClipboardImage = async (file: File, targetType: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff'; // default background for transparent PNG
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(url);
        canvas.toBlob((result) => {
          resolve(result || file);
        }, targetType, 0.95);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  // Method 2: Clipboard API button click handler
  const handlePastePillClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorMsg(null);
    setApiError(null);
    dismissHint();

    // If PDF tool, show no-paste-support info banner
    if (activeTool === 'pdf-compress' || activeTool === 'merge-pdf') {
      setApiError({ type: 'pdf-not-supported' });
      return;
    }

    // Verify browser support
    if (!navigator.clipboard || !navigator.clipboard.read) {
      setApiError({ type: 'unsupported' });
      return;
    }

    try {
      // Query permission or directly call read
      let permState: PermissionState = 'prompt';
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const perm = await navigator.permissions.query({ name: 'clipboard-read' as any });
          permState = perm.state;
        }
      } catch (_) {
        permState = 'prompt';
      }

      if (permState === 'denied') {
        setApiError({ type: 'denied' });
        return;
      }

      if (permState === 'prompt') {
        setShowPermissionCard(true);
        return;
      }

      // If already granted, proceed directly
      await executeClipboardPaste();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setApiError({ type: 'denied' });
      } else {
        setApiError({ type: 'unsupported' });
      }
    }
  };

  const handleApprovePermission = async () => {
    setShowPermissionCard(false);
    try {
      await executeClipboardPaste();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setApiError({ type: 'denied' });
      } else {
        setApiError({ type: 'unsupported' });
      }
    }
  };

  const executeClipboardPaste = async () => {
    // Read the clipboard items
    const items = await navigator.clipboard.read();
    let imageItem: ClipboardItem | null = null;
    let mimeType = '';

    for (const item of items) {
      const type = item.types.find(t => t.startsWith('image/'));
      if (type) {
        imageItem = item;
        mimeType = type;
        break;
      }
    }

    if (!imageItem || !mimeType) {
      // Try to read as files or check if empty
      setApiError({ type: 'no-image' });
      return;
    }

    const blob = await imageItem.getType(mimeType);
    if (!blob) {
      setApiError({ type: 'empty' });
      return;
    }

    // Check if the file format is allowed by the active tool
    const lowerAccepted = acceptedTypes.map(t => t.toLowerCase());
    const extension = mimeType.split('/')[1] || 'png';
    const originalFile = new File([blob], `pasted_image_${Date.now()}.${extension}`, { type: mimeType });

    let finalFile = originalFile;
    const fileType = originalFile.type.toLowerCase();

    // Check tool limits and normalization
    if (fileType === 'image/png' && activeTool === 'jpeg-compress') {
      // PDF/JPG converter automatically triggers transparent conversion
      const jpegBlob = await normalizeClipboardImage(originalFile, 'image/jpeg');
      finalFile = new File([jpegBlob], `pasted_image_${Date.now()}.jpg`, { type: 'image/jpeg' });
    } else if (fileType === 'image/webp') {
      const normBlob = await normalizeClipboardImage(originalFile, 'image/png');
      finalFile = new File([normBlob], `pasted_image_${Date.now()}.png`, { type: 'image/png' });
    } else if (fileType === 'image/bmp' || fileType === 'image/tiff') {
      const normBlob = await normalizeClipboardImage(originalFile, 'image/png');
      finalFile = new File([normBlob], `pasted_image_${Date.now()}.png`, { type: 'image/png' });
    }

    // Verify extension matches accepted list
    const finalExt = '.' + finalFile.name.split('.').pop()?.toLowerCase();
    let isAccepted = lowerAccepted.includes(finalExt);
    if (!isAccepted) {
      isAccepted = lowerAccepted.some(acceptedType => {
        if (acceptedType === '.jpg' || acceptedType === '.jpeg') {
          return finalFile.type === 'image/jpeg';
        }
        if (acceptedType === '.png') {
          return finalFile.type === 'image/png';
        }
        return false;
      });
    }

    if (!isAccepted) {
      setApiError({ 
        type: 'wrong-type', 
        formats: acceptedTypes, 
        detected: extension.toUpperCase() 
      });
      return;
    }

    // Success! Flash animation
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 150);

    onFileSelected([finalFile]);
  };

  const dismissHint = () => {
    setShowHintBubble(false);
    localStorage.setItem('fileforge-clipboard-hint-shown', 'true');
  };

  const getExtendedAcceptTypes = (): string[] => {
    const list: string[] = [];
    acceptedTypes.forEach(t => {
      const lower = t.toLowerCase();
      list.push(lower);
      if (lower === '.pdf') {
        list.push('application/pdf');
      } else if (lower === '.jpg' || lower === '.jpeg') {
        list.push('image/jpeg');
      } else if (lower === '.png') {
        list.push('image/png');
      } else if (lower === '.webp') {
        list.push('image/webp');
      } else if (lower === '.docx') {
        list.push('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        list.push('application/msword');
      } else if (lower === '.xlsx') {
        list.push('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        list.push('application/vnd.ms-excel');
      }
    });
    return Array.from(new Set(list));
  };

  const acceptString = getExtendedAcceptTypes().join(',');

  // Check if current tool supports paste option pills
  const showPastePill = supportsClipboard || isMobile;

  const getSubtextHint = () => {
    if (isMobile) {
      if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
        return "Take a screenshot with Power+Volume Down, then paste here";
      }
      return "Take a screenshot or select from your camera roll, then paste here";
    }
    return "Paste screenshots, copied images, or photos directly";
  };

  const headlineText = isMobile
    ? "Tap to browse or paste from clipboard"
    : `Drag & drop your ${multiple ? 'files' : 'file'} here or browse`;

  return (
    <div className="w-full relative">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        className={`w-full min-h-[385px] sm:min-h-[380px] h-auto border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center py-8 sm:py-10 px-4 sm:px-6 text-center select-none relative overflow-hidden ${
          isDragOver
            ? 'border-primary-accent bg-primary-accent/10 shadow-[0_0_20px_rgba(108,99,255,0.25)]'
            : isFlashActive
            ? 'border-[#00D4AA] bg-[#00D4AA]/20 shadow-[0_0_25px_rgba(0,212,170,0.35)]'
            : 'border-border-dark bg-surface-dark hover:border-primary-accent/60 hover:shadow-[0_0_15px_rgba(108,99,255,0.1)]'
        } ${shake ? 'animate-bounce' : ''}`}
        style={{
          outline: 'none',
        }}
        id="upload-drop-zone"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          onClick={(e) => e.stopPropagation()}
          accept={acceptString}
          multiple={multiple}
          className="hidden"
        />

        <div className={`p-4 rounded-full bg-[#1F2432] mb-4 text-[#6C63FF] transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
          <UploadCloud className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-display font-semibold text-text-light mb-2 px-4 leading-normal">
          {headlineText}
        </h3>
        
        <p className="text-xs text-text-sub max-w-md hidden sm:block">
          Supports: <span className="font-mono text-[11px]">{instructionText}</span>
        </p>

        {/* PILLS AREA */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 select-none relative z-10 px-4">
          {/* Browse Pill */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleZoneClick(e); }}
            className="h-[34px] px-4 rounded-full border border-border-dark bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:border-primary-accent hover:text-text-light flex items-center gap-1.5 text-[13px] font-sans font-medium transition-all duration-100 active:scale-95 cursor-pointer"
          >
            <FolderOpen className="w-[14px] h-[14px]" />
            Browse
          </button>
          
          {/* Paste Pill */}
          {showPastePill && (
            <button
              type="button"
              onClick={handlePastePillClick}
              className="h-[34px] px-4 rounded-full border border-border-dark bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:border-primary-accent hover:text-text-light flex items-center gap-1.5 text-[13px] font-sans font-medium transition-all duration-100 active:scale-95 cursor-pointer relative"
            >
              <Clipboard className="w-[14px] h-[14px]" />
              Paste
            </button>
          )}

          {/* Ctrl+V Pill - Desktop only */}
          {!isMobile && (
            <div className="relative group h-[34px] px-4 rounded-full border border-border-dark bg-[#1F2432]/40 text-[#8892A4]/60 flex items-center gap-1.5 text-[13px] font-sans select-none cursor-default">
              <span className="text-[10px] bg-[#11141D] border border-border-dark px-1.5 py-0.5 rounded font-mono text-[#8892A4]/80">Ctrl</span>
              <span>+</span>
              <span className="text-[10px] bg-[#11141D] border border-border-dark px-1.5 py-0.5 rounded font-mono text-[#8892A4]/80">V</span>
              
              {/* Tooltip on Hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#11141D] text-[#F0F2F8] text-[11px] p-2 rounded-lg border border-border-dark shadow-2xl text-center leading-relaxed font-sans z-50 pointer-events-none transition-all duration-150 scale-95 opacity-0 origin-bottom group-hover:scale-100 group-hover:opacity-100">
                Press Ctrl+V anywhere on this page to paste an image
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#11141D]" />
              </div>
            </div>
          )}
        </div>

        {/* Small muted text guide */}
        <p className="text-[12px] font-sans text-text-sub mt-3 max-w-md px-4 leading-normal">
          {getSubtextHint()}
        </p>

        <p className="text-[11px] text-[#00D4AA] mt-4 font-display flex items-center gap-1.5 bg-[#00D4AA]/10 px-3 py-1.5 rounded-full select-none">
          🔒 100% Private — processed directly on your browser
        </p>

        {/* First Visit Hint Bubble */}
        {showHintBubble && (
          <div className="absolute bottom-20 left-1/2 -translate-x-[50%] bg-[#6C63FF]/20 border border-[#6C63FF] rounded-[10px] p-3 max-w-[280px] text-left z-40 shadow-2xl flex gap-2 items-start text-xs text-text-light animate-bounce">
            <span className="flex-1 font-sans font-medium">
              💡 Did you know? You can paste screenshots directly with Ctrl+V!
            </span>
            <button
              type="button"
              onClick={dismissHint}
              className="text-text-sub hover:text-white font-bold ml-1 text-sm shrink-0 leading-none cursor-pointer"
            >
              &times;
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-[#6C63FF]" />
          </div>
        )}

        {/* Permission Request Modal Overlay (inside upload zone overlay, fully self-contained) */}
        {showPermissionCard && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="permission-card-title">
            <div className="bg-surface-dark border border-primary-accent rounded-[14px] p-5 max-w-[340px] w-full text-center space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="text-3xl select-none">🔒</div>
              <h3 id="permission-card-title" className="text-base font-bold font-display text-text-light">
                Allow Clipboard Access
              </h3>
              <p className="text-xs text-text-sub leading-normal">
                FileForge needs permission to read your clipboard to paste images. Your clipboard content is processed entirely in your browser — nothing is sent to any server.
              </p>
              <div className="bg-secondary-accent/10 border border-secondary-accent/20 text-secondary-accent rounded-lg p-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 select-none">
                <span>🔒</span> Private: We never see or store your data
              </div>
              <div className="space-y-2 pt-1 flex flex-col w-full">
                <button
                  type="button"
                  onClick={handleApprovePermission}
                  className="w-full py-2 bg-primary-accent hover:bg-primary-accent/90 text-white text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  Allow & Paste
                </button>
                <button
                  type="button"
                  onClick={() => setShowPermissionCard(false)}
                  className="w-full py-2 bg-transparent border border-border-dark text-text-sub hover:text-text-light text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-text-sub/70">
                You can revoke this permission anytime in browser settings
              </p>
            </div>
          </div>
        )}

        {/* Clipboard Custom Error & Info Banner */}
        {apiError && (
          <div 
            role="alert" 
            aria-live={apiError.type === 'pdf-not-supported' ? 'polite' : 'assertive'} 
            className={`absolute bottom-3 left-3 right-3 p-3 rounded-lg flex gap-3 text-left z-25 transition-all outline-none border ${
              apiError.type === 'pdf-not-supported'
                ? 'bg-blue-950/40 border-blue-850 text-blue-200'
                : 'bg-red-950/40 border-red-800 text-red-200'
            }`}
            onClick={(e) => e.stopPropagation()} 
          >
            {apiError.type === 'pdf-not-supported' ? (
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div className="flex-1 space-y-0.5">
              <p className="text-xs font-bold">
                {apiError.type === 'denied' && "Clipboard access blocked"}
                {apiError.type === 'empty' && "Clipboard is empty"}
                {apiError.type === 'no-image' && "No image found in clipboard"}
                {apiError.type === 'unsupported' && "Clipboard paste not supported"}
                {apiError.type === 'wrong-type' && "Image format not supported"}
                {apiError.type === 'pdf-not-supported' && "PDF paste not supported"}
              </p>
              <p className="text-[11px] leading-relaxed">
                {apiError.type === 'denied' && "Your browser blocked clipboard access. Click the 🔒 icon in your address bar and allow clipboard access, then try again. Or use 'Browse' to select your file."}
                {apiError.type === 'empty' && "Copy an image first, then paste here. Try: right-click any image → Copy Image, then press Ctrl+V here."}
                {apiError.type === 'no-image' && "Your clipboard contains text or other content, not an image. Copy an image and try again. You can paste screenshots too — press Print Screen first."}
                {apiError.type === 'unsupported' && "Your browser doesn't support clipboard paste. Please use 'Browse' to select your file, or try Chrome or Edge for paste support."}
                {apiError.type === 'wrong-type' && `This tool accepts ${apiError.formats?.join(', ') || 'supported formats'}. The pasted image is ${apiError.detected || 'unsupported'}. Please convert it first or use a different image.`}
                {apiError.type === 'pdf-not-supported' && "Browsers cannot read PDF files from the clipboard for security reasons. Please use 'Browse' to select your PDF file. Image paste works in our Image tools though!"}
              </p>
              {apiError.type === 'denied' && (
                <a 
                  href="https://support.google.com/chrome/answer/114662?hl=en" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-0.5 text-[10px] text-primary-accent font-semibold hover:underline"
                >
                  Open browser help &rarr;
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setApiError(null)}
              className="text-text-sub hover:text-text-light text-sm font-bold shrink-0 self-start cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mt-4 p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-2.5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
