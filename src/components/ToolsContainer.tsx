import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, ArrowRight, Sparkles, Sliders, Scissors, Files, 
  Trash2, ArrowUp, ArrowDown, RefreshCw, ZoomIn, Eye, Image as ImageIcon,
  AlertTriangle, CheckCircle, Info, Plus, FolderOpen, Maximize2
} from 'lucide-react';
import { ToolId, ReorderableFile, ProcessingState, CompressionResult, HistoryEntry } from '../types';
import { TOOLS_LIST } from '../utils/toolsData';
import { addHistoryEntry } from '../utils/sessionHistory';
import { SEO_AND_CONTENT_MAP } from '../utils/seoAndFaqData';
import ToolPageBlogSection from './ToolPageBlogSection';

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

function FaqItemComponent({ faq, idx }: { faq: any; idx: number; key?: any }) {
  const [isOpen, setIsOpen] = useState(idx === 0);
  return (
    <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-display font-semibold text-xs sm:text-sm text-text-light hover:bg-[#161A23]/70 transition-colors cursor-pointer"
      >
        <span className="pr-2">{faq.question}</span>
        <svg 
          className={`w-4 h-4 text-[#6C63FF] transform transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180': 'rotate-0'}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[350px] border-t border-[#252A36]/50 bg-[#161A23]/30': 'max-h-0'}`}
      >
        <p className="p-4 sm:p-5 text-xs sm:text-[13px] leading-relaxed text-[#8892A4] font-sans">
          {faq.answer}
        </p>
      </div>
    </div>
  );
}
import UploadZone from './UploadZone';
import ResultsPanel from './ResultsPanel';
import { formatSize, formatFileSize } from '../utils/fileHelpers';
import JSZip from 'jszip';
import { DragList } from '../utils/DragList';
import { 
  compressPdfWorker, 
  compressJpegWorker, 
  resizeImageWorker, 
  enhanceImageWorker, 
  jpegToPdfWorker, 
  wordToPdfWorker, 
  excelToPdfWorker, 
  pdfToImageWorker, 
  pdfToWordWorker, 
  mergePdfWorker, 
  splitPdfWorker, 
  getPdfPageCount,
  ResizeParams,
  EnhancementParams,
  SplitOption
} from '../utils/fileWorkers';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  key?: any;
}

function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="relative group/tooltip inline-block w-full">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/tooltip:block pointer-events-none z-50 w-64 bg-[#11141D] text-[#F0F2F8] text-[11px] p-2.5 rounded-xl border border-[#252A36] shadow-2xl text-center leading-relaxed font-sans font-normal normal-case tracking-normal">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#11141D]" />
      </div>
    </div>
  );
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <span className="relative group/tooltip inline-flex items-center ml-1.5 cursor-help text-[#8892A4] hover:text-[#00D4AA] transition-colors">
      <Info className="w-3.5 h-3.5" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block pointer-events-none z-50 w-56 bg-[#161A23] text-[#F0F2F8] text-[11px] p-2 rounded-xl border border-[#252A36] shadow-2xl text-center leading-relaxed font-sans font-normal normal-case tracking-normal">
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border border-transparent border-t-[#161A23]" />
      </span>
    </span>
  );
}

export interface SpeedIndicatorConfig {
  toolId: string;
  inputSize: number;
  outputSize: number;
  elapsed: string; // e.g. "1.3s" or "340ms"
  action: string;
  extraInfo: string;
  filesCount?: number;
  pageCount?: number;
  qualityValue?: number;
  originalW?: number;
  originalH?: number;
  newW?: number;
  newH?: number;
  rowCount?: number;
  imageFormat?: string;
  totalOutputSize?: number;
}

let processingInterval: any = null;
let processingStart: number = 0;

export function startTimer(): number {
  return performance.now();
}

export function getElapsed(startTime: number): string {
  const ms = performance.now() - startTime;
  if (ms < 1000) return (ms).toFixed(0) + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

function startLiveTimer(elementId: string) {
  processingStart = performance.now();
  processingInterval = setInterval(() => {
    const elapsed = (performance.now() - processingStart) / 1000;
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = '⏱ ' + elapsed.toFixed(1) + 's';
    }
  }, 100);
}

function stopLiveTimer(elementId: string) {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = '';
  }
}

function getPerformanceRating(elapsed: string): string {
  let ms = 0;
  const match = elapsed.match(/^([\d.]+)(ms|s)$/);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2];
    if (unit === 'ms') {
      ms = val;
    } else {
      ms = val * 1000;
    }
  } else {
    ms = 500;
  }

  if (ms < 500) {
    return "⚡ Lightning fast — processed entirely on your device";
  } else if (ms <= 2000) {
    return "✓ Fast — processed entirely on your device";
  } else if (ms <= 5000) {
    return "✓ Complete — large files take a moment locally on your device";
  } else {
    return "✓ Done — complex processing finished on your device";
  }
}

function getLine1Parts(config: SpeedIndicatorConfig) {
  let prefix = "";
  let suffix = "";
  const { toolId, inputSize, outputSize, filesCount, pageCount } = config;
  const inStr = formatFileSize(inputSize);
  const outStr = formatFileSize(outputSize);

  switch (toolId) {
    case 'pdf-compress':
    case 'jpeg-compress':
      prefix = `Compressed ${inStr} → ${outStr} in `;
      break;
    case 'image-resize':
      prefix = `Resized ${inStr} image in `;
      break;
    case 'image-enhance':
      prefix = `Enhanced ${inStr} image in `;
      break;
    case 'jpeg-to-pdf':
      prefix = `Converted ${filesCount || 0} image(s) (${inStr} total) → PDF in `;
      break;
    case 'word-to-pdf':
      prefix = `Converted ${inStr} Word file → PDF in `;
      break;
    case 'excel-to-pdf':
      prefix = `Converted ${inStr} spreadsheet → PDF in `;
      break;
    case 'pdf-to-image':
      prefix = `Converted ${pageCount || 0}-page PDF (${inStr}) → ${filesCount || 0} images in `;
      break;
    case 'pdf-to-word':
      prefix = `Extracted text from ${inStr} PDF in `;
      break;
    case 'merge-pdf':
      prefix = `Merged ${filesCount || 0} PDFs (${inStr} total) in `;
      break;
    case 'split-pdf':
      prefix = `Split ${inStr} PDF into ${filesCount || 0} files in `;
      break;
    case 'clipboard-load':
      prefix = `Loaded ${inStr} image from clipboard in `;
      break;
    default:
      prefix = `Processed inside `;
      break;
  }
  return { prefix, suffix };
}

export function SpeedIndicator({ config }: { config: SpeedIndicatorConfig }) {
  const [displayVal, setDisplayVal] = useState<number>(0);
  const [hovered, setHovered] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { elapsed } = config;
  const match = elapsed.match(/^([\d.]+)(ms|s)$/);
  const target = match ? parseFloat(match[1]) : 0;
  const unit = match ? match[2] : 's';

  useEffect(() => {
    if (!match) return;
    const startTimeStamp = performance.now();
    const duration = 600; // 600ms count-up window

    let animId: number;
    const step = (now: number) => {
      const elapsedMs = now - startTimeStamp;
      const progress = Math.min(elapsedMs / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      setDisplayVal(easeProgress * target);
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [elapsed, target, match]);

  const rating = getPerformanceRating(elapsed);
  const { prefix, suffix } = getLine1Parts(config);
  const isMobile = windowWidth < 480;

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <style>{`
        @keyframes pop-scale {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes speed-indicator-slide-in {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-pop-scale {
          animation: pop-scale 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-speed-slide-in {
          animation: speed-indicator-slide-in 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Tooltip */}
      <div 
        className={`absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 mb-2 w-full max-w-[260px] bg-[#252A36] border border-[#6C63FF] rounded-lg p-[10px_14px] text-left text-xs font-sans text-[#F0F2F8] shadow-xl transition-all duration-150 pointer-events-none z-[1000] ${
          hovered ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-2 invisible'
        }`}
      >
        <p className="leading-relaxed">
          FileForge processes files using your device's own CPU and memory.
          No internet connection is used during processing.
          Speed depends on your device and file size.
        </p>
        {/* Tooltip arrow pointer */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-[#252A36] w-0 h-0" />
      </div>

      {/* Main card */}
      <div 
        className={`flex ${isMobile ? 'flex-col items-start gap-4' : 'flex-row items-center gap-3.5'} justify-between bg-[#0D0F14] border border-[#252A36] border-l-[3px] border-l-[#00D4AA] rounded-[10px] p-[14px_18px] select-text relative cursor-default animate-speed-slide-in`}
      >
        <div className={`flex ${isMobile ? 'flex-col items-start gap-3' : 'flex-row items-center gap-3.5'} text-left`}>
          {/* Lightning Bolt Icon with Subtle teal glow */}
          <div className="flex-shrink-0 text-[#00D4AA] drop-shadow-[0_0_6px_rgba(0,212,170,0.5)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/>
            </svg>
          </div>

          <div className="space-y-1">
            {/* Line 1 - main speed line */}
            <p className="text-[13px] sm:text-[14px] font-sans font-semibold text-[#F0F2F8] leading-normal animate-fade-in">
              {prefix}
              <span className="text-[#00D4AA] font-bold">
                {displayVal.toFixed(unit === 'ms' ? 0 : 1)}
                {unit}
              </span>
              {suffix}
            </p>
            {/* Line 2 - performance rating */}
            <p className="text-[11px] sm:text-[12px] font-sans text-[#8892A4] leading-normal font-medium animate-fade-in flex items-center gap-1.5 flex-wrap">
              <span>{rating}</span>
              <span className="text-[#8892A4]/50">•</span>
              <span className="text-[#00D4AA] font-semibold">Saved to history ✓</span>
            </p>
          </div>
        </div>

        {/* Far right checkmark */}
        <div className="flex-shrink-0 ml-auto flex items-center justify-center">
          <div className="w-5 h-5 bg-[#00D4AA] rounded-full flex items-center justify-center text-[#0D0F14] font-extrabold font-sans text-[11px] animate-pop-scale shadow-[0_0_10px_rgba(0,212,170,0.3)]">
            ✓
          </div>
        </div>
      </div>
    </div>
  );
}

export function showSpeedIndicator(config: SpeedIndicatorConfig) {
  return <SpeedIndicator config={config} />;
}

export interface MergeGroup {
  id: string;
  name: string;
  files: File[];
}

export interface BatchFileResult {
  file: File;
  outputFilename: string;
  blob: Blob | null;
  status: 'waiting' | 'processing' | 'complete' | 'error';
  error: string | null;
  inputSize: number;
  outputSize: number;
  elapsed: string;
}

class HistoryManager {
  maxStates: number;
  stack: any[];
  currentIndex: number;
  onChange: (status: any) => void;

  constructor(options: { maxStates?: number; onChange?: (status: any) => void } = {}) {
    this.maxStates = options.maxStates || 50;
    this.stack = [];
    this.currentIndex = -1;
    this.onChange = options.onChange || (() => {});
  }

  push(state: any) {
    this.stack = this.stack.slice(0, this.currentIndex + 1);
    this.stack.push(this.deepClone(state));
    if (this.stack.length > this.maxStates) {
      this.stack.shift();
    } else {
      this.currentIndex++;
    }
    this.onChange(this.getStatus());
  }

  undo() {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    this.onChange(this.getStatus());
    return this.deepClone(this.stack[this.currentIndex]);
  }

  redo() {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    this.onChange(this.getStatus());
    return this.deepClone(this.stack[this.currentIndex]);
  }

  canUndo() { return this.currentIndex > 0; }
  canRedo() { return this.currentIndex < this.stack.length - 1; }

  clear() {
    this.stack = [];
    this.currentIndex = -1;
    this.onChange(this.getStatus());
  }

  getStatus() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.currentIndex,
      redoCount: this.stack.length - 1 - this.currentIndex,
      currentIndex: this.currentIndex,
      totalStates: this.stack.length
    };
  }

  getCurrentState() {
    if (this.currentIndex < 0) return null;
    return this.deepClone(this.stack[this.currentIndex]);
  }

  deepClone(state: any) {
    try {
      return JSON.parse(JSON.stringify(state));
    } catch (e) {
      return { ...state };
    }
  }
}

// -------------------------------------------------------------
// IMAGE CLARITY AND QUALITY ENHANCEMENT ALGORITHMS (PIXEL LEVEL)
// -------------------------------------------------------------

function gaussianBlur(pixels: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const sigma = radius / 3 || 0.5;
  const size = 2 * radius + 1;
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const d = i - radius;
    kernel[i] = Math.exp(-(d * d) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  const temp = new Uint8ClampedArray(pixels.length);
  const output = new Uint8ClampedArray(pixels.length);

  // Horizontal blur pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, weightSum = 0;
      for (let k = -radius; k <= radius; k++) {
        const px = Math.min(Math.max(x + k, 0), width - 1);
        const idx = rowOffset + px * 4;
        const weight = kernel[k + radius];
        r += pixels[idx] * weight;
        g += pixels[idx + 1] * weight;
        b += pixels[idx + 2] * weight;
        a += pixels[idx + 3] * weight;
        weightSum += weight;
      }
      const outIdx = rowOffset + x * 4;
      temp[outIdx] = r / weightSum;
      temp[outIdx + 1] = g / weightSum;
      temp[outIdx + 2] = b / weightSum;
      temp[outIdx + 3] = a / weightSum;
    }
  }

  // Vertical blur pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, weightSum = 0;
      for (let k = -radius; k <= radius; k++) {
        const py = Math.min(Math.max(y + k, 0), height - 1);
        const idx = (py * width + x) * 4;
        const weight = kernel[k + radius];
        r += temp[idx] * weight;
        g += temp[idx + 1] * weight;
        b += temp[idx + 2] * weight;
        a += temp[idx + 3] * weight;
        weightSum += weight;
      }
      const outIdx = (y * width + x) * 4;
      output[outIdx] = r / weightSum;
      output[outIdx + 1] = g / weightSum;
      output[outIdx + 2] = b / weightSum;
      output[outIdx + 3] = a / weightSum;
    }
  }

  return output;
}

function unsharpMask(pixels: Uint8ClampedArray, width: number, height: number, amount: number, radius: number, threshold: number): Uint8ClampedArray {
  const blurred = gaussianBlur(pixels, width, height, radius);
  const output = new Uint8ClampedArray(pixels.length);
  
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = pixels[i + c];
      const blur = blurred[i + c];
      const diff = orig - blur;
      
      if (Math.abs(diff) > threshold) {
        output[i + c] = Math.min(255, Math.max(0, orig + (diff * amount / 100)));
      } else {
        output[i + c] = orig;
      }
    }
    output[i + 3] = pixels[i + 3];
  }
  return output;
}

function clarityEnhancement(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
  const blurred = gaussianBlur(pixels, width, height, 15);
  const output = new Uint8ClampedArray(pixels.length);
  
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = pixels[i + c];
      const blur = blurred[i + c];
      const diff = orig - blur;
      
      const isMidtone = orig > 64 && orig < 192;
      const midtoneFactor = isMidtone ? 1.0 : Math.max(0, 1 - Math.abs(orig - 128) / 128);
      
      output[i + c] = Math.min(255, Math.max(0, orig + (diff * (amount / 100) * midtoneFactor)));
    }
    output[i + 3] = pixels[i + 3];
  }
  return output;
}

function applyDetailRecovery(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
  const blurred = gaussianBlur(pixels, width, height, 2);
  const output = new Uint8ClampedArray(pixels.length);
  
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const highPass = pixels[i + c] - blurred[i + c] + 128;
      const enhanced = pixels[i + c] + ((highPass - 128) * amount / 100);
      output[i + c] = Math.min(255, Math.max(0, enhanced));
    }
    output[i + 3] = pixels[i + 3];
  }
  return output;
}

function unsharpMaskStrong(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  radius: number,
  threshold: number
): Uint8ClampedArray {
  // Pass 1: Fine detail (small radius)
  const blur1 = gaussianBlur(pixels, width, height, 1);
  // Pass 2: Medium structure (medium radius)  
  const blur2 = gaussianBlur(pixels, width, height, 2);
  
  const output = new Uint8ClampedArray(pixels.length);
  
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = pixels[i + c];
      
      // Fine detail mask
      const fineDiff = orig - blur1[i + c];
      // Medium structure mask
      const medDiff = orig - blur2[i + c];
      
      // Combine both masks
      const combinedDiff = (fineDiff * 0.7) + (medDiff * 0.3);
      
      if (Math.abs(combinedDiff) > threshold) {
        // Stronger amount: 150-300 range instead of 80-100
        output[i + c] = Math.min(255, Math.max(0,
          orig + (combinedDiff * amount / 100)
        ));
      } else {
        output[i + c] = orig;
      }
    }
    output[i + 3] = pixels[i + 3];
  }
  return output;
}

function rgbToYuv(pixels: Uint8ClampedArray): Float32Array {
  const yuv = new Float32Array(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
    yuv[i]   = 0.299 * r + 0.587 * g + 0.114 * b;  // Y
    yuv[i+1] = -0.147 * r - 0.289 * g + 0.436 * b; // U
    yuv[i+2] = 0.615 * r - 0.515 * g - 0.100 * b;  // V
    yuv[i+3] = pixels[i+3];
  }
  return yuv;
}

function yuvToRgb(yData: Uint8ClampedArray, originalYuv: Float32Array): Uint8ClampedArray {
  const out = new Uint8ClampedArray(yData.length);
  for (let i = 0; i < yData.length; i += 4) {
    const y = yData[i];
    const u = originalYuv[i+1];
    const v = originalYuv[i+2];
    out[i]   = Math.min(255, Math.max(0, y + 1.140 * v));
    out[i+1] = Math.min(255, Math.max(0, y - 0.395 * u - 0.581 * v));
    out[i+2] = Math.min(255, Math.max(0, y + 2.032 * u));
    out[i+3] = originalYuv[i+3];
  }
  return out;
}

function extractChannel(yuv: Float32Array, channelIdx: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(yuv.length);
  for (let i = 0; i < yuv.length; i += 4) {
    const val = Math.min(255, Math.max(0, yuv[i + channelIdx]));
    out[i] = val;
    out[i+1] = val;
    out[i+2] = val;
    out[i+3] = yuv[i+3]; // Alpha channel
  }
  return out;
}

function luminanceSharpen(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
  // Convert to YUV, sharpen Y only, convert back
  const yuv = rgbToYuv(pixels);
  const yChannel = extractChannel(yuv, 0); // Y = luminance
  
  // Apply strong unsharp to Y only
  const sharpenedY = unsharpMaskStrong(
    yChannel, width, height, amount, 1, 2
  );
  
  // Put sharpened Y back
  return yuvToRgb(sharpenedY, yuv);
}

function edgeEnhancement(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  output.set(pixels);
  
  // Laplacian edge detection kernel
  // [ 0, -1,  0]
  // [-1,  5, -1]
  // [ 0, -1,  0]
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) {
        const center = pixels[idx + c];
        const top    = pixels[((y-1)*width+x)*4+c];
        const bottom = pixels[((y+1)*width+x)*4+c];
        const left   = pixels[(y*width+(x-1))*4+c];
        const right  = pixels[(y*width+(x+1))*4+c];
        
        // Laplacian sharpening
        const laplacian = 5*center - top - bottom - left - right;
        const blended = center + (laplacian - center) * (amount / 100);
        
        output[idx + c] = Math.min(255, Math.max(0, blended));
      }
      output[idx + 3] = pixels[idx + 3];
    }
  }
  return output;
}

function localContrastEnhancement(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
  // Large radius blur = local average
  const localAvg = gaussianBlur(pixels, width, height, 20);
  const output = new Uint8ClampedArray(pixels.length);
  
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = pixels[i + c];
      const avg = localAvg[i + c];
      
      // Enhance deviation from local average
      const deviation = orig - avg;
      const _enhanced = avg + deviation * (1 + amount/100);
      
      output[i + c] = Math.min(255, Math.max(0, _enhanced));
    }
    output[i + 3] = pixels[i + 3];
  }
  return output;
}

function maximumClarity(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  let result = pixels;
  
  // Pass 1: Remove JPEG artifacts
  result = removeJpegArtifacts(result, width, height, 60);
  
  // Pass 2: Denoise lightly (preserve edges)
  result = applyDenoise(result, width, height, 15);
  
  // Pass 3: Local contrast boost
  result = localContrastEnhancement(result, width, height, 40);
  
  // Pass 4: Luminance sharpening (strong)
  result = luminanceSharpen(result, width, height, 180);
  
  // Pass 5: Edge enhancement for text/lines
  result = edgeEnhancement(result, width, height, 30);
  
  // Pass 6: Final light unsharp mask
  result = unsharpMaskStrong(result, width, height, 80, 1, 4);
  
  return result;
}

function detectImageType(pixels: Uint8ClampedArray, width: number, height: number): 'screenshot' | 'photo' {
  let darkPixels = 0;
  let totalPixels = 0;
  let brightBackground = 0;
  
  const step = 4; // Sample for performance
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (i >= pixels.length) continue;
      
      const brightness = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
      if (brightness < 80) darkPixels++;
      if (brightness > 200) brightBackground++;
      totalPixels++;
    }
  }
  
  const darkRatio = darkPixels / (totalPixels || 1);
  const brightRatio = brightBackground / (totalPixels || 1);
  
  // Screenshot/document: bright background, dark text
  if (brightRatio > 0.5 && darkRatio > 0.05) {
    return 'screenshot';
  }
  return 'photo';
}

function applyDenoise(pixels: Uint8ClampedArray, width: number, height: number, strength: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const radius = Math.ceil(strength / 3);
  if (radius <= 0) {
    output.set(pixels);
    return output;
  }
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const centerIdx = rowOffset + x * 4;
      let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;
      
      for (let ky = -radius; ky <= radius; ky++) {
        const py = Math.min(Math.max(y + ky, 0), height - 1);
        const colOffset = py * width * 4;
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const idx = colOffset + px * 4;
          
          const colorDiff = Math.abs(pixels[idx] - pixels[centerIdx]) +
            Math.abs(pixels[idx+1] - pixels[centerIdx+1]) +
            Math.abs(pixels[idx+2] - pixels[centerIdx+2]);
          
          const denom = 2 * strength * strength || 1;
          const colorWeight = Math.exp(-colorDiff / denom);
          const spatialWeight = Math.exp(-(kx*kx + ky*ky) / (2 * radius * radius || 1));
          const weight = colorWeight * spatialWeight;
          
          rSum += pixels[idx] * weight;
          gSum += pixels[idx+1] * weight;
          bSum += pixels[idx+2] * weight;
          weightSum += weight;
        }
      }
      
      if (weightSum > 0) {
        output[centerIdx] = rSum / weightSum;
        output[centerIdx+1] = gSum / weightSum;
        output[centerIdx+2] = bSum / weightSum;
      } else {
        output[centerIdx] = pixels[centerIdx];
        output[centerIdx+1] = pixels[centerIdx+1];
        output[centerIdx+2] = pixels[centerIdx+2];
      }
      output[centerIdx+3] = pixels[centerIdx+3];
    }
  }
  return output;
}

function removeJpegArtifacts(pixels: Uint8ClampedArray, width: number, height: number, strength: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const nearHorizontalBoundary = (y % 8 === 0 || y % 8 === 7);
      const nearVerticalBoundary = (x % 8 === 0 || x % 8 === 7);
      
      if (nearHorizontalBoundary || nearVerticalBoundary) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = Math.min(Math.max(y+dy, 0), height-1);
          const colOffset = ny * width * 4;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = Math.min(Math.max(x+dx, 0), width-1);
            const nIdx = colOffset + nx * 4;
            r += pixels[nIdx];
            g += pixels[nIdx+1];
            b += pixels[nIdx+2];
            count++;
          }
        }
        const factor = strength / 100;
        output[idx] = pixels[idx] * (1-factor) + (r/count) * factor;
        output[idx+1] = pixels[idx+1]*(1-factor) + (g/count)*factor;
        output[idx+2] = pixels[idx+2]*(1-factor) + (b/count)*factor;
      } else {
        output[idx] = pixels[idx];
        output[idx+1] = pixels[idx+1];
        output[idx+2] = pixels[idx+2];
      }
      output[idx+3] = pixels[idx+3];
    }
  }
  return output;
}

function applyColorLight(pixels: Uint8ClampedArray, brightness: number, contrast: number, saturation: number, temp: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const bVal = brightness / 100;
  const cVal = (contrast + 100) / 100;
  const sVal = (saturation + 100) / 100;
  const tVal = temp * 0.5;
  
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i+1];
    let b = pixels[i+2];
    
    if (temp !== 0) {
      r += tVal;
      b -= tVal;
    }
    
    r += bVal * 255;
    g += bVal * 255;
    b += bVal * 255;
    
    r = (r - 128) * cVal + 128;
    g = (g - 128) * cVal + 128;
    b = (b - 128) * cVal + 128;
    
    if (saturation !== 0) {
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      r = luminance + (r - luminance) * sVal;
      g = luminance + (g - luminance) * sVal;
      b = luminance + (b - luminance) * sVal;
    }
    
    output[i] = Math.min(255, Math.max(0, r));
    output[i+1] = Math.min(255, Math.max(0, g));
    output[i+2] = Math.min(255, Math.max(0, b));
    output[i+3] = pixels[i+3];
  }
  return output;
}

function analyzeImage(pixels: Uint8ClampedArray, width: number, height: number) {
  let totalBrightness = 0;
  let edgeStrength = 0;
  const sampleStep = 4;
  let sampleCount = 0;
  
  for (let y = 1; y < height - 1; y += sampleStep) {
    for (let x = 1; x < width - 1; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const brightness = (pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3;
      totalBrightness += brightness;
      
      const rightIdx = (y * width + (x+1)) * 4;
      const downIdx = ((y+1) * width + x) * 4;
      const rightBright = (pixels[rightIdx] + pixels[rightIdx+1] + pixels[rightIdx+2]) / 3;
      const downBright = (pixels[downIdx] + pixels[downIdx+1] + pixels[downIdx+2]) / 3;
      edgeStrength += Math.abs(brightness - rightBright) + Math.abs(brightness - downBright);
      
      sampleCount++;
    }
  }
  
  const avgBrightness = totalBrightness / sampleCount;
  const avgEdgeStrength = edgeStrength / sampleCount;
  
  return {
    avgBrightness,
    blurScore: Math.max(0, 100 - avgEdgeStrength * 2),
    localContrast: avgEdgeStrength,
    noiseLevel: Math.random() * 20 + 10,
    isJpeg: true
  };
}

function autoEnhance(pixels: Uint8ClampedArray, width: number, height: number) {
  const analysis = analyzeImage(pixels, width, height);
  let result = pixels;
  const applied: string[] = [];
  
  if (analysis.noiseLevel > 20) {
    result = applyDenoise(result, width, height, Math.min(analysis.noiseLevel / 2, 30));
    applied.push("Noise Reduction");
  }
  
  if (analysis.isJpeg) {
    result = removeJpegArtifacts(result, width, height, 40);
    applied.push("JPEG Artifact Removal");
  }
  
  if (analysis.localContrast < 40) {
    result = clarityEnhancement(result, width, height, 50);
    applied.push("Clarity");
  }
  
  if (analysis.blurScore > 30) {
    result = unsharpMask(result, width, height, 80, 1, 5);
    applied.push("Unsharp Sharpening");
  } else {
    result = unsharpMask(result, width, height, 40, 1, 8);
    applied.push("Subtle Sharpening");
  }
  
  return { pixels: result, applied };
}

function findHighestEdgeRegion(pixels: Uint8ClampedArray, width: number, height: number): { x: number; y: number } {
  const cropSize = 200;
  if (width <= cropSize || height <= cropSize) {
    return { x: Math.floor((width - cropSize) / 2), y: Math.floor((height - cropSize) / 2) };
  }
  
  let bestX = Math.floor((width - cropSize) / 2);
  let bestY = Math.floor((height - cropSize) / 2);
  let maxScore = -1;
  
  const stepX = Math.max(20, Math.floor((width - cropSize) / 8));
  const stepY = Math.max(20, Math.floor((height - cropSize) / 8));
  
  for (let y = 10; y < height - cropSize - 10; y += stepY) {
    for (let x = 10; x < width - cropSize - 10; x += stepX) {
      let score = 0;
      const sampleSize = 50;
      const startX = x + 75;
      const startY = y + 75;
      
      for (let sy = 0; sy < sampleSize; sy += 4) {
        const rowIdx = (startY + sy) * width * 4;
        for (let sx = 0; sx < sampleSize; sx += 4) {
          const idx = rowIdx + (startX + sx) * 4;
          const b = (pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3;
          const rightIdx = idx + 4;
          const downIdx = idx + width * 4;
          const rb = (pixels[rightIdx] + pixels[rightIdx+1] + pixels[rightIdx+2]) / 3;
          const db = (pixels[downIdx] + pixels[downIdx+1] + pixels[downIdx+2]) / 3;
          score += Math.abs(b - rb) + Math.abs(b - db);
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }
  
  return { x: bestX, y: bestY };
}

function drawHistogramCanvas(canvas: HTMLCanvasElement, origPixels: Uint8ClampedArray, enhPixels: Uint8ClampedArray) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const w = 256;
  const h = 80;
  canvas.width = w;
  canvas.height = h;
  
  ctx.fillStyle = '#11141D';
  ctx.fillRect(0, 0, w, h);
  
  const origHist = new Array(256).fill(0);
  const enhHist = new Array(256).fill(0);
  
  for (let i = 0; i < origPixels.length; i += 32) {
    const ob = Math.round((origPixels[i] + origPixels[i+1] + origPixels[i+2]) / 3);
    origHist[ob]++;
  }
  for (let i = 0; i < enhPixels.length; i += 32) {
    const eb = Math.round((enhPixels[i] + enhPixels[i+1] + enhPixels[i+2]) / 3);
    enhHist[eb]++;
  }
  
  const maxVal = Math.max(...origHist, ...enhHist, 1);
  
  ctx.fillStyle = 'rgba(136, 146, 164, 0.25)';
  for (let i = 0; i < 256; i++) {
    const val = (origHist[i] / maxVal) * h * 0.9;
    ctx.fillRect(i, h - val, 1, val);
  }
  
  ctx.fillStyle = 'rgba(108, 99, 255, 0.45)';
  for (let i = 0; i < 256; i++) {
    const val = (enhHist[i] / maxVal) * h * 0.9;
    ctx.fillRect(i, h - val, 1, val);
  }
}

function estimateSizes(originalSize: number, jpegQuality: number, sharpness: number, clarity: number): { jpeg: string; png: string } {
  const sharpFactor = 1 + (sharpness * 0.0015) + (clarity * 0.001);
  const estimatedJpeg = Math.round(originalSize * (jpegQuality / 85) * sharpFactor * 0.85);
  const estimatedPng = Math.round(originalSize * 2.2 * sharpFactor);
  return {
    jpeg: formatSize(estimatedJpeg),
    png: formatSize(estimatedPng)
  };
}

function buildPipelineWorkerCode() {
  return `
    ${gaussianBlur.toString()}
    ${unsharpMask.toString()}
    ${clarityEnhancement.toString()}
    ${applyDetailRecovery.toString()}
    ${applyDenoise.toString()}
    ${removeJpegArtifacts.toString()}
    ${applyColorLight.toString()}
    ${analyzeImage.toString()}
    ${autoEnhance.toString()}

    self.onmessage = function(e) {
      const { pixels, width, height, settings, type } = e.data;
      
      let result = pixels;
      let applied = [];
      
      if (type === 'auto') {
        self.postMessage({ type: 'progress', value: 20 });
        const res = autoEnhance(result, width, height);
        result = res.pixels;
        applied = res.applied;
        self.postMessage({ type: 'progress', value: 80 });
      } else {
        if (settings.jpegFix) {
          self.postMessage({ type: 'progress', value: 15 });
          result = removeJpegArtifacts(result, width, height, 50);
        }
        if (settings.denoise > 0) {
          self.postMessage({ type: 'progress', value: 35 });
          result = applyDenoise(result, width, height, settings.denoise);
        }
        if (settings.clarity !== 0) {
          self.postMessage({ type: 'progress', value: 55 });
          result = clarityEnhancement(result, width, height, settings.clarity);
        }
        if (settings.detailRecovery > 0) {
          self.postMessage({ type: 'progress', value: 75 });
          result = applyDetailRecovery(result, width, height, settings.detailRecovery);
        }
        if (settings.sharpness > 0) {
          self.postMessage({ type: 'progress', value: 90 });
          result = unsharpMask(result, width, height, settings.sharpness * 2, 1, 5);
        }
        result = applyColorLight(result, settings.brightness, settings.contrast, settings.saturation, settings.temperature);
      }
      
      self.postMessage({ type: 'result', pixels: result, applied });
    };
  `;
}

interface ToolsContainerProps {
  activeTool: ToolId;
}

export default function ToolsContainer({ activeTool }: ToolsContainerProps) {
  // Shared States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // History State/Refs and Subsystems
  const [historyStatus, setHistoryStatus] = useState<Record<string, any>>({});
  const fileStore = useRef<Map<string, File>>(new Map());
  const lastFileIdMap = useRef<Record<string, string>>({});
  const isRestoringHistory = useRef(false);
  const lastPushedSliderState = useRef({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    clarity: 0,
    detailRecovery: 0,
    denoise: 0,
    jpegFix: false,
    temperature: 0
  });
  const enhancerDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [shakeButton, setShakeButton] = useState<'undo' | 'redo' | null>(null);
  const [undoToast, setUndoToast] = useState<{ visible: boolean; text: string; type: 'undo' | 'redo' | 'none' } | null>(null);
  const [showResetPopover, setShowResetPopover] = useState<string | null>(null);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [reprocessBanner, setReprocessBanner] = useState<{
    filename: string;
    toolLabel: string;
    settingsLabel: string;
    sizeSaved: string;
  } | null>(null);

  const lastLoggedConfigRef = useRef<any>(null);

  // Initialize history managers
  const historyManagers = useRef<Record<string, HistoryManager>>({});
  if (Object.keys(historyManagers.current).length === 0) {
    const tools = ['image-enhance', 'image-resize', 'jpeg-compress', 'pdf-compress', 'merge-pdf', 'jpeg-to-pdf'];
    tools.forEach(tool => {
      let maxStates = 30;
      if (tool === 'image-enhance') maxStates = 50;
      else if (tool === 'pdf-compress') maxStates = 20;

      historyManagers.current[tool] = new HistoryManager({
        maxStates,
        onChange: (status) => {
          setHistoryStatus(prev => ({
            ...prev,
            [tool]: status
          }));
        }
      });
    });
  }
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    statusText: '',
    error: null
  });
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  
  // Batch Mode States
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<BatchFileResult[]>([]);
  const [reorderableImages, setReorderableImages] = useState<ReorderableFile[]>([]);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedBatchIndices, setSelectedBatchIndices] = useState<number[]>([]);
  const [lastSelectedBatchIndex, setLastSelectedBatchIndex] = useState<number | null>(null);

  const handleRowClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.drag-handle')) return;

    if (e.shiftKey && lastSelectedBatchIndex !== null) {
      const start = Math.min(lastSelectedBatchIndex, index);
      const end = Math.max(lastSelectedBatchIndex, index);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedBatchIndices(prev => {
        const next = [...prev];
        range.forEach(r => {
          if (!next.includes(r)) next.push(r);
        });
        return next;
      });
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedBatchIndices(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
      setLastSelectedBatchIndex(index);
    } else {
      setSelectedBatchIndices([index]);
      setLastSelectedBatchIndex(index);
    }
  };

  // Synchronize state markers for global keyboard shortcuts conflict prevention
  useEffect(() => {
    if (selectedFiles.length > 0 || (isBatchMode && batchFiles.length > 0) || reorderableImages.length > 0) {
      document.body.setAttribute('data-has-files', 'true');
    } else {
      document.body.removeAttribute('data-has-files');
    }
  }, [selectedFiles, isBatchMode, batchFiles, reorderableImages]);

  useEffect(() => {
    if (processing.status === 'complete' || batchResults.length > 0) {
      document.body.setAttribute('data-result-ready', 'true');
    } else {
      document.body.removeAttribute('data-result-ready');
    }
  }, [processing.status, batchResults]);

  useEffect(() => {
    if (isBatchMode) {
      document.body.setAttribute('data-batch-mode', 'true');
    } else {
      document.body.removeAttribute('data-batch-mode');
    }
  }, [isBatchMode]);

  // Handle global key events delegation in ToolsContainer
  useEffect(() => {
    const onProcess = () => {
      const btn = document.getElementById('btn-process');
      if (btn) btn.click();
    };

    const onDeleteItem = () => {
      if (isBatchMode && selectedBatchIndices.length > 0) {
        setBatchFiles(prev => prev.filter((_, idx) => !selectedBatchIndices.includes(idx)));
        setSelectedBatchIndices([]);
        setLastSelectedBatchIndex(null);
      } else if (isBatchMode && batchFiles.length > 0) {
        setBatchFiles(prev => prev.slice(0, -1));
      }
    };

    const onSelectAll = () => {
      if (isBatchMode) {
        setSelectedBatchIndices(batchFiles.map((_, i) => i));
      }
    };

    const onDeselectAll = () => {
      if (isBatchMode) {
        setSelectedBatchIndices([]);
      }
    };

    const onBrowse = () => {
      const inputs = document.querySelectorAll('input[type="file"]');
      if (inputs.length > 0) {
        (inputs[inputs.length - 1] as HTMLInputElement).click();
      }
    };

    const onDownload = () => {
      const batchZipBtn = document.querySelector('button[title*="ZIP"]') || document.querySelector('button[title*="Download ZIP"]');
      if (batchZipBtn) {
        (batchZipBtn as HTMLButtonElement).click();
        return;
      }
      const singleDownloadBtn = document.getElementById('btn-download') || document.querySelector('button[id*="download"]') || document.querySelector('button.bg-\\[\\#00D4AA\\]');
      if (singleDownloadBtn) {
        (singleDownloadBtn as HTMLButtonElement).click();
      }
    };

    const onResetTool = () => {
      handleReset();
      setSelectedBatchIndices([]);
      setLastSelectedBatchIndex(null);
    };

    const onZoomIn = () => {
      const zoomInBtn = document.querySelector('button[title="Zoom In"]') || document.querySelector('button[aria-label="Zoom In"]') || document.querySelector('svg[className*="PlusIcon"]')?.closest('button');
      if (zoomInBtn) (zoomInBtn as HTMLButtonElement).click();
    };

    const onZoomOut = () => {
      const zoomOutBtn = document.querySelector('button[title="Zoom Out"]') || document.querySelector('button[aria-label="Zoom Out"]') || document.querySelector('svg[className*="MinusIcon"]')?.closest('button');
      if (zoomOutBtn) (zoomOutBtn as HTMLButtonElement).click();
    };

    const onZoomReset = () => {
      const zoomResetBtn = document.querySelector('button[title*="Reset Zoom"]') || document.querySelector('button[title="Actual Size"]') || document.querySelector('button[title="Fit Page"]');
      if (zoomResetBtn) (zoomResetBtn as HTMLButtonElement).click();
    };

    const onPrevPage = () => {
      const prevBtn = document.querySelector('button[title="Previous Page"]') || document.querySelector('button[aria-label="Previous Page"]') || document.querySelector('svg[className*="ChevronLeftIcon"]')?.closest('button');
      if (prevBtn) (prevBtn as HTMLButtonElement).click();
    };

    const onNextPage = () => {
      const nextBtn = document.querySelector('button[title="Next Page"]') || document.querySelector('button[aria-label="Next Page"]') || document.querySelector('svg[className*="ChevronRightIcon"]')?.closest('button');
      if (nextBtn) (nextBtn as HTMLButtonElement).click();
    };

    const onMoveUp = () => {
      const moveUpBtn = document.querySelector('button[title="Move File Up"]') || document.querySelector('button[title="Move Up"]');
      if (moveUpBtn) (moveUpBtn as HTMLButtonElement).click();
    };

    const onMoveDown = () => {
      const moveDnBtn = document.querySelector('button[title="Move File Down"]') || document.querySelector('button[title="Move Down"]');
      if (moveDnBtn) (moveDnBtn as HTMLButtonElement).click();
    };

    const onSliderFocus = (e: Event) => {
      const customEvent = e as CustomEvent;
      const key = customEvent.detail?.slider;
      const keyMap: Record<string, string> = {
        b: 'Brightness',
        c: 'Clarity',
        s: 'Sharpness',
        n: 'Noise Reduction'
      };
      const sliderName = keyMap[key];
      if (!sliderName) return;

      const inputs = Array.from(document.querySelectorAll('input[type="range"]'));
      const targetInput = inputs.find(inp => {
        const label = inp.closest('div')?.querySelector('span')?.textContent || '';
        return label.includes(sliderName) || label.toLowerCase().includes(key);
      });

      if (targetInput) {
        (targetInput as HTMLInputElement).focus();
        targetInput.classList.add('ring-2', 'ring-[#6C63FF]', 'ring-offset-1');
        targetInput.addEventListener('blur', () => {
          targetInput.classList.remove('ring-2', 'ring-[#6C63FF]', 'ring-offset-1');
        }, { once: true });
      }
    };

    const onSliderAdjust = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { direction, amount } = customEvent.detail;
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'INPUT' && (activeElement as HTMLInputElement).type === 'range') {
        const range = activeElement as HTMLInputElement;
        const currentVal = parseFloat(range.value);
        const step = parseFloat(range.step || '1');
        const min = parseFloat(range.min || '0');
        const max = parseFloat(range.max || '100');
        const delta = direction === 'increase' ? amount : -amount;
        const nextVal = Math.min(max, Math.max(min, currentVal + delta));
        range.value = String(nextVal);
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    const onToggleHistory = () => {
      const histBtn = document.querySelector('button[title*="History"]') || document.querySelector('button[aria-label="Toggle History"]');
      if (histBtn) (histBtn as HTMLButtonElement).click();
    };

    const onAutoEnhance = () => {
      const autoBtn = document.querySelector('button[title*="Auto Enhance"]') || document.querySelector('button[aria-label*="Auto Enhance"]');
      if (autoBtn) {
        (autoBtn as HTMLButtonElement).click();
      } else {
        const textBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Auto'));
        if (textBtn) textBtn.click();
      }
    };

    window.addEventListener('ff-shortcut-process', onProcess);
    window.addEventListener('ff-shortcut-delete', onDeleteItem);
    window.addEventListener('ff-shortcut-select-all', onSelectAll);
    window.addEventListener('ff-shortcut-deselect-all', onDeselectAll);
    window.addEventListener('ff-shortcut-browse', onBrowse);
    window.addEventListener('ff-shortcut-download', onDownload);
    window.addEventListener('ff-shortcut-reset', onResetTool);
    window.addEventListener('ff-shortcut-zoom-in', onZoomIn);
    window.addEventListener('ff-shortcut-zoom-out', onZoomOut);
    window.addEventListener('ff-shortcut-zoom-reset', onZoomReset);
    window.addEventListener('ff-shortcut-prev-page', onPrevPage);
    window.addEventListener('ff-shortcut-next-page', onNextPage);
    window.addEventListener('ff-shortcut-move-up', onMoveUp);
    window.addEventListener('ff-shortcut-move-down', onMoveDown);
    window.addEventListener('ff-shortcut-slider-focus', onSliderFocus);
    window.addEventListener('ff-shortcut-slider-adjust', onSliderAdjust);
    window.addEventListener('ff-shortcut-toggle-history', onToggleHistory);
    window.addEventListener('ff-shortcut-auto-enhance', onAutoEnhance);

    return () => {
      window.removeEventListener('ff-shortcut-process', onProcess);
      window.removeEventListener('ff-shortcut-delete', onDeleteItem);
      window.removeEventListener('ff-shortcut-select-all', onSelectAll);
      window.removeEventListener('ff-shortcut-deselect-all', onDeselectAll);
      window.removeEventListener('ff-shortcut-browse', onBrowse);
      window.removeEventListener('ff-shortcut-download', onDownload);
      window.removeEventListener('ff-shortcut-reset', onResetTool);
      window.removeEventListener('ff-shortcut-zoom-in', onZoomIn);
      window.removeEventListener('ff-shortcut-zoom-out', onZoomOut);
      window.removeEventListener('ff-shortcut-zoom-reset', onZoomReset);
      window.removeEventListener('ff-shortcut-prev-page', onPrevPage);
      window.removeEventListener('ff-shortcut-next-page', onNextPage);
      window.removeEventListener('ff-shortcut-move-up', onMoveUp);
      window.removeEventListener('ff-shortcut-move-down', onMoveDown);
      window.removeEventListener('ff-shortcut-slider-focus', onSliderFocus);
      window.removeEventListener('ff-shortcut-slider-adjust', onSliderAdjust);
      window.removeEventListener('ff-shortcut-toggle-history', onToggleHistory);
      window.removeEventListener('ff-shortcut-auto-enhance', onAutoEnhance);
    };
  }, [isBatchMode, batchFiles, selectedBatchIndices]);

  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState<number>(0);
  const [batchStartTime, setBatchStartTime] = useState<number | null>(null);
  const [batchWarnings, setBatchWarnings] = useState<string[]>([]);
  const [batchZipProgress, setBatchZipProgress] = useState<number | null>(null);
  const [batchZipBlob, setBatchZipBlob] = useState<Blob | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [jpgToPdfSubMode, setJpgToPdfSubMode] = useState<'individual' | 'combined'>('individual');
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([
    { id: 'group-1', name: 'Merge Group 1', files: [] }
  ]);
  
  // Custom Result States
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [resultStatsText, setResultStatsText] = useState<{ label: string; value: string } | null>(null);
  const [speedIndicatorConfig, setSpeedIndicatorConfig] = useState<SpeedIndicatorConfig | null>(null);

  // NEW Clipboard Paste States
  const [pasteSuccessBadge, setPasteSuccessBadge] = useState<{
    filename: string;
    size: number;
    conversionNote?: string;
  } | null>(null);

  const [cursorTooltip, setCursorTooltip] = useState<{
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);

  const [showSwitcherHint, setShowSwitcherHint] = useState<boolean>(false);
  const [hasRecentlyPasted, setHasRecentlyPasted] = useState<boolean>(false);
  const [howToPasteExpanded, setHowToPasteExpanded] = useState<boolean>(false);

  const mousePosRef = useRef({ x: 0, y: 0 });
  const lastToolRef = useRef<ToolId>(activeTool);
  const lastPasteTimeRef = useRef<number>(0);

  // Track mouse cursor movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Track tool switching to display tip helper switcher hints
  useEffect(() => {
    const prevTool = lastToolRef.current;
    lastToolRef.current = activeTool;

    const isPrevImage = ['jpeg-compress', 'image-resize', 'image-enhance', 'jpeg-to-pdf'].includes(prevTool);
    const isCurrentPdf = ['pdf-compress', 'merge-pdf'].includes(activeTool);
    const recentlyPasted = Date.now() - lastPasteTimeRef.current < 120000; // 2 minutes

    if (isPrevImage && isCurrentPdf && recentlyPasted) {
      setShowSwitcherHint(true);
      const timer = setTimeout(() => {
        setShowSwitcherHint(false);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShowSwitcherHint(false);
    }
  }, [activeTool]);

  // Handle auto-dismiss for cursorTooltip
  useEffect(() => {
    if (cursorTooltip?.visible) {
      const timer = setTimeout(() => {
        setCursorTooltip(prev => prev ? { ...prev, visible: false } : null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [cursorTooltip?.visible]);

  // Handle auto-dismiss for success badge
  useEffect(() => {
    if (pasteSuccessBadge) {
      const timer = setTimeout(() => {
        setPasteSuccessBadge(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [pasteSuccessBadge]);

  // Tool Specific States
  // 1. PDF Compress
  const [pdfQuality, setPdfQuality] = useState<'low' | 'medium' | 'high'>('medium');

  // 2. JPEG Compress
  const [jpegQuality, setJpegQuality] = useState<number>(75);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);

  // 3. Image Resizer
  const [resizerMode, setResizerMode] = useState<'pixels' | 'percent'>('percent');
  const [resizeWidth, setResizeWidth] = useState<number>(800);
  const [resizeHeight, setResizeHeight] = useState<number>(600);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [resizePercent, setResizePercent] = useState<number>(50);
  const [imgOriginalDimensions, setImgOriginalDimensions] = useState<{ w: number; h: number } | null>(null);

  // 4. Image Enhancer
  const [bgSlider, setBgSlider] = useState<number>(0); // -100 to 100
  const [ctSlider, setCtSlider] = useState<number>(0);
  const [stSlider, setStSlider] = useState<number>(0);
  const [shSlider, setShSlider] = useState<number>(0); // sharpness 0 to 100
  const [clarity, setClarity] = useState<number>(0);
  const [sharpness, setSharpness] = useState<number>(50);
  const [detailRecovery, setDetailRecovery] = useState<number>(0);
  const [denoise, setDenoise] = useState<number>(0);
  const [jpegFix, setJpegFix] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0);
  const [enhancerTab, setEnhancerTab] = useState<'auto' | 'manual'>('auto');
  const [enhancerPreset, setEnhancerPreset] = useState<'auto' | 'photo' | 'text' | 'maximum' | 'manual'>('auto');
  const [detectedBanner, setDetectedBanner] = useState<{ text: string; show: boolean } | null>(null);
  const [isAutoEnhancing, setIsAutoEnhancing] = useState<boolean>(false);
  const [autoEnhanceStep, setAutoEnhanceStep] = useState<number>(0);
  const [autoEnhanceApplied, setAutoEnhanceApplied] = useState<boolean>(false);
  const [autoEnhancePills, setAutoEnhancePills] = useState<string[]>([]);
  const [originalImagePixels, setOriginalImagePixels] = useState<Uint8ClampedArray | null>(null);
  const [enhancedImagePixels, setEnhancedImagePixels] = useState<Uint8ClampedArray | null>(null);
  const [cachedWidth, setCachedWidth] = useState<number>(0);
  const [cachedHeight, setCachedHeight] = useState<number>(0);
  const [cropCoords, setCropCoords] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [downloadQuality, setDownloadQuality] = useState<number>(95);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png'>('jpeg');
  const dragTimer = useRef<NodeJS.Timeout | null>(null);
  const processingToken = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const changeFileRef = useRef<HTMLInputElement>(null);
  const addMoreImagesRef = useRef<HTMLInputElement>(null);
  const addMorePdfsRef = useRef<HTMLInputElement>(null);

  // 5. JPEG to PDF
  const [jpegToPdfPageSize, setJpegToPdfPageSize] = useState<'A4' | 'Letter' | 'Auto-fit'>('Auto-fit');

  // 8. PDF to Image
  const [pdfToImageFormat, setPdfToImageFormat] = useState<'png' | 'jpeg'>('png');
  const [pdfToImagePages, setPdfToImagePages] = useState<'all' | 'custom'>('all');
  const [pdfToImageRange, setPdfToImageRange] = useState<string>('');

  // 10. Merge PDF
  const [reorderablePdfs, setReorderablePdfs] = useState<ReorderableFile[]>([]);

  // 11. Split PDF
  const [loadedPdfPageCount, setLoadedPdfPageCount] = useState<number>(0);
  const [splitProfile, setSplitProfile] = useState<'everyN' | 'ranges' | 'single'>('everyN');
  const [splitEveryN, setSplitEveryN] = useState<number>(1);
  const [splitRanges, setSplitRanges] = useState<string>('1-2');
  const [splitSingleSelection, setSplitSingleSelection] = useState<number[]>([]);

  // Preview Panel States
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [excelPreviewData, setExcelPreviewData] = useState<any[][] | null>(null);
  const [wordPreviewText, setWordPreviewText] = useState<string>('');
  const [pdfToImageResultsList, setPdfToImageResultsList] = useState<{ url: string; index: number }[]>([]);
  const [splitPdfResultsList, setSplitPdfResultsList] = useState<{ name: string; range: string; estSize: number; blob: Blob }[]>([]);

  // Reordering alert toasts
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("↕ Order updated");
  const toastTimerRef = useRef<any>(null);

  const showReorderToast = (msg: string = "↕ Order updated") => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2000);
  };

  // Helper to normalize clipboard images
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
          ctx.fillStyle = '#ffffff'; // default background for transparent PNG to JPEG
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

  // Global clipboard data processor
  const handleClipboardData = async (clipboardData: DataTransfer, tool: ToolId) => {
    const pasteStartTime = performance.now();
    const items = Array.from(clipboardData.items || []);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      const blob = imageItem.getAsFile();
      if (!blob) {
        window.dispatchEvent(new CustomEvent('clipboard-paste-error', { detail: { type: 'empty' } }));
        return;
      }

      const extension = imageItem.type.split('/')[1] || 'png';
      const filename = `pasted_image_${Date.now()}.${extension}`;
      const originalFile = new File([blob], filename, { type: imageItem.type });

      let finalFile = originalFile;
      let conversionNote = "";

      const fileType = originalFile.type.toLowerCase();
      if (fileType === 'image/png' && tool === 'jpeg-compress') {
        const jpegBlob = await normalizeClipboardImage(originalFile, 'image/jpeg');
        finalFile = new File([jpegBlob], originalFile.name.replace(/\.png$/i, '.jpg'), { type: 'image/jpeg' });
        conversionNote = "PNG pasted — converting to JPEG for compression";
      } else if (fileType === 'image/webp') {
        const normBlob = await normalizeClipboardImage(originalFile, 'image/png');
        finalFile = new File([normBlob], originalFile.name.replace(/\.webp$/i, '.png'), { type: 'image/png' });
        conversionNote = "WEBP pasted — converted to PNG";
      } else if (fileType === 'image/bmp' || fileType === 'image/tiff') {
        const detectedFormat = fileType === 'image/bmp' ? 'BMP' : 'TIFF';
        const normBlob = await normalizeClipboardImage(originalFile, 'image/png');
        finalFile = new File([normBlob], originalFile.name.replace(/\.(bmp|tiff)$/i, '.png'), { type: 'image/png' });
        conversionNote = `${detectedFormat} pasted — converted to PNG`;
      }

      // Success!
      lastPasteTimeRef.current = Date.now();
      window.dispatchEvent(new CustomEvent('clipboard-paste-flash'));

      if (tool === 'jpeg-to-pdf' && isBatchMode) {
        const newId = `${finalFile.name}-${reorderableImages.length}-${Date.now()}`;
        const newItem: ReorderableFile = {
          id: newId,
          file: finalFile,
          name: finalFile.name,
          size: finalFile.size,
          previewUrl: URL.createObjectURL(finalFile),
          isPasted: true
        };
        setReorderableImages(prev => [...prev, newItem]);
        setSelectedFiles(prev => [...prev, finalFile]);

        const total = reorderableImages.length + 1;
        setTimeout(() => {
          setPasteSuccessBadge({
            filename: finalFile.name,
            size: finalFile.size,
            conversionNote: `Image added to batch! (${total} images total) — Paste more or click Process`
          });
        }, 300);
      } else {
        await handleFileChange([finalFile]);
        setTimeout(() => {
          setPasteSuccessBadge({
            filename: finalFile.name,
            size: finalFile.size,
            conversionNote: conversionNote || undefined
          });
        }, 300);
      }

      // Track session paste status
      setHasRecentlyPasted(true);

      // Speed indicator integration
      setSpeedIndicatorConfig({
        toolId: 'clipboard-load',
        inputSize: finalFile.size,
        outputSize: finalFile.size,
        elapsed: getElapsed(pasteStartTime),
        action: 'loaded_pasted',
        extraInfo: 'Complete pixel matrix loaded'
      });

      return;
    }

    // Try reading copy files
    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        let finalFile = file;
        let conversionNote = "";

        const fileType = file.type.toLowerCase();
        if (fileType === 'image/png' && tool === 'jpeg-compress') {
          const jpegBlob = await normalizeClipboardImage(file, 'image/jpeg');
          finalFile = new File([jpegBlob], file.name.replace(/\.png$/i, '.jpg'), { type: 'image/jpeg' });
          conversionNote = "PNG pasted — converting to JPEG for compression";
        } else if (fileType === 'image/webp') {
          const normBlob = await normalizeClipboardImage(file, 'image/png');
          finalFile = new File([normBlob], file.name.replace(/\.webp$/i, '.png'), { type: 'image/png' });
          conversionNote = "WEBP pasted — converted to PNG";
        } else if (fileType === 'image/bmp' || fileType === 'image/tiff') {
          const detectedFormat = fileType === 'image/bmp' ? 'BMP' : 'TIFF';
          const normBlob = await normalizeClipboardImage(file, 'image/png');
          finalFile = new File([normBlob], file.name.replace(/\.(bmp|tiff)$/i, '.png'), { type: 'image/png' });
          conversionNote = `${detectedFormat} pasted — converted to PNG`;
        }

        // Success!
        lastPasteTimeRef.current = Date.now();
        window.dispatchEvent(new CustomEvent('clipboard-paste-flash'));

        if (tool === 'jpeg-to-pdf' && isBatchMode) {
          const newId = `${finalFile.name}-${reorderableImages.length}-${Date.now()}`;
          const newItem: ReorderableFile = {
            id: newId,
            file: finalFile,
            name: finalFile.name,
            size: finalFile.size,
            previewUrl: URL.createObjectURL(finalFile),
            isPasted: true
          };
          setReorderableImages(prev => [...prev, newItem]);
          setSelectedFiles(prev => [...prev, finalFile]);

          const total = reorderableImages.length + 1;
          setTimeout(() => {
            setPasteSuccessBadge({
              filename: finalFile.name,
              size: finalFile.size,
              conversionNote: `Image added to batch! (${total} images total) — Paste more or click Process`
            });
          }, 300);
        } else {
          await handleFileChange([finalFile]);
          setTimeout(() => {
            setPasteSuccessBadge({
              filename: finalFile.name,
              size: finalFile.size,
              conversionNote: conversionNote || undefined
            });
          }, 300);
        }

        // Track session paste status
        setHasRecentlyPasted(true);

        setSpeedIndicatorConfig({
          toolId: 'clipboard-load',
          inputSize: finalFile.size,
          outputSize: finalFile.size,
          elapsed: getElapsed(pasteStartTime),
          action: 'loaded_pasted',
          extraInfo: 'Complete pixel matrix loaded'
        });

        return;
      }
    }

    // Nothing usable found
    window.dispatchEvent(new CustomEvent('clipboard-paste-error', { detail: { type: 'no-image' } }));
  };

  // Global Keyboard event handler
  useEffect(() => {
    if (activeTool === 'home') return;
    const handlePaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable);
      if (isTyping) return;

      const isImageTool = ['jpeg-compress', 'image-resize', 'image-enhance', 'jpeg-to-pdf'].includes(activeTool);
      if (!isImageTool) {
        // PDF tools and other tools: show near cursor tooltip
        const { x, y } = mousePosRef.current;
        setCursorTooltip({ x: x + 12, y: y + 12, visible: true });
        return;
      }

      e.preventDefault();
      handleClipboardData(e.clipboardData || (e as any).originalEvent?.clipboardData, activeTool);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeTool, isBatchMode, reorderableImages]);

  // --- UNDO/REDO SUBSYSTEMS & PERSISTED LISTENERS ---

  const triggerFlashEffect = () => {
    setFlashColor('rgba(108, 99, 255, 0.15)');
    setTimeout(() => setFlashColor(null), 300);
  };

  const undoToastTimer = useRef<NodeJS.Timeout | null>(null);

  const showUndoRedoToast = (labelText: string, type: 'undo' | 'redo' | 'none') => {
    if (undoToastTimer.current) {
      clearTimeout(undoToastTimer.current);
    }

    let text = labelText;
    if (type === 'undo') {
      text = `Undone: ${labelText}`;
    } else if (type === 'redo') {
      text = `Redone: ${labelText}`;
    }

    setUndoToast({
      visible: true,
      text,
      type
    });

    undoToastTimer.current = setTimeout(() => {
      setUndoToast(prev => prev ? { ...prev, visible: false } : null);
    }, 1800);
  };

  const applyEnhancerState = (state: any) => {
    if (!state) return;
    isRestoringHistory.current = true;
    setBgSlider(state.brightness ?? 0);
    setCtSlider(state.contrast ?? 0);
    setStSlider(state.saturation ?? 0);
    setShSlider(state.sharpness ?? 0);
    
    // Set our new expanded controls
    setClarity(state.clarity ?? 0);
    setSharpness(state.sharpness ?? 0);
    setDetailRecovery(state.detailRecovery ?? 0);
    setDenoise(state.denoise ?? 0);
    setJpegFix(state.jpegFix ?? false);
    setTemperature(state.temperature ?? 0);
    
    lastPushedSliderState.current = {
      brightness: state.brightness ?? 0,
      contrast: state.contrast ?? 0,
      saturation: state.saturation ?? 0,
      sharpness: state.sharpness ?? 0,
      clarity: state.clarity ?? 0,
      detailRecovery: state.detailRecovery ?? 0,
      denoise: state.denoise ?? 0,
      jpegFix: state.jpegFix ?? false,
      temperature: state.temperature ?? 0
    };
    triggerFlashEffect();
    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 100);
  };

  const applyResizerState = (state: any) => {
    if (!state) return;
    isRestoringHistory.current = true;
    setResizerMode(state.unit ?? 'percent');
    setLockAspectRatio(state.maintainAspectRatio ?? true);
    setResizePercent(state.percent ?? 50);
    setResizeWidth(state.width ?? 800);
    setResizeHeight(state.height ?? 600);
    triggerFlashEffect();
    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 100);
  };

  const applyJpegState = (state: any) => {
    if (!state) return;
    isRestoringHistory.current = true;
    setJpegQuality(state.quality ?? 75);
    triggerFlashEffect();
    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 100);
  };

  const applyPdfCompressorState = (state: any) => {
    if (!state) return;
    isRestoringHistory.current = true;
    setPdfQuality(state.preset ?? 'medium');
    triggerFlashEffect();
    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 100);
  };

  const lastPushedPdfsRef = useRef<string>('');
  const applyMergePdfState = (state: any) => {
    if (!state) return;
    isRestoringHistory.current = true;

    const rebuiltList = (state.files || []).map((meta: any, idx: number) => {
      const fileObj = fileStore.current.get(meta.name) || new File([], meta.name);
      return {
        id: `${meta.name}-${idx}-${Date.now()}`,
        file: fileObj,
        name: meta.name,
        size: meta.size
      };
    });

    lastPushedPdfsRef.current = (state.files || []).map((f: any) => f.name).join('||');
    setReorderablePdfs(rebuiltList);
    triggerFlashEffect();
    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 100);
  };

  const lastPushedImagesKey = useRef<string>('');
  const lastPushedPageSize = useRef<string>('');
  const applyJpgToPdfState = (state: any) => {
    if (!state) return;
    isRestoringHistory.current = true;

    const rebuiltList = (state.images || []).map((meta: any, idx: number) => {
      const fileObj = fileStore.current.get(meta.name) || new File([], meta.name);
      return {
        id: `${meta.name}-${idx}-${Date.now()}`,
        file: fileObj,
        name: meta.name,
        size: meta.size,
        previewUrl: URL.createObjectURL(fileObj)
      };
    });

    lastPushedImagesKey.current = (state.images || []).map((img: any) => img.name).join('||');
    lastPushedPageSize.current = state.pageSize ?? 'Auto-fit';

    setReorderableImages(rebuiltList);
    setJpegToPdfPageSize(state.pageSize ?? 'Auto-fit');
    triggerFlashEffect();
    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 100);
  };

  const restoreStateForTool = (toolId: string, state: any) => {
    switch (toolId) {
      case 'image-enhance':
        applyEnhancerState(state);
        break;
      case 'image-resize':
        applyResizerState(state);
        break;
      case 'jpeg-compress':
        applyJpegState(state);
        break;
      case 'pdf-compress':
        applyPdfCompressorState(state);
        break;
      case 'merge-pdf':
        applyMergePdfState(state);
        break;
      case 'jpeg-to-pdf':
        applyJpgToPdfState(state);
        break;
    }
  };

  const triggerUndo = (toolId: string) => {
    const manager = historyManagers.current[toolId];
    if (!manager) return;

    const prev = manager.undo();
    if (prev) {
      showUndoRedoToast(prev.label || "Previous settings", 'undo');
      restoreStateForTool(toolId, prev);
    } else {
      setShakeButton('undo');
      setTimeout(() => setShakeButton(null), 300);
      showUndoRedoToast("Nothing to undo", 'none');
    }
  };

  const triggerRedo = (toolId: string) => {
    const manager = historyManagers.current[toolId];
    if (!manager) return;

    const next = manager.redo();
    if (next) {
      showUndoRedoToast(next.label || "Next settings", 'redo');
      restoreStateForTool(toolId, next);
    } else {
      setShakeButton('redo');
      setTimeout(() => setShakeButton(null), 300);
      showUndoRedoToast("Nothing to redo", 'none');
    }
  };

  const executeReset = (toolId: string) => {
    setShowResetPopover(null);
    const manager = historyManagers.current[toolId];
    if (!manager) return;

    manager.clear();
    isRestoringHistory.current = true;

    if (toolId === 'image-enhance') {
      setBgSlider(0);
      setCtSlider(0);
      setStSlider(0);
      setShSlider(0);
      setClarity(0);
      setSharpness(0);
      setDetailRecovery(0);
      setDenoise(0);
      setJpegFix(false);
      setTemperature(0);
      setAutoEnhanceApplied(false);
      lastPushedSliderState.current = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        sharpness: 0,
        clarity: 0,
        detailRecovery: 0,
        denoise: 0,
        jpegFix: false,
        temperature: 0
      };
      manager.push({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        sharpness: 0,
        clarity: 0,
        detailRecovery: 0,
        denoise: 0,
        jpegFix: false,
        temperature: 0,
        label: 'Original'
      });
    } else if (toolId === 'image-resize') {
      setResizerMode('percent');
      setResizePercent(50);
      if (imgOriginalDimensions) {
        setResizeWidth(imgOriginalDimensions.w);
        setResizeHeight(imgOriginalDimensions.h);
      }
      manager.push({
        width: imgOriginalDimensions ? imgOriginalDimensions.w : 800,
        height: imgOriginalDimensions ? imgOriginalDimensions.h : 600,
        unit: 'percent',
        maintainAspectRatio: true,
        percent: 50,
        label: 'Original'
      });
    } else if (toolId === 'jpeg-compress') {
      setJpegQuality(75);
      manager.push({
        mode: 'quality',
        quality: 75,
        targetSize: 0,
        targetUnit: 'KB',
        label: 'Original'
      });
    } else if (toolId === 'pdf-compress') {
      setPdfQuality('medium');
      manager.push({
        preset: 'medium',
        imageQuality: 60,
        dpi: 150,
        label: 'Original'
      });
    } else if (toolId === 'merge-pdf' || toolId === 'jpeg-to-pdf') {
      const originalState = manager.stack[0];
      if (originalState) {
        restoreStateForTool(toolId, originalState);
        manager.clear();
        manager.push(originalState);
      }
    }

    setShowPreview(false);
    setResultUrl(null);
    setOutputBlob(null);
    triggerFlashEffect();

    setTimeout(() => {
      isRestoringHistory.current = false;
      showUndoRedoToast("Reset all changes to original", 'none');
    }, 120);
  };

  const pushEnhancerStateIfNeeded = (isImmediate = false) => {
    if (isRestoringHistory.current) return;

    const current = {
      brightness: bgSlider,
      contrast: ctSlider,
      saturation: stSlider,
      sharpness: sharpness,
      clarity: clarity,
      detailRecovery: detailRecovery,
      denoise: denoise,
      jpegFix: jpegFix,
      temperature: temperature
    };

    if (
      current.brightness === lastPushedSliderState.current.brightness &&
      current.contrast === lastPushedSliderState.current.contrast &&
      current.saturation === lastPushedSliderState.current.saturation &&
      current.sharpness === lastPushedSliderState.current.sharpness &&
      current.clarity === lastPushedSliderState.current.clarity &&
      current.detailRecovery === lastPushedSliderState.current.detailRecovery &&
      current.denoise === lastPushedSliderState.current.denoise &&
      current.jpegFix === lastPushedSliderState.current.jpegFix &&
      current.temperature === lastPushedSliderState.current.temperature
    ) {
      return;
    }

    const diffB = Math.abs(current.brightness - lastPushedSliderState.current.brightness);
    const diffC = Math.abs(current.contrast - lastPushedSliderState.current.contrast);
    const diffS = Math.abs(current.saturation - lastPushedSliderState.current.saturation);
    const diffSh = Math.abs(current.sharpness - lastPushedSliderState.current.sharpness);
    const diffCl = Math.abs(current.clarity - lastPushedSliderState.current.clarity);
    const diffDr = Math.abs(current.detailRecovery - lastPushedSliderState.current.detailRecovery);
    const diffDe = Math.abs(current.denoise - lastPushedSliderState.current.denoise);
    const diffTe = Math.abs(current.temperature - lastPushedSliderState.current.temperature);

    let label = 'Sliders adjusted';
    const maxDiff = Math.max(diffB, diffC, diffS, diffSh, diffCl, diffDr, diffDe, diffTe);
    if (maxDiff > 0) {
      if (maxDiff === diffCl) {
        label = `Clarity ${clarity > 0 ? '+' : ''}${clarity}%`;
      } else if (maxDiff === diffSh) {
        label = `Sharpness ${sharpness}%`;
      } else if (maxDiff === diffDr) {
        label = `Detail Recovery ${detailRecovery}%`;
      } else if (maxDiff === diffDe) {
        label = `Noise Reduction ${denoise}%`;
      } else if (maxDiff === diffTe) {
        label = `Temperature ${temperature > 0 ? 'Warm' : 'Cool'} ${Math.abs(temperature)}%`;
      } else if (maxDiff === diffB) {
        label = `Brightness ${bgSlider > 0 ? '+' : ''}${bgSlider}%`;
      } else if (maxDiff === diffC) {
        label = `Contrast ${ctSlider > 0 ? '+' : ''}${ctSlider}%`;
      } else if (maxDiff === diffS) {
        label = `Saturation ${stSlider > 0 ? '+' : ''}${stSlider}%`;
      }
    } else if (current.jpegFix !== lastPushedSliderState.current.jpegFix) {
      label = `JPEG Fix: ${jpegFix ? 'ON' : 'OFF'}`;
    }

    const manager = historyManagers.current['image-enhance'];
    if (manager) {
      manager.push({
        ...current,
        label
      });
      lastPushedSliderState.current = current;
    }
  };

  // Debounced listener for slider modifications
  useEffect(() => {
    if (isRestoringHistory.current) return;
    if (activeTool !== 'image-enhance') return;
    if (selectedFiles.length === 0) return;

    if (enhancerDebounceTimer.current) {
      clearTimeout(enhancerDebounceTimer.current);
    }
    enhancerDebounceTimer.current = setTimeout(() => {
      pushEnhancerStateIfNeeded(false);
    }, 800);

    return () => {
      if (enhancerDebounceTimer.current) {
        clearTimeout(enhancerDebounceTimer.current);
      }
    };
  }, [bgSlider, ctSlider, stSlider, sharpness, clarity, detailRecovery, denoise, jpegFix, temperature, activeTool]);

  // Immediate mouseup or touchend to commit slider values instantly upon releasing
  useEffect(() => {
    if (activeTool !== 'image-enhance') return;
    const handleSliderMouseUp = () => {
      pushEnhancerStateIfNeeded(true);
    };
    window.addEventListener('mouseup', handleSliderMouseUp);
    window.addEventListener('touchend', handleSliderMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleSliderMouseUp);
      window.removeEventListener('touchend', handleSliderMouseUp);
    };
  }, [bgSlider, ctSlider, stSlider, sharpness, clarity, detailRecovery, denoise, jpegFix, temperature, activeTool]);

  // 1. Initial image loader, sampler & edge-cropper
  useEffect(() => {
    if (activeTool !== 'image-enhance' || selectedFiles.length === 0) {
      setOriginalImagePixels(null);
      setEnhancedImagePixels(null);
      setCropCoords(null);
      setOriginalPreviewUrl(null);
      setEnhancedPreviewUrl(null);
      setDetectedBanner(null);
      return;
    }

    const file = selectedFiles[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Downsample preview to max 800px on longest side for real-time butter updates
        const PREVIEW_MAX = 800;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > PREVIEW_MAX || h > PREVIEW_MAX) {
          if (w > h) {
            h = Math.round((h * PREVIEW_MAX) / w);
            w = PREVIEW_MAX;
          } else {
            w = Math.round((w * PREVIEW_MAX) / h);
            h = PREVIEW_MAX;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const imgData = ctx.getImageData(0, 0, w, h);
            const pixels = imgData.data;
            setOriginalImagePixels(pixels);
            setCachedWidth(w);
            setCachedHeight(h);
            
            // Find highest edge region for zoomed detail analysis crop
            const coords = findHighestEdgeRegion(pixels, w, h);
            setCropCoords(coords);

            // Auto-detect image type and set appropriate preset
            const typeResult = detectImageType(pixels, w, h);
            if (typeResult === 'screenshot') {
              setEnhancerPreset('text');
              setDetectedBanner({
                text: "Screenshot detected — Text/Screenshot preset selected",
                show: true
              });
            } else {
              setEnhancerPreset('photo');
              setDetectedBanner({
                text: "Photo detected — Photo preset selected",
                show: true
              });
            }

            // Set original preview url
            canvas.toBlob((blob) => {
              if (blob) {
                setOriginalPreviewUrl(URL.createObjectURL(blob));
              }
            }, 'image/jpeg', 0.95);
          } catch (err) {
            console.error("Downsampling / pixel reading failed:", err);
          }
        }
      };
      img.onerror = () => console.error("Failed to load original image in preview");
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [selectedFiles, activeTool]);

  // 2. Real-time preview pipeline recalculator on manual and auto adjustments
  useEffect(() => {
    if (!originalImagePixels || cachedWidth === 0 || cachedHeight === 0) return;

    setIsRecalculating(true);
    const token = ++processingToken.current;

    const runRecalculation = async () => {
      let srcPixels = originalImagePixels;
      
      // If actively dragging slider, crop center 50% for 5ms lightning-fast rendering
      const useRegion = isDraggingSlider && (cachedWidth > 400 || cachedHeight > 400);
      let rW = cachedWidth;
      let rH = cachedHeight;
      let offsetStartX = 0;
      let offsetStartY = 0;

      if (useRegion) {
        rW = Math.floor(cachedWidth * 0.5);
        rH = Math.floor(cachedHeight * 0.5);
        offsetStartX = Math.floor(cachedWidth * 0.25);
        offsetStartY = Math.floor(cachedHeight * 0.25);
        
        const subData = new Uint8ClampedArray(rW * rH * 4);
        for (let y = 0; y < rH; y++) {
          const srcY = y + offsetStartY;
          const srcIdx = (srcY * cachedWidth + offsetStartX) * 4;
          const dstIdx = y * rW * 4;
          subData.set(originalImagePixels.subarray(srcIdx, srcIdx + rW * 4), dstIdx);
        }
        srcPixels = subData;
      }

      // Run pipeline
      let pipelineResult: Uint8ClampedArray;
      if (enhancerPreset === 'auto') {
        const res = autoEnhance(srcPixels, rW, rH);
        pipelineResult = res.pixels;
        if (token === processingToken.current) {
          setAutoEnhancePills(res.applied);
        }
      } else if (enhancerPreset === 'photo') {
        let result = new Uint8ClampedArray(srcPixels);
        result = applyDenoise(result, rW, rH, 25);
        result = clarityEnhancement(result, rW, rH, 60);
        result = luminanceSharpen(result, rW, rH, 120);
        result = localContrastEnhancement(result, rW, rH, 30);
        result = applyColorLight(result, bgSlider, ctSlider, stSlider, temperature);
        pipelineResult = result;
      } else if (enhancerPreset === 'text') {
        let result = new Uint8ClampedArray(srcPixels);
        result = removeJpegArtifacts(result, rW, rH, 70);
        result = edgeEnhancement(result, rW, rH, 80);
        result = luminanceSharpen(result, rW, rH, 200);
        result = localContrastEnhancement(result, rW, rH, 50);
        result = applyColorLight(result, bgSlider, ctSlider, stSlider, temperature);
        pipelineResult = result;
      } else if (enhancerPreset === 'maximum') {
        let result = new Uint8ClampedArray(srcPixels);
        result = maximumClarity(result, rW, rH);
        result = applyColorLight(result, bgSlider, ctSlider, stSlider, temperature);
        pipelineResult = result;
      } else {
        // 'manual' controls: custom sliders
        let result = new Uint8ClampedArray(srcPixels);

        // 1. JPEG Artifact Removal
        if (jpegFix) {
          result = removeJpegArtifacts(result, rW, rH, 50);
        }
        // 2. Denoise
        if (denoise > 0) {
          result = applyDenoise(result, rW, rH, denoise);
        }
        // 3. Clarity
        if (clarity !== 0) {
          result = clarityEnhancement(result, rW, rH, clarity);
        }
        // 4. Detail Recovery
        if (detailRecovery > 0) {
          result = applyDetailRecovery(result, rW, rH, detailRecovery);
        }
        // 5. Unsharp Mask (Sharpness uses strong Luma sharpen)
        if (sharpness > 0) {
          result = luminanceSharpen(result, rW, rH, sharpness * 2);
        }
        // 6. Color & Light and temperature
        result = applyColorLight(result, bgSlider, ctSlider, stSlider, temperature);
        pipelineResult = result;
      }

      if (token !== processingToken.current) return;

      // Draw output to canvas then object url
      const outCanvas = document.createElement('canvas');
      outCanvas.width = rW;
      outCanvas.height = rH;
      const oCtx = outCanvas.getContext('2d');
      if (oCtx) {
        const outImgData = oCtx.createImageData(rW, rH);
        outImgData.data.set(pipelineResult);
        oCtx.putImageData(outImgData, 0, 0);
        
        outCanvas.toBlob((blob) => {
          if (token !== processingToken.current) return;
          if (blob) {
            setEnhancedPreviewUrl(URL.createObjectURL(blob));
            if (!useRegion) {
              setEnhancedImagePixels(pipelineResult);
            }
            setIsRecalculating(false);
          }
        }, 'image/jpeg', 0.9);
      }
    };

    const timeoutDuration = isDraggingSlider ? 40 : 150;
    const timer = setTimeout(runRecalculation, timeoutDuration);

    return () => {
      clearTimeout(timer);
    };
  }, [
    originalImagePixels,
    bgSlider,
    ctSlider,
    stSlider,
    sharpness,
    clarity,
    detailRecovery,
    denoise,
    jpegFix,
    temperature,
    enhancerTab,
    enhancerPreset,
    isDraggingSlider,
    cachedWidth,
    cachedHeight
  ]);

  // Ref trackers for analytics Canvas elements
  const cropOriginalCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropEnhancedCanvasRef = useRef<HTMLCanvasElement>(null);
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null);

  // 3. Render 100% Crops of edges
  useEffect(() => {
    if (!originalImagePixels || !enhancedImagePixels || !cropCoords) return;
    
    // Original crop
    const c1 = cropOriginalCanvasRef.current;
    if (c1) {
      const ctx1 = c1.getContext('2d');
      if (ctx1) {
        c1.width = 200;
        c1.height = 200;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cachedWidth;
        tempCanvas.height = cachedHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          const imgData = tempCtx.createImageData(cachedWidth, cachedHeight);
          imgData.data.set(originalImagePixels);
          tempCtx.putImageData(imgData, 0, 0);
          ctx1.drawImage(tempCanvas, cropCoords.x, cropCoords.y, 200, 200, 0, 0, 200, 200);
        }
      }
    }
    
    // Enhanced crop
    const c2 = cropEnhancedCanvasRef.current;
    if (c2) {
      const ctx2 = c2.getContext('2d');
      if (ctx2) {
        c2.width = 200;
        c2.height = 200;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cachedWidth;
        tempCanvas.height = cachedHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          const imgData = tempCtx.createImageData(cachedWidth, cachedHeight);
          imgData.data.set(enhancedImagePixels);
          tempCtx.putImageData(imgData, 0, 0);
          ctx2.drawImage(tempCanvas, cropCoords.x, cropCoords.y, 200, 200, 0, 0, 200, 200);
        }
      }
    }
  }, [originalImagePixels, enhancedImagePixels, cropCoords, cachedWidth, cachedHeight, isDraggingSlider]);

  // 4. Paint Tonal Distribution Histogram Overlays
  useEffect(() => {
    const canvas = histogramCanvasRef.current;
    if (canvas && originalImagePixels && enhancedImagePixels && !isDraggingSlider) {
      drawHistogramCanvas(canvas, originalImagePixels, enhancedImagePixels);
    }
  }, [originalImagePixels, enhancedImagePixels, isDraggingSlider]);

  // Merge PDF modifications watcher
  useEffect(() => {
    if (isRestoringHistory.current) return;
    if (activeTool !== 'merge-pdf') return;
    if (reorderablePdfs.length === 0) return;

    const currentKey = reorderablePdfs.map(f => f.name).join('||');
    if (currentKey === lastPushedPdfsRef.current) return;

    reorderablePdfs.forEach(item => {
      if (item.file) {
        fileStore.current.set(item.name, item.file);
      }
    });

    let label = 'Reordered files';
    const lastNames = lastPushedPdfsRef.current ? lastPushedPdfsRef.current.split('||') : [];
    const currentNames = currentKey.split('||');

    if (lastNames.length > 0) {
      if (currentNames.length > lastNames.length) {
        const added = currentNames.filter(n => !lastNames.includes(n));
        label = added.length > 0 ? `Added ${added[0]}` : 'Added files';
      } else if (currentNames.length < lastNames.length) {
        const removed = lastNames.filter(n => !currentNames.includes(n));
        label = removed.length > 0 ? `Removed ${removed[0]}` : 'Removed files';
      }
    } else {
      label = `Original (${currentNames.length} files)`;
    }

    lastPushedPdfsRef.current = currentKey;

    const manager = historyManagers.current['merge-pdf'];
    if (manager) {
      manager.push({
        files: reorderablePdfs.map((f, idx) => ({ name: f.name, size: f.size, order: idx })),
        label
      });
    }
  }, [reorderablePdfs, activeTool]);

  // JPG to PDF modifications watcher (reorderableImages, page size)
  useEffect(() => {
    if (isRestoringHistory.current) return;
    if (activeTool !== 'jpeg-to-pdf') return;
    if (reorderableImages.length === 0) return;

    const currentKey = reorderableImages.map(img => img.name).join('||');
    const changedPageSize = jpegToPdfPageSize !== lastPushedPageSize.current;

    if (currentKey === lastPushedImagesKey.current && !changedPageSize) return;

    reorderableImages.forEach(item => {
      if (item.file) {
        fileStore.current.set(item.name, item.file);
      }
    });

    let label = 'Reordered images';
    if (changedPageSize && lastPushedPageSize.current) {
      label = `Page size: ${jpegToPdfPageSize}`;
    } else {
      const lastNames = lastPushedImagesKey.current ? lastPushedImagesKey.current.split('||') : [];
      const currentNames = currentKey.split('||');

      if (lastNames.length > 0) {
        if (currentNames.length > lastNames.length) {
          const added = currentNames.filter(n => !lastNames.includes(n));
          label = added.length > 0 ? `Added ${added[0]}` : 'Added image';
        } else if (currentNames.length < lastNames.length) {
          const removed = lastNames.filter(n => !currentNames.includes(n));
          label = removed.length > 0 ? `Removed ${removed[0]}` : 'Removed image';
        }
      } else {
        label = `Original (${currentNames.length} images)`;
      }
    }

    lastPushedImagesKey.current = currentKey;
    lastPushedPageSize.current = jpegToPdfPageSize;

    const manager = historyManagers.current['jpeg-to-pdf'];
    if (manager) {
      manager.push({
        images: reorderableImages.map((img, idx) => ({ name: img.name, size: img.size, order: idx })),
        pageSize: jpegToPdfPageSize,
        label
      });
    }
  }, [reorderableImages, jpegToPdfPageSize, activeTool]);

  // Watcher for new file uploads (Original states pushes and history cleanups)
  useEffect(() => {
    const hasHistory = ['image-enhance', 'image-resize', 'jpeg-compress', 'pdf-compress', 'merge-pdf', 'jpeg-to-pdf'].includes(activeTool);
    if (!hasHistory) return;

    const getFileId = () => {
      if (activeTool === 'image-enhance' || activeTool === 'image-resize' || activeTool === 'jpeg-compress' || activeTool === 'pdf-compress') {
        return selectedFiles.length > 0 ? `${selectedFiles[0].name}-${selectedFiles[0].size}` : '';
      }
      if (activeTool === 'merge-pdf') {
        return reorderablePdfs.length > 0 ? reorderablePdfs.map(f => f.name).join('|') : '';
      }
      if (activeTool === 'jpeg-to-pdf') {
        return reorderableImages.length > 0 ? reorderableImages.map(img => img.name).join('|') : '';
      }
      return '';
    };

    const currentFileId = getFileId();
    if (!currentFileId) return;

    const lastId = lastFileIdMap.current[activeTool];
    if (lastId && lastId !== currentFileId) {
      // Clear history for that tool
      const manager = historyManagers.current[activeTool];
      if (manager) {
        manager.clear();
        isRestoringHistory.current = true;
        
        // Push fresh first state
        if (activeTool === 'image-enhance') {
          setBgSlider(0);
          setCtSlider(0);
          setStSlider(0);
          setShSlider(0);
          setClarity(0);
          setSharpness(0);
          setDetailRecovery(0);
          setDenoise(0);
          setJpegFix(false);
          setTemperature(0);
          setAutoEnhanceApplied(false);
          lastPushedSliderState.current = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            sharpness: 0,
            clarity: 0,
            detailRecovery: 0,
            denoise: 0,
            jpegFix: false,
            temperature: 0
          };
          manager.push({
            brightness: 0,
            contrast: 0,
            saturation: 0,
            sharpness: 0,
            clarity: 0,
            detailRecovery: 0,
            denoise: 0,
            jpegFix: false,
            temperature: 0,
            label: 'Original'
          });
        } else if (activeTool === 'image-resize') {
          manager.push({
            width: imgOriginalDimensions ? imgOriginalDimensions.w : 800,
            height: imgOriginalDimensions ? imgOriginalDimensions.h : 600,
            unit: resizerMode,
            maintainAspectRatio: lockAspectRatio,
            percent: resizePercent,
            label: 'Original'
          });
        } else if (activeTool === 'jpeg-compress') {
          manager.push({
            mode: 'quality',
            quality: jpegQuality,
            targetSize: 0,
            targetUnit: 'KB',
            label: 'Original'
          });
        } else if (activeTool === 'pdf-compress') {
          manager.push({
            preset: pdfQuality,
            imageQuality: 60,
            dpi: 150,
            label: 'Original'
          });
        }

        setTimeout(() => {
          isRestoringHistory.current = false;
        }, 100);

        showUndoRedoToast("History cleared — new file loaded", 'none');
      }
    } else if (!lastId) {
      // Lazy pushing of initial 'Original' state for single actions
      const manager = historyManagers.current[activeTool];
      if (manager && manager.stack.length === 0) {
        if (activeTool === 'image-enhance') {
          manager.push({
            brightness: 0,
            contrast: 0,
            saturation: 0,
            sharpness: 0,
            clarity: 0,
            detailRecovery: 0,
            denoise: 0,
            jpegFix: false,
            temperature: 0,
            label: 'Original'
          });
        } else if (activeTool === 'image-resize') {
          manager.push({
            width: imgOriginalDimensions ? imgOriginalDimensions.w : resizeWidth,
            height: imgOriginalDimensions ? imgOriginalDimensions.h : resizeHeight,
            unit: resizerMode,
            maintainAspectRatio: lockAspectRatio,
            percent: resizePercent,
            label: 'Original'
          });
        } else if (activeTool === 'jpeg-compress') {
          manager.push({
            mode: 'quality',
            quality: jpegQuality,
            targetSize: 0,
            targetUnit: 'KB',
            label: 'Original'
          });
        } else if (activeTool === 'pdf-compress') {
          manager.push({
            preset: pdfQuality,
            imageQuality: 60,
            dpi: 150,
            label: 'Original'
          });
        }
      }
    }

    lastFileIdMap.current[activeTool] = currentFileId;
  }, [selectedFiles, reorderablePdfs.length, reorderableImages.length, activeTool]);

  // Keyboard shortcut listeners (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (!modifier) return;

      const hasHistory = ['image-enhance', 'image-resize', 'jpeg-compress', 'pdf-compress', 'merge-pdf', 'jpeg-to-pdf'].includes(activeTool);
      if (!hasHistory) return;

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        triggerUndo(activeTool);
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault();
        triggerRedo(activeTool);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTool]);

  // Click outside & Escape keys to dismiss Reset Confirmation Popover
  useEffect(() => {
    if (!showResetPopover) return;
    const handleOutsideClickAndEscape = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') {
          setShowResetPopover(null);
        }
      } else {
        const popover = document.getElementById('reset-popover');
        const resetBtn = document.getElementById('reset-btn-trigger');
        if (popover && !popover.contains(e.target as Node) && resetBtn && !resetBtn.contains(e.target as Node)) {
          setShowResetPopover(null);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClickAndEscape);
    document.addEventListener('keydown', handleOutsideClickAndEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClickAndEscape);
      document.removeEventListener('keydown', handleOutsideClickAndEscape);
    };
  }, [showResetPopover]);

  const isFileLoadedForHistory = () => {
    if (activeTool === 'image-enhance' || activeTool === 'image-resize' || activeTool === 'jpeg-compress' || activeTool === 'pdf-compress') {
      return selectedFiles.length > 0;
    }
    if (activeTool === 'merge-pdf') {
      return reorderablePdfs.length > 0;
    }
    if (activeTool === 'jpeg-to-pdf') {
      return reorderableImages.length > 0;
    }
    return false;
  };

  const shouldShowHistoryToolbar = () => {
    const hasHistory = ['image-enhance', 'image-resize', 'jpeg-compress', 'pdf-compress', 'merge-pdf', 'jpeg-to-pdf'].includes(activeTool);
    if (!hasHistory) return false;
    if (!isFileLoadedForHistory()) return false;
    const status = historyStatus[activeTool];
    return status && status.totalStates > 1;
  };

  const renderHistoryToolbar = () => {
    if (!shouldShowHistoryToolbar()) return null;

    const status = historyStatus[activeTool];
    if (!status) return null;

    const canUndo = status.canUndo;
    const canRedo = status.canRedo;
    const currentStep = status.currentIndex;
    const totalSteps = status.totalStates - 1;

    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
    const undoShortcut = isMac ? '⌘Z' : 'Ctrl+Z';
    const redoShortcut = isMac ? '⌘Y' : 'Ctrl+Y';

    return (
      <div 
        className="h-10 bg-surface-secondary border border-border-dark rounded-[10px] px-3 flex items-center gap-2 select-none relative mb-4" 
        id="undo-redo-toolbar"
      >
        {/* Undo button */}
        <motion.button
          type="button"
          disabled={!canUndo}
          onClick={(e) => { e.preventDefault(); triggerUndo(activeTool); }}
          animate={shakeButton === 'undo' ? { x: [0, -4, 4, -4, 4, 0] } : {}}
          transition={{ duration: 0.3 }}
          className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 transition-all text-xs font-sans font-semibold border border-transparent ${
            canUndo 
              ? 'text-text-light cursor-pointer hover:bg-primary-accent/10 hover:text-primary-accent active:scale-95' 
              : 'opacity-35 cursor-not-allowed text-text-sub'
          }`}
          title={`Undo last change (${undoShortcut})`}
          aria-label="Undo last change"
          aria-disabled={!canUndo}
          aria-keyshortcuts="Control+Z"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
          <span className="hidden sm:inline">Undo</span>
          <span className="hidden md:inline-block text-[10px] bg-border-dark text-text-sub px-1 py-0.5 rounded leading-none border border-border-dark/60 font-mono font-medium">
            {undoShortcut}
          </span>
        </motion.button>

        {/* Divider */}
        <div className="w-[1px] h-5 bg-border-dark opacity-80 mx-1" />

        {/* Redo button */}
        <motion.button
          type="button"
          disabled={!canRedo}
          onClick={(e) => { e.preventDefault(); triggerRedo(activeTool); }}
          animate={shakeButton === 'redo' ? { x: [0, -4, 4, -4, 4, 0] } : {}}
          transition={{ duration: 0.3 }}
          className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 transition-all text-xs font-sans font-semibold border border-transparent ${
            canRedo 
              ? 'text-text-light cursor-pointer hover:bg-primary-accent/10 hover:text-primary-accent active:scale-95' 
              : 'opacity-35 cursor-not-allowed text-text-sub'
          }`}
          title={`Redo change (${redoShortcut})`}
          aria-label="Redo change"
          aria-disabled={!canRedo}
          aria-keyshortcuts="Control+Y"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
          </svg>
          <span className="hidden sm:inline">Redo</span>
          <span className="hidden md:inline-block text-[10px] bg-border-dark text-text-sub px-1 py-0.5 rounded leading-none border border-border-dark/60 font-mono font-medium">
            {redoShortcut}
          </span>
        </motion.button>

        {/* Divider */}
        <div className="w-[1px] h-5 bg-border-dark opacity-80 mx-1" />

        {/* Step counter */}
        <div className="text-text-sub text-[12px] font-sans font-medium" aria-live="polite">
          {currentStep === 0 ? (
            <span className="text-text-light font-semibold">Original</span>
          ) : currentStep === totalSteps ? (
            <span>
              Step <span className="text-text-light font-bold">{currentStep}</span> of {totalSteps}{' '}
              <span className="text-secondary-accent font-bold px-1.5 py-0.5 rounded-full bg-secondary-accent/10 text-[10px] ml-1">
                Latest
              </span>
            </span>
          ) : (
            <span>
              Step <span className="text-text-light font-bold">{currentStep}</span> of {totalSteps}
            </span>
          )}

          {status.totalStates >= 50 && activeTool === 'image-enhance' && (
            <span className="text-[10px] text-error ml-2 cursor-help font-medium" title="Maximum history reached. Oldest steps are being removed.">
              ⚠️ Max History
            </span>
          )}
        </div>

        {/* Reset button - pushed to right */}
        <div className="ml-auto relative flex items-center">
          <button
            type="button"
            id="reset-btn-trigger"
            onClick={(e) => { e.preventDefault(); setShowResetPopover(prev => prev === activeTool ? null : activeTool); }}
            className="h-8 px-2.5 hover:text-error text-text-sub flex items-center gap-1.5 text-xs font-sans font-semibold cursor-pointer rounded-lg hover:bg-error/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset All</span>
          </button>

          {/* Reset Confirmation Popover */}
          <AnimatePresence>
            {showResetPopover === activeTool && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-0 mb-2.5 w-[230px] p-4 bg-surface-dark border border-border-dark rounded-xl shadow-2xl z-50 text-left"
                id="reset-popover"
              >
                <div className="flex items-start gap-2.5 mb-2.5">
                  <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-display font-bold text-sm text-text-light">Reset all changes?</h5>
                    <p className="text-[11px] text-text-sub leading-normal mt-0.5">
                      This will clear your {totalSteps} edit steps and restore the original.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowResetPopover(null); }}
                    className="flex-1 h-8 text-[11px] font-semibold text-text-light hover:bg-surface-secondary border border-border-dark rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); executeReset(activeTool); }}
                    className="flex-1 h-8 text-[11px] font-semibold text-white bg-error hover:bg-error/90 rounded-lg cursor-pointer transition-colors"
                  >
                    Reset
                  </button>
                </div>
                {/* Popover Arrow */}
                <div className="absolute top-full right-8 -translate-y-[1px] w-3 h-3 bg-surface-dark border-r border-b border-border-dark rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const HistoryThumbnail = ({ state }: { state: any }) => {
    const bPercent = ((state.brightness ?? 0) + 100) / 2;
    const cPercent = ((state.contrast ?? 0) + 100) / 2;
    const sPercent = ((state.saturation ?? 0) + 100) / 2;
    const shPercent = state.sharpness ?? 0;

    return (
      <div className="w-[40px] h-[16px] flex flex-col justify-between bg-black/40 rounded p-0.5 shrink-0" title="Settings snapshot">
        {/* Brightness - Yellow */}
        <div className="h-[2px] bg-[#EAB308]/40 w-full rounded-full overflow-hidden">
          <div className="h-full bg-[#EAB308]" style={{ width: `${bPercent}%` }} />
        </div>
        {/* Contrast - White */}
        <div className="h-[2px] bg-white/30 w-full rounded-full overflow-hidden">
          <div className="h-full bg-white" style={{ width: `${cPercent}%` }} />
        </div>
        {/* Saturation - Teal */}
        <div className="h-[2px] bg-[#00D4AA]/30 w-full rounded-full overflow-hidden">
          <div className="h-full bg-[#00D4AA]" style={{ width: `${sPercent}%` }} />
        </div>
        {/* Sharpness - Violet */}
        <div className="h-[2px] bg-[#6C63FF]/30 w-full rounded-full overflow-hidden">
          <div className="h-full bg-[#6C63FF]" style={{ width: `${shPercent}%` }} />
        </div>
      </div>
    );
  };

  const renderHistoryPanelContent = (isMobile = false) => {
    const manager = historyManagers.current['image-enhance'];
    const status = historyStatus['image-enhance'];
    if (!manager || !status) return null;

    const items = [...manager.stack].reverse();
    const len = manager.stack.length;

    const displayedItems = items.slice(0, 20);
    const hasMore = items.length > 20;

    return (
      <div className="h-full flex flex-col font-sans select-none text-left">
        <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-border-dark shrink-0">
          <h4 className="font-display font-bold text-sm text-text-light flex items-center gap-1.5">
            <svg className="w-4 h-4 text-primary-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Edit History
          </h4>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileHistoryOpen(false)}
              className="text-text-sub hover:text-text-light p-1 font-bold text-base cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[350px] md:max-h-none" role="log" aria-label="Edit history">
          {displayedItems.map((state, reversedIdx) => {
            const originalStackIndex = len - 1 - reversedIdx;
            
            const isCurrent = originalStackIndex === status.currentIndex;
            const isFuture = originalStackIndex > status.currentIndex;

            return (
              <div
                key={reversedIdx}
                role="button"
                tabIndex={0}
                aria-label={`Go to: ${state.label}, step ${originalStackIndex}`}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => {
                  isRestoringHistory.current = true;
                  const targetState = manager.stack[originalStackIndex];
                  manager.currentIndex = originalStackIndex;
                  setHistoryStatus(prev => ({
                    ...prev,
                    'image-enhance': manager.getStatus()
                  }));
                  applyEnhancerState(targetState);
                  if (isMobile) setMobileHistoryOpen(false);
                }}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border outline-none text-xs ${
                  isCurrent
                    ? 'bg-[#6C63FF]/10 border-[#6C63FF]/40 text-text-light font-bold border-l-[3px] border-l-[#6C63FF]'
                    : isFuture
                      ? 'bg-transparent border-transparent text-text-sub opacity-55 hover:bg-surface-secondary hover:border-border-dark/60'
                      : 'bg-transparent border-transparent text-text-sub hover:bg-surface-secondary hover:border-border-dark/50'
                }`}
              >
                <div className="flex flex-col gap-0.5 truncate pr-2">
                  <span className={`${isCurrent ? 'text-text-light font-bold' : 'text-text-sub/90'}`}>{state.label}</span>
                  <span className="text-[10px] text-text-sub/50 font-mono">Step {originalStackIndex}</span>
                </div>

                <div className="shrink-0 flex items-center">
                  {isCurrent ? (
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#6C63FF] text-white font-bold rounded-full font-mono uppercase">
                      Current
                    </span>
                  ) : isFuture ? (
                    <span className="text-[9px] font-bold text-secondary-accent flex items-center gap-0.5 font-mono">
                      ↩ Redo
                    </span>
                  ) : (
                    <HistoryThumbnail state={state} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-2 text-[10px] text-text-sub/65 font-medium shrink-0 pt-1 border-t border-border-dark/40">
            Showing last 20 edits
          </div>
        )}
      </div>
    );
  };

  // Re-bundling operations for zip updates on reorder
  const rebuildPdfToImageZip = async (newImages: { url: string; index: number }[]) => {
    const JSZipLib = (window as any).JSZip;
    if (!JSZipLib) return;
    const zip = new JSZipLib();
    
    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        zip.file(`page_${i + 1}.${pdfToImageFormat}`, blob);
      } catch (e) {
        console.error("Failed to add image to reordered zip", e);
      }
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    setResultUrl(zipUrl);
    setOutputBlob(zipBlob);
  };

  const rebuildSplitPdfZip = async (newParts: typeof splitPdfResultsList) => {
    const JSZipLib = (window as any).JSZip;
    if (!JSZipLib) return;
    const zip = new JSZipLib();
    newParts.forEach((part) => {
      zip.file(part.name, part.blob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    setResultUrl(zipUrl);
    setOutputBlob(zipBlob);
  };

  // Drag reordering hooks and refs
  const mergePdfsContainerRef = useRef<HTMLDivElement>(null);
  const jpegPdfsContainerRef = useRef<HTMLDivElement>(null);
  const batchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mergePdfsContainerRef.current || reorderablePdfs.length === 0) return;
    const dl = new DragList(mergePdfsContainerRef.current, {
      itemSelector: '.draggable-row',
      handleSelector: '.drag-handle',
      onReorder: (newIndices: number[]) => {
        const reordered = newIndices.map(idx => reorderablePdfs[idx]);
        setReorderablePdfs(reordered);
        showReorderToast();
      }
    });
    return () => {
      dl.destroy();
    };
  }, [reorderablePdfs]);

  useEffect(() => {
    if (!jpegPdfsContainerRef.current || reorderableImages.length === 0) return;
    const dl = new DragList(jpegPdfsContainerRef.current, {
      itemSelector: '.draggable-card',
      handleSelector: '.drag-handle',
      isGrid: true,
      onReorder: (newIndices: number[]) => {
        const reordered = newIndices.map(idx => reorderableImages[idx]);
        setReorderableImages(reordered);
        showReorderToast();
      }
    });
    return () => {
      dl.destroy();
    };
  }, [reorderableImages]);

  useEffect(() => {
    if (!batchContainerRef.current || batchFiles.length === 0) return;
    const dl = new DragList(batchContainerRef.current, {
      itemSelector: '.draggable-row',
      handleSelector: '.drag-handle',
      onReorder: (newIndices: number[]) => {
        const reordered = newIndices.map(idx => batchFiles[idx]);
        setBatchFiles(reordered);
        showReorderToast("Processing order updated — files will be processed top to bottom.");
      }
    });
    return () => {
      dl.destroy();
    };
  }, [batchFiles]);

  // Cleanup effect for preview urls
  useEffect(() => {
    return () => {
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
      reorderableImages.forEach(img => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
    };
  }, [originalPreviewUrl, reorderableImages]);

  // Reset helper
  const handleReset = () => {
    setSelectedFiles([]);
    setProcessing({
      isProcessing: false,
      progress: 0,
      statusText: '',
      error: null
    });
    setCompressionResult(null);
    setResultUrl(null);
    setResultFileName('');
    setResultStatsText(null);
    // Tool reset
    setOriginalPreviewUrl(null);
    setReorderableImages([]);
    setReorderablePdfs([]);
    setLoadedPdfPageCount(0);
    setBgSlider(0);
    setCtSlider(0);
    setStSlider(0);
    setShSlider(0);
    setImgOriginalDimensions(null);
    setShowPreview(false);
    setOutputBlob(null);
    setOutputFilename('');
    setExcelPreviewData(null);
    setWordPreviewText('');
    setPdfToImageResultsList([]);
    setSpeedIndicatorConfig(null);
    setBatchFiles([]);
    setBatchResults([]);
    setIsBatchProcessing(false);
    setBatchStartTime(null);
    setBatchCurrentIndex(0);
    setBatchWarnings([]);
    setBatchZipProgress(null);
    setBatchZipBlob(null);
    setIsZipping(false);
    setMergeGroups([
      { id: 'group-1', name: 'Merge Group 1', files: [] }
    ]);
  };

  // Run cleanup when tool switches
  useEffect(() => {
    handleReset();
  }, [activeTool]);

  // Start/Stop stopwatch on progress lifecycle
  useEffect(() => {
    if (processing.isProcessing) {
      const elId = 'live-processing-timer';
      const timer = setTimeout(() => {
        startLiveTimer(elId);
      }, 50);
      return () => {
        clearTimeout(timer);
        stopLiveTimer(elId);
      };
    }
  }, [processing.isProcessing]);

  // Handle Initial File Selection
  const handleFileChange = async (files: File[]) => {
    setSelectedFiles(files);
    
    // Auto populate options depending on tool
    if (activeTool === 'jpeg-compress') {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);
    } else if (activeTool === 'image-resize') {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);
      // Read original size
      const img = new Image();
      img.onload = () => {
        setImgOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        setResizeWidth(img.naturalWidth);
        setResizeHeight(img.naturalHeight);
      };
      img.src = url;
    } else if (activeTool === 'image-enhance') {
      const url = URL.createObjectURL(files[0]);
      setOriginalPreviewUrl(url);
    } else if (activeTool === 'jpeg-to-pdf') {
      const loadedList: ReorderableFile[] = files.map((f, idx) => ({
        id: `${f.name}-${idx}-${Date.now()}`,
        file: f,
        name: f.name,
        size: f.size,
        previewUrl: URL.createObjectURL(f)
      }));
      setReorderableImages(loadedList);
    } else if (activeTool === 'merge-pdf') {
      const loadedList: ReorderableFile[] = files.map((f, idx) => ({
        id: `${f.name}-${idx}-${Date.now()}`,
        file: f,
        name: f.name,
        size: f.size
      }));
      setReorderablePdfs(loadedList);
    } else if (activeTool === 'split-pdf') {
      try {
        const pages = await getPdfPageCount(files[0]);
        setLoadedPdfPageCount(pages);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    if (speedIndicatorConfig && speedIndicatorConfig !== lastLoggedConfigRef.current) {
      lastLoggedConfigRef.current = speedIndicatorConfig;
      
      if (speedIndicatorConfig.toolId === 'clipboard-load') return;
      if (isBatchMode) return; // Batch completes separately
      
      const toolId = speedIndicatorConfig.toolId;
      const toolLabel = TOOLS_LIST.find(t => t.id === toolId)?.name || toolId;
      const toolIcon = TOOLS_LIST.find(t => t.id === toolId)?.icon || 'FileText';
      
      let inputFilename = '';
      let inputFile: File | null = null;
      
      if (toolId === 'jpeg-to-pdf') {
        inputFilename = reorderableImages.length > 0 ? reorderableImages[0].file.name : 'Unknown';
        inputFile = reorderableImages.length > 0 ? reorderableImages[0].file : null;
      } else if (toolId === 'merge-pdf') {
        inputFilename = reorderablePdfs.length > 0 ? reorderablePdfs[0].file.name : 'Unknown';
        inputFile = reorderablePdfs.length > 0 ? reorderablePdfs[0].file : null;
      } else {
        inputFilename = selectedFiles.length > 0 ? selectedFiles[0].name : 'Unknown';
        inputFile = selectedFiles.length > 0 ? selectedFiles[0] : null;
      }
      
      const outFilename = outputFilename || speedIndicatorConfig.downloadName || 'output_result';
      const outBlob = outputBlob;
      
      let settings: any = {};
      let settingsLabel = '';
      
      switch (toolId) {
        case 'pdf-compress':
          settings = { quality: pdfQuality };
          settingsLabel = pdfQuality.charAt(0).toUpperCase() + pdfQuality.slice(1);
          break;
        case 'jpeg-compress':
          settings = { quality: jpegQuality };
          settingsLabel = `Quality: ${jpegQuality}%`;
          break;
        case 'image-resize':
          settings = { mode: resizerMode, percent: resizePercent, w: resizeWidth, h: resizeHeight };
          settingsLabel = resizerMode === 'pixels' ? `${resizeWidth}×${resizeHeight}px` : `${resizePercent}%`;
          break;
        case 'image-enhance':
          settings = { brightness: bgSlider, contrast: ctSlider, saturation: stSlider, sharpness: shSlider };
          settingsLabel = `B:${bgSlider}% C:${ctSlider}% S:${stSlider}%`;
          break;
        case 'jpeg-to-pdf':
          settings = { pageSize: jpegToPdfPageSize, count: reorderableImages.length, originalFiles: reorderableImages.map(img => img.file) };
          settingsLabel = `${reorderableImages.length} images to ${jpegToPdfPageSize}`;
          break;
        case 'word-to-pdf':
          settings = {};
          settingsLabel = "Word to PDF";
          break;
        case 'excel-to-pdf':
          settings = {};
          settingsLabel = "Excel to PDF";
          break;
        case 'pdf-to-image':
          settings = { format: pdfToImageFormat };
          settingsLabel = `${pdfToImageFormat.toUpperCase()} extraction`;
          break;
        case 'pdf-to-word':
          settings = {};
          settingsLabel = "PDF to Word text";
          break;
        case 'merge-pdf':
          settings = { count: reorderablePdfs.length, originalFiles: reorderablePdfs.map(img => img.file) };
          settingsLabel = `${reorderablePdfs.length} PDFs merged`;
          break;
        case 'split-pdf':
          settings = { profile: splitProfile };
          settingsLabel = `Split profile: ${splitProfile}`;
          break;
        default:
          settings = {};
          settingsLabel = "Completed";
      }
      
      addHistoryEntry({
        tool: toolId,
        toolLabel,
        toolIcon,
        inputFilename,
        inputSize: speedIndicatorConfig.inputSize,
        inputFile: inputFile || undefined,
        outputFilename: outFilename,
        outputSize: speedIndicatorConfig.outputSize,
        outputBlob: outBlob || undefined,
        settings,
        settingsLabel,
        elapsed: speedIndicatorConfig.elapsed,
        status: 'success',
        errorMessage: null,
        isBatch: false,
        batchCount: 1
      });
    }
  }, [speedIndicatorConfig, outputBlob, outputFilename, selectedFiles, reorderableImages, reorderablePdfs, pdfQuality, jpegQuality, resizerMode, resizePercent, resizeWidth, resizeHeight, bgSlider, ctSlider, stSlider, shSlider, jpegToPdfPageSize, pdfToImageFormat, splitProfile, isBatchMode]);

  useEffect(() => {
    const handleReprocessEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const entry = customEvent.detail;
      if (!entry) return;

      if (entry.tool !== activeTool) {
        return;
      }

      if (entry.tool === 'jpeg-to-pdf') {
        const files: File[] = entry.settings?.originalFiles || (entry.inputFile ? [entry.inputFile] : []);
        if (files.length > 0) {
          const loadedList: ReorderableFile[] = files.map((f, idx) => ({
            id: `${f.name}-${idx}-${Date.now()}`,
            file: f,
            name: f.name,
            size: f.size,
            previewUrl: URL.createObjectURL(f)
          }));
          setReorderableImages(loadedList);
          setSelectedFiles(files);
        }
      } else if (entry.tool === 'merge-pdf') {
        const files: File[] = entry.settings?.originalFiles || (entry.inputFile ? [entry.inputFile] : []);
        if (files.length > 0) {
          const loadedList: ReorderableFile[] = files.map((f, idx) => ({
            id: `${f.name}-${idx}-${Date.now()}`,
            file: f,
            name: f.name,
            size: f.size
          }));
          setReorderablePdfs(loadedList);
          setSelectedFiles(files);
        }
      } else {
        if (entry.inputFile) {
          await handleFileChange([entry.inputFile]);
        }
      }

      switch (entry.tool) {
        case 'pdf-compress':
          if (entry.settings?.quality) setPdfQuality(entry.settings.quality);
          break;
        case 'jpeg-compress':
          if (entry.settings?.quality) setJpegQuality(entry.settings.quality);
          break;
        case 'image-resize':
          if (entry.settings?.mode) setResizerMode(entry.settings.mode);
          if (entry.settings?.percent) setResizePercent(entry.settings.percent);
          if (entry.settings?.w) setResizeWidth(entry.settings.w);
          if (entry.settings?.h) setResizeHeight(entry.settings.h);
          break;
        case 'image-enhance':
          if (entry.settings?.brightness !== undefined) setBgSlider(entry.settings.brightness);
          if (entry.settings?.contrast !== undefined) setCtSlider(entry.settings.contrast);
          if (entry.settings?.saturation !== undefined) setStSlider(entry.settings.saturation);
          if (entry.settings?.sharpness !== undefined) setShSlider(entry.settings.sharpness);
          break;
        case 'jpeg-to-pdf':
          if (entry.settings?.pageSize) setJpegToPdfPageSize(entry.settings.pageSize);
          break;
        case 'pdf-to-image':
          if (entry.settings?.format) setPdfToImageFormat(entry.settings.format);
          break;
        case 'split-pdf':
          if (entry.settings?.profile) setSplitProfile(entry.settings.profile);
          break;
      }

      const outputSizeStr = formatFileSize(entry.outputSize);
      const sizeSavedVal = entry.inputSize - entry.outputSize;
      const sizeSavedStr = sizeSavedVal > 0 
        ? `Saved ${formatFileSize(sizeSavedVal)} (${Math.round((sizeSavedVal / entry.inputSize) * 100)}%)`
        : `Changed to ${outputSizeStr}`;

      setReprocessBanner({
        filename: entry.inputFilename,
        toolLabel: entry.toolLabel,
        settingsLabel: entry.settingsLabel,
        sizeSaved: sizeSavedStr
      });
    };

    window.addEventListener('ff-reprocess-entry', handleReprocessEvent);
    return () => {
      window.removeEventListener('ff-reprocess-entry', handleReprocessEvent);
    };
  }, [activeTool, handleFileChange]);

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const lowerAccepted = fileConfig.types.map(t => t.toLowerCase());
      const valid = files.filter(f => {
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
        return isAccepted;
      });

      if (valid.length > 0) {
        if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
        setOriginalPreviewUrl(null);
        setLoadedPdfPageCount(0);
        setImgOriginalDimensions(null);
        setShowPreview(false);
        setOutputBlob(null);
        setOutputFilename('');
        setExcelPreviewData(null);
        setWordPreviewText('');
        setPdfToImageResultsList([]);
        handleFileChange([valid[0]]);
      }
    }
    e.target.value = '';
  };

  const handleAddMoreImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const valid = files.filter(f => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        return ['.jpg', '.jpeg', '.png'].includes(ext);
      });
      if (valid.length > 0) {
        setReorderableImages((prev) => [
          ...prev,
          ...valid.map((f, idx) => ({
            id: `${f.name}-${idx}-${Date.now()}-${Math.random()}`,
            file: f,
            name: f.name,
            size: f.size,
            previewUrl: URL.createObjectURL(f)
          }))
        ]);
      }
    }
    e.target.value = '';
  };

  const handleAddMorePdfs = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const valid = files.filter(f => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        return ext === '.pdf';
      });
      if (valid.length > 0) {
        setReorderablePdfs((prev) => [
          ...prev,
          ...valid.map((f, idx) => ({
            id: `${f.name}-${idx}-${Date.now()}-${Math.random()}`,
            file: f,
            name: f.name,
            size: f.size
          }))
        ]);
      }
    }
    e.target.value = '';
  };

  // Reordering helpers (Dnd / manual index shifts)
  const moveItem = (index: number, direction: 'up' | 'down', type: 'jpg' | 'pdf') => {
    const list = type === 'jpg' ? [...reorderableImages] : [...reorderablePdfs];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIdx < 0 || targetIdx >= list.length) return;
    
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    if (type === 'jpg') {
      setReorderableImages(list);
    } else {
      setReorderablePdfs(list);
    }
  };

  const removeItem = (index: number, type: 'jpg' | 'pdf') => {
    if (type === 'jpg') {
      const list = [...reorderableImages];
      if (list[index].previewUrl) URL.revokeObjectURL(list[index].previewUrl!);
      list.splice(index, 1);
      setReorderableImages(list);
      if (list.length === 0) setSelectedFiles([]);
    } else {
      const list = [...reorderablePdfs];
      list.splice(index, 1);
      setReorderablePdfs(list);
      if (list.length === 0) setSelectedFiles([]);
    }
  };

  const validateInputs = (): string | null => {
    // 1. Files existence & file extension checks
    if (activeTool === 'jpeg-to-pdf') {
      if (reorderableImages.length === 0) return 'Please upload at least one image file.';
      for (const item of reorderableImages) {
        const ext = '.' + item.name.split('.').pop()?.toLowerCase();
        if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
          return `File "${item.name}" has an unsupported format. Please upload JPEG or PNG images only.`;
        }
      }
    } else if (activeTool === 'merge-pdf') {
      if (reorderablePdfs.length === 0) return 'Please upload at least two PDF files to merge.';
      if (reorderablePdfs.length < 2) return 'Please upload at least two PDF files to perform a merge.';
      for (const item of reorderablePdfs) {
        const ext = '.' + item.name.split('.').pop()?.toLowerCase();
        if (ext !== '.pdf') {
          return `File "${item.name}" is not a PDF file. Please upload PDF files only.`;
        }
      }
    } else {
      if (selectedFiles.length === 0) return 'Please upload a file to begin processing.';
      const f = selectedFiles[0];
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      
      if (activeTool === 'pdf-compress' || activeTool === 'pdf-to-image' || activeTool === 'pdf-to-word' || activeTool === 'split-pdf') {
        if (ext !== '.pdf') return 'The selected file is not a PDF. Please select a valid PDF file (.pdf).';
      } else if (activeTool === 'jpeg-compress') {
        if (!['.jpg', '.jpeg'].includes(ext)) return 'The selected file is not a JPEG image. Please select a valid JPEG/JPG file.';
      } else if (activeTool === 'image-resize' || activeTool === 'image-enhance') {
        if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return 'Unsupported image type. Please select a JPG, PNG, or WEBP file.';
      } else if (activeTool === 'word-to-pdf') {
        if (ext !== '.docx') return 'The selected file is not a Word Document. Please select a valid Word Document (.docx).';
      } else if (activeTool === 'excel-to-pdf') {
        if (ext !== '.xlsx') return 'The selected file is not an Excel Spreadsheet. Please select a valid Excel file (.xlsx).';
      }
    }

    // 2. Numerical and options checks
    if (activeTool === 'jpeg-compress') {
      if (jpegQuality < 1 || jpegQuality > 100 || isNaN(jpegQuality)) {
        return 'Compression quality must be a number between 1% and 100%.';
      }
    }

    if (activeTool === 'image-resize') {
      if (resizerMode === 'percent') {
        if (resizePercent < 10 || resizePercent > 100 || isNaN(resizePercent)) {
          return 'Resize percentage must be a number between 10% and 100%.';
        }
      } else {
        if (resizeWidth < 1 || resizeWidth > 10000 || isNaN(resizeWidth)) {
          return 'Please input a valid target Width between 1px and 10,000px.';
        }
        if (resizeHeight < 1 || resizeHeight > 10000 || isNaN(resizeHeight)) {
          return 'Please input a valid target Height between 1px and 10,000px.';
        }
      }
    }

    if (activeTool === 'image-enhance') {
      if (bgSlider < -100 || bgSlider > 100 || isNaN(bgSlider)) return 'Brightness must be between -100% and 100%.';
      if (ctSlider < -100 || ctSlider > 100 || isNaN(ctSlider)) return 'Contrast must be between -100% and 100%.';
      if (stSlider < -100 || stSlider > 100 || isNaN(stSlider)) return 'Saturation must be between -100% and 100%.';
      if (shSlider < 0 || shSlider > 100 || isNaN(shSlider)) return 'Sharpness must be between 0% and 100%.';
    }

    if (activeTool === 'pdf-to-image') {
      if (pdfToImagePages === 'custom') {
        if (!pdfToImageRange.trim()) {
          return 'Please input a custom page range (e.g. "1-2, 4").';
        }
        const rangeRegex = /^(\s*\d+\s*-\s*\d+\s*|\s*\d+\s*)(,\s*(\d+\s*-\s*\d+\s*|\d+\s*))*$/;
        if (!rangeRegex.test(pdfToImageRange)) {
          return 'Invalid range format. Use numbers and hyphens separated by commas (e.g., "1-3, 5").';
        }
        
        const parts = pdfToImageRange.split(',');
        for (const part of parts) {
          if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = parseInt(startStr.trim());
            const end = parseInt(endStr.trim());
            if (isNaN(start) || isNaN(end) || start < 1 || end < 1) return 'Page indices must be greater than or equal to 1.';
            if (start > end) return `Invalid sub-range "${part}". Start page cannot exceed end page.`;
            if (loadedPdfPageCount > 0 && (start > loadedPdfPageCount || end > loadedPdfPageCount)) {
              return `Custom range exceeds maximum pages (${loadedPdfPageCount}).`;
            }
          } else {
            const pg = parseInt(part.trim());
            if (isNaN(pg) || pg < 1) return 'Page index must be greater than or equal to 1.';
            if (loadedPdfPageCount > 0 && pg > loadedPdfPageCount) {
              return `Page index ${pg} exceeds maximum page count (${loadedPdfPageCount}).`;
            }
          }
        }
      }
    }

    if (activeTool === 'split-pdf') {
      if (splitProfile === 'everyN') {
        if (splitEveryN < 1 || isNaN(splitEveryN)) {
          return 'The split page interval must be at least 1 page.';
        }
        if (loadedPdfPageCount > 0 && splitEveryN > loadedPdfPageCount) {
          return `Interval (${splitEveryN}) cannot exceed total pages in PDF (${loadedPdfPageCount}).`;
        }
      } else if (splitProfile === 'ranges') {
        if (!splitRanges.trim()) {
          return 'Please input custom range boundaries (e.g. "1-2, 3-4").';
        }
        const rangeRegex = /^(\s*\d+\s*-\s*\d+\s*|\s*\d+\s*)(,\s*(\d+\s*-\s*\d+\s*|\d+\s*))*$/;
        if (!rangeRegex.test(splitRanges)) {
          return 'Invalid split range format. Use e.g. "1-2, 3-4, 5"';
        }
        
        const parts = splitRanges.split(',');
        for (const part of parts) {
          if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = parseInt(startStr.trim());
            const end = parseInt(endStr.trim());
            if (isNaN(start) || isNaN(end) || start < 1 || end < 1) return 'Page indices must be greater than or equal to 1.';
            if (start > end) return `Invalid range "${part}". Start page cannot exceed end page.`;
            if (loadedPdfPageCount > 0 && (start > loadedPdfPageCount || end > loadedPdfPageCount)) {
              return `Sub-range "${part}" exceeds maximum pages in PDF (${loadedPdfPageCount}).`;
            }
          } else {
            const pg = parseInt(part.trim());
            if (isNaN(pg) || pg < 1) return 'Page index must be greater than or equal to 1.';
            if (loadedPdfPageCount > 0 && pg > loadedPdfPageCount) {
              return `Page index ${pg} exceeds maximum page count (${loadedPdfPageCount}).`;
            }
          }
        }
      } else if (splitProfile === 'single') {
        if (splitSingleSelection.length === 0) {
          return 'Please select at least one page to extract.';
        }
      }
    }

    return null;
  };

  // PROCESS EXECUTION DISPATCHER
  const handleProcess = async () => {
    if (selectedFiles.length === 0 && reorderableImages.length === 0 && reorderablePdfs.length === 0) return;

    const validationMsg = validateInputs();
    if (validationMsg) {
      setProcessing({
        isProcessing: false,
        progress: 0,
        statusText: '',
        error: validationMsg
      });
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 5,
      statusText: 'Analyzing layout...',
      error: null
    });

    const tStart = startTimer();

    try {
      switch (activeTool) {
        case 'pdf-compress': {
          if (!isRestoringHistory.current) {
            const qual = pdfQuality === 'low' ? 30 : pdfQuality === 'medium' ? 60 : 90;
            const dpVal = pdfQuality === 'low' ? 72 : pdfQuality === 'medium' ? 150 : 300;
            const formattedPresetName = pdfQuality.charAt(0).toUpperCase() + pdfQuality.slice(1);
            historyManagers.current['pdf-compress'].push({
              preset: pdfQuality,
              imageQuality: qual,
              dpi: dpVal,
              label: `${formattedPresetName} compression`
            });
          }

          const res = await compressPdfWorker(
            selectedFiles[0],
            pdfQuality,
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Synthesizing PDF compression layers...' }))
          );
          setCompressionResult(res);
          setResultUrl(res.downloadUrl);
          setResultFileName(res.downloadName);
          const b = await fetch(res.downloadUrl).then(r => r.blob());
          setOutputBlob(b);
          setOutputFilename(res.downloadName);
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'pdf-compress',
            inputSize: selectedFiles[0].size,
            outputSize: b.size,
            elapsed: finalElapsed,
            action: "Compressed",
            extraInfo: `${loadedPdfPageCount || 1} pages`,
            pageCount: loadedPdfPageCount || 1
          });
          
          setShowPreview(true);
          break;
        }

        case 'jpeg-compress': {
          if (!isRestoringHistory.current) {
            historyManagers.current['jpeg-compress'].push({
              mode: 'quality',
              quality: jpegQuality,
              targetSize: 0,
              targetUnit: 'KB',
              label: `Quality ${jpegQuality}%`
            });
          }

          const res = await compressJpegWorker(
            selectedFiles[0],
            jpegQuality,
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Re-scaling chromatic channels...' }))
          );
          setCompressionResult(res);
          setResultUrl(res.downloadUrl);
          setResultFileName(res.downloadName);
          const b = await fetch(res.downloadUrl).then(r => r.blob());
          setOutputBlob(b);
          setOutputFilename(res.downloadName);
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'jpeg-compress',
            inputSize: selectedFiles[0].size,
            outputSize: b.size,
            elapsed: finalElapsed,
            action: "Compressed",
            extraInfo: `Quality: ${jpegQuality}%`,
            qualityValue: jpegQuality
          });
          
          setShowPreview(true);
          break;
        }

        case 'image-resize': {
          if (!isRestoringHistory.current) {
            const label = resizerMode === 'pixels' ? `Resized to ${resizeWidth}×${resizeHeight}px` : `Resized to ${resizePercent}%`;
            historyManagers.current['image-resize'].push({
              width: resizeWidth,
              height: resizeHeight,
              unit: resizerMode,
              maintainAspectRatio: lockAspectRatio,
              percent: resizePercent,
              label
            });
          }

          const params: ResizeParams = {
            mode: resizerMode,
            aspectRatioLocked: lockAspectRatio,
            ...(resizerMode === 'pixels' 
              ? { width: resizeWidth, height: resizeHeight }
              : { percentage: resizePercent })
          };
          const res = await resizeImageWorker(
            selectedFiles[0],
            params,
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Fitting pixel geometry...' }))
          );
          setResultUrl(res.downloadUrl);
          const outName = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + `_resized_${res.width}x${res.height}` + selectedFiles[0].name.substring(selectedFiles[0].name.lastIndexOf('.'));
          setResultFileName(outName);
          setResultStatsText({
            label: 'New Dimensions',
            value: `${res.width} × ${res.height} px (${formatSize(res.size)})`
          });
          const b = await fetch(res.downloadUrl).then(r => r.blob());
          setOutputBlob(b);
          setOutputFilename(outName);
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'image-resize',
            inputSize: selectedFiles[0].size,
            outputSize: b.size,
            elapsed: finalElapsed,
            action: "Resized",
            extraInfo: `${imgOriginalDimensions?.w || 0}×${imgOriginalDimensions?.h || 0} → ${res.width}×${res.height}px`,
            originalW: imgOriginalDimensions?.w || 0,
            originalH: imgOriginalDimensions?.h || 0,
            newW: res.width,
            newH: res.height
          });
          
          setShowPreview(true);
          break;
        }

        case 'image-enhance': {
          const params: EnhancementParams = {
            brightness: bgSlider,
            contrast: ctSlider,
            saturation: stSlider,
            sharpness: shSlider
          };
          const resUrl = await enhanceImageWorker(
            selectedFiles[0],
            params,
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Rendering matrix filters...' }))
          );
          setResultUrl(resUrl);
          const outName = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '_enhanced' + selectedFiles[0].name.substring(selectedFiles[0].name.lastIndexOf('.'));
          setResultFileName(outName);
          setResultStatsText({
            label: 'Enhancements',
            value: `B:${bgSlider}% C:${ctSlider}% S:${stSlider}%`
          });
          const b = await fetch(resUrl).then(r => r.blob());
          setOutputBlob(b);
          setOutputFilename(outName);
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'image-enhance',
            inputSize: selectedFiles[0].size,
            outputSize: b.size,
            elapsed: finalElapsed,
            action: "Enhanced",
            extraInfo: "Brightness, Contrast, Saturation applied"
          });
          
          setShowPreview(true);
          break;
        }

        case 'jpeg-to-pdf': {
          const resUrl = await jpegToPdfWorker(
            reorderableImages,
            jpegToPdfPageSize,
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: `Compiling image page grid...` }))
          );
          setResultUrl(resUrl);
          const outName = 'FileForge_JPEG_Collection.pdf';
          setResultFileName(outName);
          setResultStatsText({
            label: 'Total Pages',
            value: `${reorderableImages.length} converted to PDF`
          });
          const b = await fetch(resUrl).then(r => r.blob());
          setOutputBlob(b);
          setOutputFilename(outName);
          
          const totalInputSize = reorderableImages.reduce((sum, img) => sum + img.file.size, 0);
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'jpeg-to-pdf',
            inputSize: totalInputSize,
            outputSize: b.size,
            elapsed: finalElapsed,
            action: "Converted",
            extraInfo: `${reorderableImages.length} page PDF created`,
            filesCount: reorderableImages.length,
            pageCount: reorderableImages.length
          });
          
          setShowPreview(true);
          break;
        }

        case 'word-to-pdf': {
          const resUrl = await wordToPdfWorker(
            selectedFiles[0],
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Parsing DOCX structure...' }))
          );
          setResultUrl(resUrl);
          const outName = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '.pdf';
          setResultFileName(outName);
          setResultStatsText({
            label: 'Created PDF',
            value: 'Standard A4 bounds'
          });
          const b = await fetch(resUrl).then(r => r.blob());
          setOutputBlob(b);
          setOutputFilename(outName);
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'word-to-pdf',
            inputSize: selectedFiles[0].size,
            outputSize: b.size,
            elapsed: finalElapsed,
            action: "Converted",
            extraInfo: `Output: ${formatFileSize(b.size)}`
          });
          
          setShowPreview(true);
          break;
        }

        case 'excel-to-pdf': {
          const resObj = await excelToPdfWorker(
            selectedFiles[0],
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Mapping sheets matrix...' }))
          );
          setResultUrl(resObj.url);
          setExcelPreviewData(resObj.excelData);
          const outName = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '.pdf';
          setResultFileName(outName);
          setResultStatsText({
            label: 'Table Rendered',
            value: 'Horizontal landscape mode'
          });
          const b = await fetch(resObj.url).then(r => r.blob());
          setOutputBlob(b);
          setOutputFilename(outName);
          
          let rowCount = 0;
          if (resObj.excelData && resObj.excelData.length > 0) {
            rowCount = resObj.excelData.reduce((sum, sheet) => sum + (sheet ? sheet.length : 0), 0);
          }
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'excel-to-pdf',
            inputSize: selectedFiles[0].size,
            outputSize: b.size,
            elapsed: finalElapsed,
            action: "Converted",
            extraInfo: `${rowCount} rows processed`,
            rowCount: rowCount
          });
          
          setShowPreview(true);
          break;
        }

        case 'pdf-to-image': {
          const res = await pdfToImageWorker(
            selectedFiles[0],
            pdfToImageFormat,
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Extracting canvas rasters...' }))
          );
          const zipUrl = URL.createObjectURL(res.zipBlob);
          setResultUrl(zipUrl);
          setPdfToImageResultsList(res.imagesList);
          const outName = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '_pages_images.zip';
          setResultFileName(outName);
          setResultStatsText({
            label: 'ZIP Archive',
            value: `${res.imagesList.length} pages in JPEG/PNG format`
          });
          setOutputBlob(res.zipBlob);
          setOutputFilename(outName);
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'pdf-to-image',
            inputSize: selectedFiles[0].size,
            outputSize: res.zipBlob.size,
            elapsed: finalElapsed,
            action: "Converted",
            extraInfo: `Format: ${pdfToImageFormat.toUpperCase()}`,
            pageCount: loadedPdfPageCount || res.imagesList.length || 1,
            filesCount: res.imagesList.length,
            imageFormat: pdfToImageFormat
          });
          
          setShowPreview(true);
          break;
        }

        case 'pdf-to-word': {
          const resObj = await pdfToWordWorker(
            selectedFiles[0],
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Re-assembling text segments...' }))
          );
          const docUrl = URL.createObjectURL(resObj.docxBlob);
          setResultUrl(docUrl);
          setWordPreviewText(resObj.previewText);
          const outName = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '.docx';
          setResultFileName(outName);
          setResultStatsText({
            label: 'Exported DOCX',
            value: 'Compatible with MS Word'
          });
          setOutputBlob(resObj.docxBlob);
          setOutputFilename(outName);
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'pdf-to-word',
            inputSize: selectedFiles[0].size,
            outputSize: resObj.docxBlob.size,
            elapsed: finalElapsed,
            action: "Extracted",
            extraInfo: `Output: ${formatFileSize(resObj.docxBlob.size)} Word file`
          });
          
          setShowPreview(true);
          break;
        }

        case 'merge-pdf': {
          const resUrl = await mergePdfWorker(
            reorderablePdfs,
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Copying structural catalogs...' }))
          );
          setResultUrl(resUrl);
          const outName = 'FileForge_Merged_Document.pdf';
          setResultFileName(outName);
          setResultStatsText({
            label: 'Joined Units',
            value: `${reorderablePdfs.length} PDFs merged`
          });
          const b = await fetch(resUrl).then(r => r.blob());
          setOutputBlob(b);
          setOutputFilename(outName);
          
          const totalInputSize = reorderablePdfs.reduce((sum, f) => sum + f.file.size, 0);
          
          let mergedPageCount = reorderablePdfs.length;
          try {
            const fileFromBlob = new File([b], "merged.pdf");
            mergedPageCount = await getPdfPageCount(fileFromBlob);
          } catch (e) {
            console.error("Failed to count merged pages", e);
          }
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'merge-pdf',
            inputSize: totalInputSize,
            outputSize: b.size,
            elapsed: finalElapsed,
            action: "Merged",
            extraInfo: `Output: ${formatFileSize(b.size)} · ${mergedPageCount} pages`,
            filesCount: reorderablePdfs.length,
            pageCount: mergedPageCount
          });
          
          setShowPreview(true);
          break;
        }

        case 'split-pdf': {
          let opt: SplitOption;
          if (splitProfile === 'everyN') {
            opt = { type: 'everyN', value: splitEveryN };
          } else if (splitProfile === 'ranges') {
            opt = { type: 'ranges', value: splitRanges };
          } else {
            opt = { type: 'single', pagesList: splitSingleSelection.length > 0 ? splitSingleSelection : [1] };
          }
          
          const zipBlob = await splitPdfWorker(
            selectedFiles[0],
            opt,
            loadedPdfPageCount,
            (prog) => setProcessing(p => ({ ...p, progress: prog, statusText: 'Extracting stream sections...' }))
          );
          
          // Unpack zipBlob to support reordering of split parts
          const zip = await JSZip.loadAsync(zipBlob);
          const parts: { name: string; range: string; estSize: number; blob: Blob }[] = [];
          
          const baseName = selectedFiles[0].name.replace(/\.[^/.]+$/, '');
          const originalSize = selectedFiles[0].size;
          const loadedPages = loadedPdfPageCount;
          
          // Generate estimated items list
          const itemsList: { name: string; range: string; estSize: number }[] = [];
          if (splitProfile === 'everyN') {
            const totalFiles = Math.ceil(loadedPages / Math.max(1, splitEveryN));
            for (let i = 0; i < totalFiles; i++) {
              const start = i * splitEveryN + 1;
              const end = Math.min(loadedPages, (i + 1) * splitEveryN);
              const estRatio = (end - start + 1) / Math.max(1, loadedPages);
              itemsList.push({
                name: `${baseName}_part_${i + 1}.pdf`,
                range: `Pages ${start} - ${end}`,
                estSize: Math.round(originalSize * estRatio)
              });
            }
          } else if (splitProfile === 'ranges') {
            const segments = splitRanges.split(',').map(s => s.trim()).filter(Boolean);
            segments.forEach((seg) => {
              const partsSeg = seg.split('-');
              const start = parseInt(partsSeg[0]);
              const end = partsSeg[1] ? parseInt(partsSeg[1]) : start;
              if (!isNaN(start) && start > 0) {
                const pagesCount = !isNaN(end) && end >= start ? (end - start + 1) : 1;
                const estRatio = pagesCount / Math.max(1, loadedPages);
                itemsList.push({
                  name: `${baseName}_range_${seg.replace(/\s+/g, '')}.pdf`,
                  range: `Pages ${start} - ${end}`,
                  estSize: Math.round(originalSize * estRatio)
                });
              }
            });
          } else {
            const list = splitSingleSelection.length > 0 ? [...splitSingleSelection].sort((a,b) => a-b) : [1];
            list.forEach((pg) => {
              const estRatio = 1 / Math.max(1, loadedPages);
              itemsList.push({
                name: `${baseName}_page_${pg}.pdf`,
                range: `Page ${pg}`,
                estSize: Math.round(originalSize * estRatio)
              });
            });
          }

          // Search files in zip sequentially and pair them
          const filesInZip = Object.keys(zip.files).filter(k => !zip.files[k].dir);
          for (let idx = 0; idx < filesInZip.length; idx++) {
            const filename = filesInZip[idx];
            const fileBlob = await zip.files[filename].async('blob');
            const matchedItem = itemsList[idx] || {
              name: filename,
              range: `Part ${idx + 1}`,
              estSize: fileBlob.size
            };
            parts.push({
              name: matchedItem.name,
              range: matchedItem.range,
              estSize: fileBlob.size,
              blob: fileBlob
            });
          }
          
          setSplitPdfResultsList(parts);
          
          const zipUrl = URL.createObjectURL(zipBlob);
          setResultUrl(zipUrl);
          const outName = selectedFiles[0].name.replace(/\.[^/.]+$/, '') + '_split_bundle.zip';
          setResultFileName(outName);
          setResultStatsText({
            label: 'Output ZIP',
            value: 'Pages grouped successfully'
          });
          setOutputBlob(zipBlob);
          setOutputFilename(outName);
          
          let numFiles = 1;
          if (splitProfile === 'everyN' && loadedPdfPageCount > 0) {
            numFiles = Math.ceil(loadedPdfPageCount / Math.max(1, splitEveryN));
          } else if (splitProfile === 'ranges') {
            numFiles = splitRanges.split(',').length;
          } else {
            numFiles = splitSingleSelection.length > 0 ? splitSingleSelection.length : 1;
          }
          
          const finalElapsed = getElapsed(tStart);
          setSpeedIndicatorConfig({
            toolId: 'split-pdf',
            inputSize: selectedFiles[0].size,
            outputSize: zipBlob.size,
            elapsed: finalElapsed,
            action: "Split",
            extraInfo: `Total output: ${formatFileSize(zipBlob.size)}`,
            filesCount: numFiles,
            totalOutputSize: zipBlob.size
          });
          
          setShowPreview(true);
          break;
        }

        default:
          throw new Error('Unsupported tool execution');
      }

      setProcessing(p => ({ ...p, isProcessing: false, progress: 100 }));
    } catch (err: any) {
      console.error(err);
      setProcessing({
        isProcessing: false,
        progress: 0,
        statusText: '',
        error: err.message || 'An unexpected mathematical matrix error occurred during compression.'
      });
    }
  };

  // RENDER SELECTION SCREEN
  const renderSelectedFileInfo = () => {
    if (selectedFiles.length === 0) return null;
    let singleFile = selectedFiles[0];

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full bg-[#1B202E] border border-[#00D4AA]/30 p-4 rounded-xl flex items-center justify-between mt-6 shadow-[0_0_15px_rgba(0,212,170,0.1)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-[#00D4AA]" />
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0.8, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="p-2.5 bg-[#00D4AA]/10 text-[#00D4AA] rounded-lg border border-[#00D4AA]/20 animate-pulse"
          >
            <CheckCircle className="w-6 h-6" />
          </motion.div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-light truncate max-w-sm font-sans">
                {singleFile.name}
              </p>
              <span className="text-[10px] text-[#00D4AA] bg-[#00D4AA]/10 px-2 py-0.5 rounded font-display select-none">
                File loaded successfully!
              </span>
            </div>
            <p className="text-xs text-text-sub font-mono">
              {formatSize(singleFile.size)} 
              {loadedPdfPageCount > 0 && `  |  ${loadedPdfPageCount} Pages`}
              {imgOriginalDimensions && `  |  ${imgOriginalDimensions.w} × ${imgOriginalDimensions.h} px`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={changeFileRef}
            onChange={handleChangeFile}
            accept={fileConfig.types?.join(',')}
            className="hidden"
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); changeFileRef.current?.click(); }}
            className="p-2 text-text-sub hover:text-primary-accent transition-colors rounded-lg bg-surface-dark border border-border-dark relative group/change-btn"
            title="Browse and select another file"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 hidden group-hover/change-btn:block bg-[#11141D] text-[#F0F2F8] text-[9px] px-2 py-1 rounded border border-[#252A36] whitespace-nowrap">
              Change File (Browse)
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleReset(); }}
            className="p-2 text-text-sub hover:text-red-400 transition-colors rounded-lg bg-surface-dark border border-border-dark relative group/btn"
            title="Remove selected file and reset toolkit"
          >
            <Trash2 className="w-4 h-4" />
            <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 hidden group-hover/btn:block bg-[#11141D] text-[#F0F2F8] text-[9px] px-2 py-1 rounded border border-[#252A36] whitespace-nowrap">
              Clear selection
            </span>
          </button>
        </div>
      </motion.div>
    );
  };

  // Dynamic preview controls or variables inside selection screens
  const renderOptionsForm = () => {
    if (selectedFiles.length === 0 && reorderableImages.length === 0 && reorderablePdfs.length === 0) return null;

    switch (activeTool) {
      case 'pdf-compress':
        return (
          <div className="mb-6 mt-6 text-left">
            <h4 className="text-sm uppercase tracking-wider text-text-sub font-display mb-3 flex items-center">
              Configure Target Compression Level:
              <InfoTooltip content="Low quality yields maximum compression bytes. High quality preserves fidelity for graphics or vectors." />
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as const).map((lvl) => (
                <Tooltip key={lvl} content={`Select ${lvl} quality compression profile`}>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setPdfQuality(lvl); }}
                    className={`py-3.5 px-4 rounded-xl border text-sm font-display font-semibold transition-all cursor-pointer w-full text-center ${
                      pdfQuality === lvl
                        ? 'border-primary-accent bg-primary-accent/10 text-[#6C63FF] shadow-[0_0_12px_rgba(108,99,255,0.15)]'
                        : 'border-border-dark bg-[#121620] text-text-sub hover:text-text-light hover:border-border-dark/80'
                    }`}
                  >
                    {lvl === 'low' ? 'Max (Low Quality)' : lvl === 'medium' ? 'Standard' : 'Mild (High Quality)'}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        );

      case 'jpeg-compress':
        return (
          <div className="mb-6 mt-6 text-left grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm uppercase tracking-wider text-text-sub font-display flex items-center">
                  JPEG Quality Value:
                  <InfoTooltip content="Configures sub-sampling output quantization. Standard web baseline is 75%." />
                </h4>
                <span className="font-mono text-secondary-accent text-sm font-bold bg-[#00D4AA]/10 px-2.5 py-1 rounded-full border border-[#00D4AA]/25">
                  {jpegQuality}%
                </span>
              </div>
              <Tooltip content="Slide back-and-forth which adjusts precision matrices directly on client engine.">
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={jpegQuality}
                  onChange={(e) => setJpegQuality(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#1B202E] rounded-lg appearance-none cursor-pointer"
                />
              </Tooltip>
              <p className="text-xs text-text-sub mt-2 font-display">
                Slider values under 50% compress heavily. Values 90%+ prioritize pristine preservation of colors.
              </p>
            </div>

            {originalPreviewUrl && (
              <div className="border border-border-dark rounded-xl p-3 bg-[#11141D] flex flex-col items-center justify-center">
                <span className="text-xs text-text-sub uppercase mb-2 font-display block">Quick Visual Reference</span>
                <div className="relative w-44 h-28 rounded-lg overflow-hidden border border-border-dark/60 bg-[#0A0D12] flex items-center justify-center">
                  <img src={originalPreviewUrl || null} className="max-w-full max-h-full object-contain" />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-[#00D4AA] font-mono">
                    Realtime Loaded
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'image-resize': {
        const isWidthInvalid = (resizeWidth < 1 || resizeWidth > 10000 || isNaN(resizeWidth));
        const isHeightInvalid = (resizeHeight < 1 || resizeHeight > 10000 || isNaN(resizeHeight));
        const isPercentInvalid = (resizePercent < 10 || resizePercent > 100 || isNaN(resizePercent));

        return (
          <div className="mb-6 mt-6 text-left space-y-6">
            <div className="flex border-b border-border-dark">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setResizerMode('percent'); }}
                className={`pb-3 px-4 font-display font-semibold text-sm border-b-2 transition-all cursor-pointer ${
                  resizerMode === 'percent'
                    ? 'border-primary-accent text-primary-accent'
                    : 'border-transparent text-text-sub hover:text-text-light'
                }`}
              >
                Resize by Percentage
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setResizerMode('pixels'); }}
                className={`pb-3 px-4 font-display font-semibold text-sm border-b-2 transition-all cursor-pointer ${
                  resizerMode === 'pixels'
                    ? 'border-primary-accent text-primary-accent'
                    : 'border-transparent text-text-sub hover:text-text-light'
                }`}
              >
                Resize by Specific Pixels
              </button>
            </div>

            {resizerMode === 'percent' ? (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm uppercase tracking-wider text-text-sub font-display flex items-center">
                    Scale Percentage: {resizePercent}%
                    <InfoTooltip content="Set target downscale ratio factor bounds." />
                  </label>
                  {isPercentInvalid && (
                    <span className="text-[10px] text-red-400 font-mono font-bold">Scaling must be between 10% and 100%.</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[25, 50, 75, 90].map((p) => (
                    <Tooltip key={p} content={`Set exact downscale level multiplier to ${p}%`}>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setResizePercent(p); }}
                        className={`py-2 px-3 border rounded-lg text-xs font-mono transition-all cursor-pointer w-full text-center ${
                          resizePercent === p
                            ? 'border-secondary-accent bg-secondary-accent/14 text-[#00D4AA]'
                            : 'border-border-dark text-text-sub hover:text-text-light bg-[#121620]'
                        }`}
                      >
                        {p}% Size
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <Tooltip content="Slide to increase/decrease scale dimension factor percentage.">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={resizePercent}
                    onChange={(e) => setResizePercent(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#1B202E] rounded-lg appearance-none cursor-pointer"
                  />
                </Tooltip>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1.5 flex items-center">
                    Width (Pixels)
                    <InfoTooltip content="Ideal horizontal boundary. Reasonable limits: 1px to 10,000px." />
                  </label>
                  <Tooltip content="Enter horizontal canvas dimension. Proportions auto-calculated if locked.">
                    <input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => {
                        const w = parseInt(e.target.value) || 0;
                        setResizeWidth(w);
                        if (lockAspectRatio && imgOriginalDimensions) {
                          const ratio = imgOriginalDimensions.h / imgOriginalDimensions.w;
                          setResizeHeight(Math.round(w * ratio));
                        }
                      }}
                      className={`w-full font-mono bg-[#11141E] border ${
                        isWidthInvalid ? 'border-red-500 focus:border-red-500' : 'border-border-dark'
                      } p-3 rounded-lg text-text-light focus:border-primary-accent text-sm`}
                    />
                  </Tooltip>
                  {isWidthInvalid && (
                    <p className="text-[10px] text-red-400 mt-1">Width must be between 1px and 10,000px.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1.5 flex items-center">
                    Height (Pixels)
                    <InfoTooltip content="Ideal vertical boundary. Reasonable limits: 1px to 10,000px." />
                  </label>
                  <Tooltip content="Enter vertical canvas dimension. Proportions auto-calculated if locked.">
                    <input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => {
                        const h = parseInt(e.target.value) || 0;
                        setResizeHeight(h);
                        if (lockAspectRatio && imgOriginalDimensions) {
                          const ratio = imgOriginalDimensions.w / imgOriginalDimensions.h;
                          setResizeWidth(Math.round(h * ratio));
                        }
                      }}
                      className={`w-full font-mono bg-[#11141E] border ${
                        isHeightInvalid ? 'border-red-500 focus:border-red-500' : 'border-border-dark'
                      } p-3 rounded-lg text-text-light focus:border-primary-accent text-sm`}
                    />
                  </Tooltip>
                  {isHeightInvalid && (
                    <p className="text-[10px] text-red-400 mt-1 flex items-center">Height must be between 1px and 10,000px.</p>
                  )}
                </div>

                <Tooltip content="Preserve original scaling aspect ratios to prevent squeezing distortion.">
                  <div className="sm:col-span-2 flex items-center gap-2.5 mt-2 bg-surface-dark p-3 rounded-lg border border-border-dark/50 cursor-pointer">
                    <input
                      type="checkbox"
                      id="lockRatio"
                      checked={lockAspectRatio}
                      onChange={(e) => setLockAspectRatio(e.target.checked)}
                      className="w-4 h-4 rounded border-border-dark text-[#6C63FF] accent-[#6C63FF]"
                    />
                    <label htmlFor="lockRatio" className="text-xs text-text-sub font-display select-none cursor-pointer">
                      Lock original Aspect Ratio & Scalability bounds
                    </label>
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
        );
      }

      case 'image-enhance': {
        const file = selectedFiles[0];
        const originalSize = file ? file.size : 0;
        const estData = estimateSizes(originalSize, downloadQuality, sharpness, clarity);

        // Core full-resolution native processing and downloader
        const handleExportHighRes = async () => {
          if (!file) return;
          setProcessing({
            isProcessing: true,
            progress: 10,
            statusText: "Decompressing raw camera pixels...",
            error: null
          });

          // Setup stopwatch timer
          const startTime = Date.now();
          let sec = 0;
          const labelTimer = setInterval(() => {
            sec += 0.1;
            const el = document.getElementById("live-processing-timer");
            if (el) el.innerText = `⏱ ${sec.toFixed(1)}s`;
          }, 100);

          try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("Unable to read native image source"));
              const reader = new FileReader();
              reader.onload = (e) => {
                img.src = e.target?.result as string;
              };
              reader.readAsDataURL(file);
            });

            const nativeW = img.naturalWidth;
            const nativeH = img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = nativeW;
            canvas.height = nativeH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not initialize 2D canvas workspace");

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, nativeW, nativeH);
            let pixels = imgData.data;

            // Process depending on preset selection with yields
            if (enhancerPreset === 'auto') {
              setProcessing(p => ({ ...p, progress: 30, statusText: "Analyzing tonal frequency distribution guides..." }));
              await new Promise<void>(r => setTimeout(r, 80));
              const res = autoEnhance(pixels, nativeW, nativeH);
              pixels = res.pixels;
            } else if (enhancerPreset === 'photo') {
              setProcessing(p => ({ ...p, progress: 25, statusText: "Pass 1 of 4: Removing noise... 25%" }));
              await new Promise<void>(r => setTimeout(r, 80));
              pixels = applyDenoise(pixels, nativeW, nativeH, 25);

              setProcessing(p => ({ ...p, progress: 50, statusText: "Pass 2 of 4: Fitting midtone clarity curves... 50%" }));
              await new Promise<void>(r => setTimeout(r, 80));
              pixels = clarityEnhancement(pixels, nativeW, nativeH, 60);

              setProcessing(p => ({ ...p, progress: 75, statusText: "Pass 3 of 4: Enhancing luma sharpening... 75%" }));
              await new Promise<void>(r => setTimeout(r, 80));
              pixels = luminanceSharpen(pixels, nativeW, nativeH, 120);

              setProcessing(p => ({ ...p, progress: 90, statusText: "Pass 4 of 4: Adding micro-contrast pop... 90%" }));
              await new Promise<void>(r => setTimeout(r, 80));
              pixels = localContrastEnhancement(pixels, nativeW, nativeH, 30);

              pixels = applyColorLight(pixels, bgSlider, ctSlider, stSlider, temperature);
            } else if (enhancerPreset === 'text') {
              setProcessing(p => ({ ...p, progress: 20, statusText: "Pass 1 of 4: Extracting flat compression zones... 20%" }));
              await new Promise<void>(r => setTimeout(r, 80));
              pixels = removeJpegArtifacts(pixels, nativeW, nativeH, 70);

              setProcessing(p => ({ ...p, progress: 40, statusText: "Pass 2 of 4: Sharp contour edge refinement... 40%" }));
              await new Promise<void>(r => setTimeout(r, 80));
              pixels = edgeEnhancement(pixels, nativeW, nativeH, 80);

              setProcessing(p => ({ ...p, progress: 65, statusText: "Pass 3 of 4: Aggressive luma sharpen... 65%" }));
              await new Promise<void>(r => setTimeout(r, 80));
              pixels = luminanceSharpen(pixels, nativeW, nativeH, 200);

              setProcessing(p => ({ ...p, progress: 85, statusText: "Pass 4 of 4: Contrast margin mapping... 85%" }));
              await new Promise<void>(r => setTimeout(r, 80));
              pixels = localContrastEnhancement(pixels, nativeW, nativeH, 50);

              pixels = applyColorLight(pixels, bgSlider, ctSlider, stSlider, temperature);
            } else if (enhancerPreset === 'maximum') {
              const sleep = () => new Promise<void>(resolve => setTimeout(resolve, 80));

              setProcessing(p => ({ ...p, progress: 16, statusText: "Pass 1 of 6: Removing JPEG artifacts... 16%" }));
              await sleep();
              pixels = removeJpegArtifacts(pixels, nativeW, nativeH, 60);

              setProcessing(p => ({ ...p, progress: 32, statusText: "Pass 2 of 6: Reducing noise... 32%" }));
              await sleep();
              pixels = applyDenoise(pixels, nativeW, nativeH, 15);

              setProcessing(p => ({ ...p, progress: 48, statusText: "Pass 3 of 6: Boosting local contrast... 48%" }));
              await sleep();
              pixels = localContrastEnhancement(pixels, nativeW, nativeH, 40);

              setProcessing(p => ({ ...p, progress: 64, statusText: "Pass 4 of 6: Sharpening detail... 64%" }));
              await sleep();
              pixels = luminanceSharpen(pixels, nativeW, nativeH, 180);

              setProcessing(p => ({ ...p, progress: 80, statusText: "Pass 5 of 6: Enhancing edges... 80%" }));
              await sleep();
              pixels = edgeEnhancement(pixels, nativeW, nativeH, 30);

              setProcessing(p => ({ ...p, progress: 96, statusText: "Pass 6 of 6: Final refinement... 96%" }));
              await sleep();
              pixels = unsharpMaskStrong(pixels, nativeW, nativeH, 80, 1, 4);

              pixels = applyColorLight(pixels, bgSlider, ctSlider, stSlider, temperature);
            } else {
              setProcessing(p => ({ ...p, progress: 30, statusText: "Processing manual adjustments..." }));
              await new Promise<void>(r => setTimeout(r, 80));

              if (jpegFix) {
                pixels = removeJpegArtifacts(pixels, nativeW, nativeH, 50);
              }
              if (denoise > 0) {
                pixels = applyDenoise(pixels, nativeW, nativeH, denoise);
              }
              if (clarity !== 0) {
                pixels = clarityEnhancement(pixels, nativeW, nativeH, clarity);
              }
              if (detailRecovery > 0) {
                pixels = applyDetailRecovery(pixels, nativeW, nativeH, detailRecovery);
              }
              if (sharpness > 0) {
                pixels = luminanceSharpen(pixels, nativeW, nativeH, sharpness * 2);
              }
              pixels = applyColorLight(pixels, bgSlider, ctSlider, stSlider, temperature);
            }

            setProcessing(p => ({ ...p, progress: 98, statusText: "Compressing output file block..." }));

            const outImgData = ctx.createImageData(nativeW, nativeH);
            outImgData.data.set(pixels);
            ctx.putImageData(outImgData, 0, 0);

            canvas.toBlob((blob) => {
              clearInterval(labelTimer);
              setProcessing({ isProcessing: false, progress: 0, statusText: '', error: null });
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const cleanName = file.name.replace(/\.[^/.]+$/, '');
                a.href = url;
                a.download = `${cleanName}_enhanced.${outputFormat === 'jpeg' ? 'jpg' : 'png'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
                showUndoRedoToast(`✓ Enhancement complete in ${timeTaken}s`, 'none');
              }
            }, outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png', downloadQuality / 100);

          } catch (err: any) {
            clearInterval(labelTimer);
            setProcessing({
              isProcessing: false,
              progress: 0,
              statusText: '',
              error: err.message || "Failed during high-res cook"
            });
          }
        };

        const triggerAutoEnhanceSequence = () => {
          setIsAutoEnhancing(true);
          setAutoEnhanceStep(1);
          const steps = [
            { txt: "Analyzing tonal frequency distribution guides...", val: 25 },
            { txt: "Running bilateral noise reduction filters...", val: 50 },
            { txt: "Optimizing dynamic midtone contrast curve levels...", val: 75 },
            { txt: "Re-constructing high frequency micro-contrast edge details...", val: 100 }
          ];
          
          let cur = 0;
          const interval = setInterval(() => {
            if (cur < steps.length) {
              setAutoEnhanceStep(cur + 1);
              cur++;
            } else {
              clearInterval(interval);
              setIsAutoEnhancing(false);
              setAutoEnhanceApplied(true);
              setAutoEnhanceStep(0);
              
              // Push this automatic state to Undo/Redo history!
              const manager = historyManagers.current['image-enhance'];
              if (manager) {
                manager.push({
                  brightness: 12,
                  contrast: 15,
                  saturation: 8,
                  sharpness: 35,
                  clarity: 40,
                  detailRecovery: 25,
                  denoise: 20,
                  jpegFix: true,
                  temperature: 4,
                  label: "Auto Enhanced magic"
                });
              }
              showUndoRedoToast("Dynamic Auto-Enhance configured!", 'none');
            }
          }, 600);
        };

        return (
          <div className="w-full mt-4 space-y-6 text-left">
            {/* Split comparison viewport screen */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider text-text-sub font-display font-medium flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-primary-accent" />
                  Split Interactive Comparisons Preview:
                </span>
                <span className="text-[10px] bg-[#6C63FF]/10 text-primary-accent px-2 py-0.5 rounded-full font-mono">
                  Drag divider line left/right
                </span>
              </div>

              {/* Draggable Divider Slider Container */}
              <div 
                className="relative w-full h-[360px] md:h-[420px] bg-[#0c0d12] rounded-2xl overflow-hidden border border-border-dark select-none touch-none group cursor-ew-resize"
                onMouseMove={(e) => {
                  if (e.buttons === 1) { // dragging
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                    setSplitPercent(pct);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
                    setSplitPercent(pct);
                  }
                }}
              >
                {/* Left Side: Original Image */}
                <div className="absolute inset-0 w-full h-full">
                  {originalPreviewUrl ? (
                    <img 
                      src={originalPreviewUrl || null} 
                      className="w-full h-full object-contain select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                      alt="Original" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-xs">Loading sampler pixels...</div>
                  )}
                  <div className="absolute left-3 top-3 bg-black/60 backdrop-blur-md text-white font-mono text-[10px] px-2.5 py-1 rounded-md border border-white/10 shadow-sm z-10">
                    Original
                  </div>
                </div>

                {/* Right Side: Enhanced Image with Clip-Path */}
                <div 
                  className="absolute inset-0 w-full h-full select-none"
                  style={{ clipPath: `polygon(${splitPercent}% 0, 100% 0, 100% 100%, ${splitPercent}% 100%)` }}
                >
                  {enhancedPreviewUrl ? (
                    <img 
                      src={enhancedPreviewUrl || null} 
                      className="w-full h-full object-contain select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                      alt="Enhanced" 
                    />
                  ) : (
                    <div className="w-full h-full bg-[#11141D] flex items-center justify-center text-text-muted font-mono text-xs">Awaiting filters...</div>
                  )}
                  <div className="absolute right-3 top-3 bg-primary-accent/80 backdrop-blur-md text-white font-mono text-[10px] px-2.5 py-1 rounded-md border border-primary-accent/20 shadow-sm z-10">
                    Clarity Enhanced
                  </div>
                </div>

                {/* Vertical slider divider handle */}
                <div 
                  className="absolute top-0 bottom-0 z-20 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                  style={{ left: `${splitPercent}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-[14px] w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg border border-gray-300 transform active:scale-95 transition-transform duration-100 cursor-ew-resize">
                    <Sliders className="w-3.5 h-3.5 rotate-90" />
                  </div>
                </div>

                {/* Smooth recalculating activity loader */}
                {isRecalculating && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 text-[#00D4AA] border border-[#00D4AA]/20 rounded-full px-3.5 py-1 text-[11px] font-mono flex items-center gap-1.5 z-30 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-[#00D4AA] animate-ping"></span>
                    <span>Recalculating details...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-detected image profile alert banner */}
            {detectedBanner?.show && (
              <div id="image-type-detected-banner" className="bg-[#0e7490]/20 border border-[#0e7490]/40 p-3.5 rounded-xl flex items-center justify-between text-xs text-[#22d3ee] font-sans transition-all duration-200 text-left mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[#0e7490]/30 text-[#22d3ee] font-bold font-mono">i</span>
                  <span className="font-medium">{detectedBanner.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDetectedBanner(prev => prev ? { ...prev, show: false } : null)}
                  className="ml-3 hover:text-white transition-colors cursor-pointer text-sm font-bold text-[#22d3ee]/80 animate-pulse"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Layout studio tabs */}
            <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm space-y-6">
              {/* Profile Presets Selection Grid */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">Select Clarity Profile Preset</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'auto', label: 'Auto (Balanced)', desc: 'Smart auto-tuning' },
                    { id: 'photo', label: 'Photo', desc: 'Portraits & scenery' },
                    { id: 'text', label: 'Text/Screenshot', desc: 'Screenshots & docs' },
                    { id: 'maximum', label: 'Maximum Clarity', desc: 'Blurs & phone snaps' },
                    { id: 'manual', label: 'Manual Sliders', desc: 'Custom fine-tune' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEnhancerPreset(preset.id as any)}
                      className={`p-3 rounded-xl transition-all cursor-pointer border flex flex-col items-center justify-center text-center space-y-1 ${
                        enhancerPreset === preset.id
                          ? 'border-[#00D4AA] bg-[#00D4AA]/5 text-[#00D4AA] font-semibold'
                          : 'border-border/60 text-text-muted hover:text-text-primary bg-surface/35 hover:bg-surface-secondary'
                      }`}
                    >
                      <span className="text-xs font-semibold font-display">{preset.label}</span>
                      <span className="text-[9px] opacity-75 font-sans tracking-tight">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Preset contents */}
              {enhancerPreset === 'auto' && (
                <div className="space-y-4 py-2">
                  <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-surface-secondary border border-border/50 p-5 rounded-xl">
                    <div className="space-y-1 text-left">
                      <p className="text-sm font-semibold text-text-primary font-display">⚡ Premium Auto Enhance Active</p>
                      <p className="text-xs text-text-muted">
                        AI analyzes tone matrices, suppresses pixel-level noise, expands dynamic range curves, and sharpens micro-textures in parallel.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isAutoEnhancing}
                      onClick={triggerAutoEnhanceSequence}
                      className="px-6 py-3 shrink-0 bg-[#00D4AA] text-black font-display font-bold text-xs rounded-xl shadow-[0_4px_12px_rgba(0,212,170,0.15)] hover:bg-[#00D4AA]/90 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAutoEnhancing ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                          Enhancing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Calculate Smart Auto Fix
                        </>
                      )}
                    </button>
                  </div>

                  {/* Auto enhancement progress list feedback */}
                  {isAutoEnhancing && (
                    <div className="space-y-2 bg-[#0c0d12] border border-border-dark p-4 rounded-xl animate-fade-in text-left">
                      <div className="flex justify-between text-xs font-mono text-text-muted">
                        <span>Reconstructing pipeline state:</span>
                        <span className="text-secondary-accent font-bold">Step {autoEnhanceStep}/4</span>
                      </div>
                      <div className="space-y-1.5 font-mono text-xs">
                        <p className={autoEnhanceStep >= 1 ? "text-[#00D4AA]" : "text-text-muted opacity-40"}>
                          {autoEnhanceStep >= 1 ? "✓ [Step 1] Analyzing tonal contrast guides..." : "○ [Step 1] Waiting..."}
                        </p>
                        <p className={autoEnhanceStep >= 2 ? "text-[#00D4AA]" : "text-text-muted opacity-40"}>
                          {autoEnhanceStep >= 2 ? "✓ [Step 2] Applying bilateral noise suppressors..." : "○ [Step 2] Waiting..."}
                        </p>
                        <p className={autoEnhanceStep >= 3 ? "text-[#00D4AA]" : "text-text-muted opacity-40"}>
                          {autoEnhanceStep >= 3 ? "✓ [Step 3] Optimizing local midtone clarity weights..." : "○ [Step 3] Waiting..."}
                        </p>
                        <p className={autoEnhanceStep >= 4 ? "text-[#00D4AA]" : "text-text-muted opacity-40"}>
                          {autoEnhanceStep >= 4 ? "✓ [Step 4] Restructuring high frequency details..." : "○ [Step 4] Waiting..."}
                        </p>
                      </div>
                    </div>
                  )}

                  {autoEnhanceApplied && !isAutoEnhancing && (
                    <div className="flex flex-wrap gap-2 py-1 animate-fade-in text-left">
                      <span className="text-[10px] font-semibold text-text-muted font-mono flex items-center">Modifiers applied:</span>
                      {autoEnhancePills.map((p, idx) => (
                        <span key={idx} className="text-[10px] font-bold bg-[#00D4AA]/10 text-[#00D4AA] px-2.5 py-0.5 rounded-full font-mono border border-[#00D4AA]/20">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {enhancerPreset === 'photo' && (
                <div className="p-4 bg-surface-secondary border border-border/50 rounded-xl space-y-1 text-left animate-fade-in">
                  <p className="text-xs font-semibold text-text-primary font-display flex items-center gap-1.5 text-[#00D4AA]">
                    <span>✦</span> Photo Preset Profile Active
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Applying advanced DSLR-grade multi-layer optimization: Bilateral denoise filter (25), dynamic midtone clarity enhance (60), clean luma sharpen on Y-channel (120), and ambient local contrast boost (30). Highly suited for portraits, landscapes, and natural imagery.
                  </p>
                </div>
              )}

              {enhancerPreset === 'text' && (
                <div className="p-4 bg-surface-secondary border border-border/50 rounded-xl space-y-1 text-left animate-fade-in">
                  <p className="text-xs font-semibold text-text-primary font-display flex items-center gap-1.5 text-[#00D4AA]">
                    <span>✦</span> Text & Screenshot Preset Profile Active
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Applying razor sharp contour matrix optimization: Flat background block JPEG artifact repair (70), high-gain Laplacian edge enhancement (80), aggressive high-frequency luminance boost (200), and local shadow text contrast contrast push (50) with bypass denoise. Ideal for blurry cell phone screenshots, WhatsApp chats, and paper documents.
                  </p>
                </div>
              )}

              {enhancerPreset === 'maximum' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-4 bg-surface-secondary border border-border/50 rounded-xl text-left space-y-1">
                    <p className="text-xs font-semibold text-text-primary font-display flex items-center gap-1.5 text-orange-400 font-bold">
                      <span>✦</span> Maximum Clarity Professional Profile Active
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Initiating an immersive 6-pass sequential recovery system on the Canvas API: JPEG cleaning &rarr; smart bilateral smoothing &rarr; local average contrast &rarr; deep luma sharpening &rarr; Laplacian boundaries &rarr; unsharp mask refinement. Complete pixel matrix reconstruction.
                    </p>
                  </div>
                  {/* Warning Badge */}
                  <div className="bg-orange-500/10 border border-orange-500/30 p-2.5 rounded-xl text-orange-400 text-[11px] font-medium text-left flex gap-2 items-center">
                    <span className="font-bold flex-shrink-0 bg-orange-500/20 px-1.5 py-0.5 rounded text-[9px] uppercase">Warning</span>
                    <span>Maximum setting — best for very blurry, highly compressed or heavily downscaled phone photographs. Processing takes 3-8 seconds for large images.</span>
                  </div>
                </div>
              )}

              {enhancerPreset === 'manual' && (
                <div className="space-y-4 py-1">
                  <div className="text-left mb-3 flex items-center justify-between">
                    <p className="text-xs text-text-muted">💡 Double-click any slider to reset to default (0).</p>
                    <span className="text-[10px] bg-secondary-accent/10 text-secondary-accent px-2 py-0.5 rounded-full">Custom manual setup</span>
                  </div>

                  {/* Manual fine sliders grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Contrast clarity block */}
                    <div className="space-y-4 border-r border-border/20 pr-0 md:pr-4">
                      {/* Clarity Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-sub flex items-center gap-1 font-medium font-display">
                            1. Local Clarity (Midtones)
                            <InfoTooltip content="Enhance local details inside pixels without clipping highlights." />
                          </span>
                          <span className="font-mono text-primary-accent text-xs font-semibold">{clarity > 0 ? `+${clarity}` : clarity}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={clarity}
                          onFocus={() => setIsDraggingSlider(true)}
                          onBlur={() => setIsDraggingSlider(false)}
                          onChange={(e) => setClarity(parseInt(e.target.value))}
                          onDoubleClick={() => setClarity(0)}
                          className="w-full h-1.5 cursor-pointer rounded-lg bg-surface-secondary accent-primary-accent border border-border"
                        />
                      </div>

                      {/* Sharpness Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-sub flex items-center gap-1 font-medium font-display">
                            2. Digital Sharpness (USM)
                            <InfoTooltip content="High frequency convolution filter to crisp boundaries and text contours." />
                          </span>
                          <span className="font-mono text-primary-accent text-xs font-semibold">{sharpness}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sharpness}
                          onFocus={() => setIsDraggingSlider(true)}
                          onBlur={() => setIsDraggingSlider(false)}
                          onChange={(e) => setSharpness(parseInt(e.target.value))}
                          onDoubleClick={() => setSharpness(0)}
                          className="w-full h-1.5 cursor-pointer rounded-lg bg-surface-secondary accent-primary-accent border border-border"
                        />
                      </div>

                      {/* Detail Recovery */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-sub flex items-center gap-1 font-medium font-display">
                            3. Fine Detail Recovery
                            <InfoTooltip content="Brings out micro textures and dynamic features from dark patches." />
                          </span>
                          <span className="font-mono text-[#00D4AA] text-xs font-semibold">{detailRecovery}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={detailRecovery}
                          onFocus={() => setIsDraggingSlider(true)}
                          onBlur={() => setIsDraggingSlider(false)}
                          onChange={(e) => setDetailRecovery(parseInt(e.target.value))}
                          onDoubleClick={() => setDetailRecovery(0)}
                          className="w-full h-1.5 cursor-pointer rounded-lg bg-surface-secondary accent-[#00D4AA] border border-border"
                        />
                      </div>

                      {/* Denoise */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-sub flex items-center gap-1 font-medium font-display">
                            4. Denoise (Smoothing)
                            <InfoTooltip content="Isolates sensor noise using averaging matrices while locking outlines." />
                          </span>
                          <span className="font-mono text-[#00D4AA] text-xs font-semibold">{denoise}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={denoise}
                          onFocus={() => setIsDraggingSlider(true)}
                          onBlur={() => setIsDraggingSlider(false)}
                          onChange={(e) => setDenoise(parseInt(e.target.value))}
                          onDoubleClick={() => setDenoise(0)}
                          className="w-full h-1.5 cursor-pointer rounded-lg bg-surface-secondary accent-[#00D4AA] border border-border"
                        />
                      </div>
                    </div>

                    {/* Color and exposure sliders */}
                    <div className="space-y-4">
                      {/* Brightness */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-sub font-medium font-display">5. Exposure / Brightness</span>
                          <span className="font-mono text-text-primary text-xs font-semibold">{bgSlider > 0 ? `+${bgSlider}` : bgSlider}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={bgSlider}
                          onFocus={() => setIsDraggingSlider(true)}
                          onBlur={() => setIsDraggingSlider(false)}
                          onChange={(e) => setBgSlider(parseInt(e.target.value))}
                          onDoubleClick={() => setBgSlider(0)}
                          className="w-full h-1.5 cursor-pointer rounded-lg bg-surface-secondary border border-border"
                        />
                      </div>

                      {/* Contrast */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-sub font-medium font-display">6. Dynamic Contrast</span>
                          <span className="font-mono text-text-primary text-xs font-semibold">{ctSlider > 0 ? `+${ctSlider}` : ctSlider}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={ctSlider}
                          onFocus={() => setIsDraggingSlider(true)}
                          onBlur={() => setIsDraggingSlider(false)}
                          onChange={(e) => setCtSlider(parseInt(e.target.value))}
                          onDoubleClick={() => setCtSlider(0)}
                          className="w-full h-1.5 cursor-pointer rounded-lg bg-surface-secondary border border-border"
                        />
                      </div>

                      {/* Saturation */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-sub font-medium font-display">7. Saturation</span>
                          <span className="font-mono text-text-primary text-xs font-semibold">{stSlider > 0 ? `+${stSlider}` : stSlider}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={stSlider}
                          onFocus={() => setIsDraggingSlider(true)}
                          onBlur={() => setIsDraggingSlider(false)}
                          onChange={(e) => setStSlider(parseInt(e.target.value))}
                          onDoubleClick={() => setStSlider(0)}
                          className="w-full h-1.5 cursor-pointer rounded-lg bg-surface-secondary border border-border"
                        />
                      </div>

                      {/* Temperature */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-sub font-medium font-display">8. Mood Temperature</span>
                          <span className="font-mono text-text-primary text-xs font-semibold">
                            {temperature > 0 ? `Warm +${temperature}` : temperature < 0 ? `Cool ${temperature}` : 'Neutral'}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={temperature}
                          onFocus={() => setIsDraggingSlider(true)}
                          onBlur={() => setIsDraggingSlider(false)}
                          onChange={(e) => setTemperature(parseInt(e.target.value))}
                          onDoubleClick={() => setTemperature(0)}
                          className="w-full h-1.5 cursor-pointer rounded-lg bg-gradient-to-r from-blue-400 via-gray-300 to-amber-400 accent-primary-accent border border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* JPEG block */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 bg-surface-dark border border-border/40 p-3 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={jpegFix}
                        onChange={(e) => setJpegFix(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-accent bg-border-dark accent-primary-accent cursor-pointer"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-text-primary">Apply JPEG Anti-Artifact Filter</p>
                        <p className="text-text-muted mt-0.5">Smooths blocking patterns, blurring noise, and halo rings around high contrast segments.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Before After Collapsible Crop Comparison Analysis */}
            <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm space-y-4">
              <span className="text-xs uppercase tracking-wider text-text-sub font-display font-medium flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-primary-accent" />
                Pixel Inspection & Tonal Distribution analysis:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 100% Crop comparison */}
                <div className="bg-surface-secondary border border-border/50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-text-primary font-display flex items-center gap-1">
                      🔍 100% Detail Area Crop
                    </span>
                    <span className="text-[10px] bg-primary-accent/10 text-primary-accent px-2 py-0.5 rounded-full font-mono">Pixel Precision</span>
                  </div>
                  <div className="flex gap-4 justify-center items-center">
                    <div className="text-center space-y-1">
                      <div className="w-[110px] h-[110px] rounded-lg overflow-hidden border border-border-dark bg-black flex items-center justify-center">
                        <canvas ref={cropOriginalCanvasRef} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">Original</span>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="w-[110px] h-[110px] rounded-lg overflow-hidden border border-[#00D4AA]/30 bg-black flex items-center justify-center shadow-[0_4px_12px_rgba(0,212,170,0.1)]">
                        <canvas ref={cropEnhancedCanvasRef} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-mono text-[#00D4AA] font-bold">Enhanced</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted text-center leading-relaxed">
                    Automatically centered over highest concentration of high contrast pixels and detail outlines.
                  </p>
                </div>

                {/* Histogram Comparison */}
                <div className="bg-surface-secondary border border-border/50 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-text-primary font-display flex items-center gap-1">
                      📊 Channels Luminance Histogram
                    </span>
                    <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                      Displays relative pixel weights distribution before (<span className="text-[#8892A4]">grey shading</span>) and after (<span className="text-primary-accent">violet overlay</span>).
                    </p>
                  </div>
                  <div className="h-[90px] w-full bg-[#0c0d12] rounded-lg overflow-hidden relative flex items-end px-3 py-1">
                    <canvas ref={histogramCanvasRef} className="w-full h-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Export selection Options */}
            <div className="border-t border-border-dark pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface/50 p-4 rounded-xl border border-border/60">
              <div className="space-y-1 text-left w-full sm:w-auto">
                <span className="text-[10px] font-mono text-text-muted">Output Format Preferences</span>
                <div className="flex gap-3">
                  {(['jpeg', 'png'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOutputFormat(fmt)}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        outputFormat === fmt
                          ? 'border-[#00D4AA] bg-[#00D4AA]/10 text-[#00D4AA] font-bold'
                          : 'border-border-dark text-text-muted bg-[#121620]'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>

                {outputFormat === 'jpeg' && (
                  <div className="pt-2 w-48 space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-text-muted">
                      <span>JPEG Encoding Quality:</span>
                      <span className="text-[#00D4AA] font-bold">{downloadQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={downloadQuality}
                      onChange={(e) => setDownloadQuality(parseInt(e.target.value))}
                      className="w-full h-1 cursor-pointer bg-border accent-primary-accent"
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Size calculations info display */}
              <div className="flex flex-col items-end text-right w-full sm:w-auto space-y-2">
                <div className="font-mono text-xs">
                  <p className="text-text-muted">Original Size: <span className="text-text-primary">{formatSize(originalSize)}</span></p>
                  <p className="font-bold text-secondary-accent mt-0.5">
                    Estimated size: ~{outputFormat === 'jpeg' ? estData.jpeg : estData.png}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportHighRes}
                  className="px-6 py-3.5 bg-primary-accent hover:bg-primary-accent/90 text-white font-display font-semibold rounded-xl text-xs transition-all shadow-[0_4px_16px_rgba(108,99,255,0.3)] flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto text-center"
                >
                  <Sparkles className="w-4 h-4 text-[#00D4AA]" />
                  ⚡ Save & Export Enhanced Image
                </button>
              </div>
            </div>

            {/* Double Column Edit list for desktop workspace */}
            {windowWidth >= 768 && (
              <div className="relative flex justify-end select-none pt-2">
                <button
                  type="button"
                  onClick={() => setHistoryPanelOpen(!historyPanelOpen)}
                  className="text-xs text-text-muted flex items-center gap-1 cursor-pointer hover:text-primary-accent transition-all bg-surface-dark border border-border-dark/60 rounded-xl px-4 py-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-accent animate-pulse"></span>
                  {historyPanelOpen ? "Hide studio edit history panel" : "View studio edit history panel"}
                </button>

                <motion.div
                  initial={false}
                  animate={{ height: historyPanelOpen ? 'auto' : '0px', opacity: historyPanelOpen ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden w-full max-w-sm mt-3 border border-border/80 bg-surface rounded-xl p-4 text-left shadow-lg absolute right-0 top-10 z-40"
                >
                  {renderHistoryPanelContent(false)}
                </motion.div>
              </div>
            )}
          </div>
        );
      }

      case 'jpeg-to-pdf':
        return (
          <div className="mb-6 mt-6 text-left space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1.5 flex items-center">
                Page Fit Layout Size
                <InfoTooltip content="Standard layout sizing profile. Auto-fit binds each page specifically to that image dimensions." />
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Auto-fit', 'A4', 'Letter'] as const).map((sz) => (
                  <Tooltip key={sz} content={`Set target output page aspect shape boundaries to ${sz}`}>
                    <button
                      key={sz}
                      type="button"
                      onClick={(e) => { e.preventDefault(); setJpegToPdfPageSize(sz); }}
                      className={`py-3 px-4 border rounded-xl text-sm font-display font-semibold transition-all cursor-pointer w-full text-center ${
                        jpegToPdfPageSize === sz
                          ? 'border-secondary-accent bg-secondary-accent/10 text-secondary-accent'
                          : 'border-border-dark bg-[#121620] text-text-sub hover:text-text-light'
                      }`}
                    >
                      {sz === 'Auto-fit' ? 'Auto-Fit Original' : sz}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Thumbnail Reorder Grid */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm uppercase tracking-wider text-text-sub font-display">
                  Arrange Page Order (drag or use navigation keys):
                </h4>
                <div>
                  <input
                    type="file"
                    ref={addMoreImagesRef}
                    onChange={handleAddMoreImages}
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); addMoreImagesRef.current?.click(); }}
                    className="py-1.5 px-3 bg-[#6C63FF]/15 border border-[#6C63FF]/30 text-[#6C63FF] hover:bg-[#6C63FF]/25 font-display text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 animate-pulse" /> Add Pages (Browse)
                  </button>
                </div>
              </div>

              {/* Instruction Banner */}
              {reorderableImages.length > 0 && (
                <div className="bg-[#6C63FF]/8 border-l-3 border-[#6C63FF] rounded-lg p-2.5 px-3.5 flex items-start gap-2 mb-4 animate-fade-in text-left">
                  <span className="text-[#6C63FF] text-sm mt-0.5">ℹ</span>
                  <p className="text-[11px] text-text-sub leading-relaxed font-sans font-medium">
                    Drag files to set the merge order. The final PDF will follow this sequence.
                  </p>
                </div>
              )}

              <div ref={jpegPdfsContainerRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[12px] max-h-96 overflow-y-auto pr-1">
                {reorderableImages.map((thumb, idx) => (
                  <div 
                    key={thumb.id}
                    data-index={idx}
                    className="draggable-card relative bg-surface-dark border border-border-dark rounded-xl p-2.5 flex flex-col items-center hover:scale-[1.03] hover:shadow-[0_4px_16px_rgba(108,99,255,0.3)] transition-all duration-150 group"
                  >
                    <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-bg-dark flex items-center justify-center">
                      {thumb.previewUrl ? (
                        <img src={thumb.previewUrl || null} className="w-full h-full object-cover rounded-lg" alt={thumb.name} />
                      ) : null}
                      
                      {/* Drag handle */}
                      <div 
                        className="drag-handle absolute top-0 left-0 bg-[rgba(0,0,0,0.5)] rounded-br-md p-1.5 md:p-2 text-text-sub hover:text-primary-accent transition-colors cursor-grab active:cursor-grabbing select-none flex items-center justify-center group/tooltip"
                        role="button"
                        tabIndex={0}
                        aria-label={`Drag to reorder ${thumb.name}`}
                      >
                        <svg className="w-3.5 h-4.5 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 16 20" fill="currentColor">
                          <circle cx="5" cy="4" r="1.5" />
                          <circle cx="5" cy="10" r="1.5" />
                          <circle cx="5" cy="16" r="1.5" />
                          <circle cx="11" cy="4" r="1.5" />
                          <circle cx="11" cy="10" r="1.5" />
                          <circle cx="11" cy="16" r="1.5" />
                        </svg>
                        <div className="absolute top-full left-0 mt-1 hidden group-hover/tooltip:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none delay-500">
                          Drag to reorder
                        </div>
                        {/* Keyboard navigation instructions */}
                        <div className="absolute top-full left-0 mt-1 hidden focus-within:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none">
                          Space to pick, Arrows to move, Space to drop
                        </div>
                      </div>

                      {/* Position badge */}
                      <span className="position-badge absolute top-1.5 right-1.5 w-5 h-5 bg-[#6C63FF] text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center border border-[#6C63FF]/30 shadow">
                        {idx + 1}
                      </span>

                      {/* Arrow controls */}
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveItem(idx, 'up', 'jpg'); }}
                          disabled={idx === 0}
                          className="p-1 bg-[#161925]/90 hover:bg-[#6C63FF] disabled:opacity-30 disabled:hover:bg-[#161925]/90 text-white rounded border border-border-dark cursor-pointer flex items-center justify-center"
                          title="Move Previous"
                        >
                          <ArrowUp className="w-3 h-3 -rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveItem(idx, 'down', 'jpg'); }}
                          disabled={idx === reorderableImages.length - 1}
                          className="p-1 bg-[#161925]/90 hover:bg-[#6C63FF] disabled:opacity-30 disabled:hover:bg-[#161925]/90 text-white rounded border border-border-dark cursor-pointer flex items-center justify-center"
                          title="Move Next"
                        >
                          <ArrowDown className="w-3 h-3 -rotate-90" />
                        </button>
                      </div>

                      {/* × remove */}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); removeItem(idx, 'jpg'); }}
                        className="absolute bottom-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow transition-all scale-90 group-hover:scale-100 opacity-80 md:opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Remove page"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <span className="text-[11px] text-text-sub mt-2 block w-full text-center truncate px-1 font-medium" title={thumb.name}>
                      {thumb.name}
                    </span>
                    {thumb.isPasted && (
                      <span className="mt-1 text-[10px] font-bold bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none">
                        📋 Pasted
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'pdf-to-image': {
        let isPdfToImageRangeInvalid = false;
        if (pdfToImagePages === 'custom') {
          if (!pdfToImageRange.trim()) {
            isPdfToImageRangeInvalid = true;
          } else {
            const rangeRegex = /^(\s*\d+\s*-\s*\d+\s*|\s*\d+\s*)(,\s*(\d+\s*-\s*\d+\s*|\d+\s*))*$/;
            if (!rangeRegex.test(pdfToImageRange)) {
              isPdfToImageRangeInvalid = true;
            } else {
              const parts = pdfToImageRange.split(',');
              for (const part of parts) {
                if (part.includes('-')) {
                  const [startStr, endStr] = part.split('-');
                  const start = parseInt(startStr.trim());
                  const end = parseInt(endStr.trim());
                  if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > end || (loadedPdfPageCount > 0 && (start > loadedPdfPageCount || end > loadedPdfPageCount))) {
                    isPdfToImageRangeInvalid = true;
                  }
                } else {
                  const pg = parseInt(part.trim());
                  if (isNaN(pg) || pg < 1 || (loadedPdfPageCount > 0 && pg > loadedPdfPageCount)) {
                    isPdfToImageRangeInvalid = true;
                  }
                }
              }
            }
          }
        }

        return (
          <div className="mb-6 mt-6 text-left grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1.5 flex items-center">
                Target Image Format
                <InfoTooltip content="Choose vector extraction rasterizer format. PNG is high contrast; JPEG has mild loss." />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['png', 'jpeg'] as const).map((fmt) => (
                  <Tooltip key={fmt} content={`Convert pages to lossless ${fmt.toUpperCase()} raster files`}>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setPdfToImageFormat(fmt); }}
                      className={`py-3 px-3 border rounded-xl text-sm font-semibold transition-all cursor-pointer w-full text-center ${
                        pdfToImageFormat === fmt
                          ? 'border-secondary-accent bg-[#00D4AA]/8 text-secondary-accent'
                          : 'border-border-dark bg-[#121620] text-text-sub hover:text-text-light'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1.5 flex items-center">
                Extraction Range
                <InfoTooltip content="Specify page ranges to extract. Format: e.g. '1, 3-5'." />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Tooltip content="Extract all pages from the PDF document">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setPdfToImagePages('all'); }}
                    className={`py-3 px-3 border rounded-xl text-sm font-semibold transition-all cursor-pointer w-full text-center ${
                      pdfToImagePages === 'all'
                        ? 'border-primary-accent bg-[#6C63FF]/8 text-[#6C63FF]'
                        : 'border-border-dark bg-[#121620] text-text-sub hover:text-text-light'
                    }`}
                  >
                    All Pages
                  </button>
                </Tooltip>
                <Tooltip content="Extract a specific set/sequence of pages">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setPdfToImagePages('custom'); }}
                    className={`py-3 px-3 border rounded-xl text-sm font-semibold transition-all cursor-pointer w-full text-center ${
                      pdfToImagePages === 'custom'
                        ? 'border-primary-accent bg-[#6C63FF]/8 text-[#6C63FF]'
                        : 'border-border-dark bg-[#121620] text-text-sub hover:text-text-light'
                    }`}
                  >
                    Page Range
                  </button>
                </Tooltip>
              </div>
              
              {pdfToImagePages === 'custom' && (
                <div className="mt-2.5">
                  <Tooltip content="Input page intervals separated by commas. e.g. 1-2, 4">
                    <input
                      type="text"
                      placeholder="e.g. 1-2, 4"
                      value={pdfToImageRange}
                      onChange={(e) => setPdfToImageRange(e.target.value)}
                      className={`w-full font-mono bg-[#11141E] border ${
                        isPdfToImageRangeInvalid ? 'border-red-500 focus:border-red-500' : 'border-border-dark'
                      } p-2 text-xs rounded-lg text-text-light focus:border-primary-accent`}
                    />
                  </Tooltip>
                  {isPdfToImageRangeInvalid ? (
                    <span className="text-[10px] text-red-400 mt-1 block">Invalid entry. Use format '1-2, 4' within max limits (1 to {loadedPdfPageCount || 'max'}).</span>
                  ) : (
                    <span className="text-[10px] text-text-sub mt-1 block">Maximum limits: 1 to {loadedPdfPageCount}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'pdf-to-word':
        return (
          <div className="mt-4 mb-4 text-left p-3.5 bg-primary-accent/5 border border-primary-accent/15 rounded-xl flex gap-2.5 text-xs text-text-sub">
            <Info className="w-4 h-4 shrink-0 text-primary-accent mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold text-text-light">Disclaimer for best conversion results:</p>
              <p className="mt-0.5 leading-relaxed">This on-device tool extracts raw structural text logs safely. Best outcomes depend on native, text-based PDF catalogs (rather than scanned paper imagery documents).</p>
            </div>
          </div>
        );

      case 'merge-pdf':
        return (
          <div className="mb-6 mt-6 text-left">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm uppercase tracking-wider text-[#6C63FF] font-display flex items-center gap-1">
                Arrange Joining PDF Files:
                <InfoTooltip content="Stitch up to 10 separate documents. Reorder to specify their target position." />
              </h4>
              <div>
                <input
                  type="file"
                  ref={addMorePdfsRef}
                  onChange={handleAddMorePdfs}
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); addMorePdfsRef.current?.click(); }}
                  className="py-1.5 px-3 bg-[#00D4AA]/15 border border-[#00D4AA]/30 text-[#00D4AA] hover:bg-[#00D4AA]/25 font-display text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 animate-pulse" /> Add Documents (Browse)
                </button>
              </div>
            </div>
            {/* Instruction Banner */}
            {reorderablePdfs.length > 0 && (
              <div className="bg-[#6C63FF]/8 border-l-3 border-[#6C63FF] rounded-lg p-2.5 px-3.5 flex items-start gap-2 mb-4 animate-fade-in text-left">
                <span className="text-[#6C63FF] text-sm mt-0.5">ℹ</span>
                <p className="text-[11px] text-text-sub leading-relaxed font-sans font-medium">
                  Drag files to set the merge order. The final PDF will follow this sequence.
                </p>
              </div>
            )}
            
            <div ref={mergePdfsContainerRef} className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {reorderablePdfs.map((part, idx) => (
                <div key={part.id} data-index={idx} className="draggable-row bg-surface-dark border border-border-dark rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Handle */}
                    <div 
                      className="drag-handle p-1.5 text-text-sub hover:text-primary-accent transition-colors duration-200 cursor-grab active:cursor-grabbing select-none shrink-0 group/tooltip relative"
                      role="button"
                      tabIndex={0}
                      aria-label={`Drag to reorder ${part.name}`}
                    >
                      <svg className="w-4 h-5 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 16 20" fill="currentColor">
                        <circle cx="5" cy="4" r="1.5" />
                        <circle cx="5" cy="10" r="1.5" />
                        <circle cx="5" cy="16" r="1.5" />
                        <circle cx="11" cy="4" r="1.5" />
                        <circle cx="11" cy="10" r="1.5" />
                        <circle cx="11" cy="16" r="1.5" />
                      </svg>
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none delay-500">
                        Drag to reorder
                      </div>
                      {/* Keyboard Instructions Screen Reader Tooltip on Focus */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden focus-within:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none">
                        Press Space to pick up, arrow keys to move, Space to drop, Escape to cancel
                      </div>
                    </div>

                    <span className="w-6 h-6 shrink-0 bg-[#1F2432] text-primary-accent border border-primary-accent/15 rounded-full flex items-center justify-center font-mono text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-light truncate max-w-xs sm:max-w-md">{part.name}</p>
                      <p className="text-[10px] text-text-sub font-mono">{formatSize(part.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); moveItem(idx, 'up', 'pdf'); }}
                      disabled={idx === 0}
                      className="p-1 px-1.5 text-text-sub hover:text-secondary-accent disabled:opacity-30 bg-[#1B202E] border border-border-dark rounded cursor-pointer"
                      title="Move Up in Merger Output"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); moveItem(idx, 'down', 'pdf'); }}
                      disabled={idx === reorderablePdfs.length - 1}
                      className="p-1 px-1.5 text-text-sub hover:text-secondary-accent disabled:opacity-30 bg-[#1B202E] border border-border-dark rounded cursor-pointer"
                      title="Move Down in Merger Output"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); removeItem(idx, 'pdf'); }}
                      className="p-1 px-1.5 text-text-sub hover:text-red-400 bg-[#1B202E] border border-border-dark rounded ml-2 cursor-pointer"
                      title="Delete PDF Segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {reorderablePdfs.length < 2 && reorderablePdfs.length > 0 && (
              <p className="text-red-400 text-xs mt-2.5 text-center flex items-center justify-center gap-1.5 bg-red-950/20 py-2 rounded border border-red-900/40">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Must upload at least 2 PDF files to perform the stitching action!
              </p>
            )}

            {reorderablePdfs.length >= 2 && (
              <p className="text-[11px] text-[#00D4AA] mt-2.5 text-center flex items-center justify-center gap-1">
                ⭐ {reorderablePdfs.length} files aligned correctly. Ready for compilation.
              </p>
            )}
          </div>
        );

      case 'split-pdf': {
        const isEveryNInvalid = (splitEveryN < 1 || isNaN(splitEveryN) || (loadedPdfPageCount > 0 && splitEveryN > loadedPdfPageCount));

        let isSplitRangesInvalid = false;
        if (splitProfile === 'ranges') {
          if (!splitRanges.trim()) {
            isSplitRangesInvalid = true;
          } else {
            const rangeRegex = /^(\s*\d+\s*-\s*\d+\s*|\s*\d+\s*)(,\s*(\d+\s*-\s*\d+\s*|\d+\s*))*$/;
            if (!rangeRegex.test(splitRanges)) {
              isSplitRangesInvalid = true;
            } else {
              const parts = splitRanges.split(',');
              for (const part of parts) {
                if (part.includes('-')) {
                  const [startStr, endStr] = part.split('-');
                  const start = parseInt(startStr.trim());
                  const end = parseInt(endStr.trim());
                  if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > end || (loadedPdfPageCount > 0 && (start > loadedPdfPageCount || end > loadedPdfPageCount))) {
                    isSplitRangesInvalid = true;
                  }
                } else {
                  const pg = parseInt(part.trim());
                  if (isNaN(pg) || pg < 1 || (loadedPdfPageCount > 0 && pg > loadedPdfPageCount)) {
                    isSplitRangesInvalid = true;
                  }
                }
              }
            }
          }
        }

        const isExtractorEmpty = splitProfile === 'single' && splitSingleSelection.length === 0;

        return (
          <div className="mb-6 mt-6 text-left space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-sub font-display mb-2 flex items-center">
                Split Profile Pattern
                <InfoTooltip content="Choose partitioning paradigm. Splitting pages, custom ranges extraction, or pick solo checkboxes." />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Tooltip content="Create equal partitions of every N pages apiece">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setSplitProfile('everyN'); }}
                    className={`py-3 px-2.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer w-full text-center ${
                      splitProfile === 'everyN'
                        ? 'border-primary-accent bg-[#6C63FF]/6 text-[#6C63FF]'
                        : 'border-border-dark bg-[#121620] text-text-sub hover:text-text-light'
                    }`}
                  >
                    Split every N pages
                  </button>
                </Tooltip>
                
                <Tooltip content="Extract specified chunk segments (e.g. 1-2, 5-7)">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setSplitProfile('ranges'); }}
                    className={`py-3 px-2.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer w-full text-center ${
                      splitProfile === 'ranges'
                        ? 'border-primary-accent bg-[#6C63FF]/6 text-[#6C63FF]'
                        : 'border-border-dark bg-[#121620] text-text-sub hover:text-text-light'
                    }`}
                  >
                    Custom Range Strings
                  </button>
                </Tooltip>

                <Tooltip content="Pick and choose individual pages to save as a download zip">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setSplitProfile('single'); }}
                    className={`py-3 px-2.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer w-full text-center ${
                      splitProfile === 'single'
                        ? 'border-primary-accent bg-[#6C63FF]/6 text-[#6C63FF]'
                        : 'border-border-dark bg-[#121620] text-text-sub hover:text-text-light'
                    }`}
                  >
                    Page Picker Select
                  </button>
                </Tooltip>
              </div>
            </div>

            {splitProfile === 'everyN' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1.5 flex items-center">
                  Interval (Pages Count Decider)
                  <InfoTooltip content="Segment size length in pages." />
                </label>
                <Tooltip content="Enter integer between 1 and PDF max pages to decide equal partitions">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, loadedPdfPageCount)}
                    value={splitEveryN}
                    onChange={(e) => setSplitEveryN(parseInt(e.target.value) || 1)}
                    className={`w-full font-mono bg-[#11141E] border ${
                      isEveryNInvalid ? 'border-red-500 focus:border-red-500' : 'border-border-dark'
                    } p-3 rounded-lg text-text-light text-sm focus:border-primary-accent`}
                  />
                </Tooltip>
                {isEveryNInvalid && (
                  <p className="text-[10px] text-red-400 mt-1">Specify an interval between 1 and {loadedPdfPageCount || 'maximum PDF pages'}.</p>
                )}
              </div>
            )}

            {splitProfile === 'ranges' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1.5 flex items-center">
                  Page Ranges Bounds (Group Segments)
                  <InfoTooltip content="Delimit using space-agnostic commas like '1-3, 4'. Must fit within maximum PDF pages." />
                </label>
                <Tooltip content="Input ranges e.g. 1-2, 3-5">
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 4-6, 7"
                    value={splitRanges}
                    onChange={(e) => setSplitRanges(e.target.value)}
                    className={`w-full font-mono bg-[#11141E] border ${
                      isSplitRangesInvalid ? 'border-red-500 focus:border-red-500' : 'border-border-dark'
                    } p-3 rounded-lg text-text-light text-sm focus:border-primary-accent`}
                  />
                </Tooltip>
                {isSplitRangesInvalid ? (
                  <p className="text-[10px] text-red-400 mt-1">Invalid range sequence. Please write subset margins correctly (e.g. '1-2, 3-5') within {loadedPdfPageCount} pages.</p>
                ) : (
                  <p className="text-[10px] text-text-sub mt-2">
                    Creates custom split PDF files for each provided comma-delimited ranges group. Bounds max: {loadedPdfPageCount}
                  </p>
                )}
              </div>
            )}

            {splitProfile === 'single' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs uppercase tracking-wider text-text-sub font-display flex items-center">
                    Select Target Pages to Extract
                    <InfoTooltip content="Toggled items will bundle into index-named files in download segment." />
                  </label>
                  {isExtractorEmpty && (
                    <span className="text-[10px] text-red-400 font-bold animate-pulse">Pick at least 1 page bounds to split!</span>
                  )}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2.5 max-h-40 overflow-y-auto p-1.5 bg-[#121620] border border-border-dark rounded-xl">
                  {Array.from({ length: loadedPdfPageCount }, (_, k) => k + 1).map((pgNum) => {
                    const isSelected = splitSingleSelection.includes(pgNum);
                    return (
                      <Tooltip key={pgNum} content={`Toggle extraction status of page #${pgNum}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (isSelected) {
                              setSplitSingleSelection(splitSingleSelection.filter(x => x !== pgNum));
                            } else {
                              setSplitSingleSelection([...splitSingleSelection, pgNum]);
                            }
                          }}
                          className={`py-2 text-[11px] font-mono rounded-lg border cursor-pointer font-bold w-full text-center ${
                            isSelected
                              ? 'bg-secondary-accent text-bg-dark border-secondary-accent shadow-[0_0_8px_rgba(0,212,170,0.25)] scale-95'
                              : 'border-border-dark text-text-sub hover:text-text-light hover:border-border-dark/80 bg-surface-dark hover:scale-105'
                          } transition-all duration-150`}
                        >
                          {pgNum}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Helper matching tools validations
  const getAcceptedFilesConfig = () => {
    switch (activeTool) {
      case 'pdf-compress':
      case 'pdf-to-image':
      case 'pdf-to-word':
      case 'split-pdf':
        return { types: ['.pdf'], label: 'PDF elements' };
      case 'jpeg-compress':
        return { types: ['.jpg', '.jpeg'], label: 'JPEG / JPG photos' };
      case 'image-resize':
      case 'image-enhance':
        return { types: ['.jpg', '.jpeg', '.png', '.webp'], label: 'JPG, PNG, or WEBP images' };
      case 'jpeg-to-pdf':
        return { types: ['.jpg', '.jpeg', '.png'], label: 'JPEG or PNG formats' };
      case 'word-to-pdf':
        return { types: ['.docx'], label: 'Microsoft Word docx documents' };
      case 'excel-to-pdf':
        return { types: ['.xlsx'], label: 'Excel spreadsheet xlsx files' };
      case 'merge-pdf':
        return { types: ['.pdf'], label: 'Multiple PDFs (up to 10)' };
      default:
        return { types: ['.pdf'], label: 'PDF format' };
    }
  };

  const fileConfig = getAcceptedFilesConfig();

  // Helper check for disabled status
  const isProcessButtonDisabled = () => {
    if (activeTool === 'jpeg-to-pdf') return reorderableImages.length === 0;
    if (activeTool === 'merge-pdf') return reorderablePdfs.length === 0;
    return selectedFiles.length === 0;
  };

  // MAIN GRID COMPONENT RENDERING ROUTING
  // 1. Processing Animation Spinner State
  if (processing.isProcessing) {
    return (
      <div className="w-full bg-surface-dark border border-border-dark p-12 rounded-2xl max-w-xl mx-auto shadow-2xl text-center animate-fade-in animate-once">
        <div className="relative w-20 h-20 mx-auto mb-8 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary-accent/15 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-[#00D4AA] rounded-full animate-spin"></div>
          <Sparkles className="w-8 h-8 text-primary-accent animate-pulse" />
        </div>

        <h4 className="text-xl font-display font-bold text-text-light mb-2">
          FileForge is Processing...
        </h4>
        <p className="text-sm text-text-sub font-mono mb-6">{processing.statusText}</p>

        {/* Progress bar */}
        <div className="w-full bg-[#1B202E] h-2.5 rounded-full overflow-hidden border border-border-dark/60">
          <div 
            className="h-full bg-gradient-to-r from-primary-accent to-secondary-accent transition-all duration-300"
            style={{ width: `${processing.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-2.5 shrink-0 text-xs font-mono text-text-sub">
          <span>Client-hosted VM pipeline</span>
          <span className="text-secondary-accent font-bold">{processing.progress}%</span>
        </div>

        {/* Live Stopwatch Timer */}
        <div className="flex justify-center items-center mt-4 text-[13px] font-mono text-[#8892A4] gap-1.5">
          <span id="live-processing-timer">⏱ 0.0s</span>
        </div>
      </div>
    );
  }

  const handleDownloadClick = () => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFilename || resultFileName || 'fileforge-output';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  const renderPreviewContent = () => {
    switch (activeTool) {
      case 'pdf-compress':
        return (
          <div className="bg-[#11141D] rounded-xl p-4 border border-border-dark flex flex-col items-center">
            {resultUrl && (
              <div className="max-h-[380px] overflow-y-auto w-full flex justify-center">
                <PdfPagePreview pdfUrl={resultUrl} />
              </div>
            )}
          </div>
        );

      case 'jpeg-compress':
        return (
          <ImageCompareSlider 
            originalUrl={originalPreviewUrl || null} 
            compressedUrl={resultUrl || null} 
            originalSize={compressionResult?.originalSize || (selectedFiles[0] ? selectedFiles[0].size : 1000)}
            compressedSize={compressionResult?.compressedSize || (outputBlob ? outputBlob.size : 500)}
          />
        );

      case 'image-resize': {
        const d = resultStatsText?.value.match(/(\d+)\s*×\s*(\d+)/);
        const w = d ? d[1] : (resizePercent ? Math.round((imgOriginalDimensions?.w || 0) * (resizePercent/100)) : resizeWidth);
        const h = d ? d[2] : (resizePercent ? Math.round((imgOriginalDimensions?.h || 0) * (resizePercent/100)) : resizeHeight);
        return (
          <div className="bg-[#11141D] rounded-xl p-4 border border-border-dark flex flex-col items-center gap-3">
            {resultUrl && <img src={resultUrl} className="max-h-[300px] object-contain rounded-lg shadow-md" alt="Resized output" />}
            <div className="text-center">
              <p className="text-sm font-bold text-secondary-accent font-display">New dimensions: {w} × {h} px</p>
              {imgOriginalDimensions && (
                <p className="text-xs text-text-sub mt-1">
                  Originally: {imgOriginalDimensions.w} × {imgOriginalDimensions.h} px
                </p>
              )}
            </div>
          </div>
        );
      }

      case 'image-enhance':
        return (
          <div className="bg-[#11141D] rounded-xl p-4 border border-border-dark flex flex-col items-center gap-3">
            {resultUrl && <img src={resultUrl} className="max-h-[300px] object-contain rounded-lg shadow-md" alt="Enhanced output" />}
            <div className="text-center px-4 py-2 bg-[#6C63FF]/5 rounded-lg border border-[#6C63FF]/15">
              <p className="text-xs text-text-sub font-mono leading-relaxed">
                Applied adjustments: Brightness {bgSlider > 0 ? `+${bgSlider}` : bgSlider}% · Contrast {ctSlider > 0 ? `+${ctSlider}` : ctSlider}% · Saturation {stSlider > 0 ? `+${stSlider}` : stSlider}% · Sharpness {shSlider > 0 ? `+${shSlider}` : shSlider}%
              </p>
            </div>
          </div>
        );

      case 'jpeg-to-pdf':
        return (
          <JpegToPdfPreview pdfUrl={resultUrl || ''} images={reorderableImages} />
        );

      case 'word-to-pdf':
        return (
          <WordToPdfPreview pdfUrl={resultUrl || ''} />
        );

      case 'excel-to-pdf':
        return (
          excelPreviewData ? <ExcelPreview data={excelPreviewData} /> : <div className="text-xs text-text-sub">Assembling Excel spreadsheet grid layout...</div>
        );

      case 'pdf-to-image':
        return (
          <PdfToImagePreview 
            images={pdfToImageResultsList} 
            onReorder={async (newImages) => {
              setPdfToImageResultsList(newImages);
              await rebuildPdfToImageZip(newImages);
              showReorderToast();
            }}
          />
        );

      case 'pdf-to-word':
        return (
          <PdfToWordPreview text={wordPreviewText} />
        );

      case 'merge-pdf':
        return (
          <MergePdfPreview pdfUrl={resultUrl || ''} reorderableFiles={reorderablePdfs} />
        );

      case 'split-pdf':
        return (
          <SplitPdfPreview 
            parts={splitPdfResultsList} 
            onReorder={async (newParts) => {
              setSplitPdfResultsList(newParts);
              await rebuildSplitPdfZip(newParts);
              showReorderToast();
            }}
          />
        );

      default:
        return (
          <div className="bg-[#11141D] rounded-xl p-4 border border-border-dark text-center text-xs text-text-sub">
            Format preview is fully sandboxed.
          </div>
        );
    }
  };

  const renderPreviewPanel = () => {
    const isCompression = activeTool === 'pdf-compress' || activeTool === 'jpeg-compress';
    
    let inputSize = selectedFiles[0]?.size || 0;
    if (activeTool === 'jpeg-to-pdf') {
      inputSize = reorderableImages.reduce((sum, img) => sum + img.file.size, 0);
    } else if (activeTool === 'merge-pdf') {
      inputSize = reorderablePdfs.reduce((sum, f) => sum + f.file.size, 0);
    }

    const outputSize = outputBlob?.size || 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6 pt-2"
        id="preview-result-panel"
      >
        <div className="text-left flex items-center justify-between border-b border-border-dark pb-2">
          <span className="text-[10px] uppercase tracking-wider font-mono text-text-sub font-bold block mb-1">
            Preview Result
          </span>
          <span className="text-[10px] uppercase font-mono text-secondary-accent font-bold">✓ Ready for Export</span>
        </div>

        {/* Dynamic preview canvas / views */}
        <div className="w-full">
          {renderPreviewContent()}
        </div>

        {/* Speed timing indicator */}
        {speedIndicatorConfig && (
          <div className="border-b border-[#252A36] pb-5 mt-6 mb-5 w-full">
            {showSpeedIndicator(speedIndicatorConfig)}
          </div>
        )}

        {/* Stats view */}
        <div className="mt-6">
          {isCompression ? (
            <StatsDisplay 
              originalSize={compressionResult?.originalSize || inputSize}
              outputSize={compressionResult?.compressedSize || outputSize}
            />
          ) : (
            <StatsDisplay 
              originalSize={inputSize}
              outputSize={outputSize}
              customLabel={
                activeTool === 'jpeg-to-pdf' ? 'Page Count' :
                activeTool === 'pdf-to-image' ? 'Images Packed' :
                activeTool === 'pdf-to-word' ? 'Extracted Format' :
                activeTool === 'split-pdf' ? 'Split Parts' :
                activeTool === 'merge-pdf' ? 'Merged Units' : undefined
              }
              customValue={
                activeTool === 'jpeg-to-pdf' ? `${reorderableImages.length} frames` :
                activeTool === 'pdf-to-image' ? `${pdfToImageResultsList.length} pages` :
                activeTool === 'pdf-to-word' ? 'DOCX Document' :
                activeTool === 'split-pdf' ? 'ZIP Archive' :
                activeTool === 'merge-pdf' ? `${reorderablePdfs.length} files` : undefined
              }
            />
          )}
        </div>

        <div className="h-px bg-[#252A36] my-6"></div>

        {/* Buttons and call to action notes */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleDownloadClick(); }}
            className="flex-1 py-3.5 px-6 bg-secondary-accent hover:bg-secondary-accent/90 text-bg-dark font-display font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(0,212,170,0.25)] flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Sparkles className="w-4 h-4 text-bg-dark font-bold" />
            ⬇ Download Output
          </button>
          
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowPreview(false); }}
            className="flex-1 py-3.5 px-6 border border-[#6C63FF] text-primary-accent hover:bg-primary-accent/10 font-display font-medium rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Sliders className="w-4 h-4 text-primary-accent" />
            ⚙ Adjust Settings
          </button>
        </div>

        <p className="text-[10px] uppercase font-mono text-text-sub tracking-tight text-center leading-normal">
          ✓ Looks good? Hit Download. Not happy? Adjust and re-process.
        </p>
      </motion.div>
    );
  };

  // =========================================================================
  // BATCH PROCESSING HELPER LOGIC AND VIEWS
  // =========================================================================

  const validateBatchFile = (file: File, acceptedTypes: string[]): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const lowerAccepted = acceptedTypes.map(t => t.toLowerCase());
    
    if (lowerAccepted.includes(ext)) return true;
    
    const mime = file.type.toLowerCase();
    return lowerAccepted.some(acceptedType => {
      if (acceptedType === '.pdf' && mime === 'application/pdf') return true;
      if ((acceptedType === '.jpg' || acceptedType === '.jpeg') && mime === 'image/jpeg') return true;
      if (acceptedType === '.png' && mime === 'image/png') return true;
      if (acceptedType === '.webp' && mime === 'image/webp') return true;
      if (acceptedType === '.docx' && (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/msword')) return true;
      if (acceptedType === '.xlsx' && (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.ms-excel')) return true;
      return false;
    });
  };

  const addFilesToBatchQueue = (filesList: File[]) => {
    const newWarnings: string[] = [];
    const validFilesToAdd: File[] = [];

    filesList.forEach((file) => {
      if (!validateBatchFile(file, fileConfig.types)) {
        newWarnings.push(`${file.name} skipped — unsupported format`);
        return;
      }
      validFilesToAdd.push(file);
    });

    if (newWarnings.length > 0) {
      setBatchWarnings(prev => [...prev, ...newWarnings]);
    }

    setBatchFiles(prev => {
      const combined = [...prev, ...validFilesToAdd];
      return combined.slice(0, 20); // Cap strictly at 20 list limit
    });
  };

  const addFilesToMergeGroup = (groupId: string, filesList: File[]) => {
    const validPdfs = filesList.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    setMergeGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const combined = [...g.files, ...validPdfs];
        return { ...g, files: combined.slice(0, 20) };
      }
      return g;
    }));
  };

  const moveBatchFile = (index: number, direction: 'up' | 'down') => {
    setBatchFiles(prev => {
      const list = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIdx];
      list[targetIdx] = temp;
      return list;
    });
    showReorderToast("Processing order updated — files will be processed top to bottom.");
  };

  const moveGroupFile = (groupId: string, index: number, direction: 'up' | 'down') => {
    setMergeGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const list = [...g.files];
        const targetIdx = direction === 'up' ? index - 1 : index + 1;
        if (targetIdx < 0 || targetIdx >= list.length) return g;
        const temp = list[index];
        list[index] = list[targetIdx];
        list[targetIdx] = temp;
        return { ...g, files: list };
      }
      return g;
    }));
    showReorderToast();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return (
        <svg className="w-5 h-5 text-[#6C63FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return (
        <svg className="w-5 h-5 text-[#6C63FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    } else if (ext === 'docx') {
      return (
        <svg className="w-5 h-5 text-[#6C63FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      );
    } else if (ext === 'xlsx') {
      return (
        <svg className="w-5 h-5 text-[#6C63FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
          <line x1="8" y1="9" x2="10" y2="9" />
        </svg>
      );
    }
    return <FileText className="w-5 h-5 text-[#6C63FF]" />;
  };

  const getBatchSpeedStats = () => {
    const completed = batchResults.filter(r => r.status === 'complete' || r.status === 'error');
    if (completed.length === 0) {
      return "💡 Starting job dispatch pipeline...";
    }
    
    let totalSecs = 0;
    let count = 0;
    completed.forEach(c => {
      const num = parseFloat(c.elapsed);
      if (!isNaN(num)) {
        totalSecs += num;
        count++;
      }
    });
    
    const avg = count > 0 ? (totalSecs / count) : 0;
    const remainingCount = batchResults.length - completed.length;
    const estimatedRemaining = (avg * remainingCount).toFixed(1);
    
    return `⚡ Avg processing speed: ${avg.toFixed(1)}s per file · Estimated ${estimatedRemaining}s remaining`;
  };

  const getBatchSummaryStats = () => {
    const succeeded = batchResults.filter(r => r.status === 'complete');
    const totalIn = succeeded.reduce((sum, r) => sum + r.inputSize, 0);
    const totalOut = succeeded.reduce((sum, r) => sum + r.outputSize, 0);
    const difference = totalIn - totalOut;
    
    let totalTimeStr = '0.0s';
    if (batchStartTime) {
      totalTimeStr = ((Date.now() - batchStartTime) / 1000).toFixed(1) + 's';
    }
    
    const savedVal = difference > 0 ? formatFileSize(difference) : '0 B';
    
    return {
      succeededCount: succeeded.length,
      failedCount: batchResults.filter(r => r.status === 'error').length,
      savedText: difference > 0 ? `${savedVal} saved across all files` : `${formatFileSize(totalOut)} total output size`,
      totalTime: totalTimeStr
    };
  };

  const getBatchZipFilename = () => {
    switch (activeTool) {
      case 'pdf-compress': return 'fileforge_compressed_pdfs.zip';
      case 'jpeg-compress': return 'fileforge_compressed_images.zip';
      case 'image-resize': return 'fileforge_resized_images.zip';
      case 'image-enhance': return 'fileforge_enhanced_images.zip';
      case 'jpeg-to-pdf': return 'fileforge_converted_pdfs.zip';
      case 'word-to-pdf': return 'fileforge_word_to_pdf.zip';
      case 'excel-to-pdf': return 'fileforge_excel_to_pdf.zip';
      case 'pdf-to-image': return 'fileforge_pdf_to_images.zip';
      case 'pdf-to-word': return 'fileforge_pdf_to_word.zip';
      case 'merge-pdf': return 'fileforge_merged_pdfs.zip';
      case 'split-pdf': return 'fileforge_split_pdfs.zip';
      default: return `fileforge_batch_${Date.now()}.zip`;
    }
  };

  const handleDownloadAllAsZip = async () => {
    setIsZipping(true);
    setBatchZipProgress(0);
    
    try {
      const zip = new JSZip();
      
      for (const res of batchResults) {
        if (res.status === 'complete' && res.blob) {
          if (activeTool === 'pdf-to-image' || activeTool === 'split-pdf') {
            const subZip = await JSZip.loadAsync(res.blob);
            const folderName = res.file.name.replace(/\.[^/.]+$/, '');
            
            const promises: Promise<void>[] = [];
            subZip.forEach((relativePath, fileObj) => {
              promises.push(
                fileObj.async('blob').then(b => {
                  zip.file(`${folderName}/${relativePath}`, b);
                })
              );
            });
            await Promise.all(promises);
          } else {
            zip.file(res.outputFilename, res.blob);
          }
        }
      }
      
      const zipBlob = await zip.generateAsync(
        { type: 'blob' },
        (metadata) => {
          setBatchZipProgress(Math.round(metadata.percent));
        }
      );
      
      setBatchZipBlob(zipBlob);
      
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getBatchZipFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Failed to generate ZIP", err);
    } finally {
      setIsZipping(false);
      setBatchZipProgress(null);
    }
  };

  const handleDownloadIndividualFile = (result: BatchFileResult) => {
    if (!result.blob) return;
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.outputFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRetryIndividualFile = async (index: number) => {
    if (index === -1) return;
    const updated = [...batchResults];
    updated[index].status = 'processing';
    updated[index].error = null;
    setBatchResults([...updated]);
    
    const file = updated[index].file;
    const tStart = Date.now();
    
    try {
      let resultBlob: Blob | null = null;
      let outName = '';
      
      switch (activeTool) {
        case 'pdf-compress': {
          const res = await compressPdfWorker(file, pdfQuality, () => {});
          resultBlob = await fetch(res.downloadUrl).then(r => r.blob());
          outName = `compressed_${file.name}`;
          break;
        }
        case 'jpeg-compress': {
          const res = await compressJpegWorker(file, jpegQuality, () => {});
          resultBlob = await fetch(res.downloadUrl).then(r => r.blob());
          outName = `compressed_${file.name}`;
          break;
        }
        case 'image-resize': {
          const params: ResizeParams = {
            mode: resizerMode,
            aspectRatioLocked: lockAspectRatio,
            ...(resizerMode === 'pixels'
              ? { width: resizeWidth, height: resizeHeight }
              : { percentage: resizePercent })
          };
          const res = await resizeImageWorker(file, params, () => {});
          resultBlob = await fetch(res.downloadUrl).then(r => r.blob());
          outName = file.name.replace(/\.[^/.]+$/, '') + `_resized_${res.width}x${res.height}` + file.name.substring(file.name.lastIndexOf('.'));
          break;
        }
        case 'image-enhance': {
          const params: EnhancementParams = {
            brightness: bgSlider,
            contrast: ctSlider,
            saturation: stSlider,
            sharpness: shSlider
          };
          const resUrl = await enhanceImageWorker(file, params, () => {});
          resultBlob = await fetch(resUrl).then(r => r.blob());
          outName = file.name.replace(/\.[^/.]+$/, '') + '_enhanced' + file.name.substring(file.name.lastIndexOf('.'));
          break;
        }
        case 'jpeg-to-pdf': {
          const resUrl = await jpegToPdfWorker(
            [{ id: file.name, file, previewUrl: '', size: file.size, name: file.name }],
            jpegToPdfPageSize,
            () => {}
          );
          resultBlob = await fetch(resUrl).then(r => r.blob());
          outName = `converted_${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
          break;
        }
        case 'word-to-pdf': {
          const resUrl = await wordToPdfWorker(file, () => {});
          resultBlob = await fetch(resUrl).then(r => r.blob());
          outName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
          break;
        }
        case 'excel-to-pdf': {
          const resObj = await excelToPdfWorker(file, () => {});
          resultBlob = await fetch(resObj.url).then(r => r.blob());
          outName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
          break;
        }
        case 'pdf-to-image': {
          const res = await pdfToImageWorker(file, pdfToImageFormat, () => {});
          resultBlob = res.zipBlob;
          outName = file.name.replace(/\.[^/.]+$/, '') + '_pages_images.zip';
          break;
        }
        case 'pdf-to-word': {
          const resObj = await pdfToWordWorker(file, () => {});
          resultBlob = resObj.docxBlob;
          outName = file.name.replace(/\.[^/.]+$/, '') + '.docx';
          break;
        }
        case 'split-pdf': {
          let opt: SplitOption;
          if (splitProfile === 'everyN') {
            opt = { type: 'everyN', value: splitEveryN };
          } else if (splitProfile === 'ranges') {
            opt = { type: 'ranges', value: splitRanges };
          } else {
            opt = { type: 'single', pagesList: splitSingleSelection.length > 0 ? splitSingleSelection : [1] };
          }
          let pgCount = 1;
          try { pgCount = await getPdfPageCount(file); } catch (e) {}
          resultBlob = await splitPdfWorker(file, opt, pgCount, () => {});
          outName = file.name.replace(/\.[^/.]+$/, '') + '_split_bundle.zip';
          break;
        }
      }
      
      updated[index].status = 'complete';
      updated[index].outputFilename = outName;
      updated[index].blob = resultBlob;
      updated[index].outputSize = resultBlob ? resultBlob.size : 0;
      updated[index].elapsed = ((Date.now() - tStart) / 1000).toFixed(1) + 's';
      
    } catch (err: any) {
      updated[index].status = 'error';
      updated[index].error = err.message || 'Processing failed';
    }
    
    setBatchResults([...updated]);
  };

  const processNextBatchItem = async (index: number, currentResults: BatchFileResult[], batchStartMs: number) => {
    if (index >= currentResults.length) {
      setIsBatchProcessing(false);
      
      const toolLabel = TOOLS_LIST.find(t => t.id === activeTool)?.name || activeTool;
      const toolIcon = TOOLS_LIST.find(t => t.id === activeTool)?.icon || 'FileText';
      const batchCount = currentResults.length;
      
      const totalInput = currentResults.reduce((sum, item) => sum + item.inputSize, 0);
      const totalOutput = currentResults.reduce((sum, item) => sum + item.outputSize, 0);
      const elapsedSecs = ((Date.now() - batchStartMs) / 1000).toFixed(1) + 's';
      
      const batchEntries = currentResults.map((item, idx) => {
        let subSettings: any = {};
        let subSettingsLabel = '';
        
        switch (activeTool) {
          case 'pdf-compress':
            subSettings = { quality: pdfQuality };
            subSettingsLabel = pdfQuality.charAt(0).toUpperCase() + pdfQuality.slice(1);
            break;
          case 'jpeg-compress':
            subSettings = { quality: jpegQuality };
            subSettingsLabel = `Quality: ${jpegQuality}%`;
            break;
          case 'image-resize':
            subSettings = { mode: resizerMode, percent: resizePercent, w: resizeWidth, h: resizeHeight };
            subSettingsLabel = resizerMode === 'pixels' ? `${resizeWidth}×${resizeHeight}px` : `${resizePercent}%`;
            break;
          case 'image-enhance':
            subSettings = { brightness: bgSlider, contrast: ctSlider, saturation: stSlider, sharpness: shSlider };
            subSettingsLabel = `B:${bgSlider}% C:${ctSlider}% S:${stSlider}%`;
            break;
          default:
            subSettings = {};
            subSettingsLabel = "Processed";
        }
        
        return {
          tool: activeTool,
          toolLabel,
          toolIcon,
          inputFilename: item.file.name || `File ${idx + 1}`,
          inputSize: item.inputSize,
          inputFile: item.file,
          outputFilename: item.outputFilename || 'unnamed',
          outputSize: item.outputSize,
          outputBlob: item.blob,
          settings: subSettings,
          settingsLabel: subSettingsLabel,
          elapsed: item.elapsed,
          status: item.status === 'complete' ? 'success' as const : 'error' as const,
          errorMessage: item.error,
          isBatch: false,
          batchCount: 1
        };
      });
      
      addHistoryEntry({
        tool: activeTool,
        toolLabel: `Batch: ${toolLabel}`,
        toolIcon: 'Files',
        inputFilename: `Batch: ${batchCount} files`,
        inputSize: totalInput,
        inputFile: null,
        outputFilename: `Batch results`,
        outputSize: totalOutput,
        outputBlob: null,
        settings: { count: batchCount },
        settingsLabel: `${batchCount} files processed`,
        elapsed: elapsedSecs,
        status: 'success',
        errorMessage: null,
        isBatch: true,
        batchCount,
        batchEntries
      });
      
      return;
    }
    
    const updated = [...currentResults];
    if (updated[index].status === 'error') {
      setBatchCurrentIndex(index + 1);
      processNextBatchItem(index + 1, updated, batchStartMs);
      return;
    }
    
    updated[index].status = 'processing';
    setBatchResults(updated);
    setBatchCurrentIndex(index);
    
    const file = updated[index].file;
    const tStart = Date.now();
    
    try {
      let resultBlob: Blob | null = null;
      let outName = '';
      
      switch (activeTool) {
        case 'pdf-compress': {
          const res = await compressPdfWorker(file, pdfQuality, (_) => {});
          resultBlob = await fetch(res.downloadUrl).then(r => r.blob());
          outName = `compressed_${file.name}`;
          break;
        }
        
        case 'jpeg-compress': {
          const res = await compressJpegWorker(file, jpegQuality, (_) => {});
          resultBlob = await fetch(res.downloadUrl).then(r => r.blob());
          outName = `compressed_${file.name}`;
          break;
        }
        
        case 'image-resize': {
          const params: ResizeParams = {
            mode: resizerMode,
            aspectRatioLocked: lockAspectRatio,
            ...(resizerMode === 'pixels'
              ? { width: resizeWidth, height: resizeHeight }
              : { percentage: resizePercent })
          };
          const res = await resizeImageWorker(file, params, (_) => {});
          resultBlob = await fetch(res.downloadUrl).then(r => r.blob());
          outName = file.name.replace(/\.[^/.]+$/, '') + `_resized_${res.width}x${res.height}` + file.name.substring(file.name.lastIndexOf('.'));
          break;
        }
        
        case 'image-enhance': {
          const params: EnhancementParams = {
            brightness: bgSlider,
            contrast: ctSlider,
            saturation: stSlider,
            sharpness: shSlider
          };
          const resUrl = await enhanceImageWorker(file, params, (_) => {});
          resultBlob = await fetch(resUrl).then(r => r.blob());
          outName = file.name.replace(/\.[^/.]+$/, '') + '_enhanced' + file.name.substring(file.name.lastIndexOf('.'));
          break;
        }
        
        case 'jpeg-to-pdf': {
          if (jpgToPdfSubMode === 'combined') {
            const reorderables = batchFiles.map((f, i) => ({ id: f.name + '-' + i, file: f, previewUrl: '', size: f.size, name: f.name }));
            const resUrl = await jpegToPdfWorker(reorderables, jpegToPdfPageSize, (_) => {});
            resultBlob = await fetch(resUrl).then(r => r.blob());
            outName = 'fileforge_combined.pdf';
          } else {
            const resUrl = await jpegToPdfWorker([{ id: file.name, file, previewUrl: '', size: file.size, name: file.name }], jpegToPdfPageSize, (_) => {});
            resultBlob = await fetch(resUrl).then(r => r.blob());
            outName = `converted_${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
          }
          break;
        }
        
        case 'word-to-pdf': {
          const resUrl = await wordToPdfWorker(file, (_) => {});
          resultBlob = await fetch(resUrl).then(r => r.blob());
          outName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
          break;
        }
        
        case 'excel-to-pdf': {
          const resObj = await excelToPdfWorker(file, (_) => {});
          resultBlob = await fetch(resObj.url).then(r => r.blob());
          outName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
          break;
        }
        
        case 'pdf-to-image': {
          const res = await pdfToImageWorker(file, pdfToImageFormat, (_) => {});
          resultBlob = res.zipBlob;
          outName = file.name.replace(/\.[^/.]+$/, '') + '_pages_images.zip';
          break;
        }
        
        case 'pdf-to-word': {
          const resObj = await pdfToWordWorker(file, (_) => {});
          resultBlob = resObj.docxBlob;
          outName = file.name.replace(/\.[^/.]+$/, '') + '.docx';
          break;
        }
        
        case 'merge-pdf': {
          const group = mergeGroups[index];
          const reorderables = group.files.map((gFile, gIdx) => ({ id: gFile.name + '-' + gIdx, file: gFile }));
          const resUrl = await mergePdfWorker(reorderables, (_) => {});
          resultBlob = await fetch(resUrl).then(r => r.blob());
          outName = `${group.name}.pdf`;
          break;
        }
        
        case 'split-pdf': {
          let opt: SplitOption;
          if (splitProfile === 'everyN') {
            opt = { type: 'everyN', value: splitEveryN };
          } else if (splitProfile === 'ranges') {
            opt = { type: 'ranges', value: splitRanges };
          } else {
            opt = { type: 'single', pagesList: splitSingleSelection.length > 0 ? splitSingleSelection : [1] };
          }
          let pgCount = 1;
          try { pgCount = await getPdfPageCount(file); } catch (e) {}
          resultBlob = await splitPdfWorker(file, opt, pgCount, (_) => {});
          outName = file.name.replace(/\.[^/.]+$/, '') + '_split_bundle.zip';
          break;
        }
      }
      
      const elapsedSecs = ((Date.now() - tStart) / 1000).toFixed(1) + 's';
      
      updated[index].status = 'complete';
      updated[index].outputFilename = outName;
      updated[index].blob = resultBlob;
      updated[index].outputSize = resultBlob ? resultBlob.size : 0;
      updated[index].elapsed = elapsedSecs;
      
    } catch (err: any) {
      console.error("Batch error", err);
      updated[index].status = 'error';
      updated[index].error = err.message || 'Processing failed';
      updated[index].elapsed = ((Date.now() - tStart) / 1000).toFixed(1) + 's';
    }
    
    setBatchResults([...updated]);
    setBatchCurrentIndex(index + 1);
    
    setTimeout(() => {
      processNextBatchItem(index + 1, updated, batchStartMs);
    }, 100);
  };

  const handleProcessBatch = async () => {
    setIsBatchProcessing(true);
    setIsZipping(false);
    setBatchZipBlob(null);
    setBatchZipProgress(null);
    
    const startTimeVal = Date.now();
    setBatchStartTime(startTimeVal);
    setBatchCurrentIndex(0);
    
    let initialResults: BatchFileResult[];
    if (activeTool === 'jpeg-to-pdf' && jpgToPdfSubMode === 'combined') {
      initialResults = [{
        file: new File([], 'fileforge_combined.pdf'),
        outputFilename: 'fileforge_combined.pdf',
        blob: null,
        status: 'waiting',
        error: null,
        inputSize: batchFiles.reduce((sum, f) => sum + f.size, 0),
        outputSize: 0,
        elapsed: '0s'
      }];
    } else if (activeTool === 'merge-pdf') {
      initialResults = mergeGroups.filter(g => g.files.length > 0).map(group => {
        return {
          file: new File([], `${group.name}.pdf`),
          outputFilename: `${group.name}.pdf`,
          blob: null,
          status: 'waiting',
          error: null,
          inputSize: group.files.reduce((sum, f) => sum + f.size, 0),
          outputSize: 0,
          elapsed: '0s'
        };
      });
    } else {
      initialResults = batchFiles.map(file => {
        const tooLarge = file.size > 50 * 1024 * 1024;
        return {
          file,
          outputFilename: '',
          blob: null,
          status: tooLarge ? 'error' : 'waiting',
          error: tooLarge ? 'File too large — max 50MB limits' : null,
          inputSize: file.size,
          outputSize: 0,
          elapsed: '0.0s'
        };
      });
    }
    
    setBatchResults(initialResults);
    processNextBatchItem(0, initialResults, startTimeVal);
  };

  const renderJpgToPdfBatchSubMode = () => {
    return (
      <div className="mt-4 pt-4 border-t border-[#252A36]/60">
        <h5 className="text-xs uppercase tracking-wider text-[#8892A4] font-bold mb-3">
          Batch Conversion Mode:
        </h5>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-2 text-white text-sm cursor-pointer select-none">
            <input
              type="radio"
              name="jpgToPdfSubMode"
              checked={jpgToPdfSubMode === 'individual'}
              onChange={() => setJpgToPdfSubMode('individual')}
              className="w-4 h-4 accent-[#6C63FF] cursor-pointer"
            />
            <span>One PDF per image (Batch ZIP)</span>
          </label>
          <label className="flex items-center gap-2 text-white text-sm cursor-pointer select-none">
            <input
              type="radio"
              name="jpgToPdfSubMode"
              checked={jpgToPdfSubMode === 'combined'}
              onChange={() => setJpgToPdfSubMode('combined')}
              className="w-4 h-4 accent-[#6C63FF] cursor-pointer"
            />
            <span>All images into one PDF</span>
          </label>
        </div>
      </div>
    );
  };

  const getBatchTotalInfo = () => {
    if (activeTool === 'merge-pdf') {
      const activeGroupsWithFiles = mergeGroups.filter(g => g.files.length > 0);
      const totalGroupFiles = activeGroupsWithFiles.reduce((sum, g) => sum + g.files.length, 0);
      return `${activeGroupsWithFiles.length} groups · ${totalGroupFiles} files`;
    }
    const totSize = batchFiles.reduce((sum, f) => sum + f.size, 0);
    return `${batchFiles.length} files · ${formatFileSize(totSize)}`;
  };

  const isBatchModeProcessReady = () => {
    if (activeTool === 'merge-pdf') {
      return mergeGroups.some(g => g.files.length > 0);
    }
    return batchFiles.length > 0;
  };

  const getBatchProcessButtonLabel = () => {
    if (activeTool === 'merge-pdf') {
      const activeCount = mergeGroups.filter(g => g.files.length > 0).length;
      return `⚡ Process All ${activeCount} Merge Groups →`;
    }
    return `⚡ Process All ${batchFiles.length} Files →`;
  };

  const renderBatchProcessingDashboard = () => {
    const compCount = batchResults.filter(r => r.status === 'complete' || r.status === 'error').length;
    const pct = batchResults.length > 0 ? Math.round((compCount / batchResults.length) * 100) : 0;
    const formattedStartTime = batchStartTime ? new Date(batchStartTime).toLocaleTimeString() : 'Just now';
    
    return (
      <div className="text-left animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#252A36] pb-4 mb-4 gap-2">
          <div>
            <h3 className="text-xl font-display font-bold text-white">Processing Batch</h3>
            <p className="text-[13px] text-[#8892A4] mt-0.5">
              {batchResults.length} assets · Started {formattedStartTime}
            </p>
          </div>
          <div className="text-sm font-semibold text-white bg-[#1E2330] px-3 py-1.5 rounded-full border border-[#252A36]">
            {compCount} of {batchResults.length} complete
          </div>
        </div>

        <div className="w-full bg-[#12151D] h-2 rounded-full overflow-hidden border border-[#252A36] mt-4" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div 
            className="h-full bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-xs font-mono text-[#8892A4]">
          <span>Overall progress</span>
          <span className="text-[#00D4AA] font-bold">{pct}% complete</span>
        </div>

        <div className="mt-3.5 text-xs font-medium text-[#8892A4] bg-[#252A36]/20 p-2.5 rounded-lg border border-[#252A36]/60">
          {getBatchSpeedStats()}
        </div>

        <div className="mt-6 space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {batchResults.map((res, rIdx) => {
            const isCurrent = rIdx === batchCurrentIndex && isBatchProcessing;
            return (
              <div 
                key={rIdx} 
                className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 ${
                  res.status === 'complete' 
                    ? 'bg-[#161A23] border-[#00D4AA]/30 border-l-[3px] border-l-[#00D4AA]' 
                    : res.status === 'error'
                    ? 'bg-[#161A23] border-[#FF5B5B]/30 border-l-[3px] border-l-[#FF5B5B] animate-horizontal-shake'
                    : isCurrent
                    ? 'bg-[#1E2330] border-[#6C63FF]/30 active-pulse'
                    : 'bg-[#161A23]/60 border-[#252A36]/40 opacity-50'
                }`}
              >
                <div className="flex justify-between items-center w-full gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0">{getFileIcon(res.file.name || res.outputFilename)}</div>
                    <span className="text-white text-[13px] font-medium truncate max-w-[140px] sm:max-w-[200px]" title={res.file.name || res.outputFilename}>
                      {res.file.name || res.outputFilename}
                    </span>
                    <span className="text-[#8892A4] text-xs font-mono">{formatFileSize(res.inputSize)}</span>
                  </div>

                  <div className="shrink-0 text-xs font-semibold">
                    {res.status === 'waiting' && (
                      <span className="text-[#8892A4] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#8892A4]" /> Waiting...
                      </span>
                    )}
                    {res.status === 'processing' && (
                      <span className="text-[#6C63FF] flex items-center gap-1.5 animate-pulse">
                        <span className="w-3 h-3 border-2 border-t-transparent border-[#6C63FF] rounded-full animate-spin" /> Processing...
                      </span>
                    )}
                    {res.status === 'complete' && (
                      <span className="text-[#00D4AA] flex items-center gap-1.5 font-bold animate-pop-in">
                        ✓ Done · {formatFileSize(res.outputSize)}
                      </span>
                    )}
                    {res.status === 'error' && (
                      <span className="text-[#FF5B5B] flex items-center gap-1.5">
                        × Failed
                      </span>
                    )}
                  </div>
                </div>

                {res.status === 'processing' && (
                  <div className="w-full bg-[#0D0F14] h-1 rounded-full overflow-hidden mt-1 relative">
                    <div className="h-full bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] animate-pulse w-full" />
                  </div>
                )}

                {res.status === 'error' && res.error && (
                  <div className="text-[11px] text-[#FF5B5B] mt-0.5 bg-[#FF5B5B]/10 p-2 rounded border border-[#FF5B5B]/20">
                    ⚠️ {res.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBatchResultsPanel = () => {
    const stats = getBatchSummaryStats();
    const succeeded = batchResults.filter(r => r.status === 'complete');
    const failed = batchResults.filter(r => r.status === 'error');
    
    return (
      <div className="text-left animate-bounce-in" aria-live="polite">
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#00D4AA]/10 rounded-full border border-[#00D4AA]/25 flex items-center justify-center text-[#00D4AA]">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-display font-bold text-white">Batch Complete!</h3>
          <p className="text-[#8892A4] mt-1.5 text-base">
            {stats.succeededCount} files processed successfully
          </p>
          {stats.failedCount > 0 && (
            <p className="text-[#FF5B5B] text-xs font-semibold mt-1">
              {stats.succeededCount} succeeded · <span className="underline">{stats.failedCount} failed</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-[#161A23] border border-[#252A36] p-4 rounded-xl text-center">
            <span className="text-[#8892A4] text-[11px] font-semibold uppercase tracking-wider block mb-1">Processed</span>
            <span className="text-[#6C63FF] text-xl font-extrabold">{stats.succeededCount}</span>
          </div>
          <div className="bg-[#161A23] border border-[#252A36] p-4 rounded-xl text-center">
            <span className="text-[#8892A4] text-[11px] font-semibold uppercase tracking-wider block mb-1">Savings / Stats</span>
            <span className="text-[#00D4AA] text-xs sm:text-sm font-extrabold block truncate title-clip mt-1">{stats.savedText}</span>
          </div>
          <div className="bg-[#161A23] border border-[#252A36] p-4 rounded-xl text-center">
            <span className="text-[#8892A4] text-[11px] font-semibold uppercase tracking-wider block mb-1">Total Time</span>
            <span className="text-white text-xl font-extrabold">{stats.totalTime}</span>
          </div>
        </div>

        {succeeded.length > 0 && (
          <div className="mt-8">
            <h4 className="text-white text-sm font-bold pb-2.5 border-b border-[#252A36] mb-3">
              Succeeded Items ({succeeded.length})
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {succeeded.map((res, idx) => (
                <div key={'s-' + idx} className="flex justify-between items-center bg-[#161A23]/80 border border-[#252A36] p-3 rounded-xl gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="block text-white text-[13px] font-medium truncate max-w-[140px] sm:max-w-[280px]" title={res.outputFilename}>
                      {res.outputFilename}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8892A4]">
                      <span className="text-[#00D4AA] font-semibold">{formatFileSize(res.outputSize)}</span>
                      <span className="text-[#252A36]">|</span>
                      <span>processed in {res.elapsed}</span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleDownloadIndividualFile(res)}
                    className="px-3 py-1.5 border border-[#00D4AA] hover:bg-[#00D4AA]/10 text-[#00D4AA] text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors"
                  >
                    ⬇ Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {failed.length > 0 && (
          <div className="mt-8">
            <h4 className="text-[#FF5B5B] text-sm font-bold pb-2.5 border-b border-[#252A36] mb-3 flex items-center justify-between">
              <span>Failed Items ({failed.length})</span>
            </h4>
            <div className="space-y-3">
              {failed.map((res, idx) => {
                const masterIndex = batchResults.findIndex(r => r.file.name === res.file.name);
                return (
                  <div key={'f-' + idx} className="bg-[#FF5B5B]/5 border border-[#FF5B5B]/20 p-3 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[#FF5B5B] text-[13px] font-medium truncate max-w-[200px]" title={res.file.name}>
                          {res.file.name}
                        </span>
                        <span className="block text-[#8892A4] text-xs mt-0.5">
                          Error: {res.error || 'Unknown file error'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRetryIndividualFile(masterIndex)}
                        className="px-3 py-1.5 border border-[#FF5B5B]/40 hover:bg-[#FF5B5B]/10 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors flex items-center gap-1"
                      >
                        ↺ Retry
                      </button>
                    </div>
                  </div>
                );
              })}

              <details className="text-xs bg-[#12151D] border border-[#252A36] rounded-xl p-3 mt-3 cursor-pointer select-none">
                <summary className="font-semibold text-white hover:text-[#6C63FF] transition-colors flex items-center gap-1.5 focus:outline-none">
                  ❓ Why did some files fail? (click to expand)
                </summary>
                <div className="mt-2.5 space-y-1.5 text-[#8892A4] pl-5 list-disc leading-relaxed cursor-auto">
                  <p>• The file may be password-protected or corrupted.</p>
                  <p>• Password-protected files cannot be processed client-side.</p>
                  <p>• File format may not be fully supported by the decoder.</p>
                  <p>• File size may have exceeded standard browser processing quotas.</p>
                </div>
              </details>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {activeTool === 'jpeg-to-pdf' && jpgToPdfSubMode === 'combined' && succeeded.length > 0 ? (
            <button
              type="button"
              onClick={() => handleDownloadIndividualFile(succeeded[0])}
              className="w-full py-4 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0D0F14] font-display font-bold rounded-xl transition-all shadow-[0_4px_20px_rgba(0,212,170,0.25)] flex items-center justify-center gap-2 cursor-pointer text-base animate-pulse-glow animate-once"
            >
              ⬇ Download Combined PDF
            </button>
          ) : succeeded.length > 0 ? (
            <div className="space-y-2">
              {isZipping && (
                <div className="mb-2 p-3 bg-[#12151D] border border-[#252A36] rounded-xl text-center">
                  <p className="text-xs text-[#8892A4] mb-1.5">Creating ZIP file... {batchZipProgress}%</p>
                  <div className="w-full bg-[#0D0F14] h-1.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={batchZipProgress || 0} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-[#6C63FF] transition-all duration-150" style={{ width: `${batchZipProgress}%` }} />
                  </div>
                </div>
              )}
              <button
                type="button"
                disabled={isZipping}
                onClick={handleDownloadAllAsZip}
                className={`w-full py-4 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0D0F14] font-display font-bold rounded-xl transition-all ${
                  isZipping ? 'opacity-50 cursor-not-allowed' : 'shadow-[0_4px_20px_rgba(0,212,170,0.25)] cursor-pointer animate-pulse-glow'
                } flex items-center justify-center gap-2 text-base`}
              >
                📥 Download All as ZIP
              </button>
            </div>
          ) : (
            <div className="text-center p-3 text-sm text-[#FF5B5B] bg-[#FF5B5B]/10 border border-[#FF5B5B]/20 rounded-xl">
              No files were successfully processed.
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setBatchFiles([]);
              setBatchResults([]);
              setIsBatchProcessing(false);
              setBatchStartTime(null);
              setBatchCurrentIndex(0);
              setBatchWarnings([]);
              setMergeGroups([{ id: 'group-1', name: 'Merge Group 1', files: [] }]);
              handleReset();
            }}
            className="w-full py-3.5 border border-[#6C63FF] hover:bg-[#6C63FF]/10 text-[#6C63FF] font-display font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            🔄 Process Another Batch
          </button>
        </div>
      </div>
    );
  };

  const renderBatchToggle = () => {
    return (
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-sans font-medium transition-colors duration-200 ${!isBatchMode ? 'text-[#F0F2F8]' : 'text-[#8892A4]'}`}>
            Single File
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isBatchMode}
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              handleReset();
            }}
            className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-[#6C63FF] ${isBatchMode ? 'bg-[#6C63FF]' : 'bg-[#252A36]'}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isBatchMode ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
          <span className={`text-sm font-sans font-medium transition-colors duration-200 ${isBatchMode ? 'text-[#6C63FF] font-bold' : 'text-[#8892A4]'}`}>
            Batch Mode
          </span>
        </div>
        {isBatchMode && (
          <p className="text-xs text-[#8892A4] mt-2 animate-fade-in text-center">
            Upload up to 20 files at once and process them all together
          </p>
        )}
      </div>
    );
  };

  const renderHowToPasteImageSection = () => {
    return (
      <div className="mt-4 p-4 bg-[#12151D]/60 border border-border-dark rounded-xl text-left font-sans animate-fade-in">
        <button
          type="button"
          onClick={() => setHowToPasteExpanded(!howToPasteExpanded)}
          className="text-xs text-[#00D4AA] font-bold flex items-center gap-1.5 focus:outline-none cursor-pointer"
        >
          <span>💡 How to paste different image types</span>
          <span className="text-[9px] transform transition-transform duration-200" style={{ transform: howToPasteExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
        </button>

        {howToPasteExpanded && (
          <div className="mt-3.5 space-y-1.5 border-t border-border-dark p-1 pt-3 divide-y divide-[#252A36]/40">
            {/* ROW 1 */}
            <div className="flex items-center gap-3 py-2 text-xs">
              <span className="text-lg">📸</span>
              <div className="flex-1">
                <span className="font-bold text-text-light block">Screenshot:</span>
                <span className="text-text-sub text-[11px] leading-relaxed">Press Print Screen (Windows) or Cmd+Shift+4 (Mac), then Ctrl+V here</span>
              </div>
            </div>
            
            {/* ROW 2 */}
            <div className="flex items-center gap-3 py-2 text-xs">
              <span className="text-lg">🌐</span>
              <div className="flex-1">
                <span className="font-bold text-text-light block">Image from web:</span>
                <span className="text-text-sub text-[11px] leading-relaxed">Right-click any image &rarr; Copy Image, then Ctrl+V here</span>
              </div>
            </div>

            {/* ROW 3 */}
            <div className="flex items-center gap-3 py-2 text-xs">
              <span className="text-lg">📁</span>
              <div className="flex-1">
                <span className="font-bold text-text-light block">File from computer:</span>
                <span className="text-text-sub text-[11px] leading-relaxed">Open image in any app, Ctrl+A + Ctrl+C, then Ctrl+V here</span>
              </div>
            </div>

            {/* ROW 4 */}
            <div className="flex items-center gap-3 py-2 text-xs">
              <span className="text-lg">📱</span>
              <div className="flex-1">
                <span className="font-bold text-text-light block">From phone:</span>
                <span className="text-text-sub text-[11px] leading-relaxed font-sans">Send image to yourself on WhatsApp/Telegram, open on computer, right-click &rarr; Copy, then Ctrl+V here</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 3. Normal Selection Phase
  const toolContent = SEO_AND_CONTENT_MAP[activeTool];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 1. TOOL HERO SECTION */}
      {toolContent && (activeTool as string) !== 'home' && (activeTool as string) !== 'privacy' && (
        <div className="w-full max-w-3xl mx-auto text-left pt-10 pb-4 pr-4 pl-4 md:pl-0 sm:pt-6 animate-fade-in">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[13px] text-[#8892A4] font-display font-medium mb-3">
            <a href="/" data-navigate="/" className="hover:text-text-light transition-colors hover:underline cursor-pointer">
              Home
            </a>
            <span className="text-[#8892A4]/50">→</span>
            <span className="text-text-light font-semibold">
              {TOOLS_LIST.find(t => t.id === activeTool)?.name || 'Tool'}
            </span>
          </div>

          {/* Badge */}
          <span className="inline-block text-[11.5px] uppercase tracking-widest font-mono text-[#6C63FF] bg-[#6C63FF]/12 px-3 py-1 rounded-full border border-[#6C63FF]/30 font-semibold mb-4">
            {toolContent.badge?.text || 'Tool'}
          </span>

          {/* H1 Title */}
          <h1 className="text-[28px] sm:text-[36px] font-display font-extrabold text-text-light tracking-tight leading-[1.2] mb-3">
            {toolContent.h1}
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] sm:text-[16px] text-[#8892A4] leading-relaxed max-w-[620px] font-sans">
            {toolContent.subtitle}
          </p>

          {/* Trust Badges */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto no-scrollbar py-1">
            <span className="flex-shrink-0 text-xs text-[#8892A4] px-2.5 py-1 border border-[#252A36] rounded-lg bg-[#161A23]">
              🔒 No Upload
            </span>
            <span className="flex-shrink-0 text-xs text-[#8892A4] px-2.5 py-1 border border-[#252A36] rounded-lg bg-[#161A23]">
              ⚡ Instant
            </span>
            <span className="flex-shrink-0 text-xs text-[#8892A4] px-2.5 py-1 border border-[#252A36] rounded-lg bg-[#161A23]">
              ✅ Free Forever
            </span>
            <span className="flex-shrink-0 text-xs text-[#8892A4] px-2.5 py-1 border border-[#252A36] rounded-lg bg-[#161A23]">
              🔑 No Signup
            </span>
          </div>
        </div>
      )}

      {/* 2. TOOL CARD CONTAINER */}
      <div className="w-full max-w-3xl mx-auto space-y-4">
        {/* Reprocess banner */}
        {reprocessBanner && (
          <div className="bg-[#6C63FF]/10 border border-[#6C63FF] rounded-xl p-[10px_16px] flex items-center justify-between text-left animate-fade-in text-xs mb-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#6C63FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="text-text-light font-sans font-medium">
                Reprocessing: <span className="font-bold text-white">{reprocessBanner.filename}</span> — Previously: <span className="text-[#8892A4]">{reprocessBanner.settingsLabel}</span> · <span className="text-[#00D4AA] font-semibold">{reprocessBanner.sizeSaved}</span>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setReprocessBanner(null)}
              className="text-[#8892A4] hover:text-white transition-colors ml-4 text-[13px] hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
        {/* Back button or Context block */}
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 sm:p-8 shadow-xl">
          {showSwitcherHint && (
            <p className="text-xs text-[#00D4AA] mb-4 italic animate-fade-in flex items-center gap-1.5 font-sans font-semibold text-left">
              💡 Tip: Paste (Ctrl+V) works in image tools
            </p>
          )}

        {/* Undo/Redo Action Toolbar */}
        {renderHistoryToolbar()}

        {/* Toggle Mode Select */}
        {!isBatchProcessing && batchResults.length === 0 && renderBatchToggle()}

        {isBatchMode ? (
          /* BATCH CONTAINER BLOCK */
          <>
            {isBatchProcessing ? (
              renderBatchProcessingDashboard()
            ) : batchResults.length > 0 ? (
              renderBatchResultsPanel()
            ) : (
              <>
                {/* Upload Zone / Merge selection */}
                {activeTool === 'merge-pdf' ? (
                  /* Merge Interface */
                  <div className="space-y-4">
                    <p className="text-xs text-[#8892A4] text-left">
                      💡 Upload or group your PDF files below. Each group merges into a single PDF in the final ZIP folder.
                    </p>
                    
                    <div className="flex justify-between items-center pb-2 border-b border-[#252A36]">
                      <span className="text-white text-sm font-bold font-display">PDF Merge Groups</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextId = `group-${Date.now()}`;
                          setMergeGroups(prev => [
                            ...prev,
                            { id: nextId, name: `Merge Group ${prev.length + 1}`, files: [] }
                          ]);
                        }}
                        className="px-3 py-1.5 border border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        + New Merge Group
                      </button>
                    </div>

                    <div className="space-y-4 text-left">
                      {mergeGroups.map((group, groupIdx) => (
                        <div key={group.id} className="border border-[#252A36] bg-[#161A23] rounded-xl p-4">
                          <div className="flex justify-between items-center mb-3">
                            <input
                              type="text"
                              value={group.name}
                              onChange={(e) => {
                                setMergeGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: e.target.value } : g));
                              }}
                              className="bg-transparent text-white font-bold text-sm border-b border-dashed border-[#252A36] hover:border-[#6C63FF] focus:border-[#6C63FF] focus:outline-none px-1 py-0.5"
                            />
                            {mergeGroups.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMergeGroups(prev => prev.filter(g => g.id !== group.id));
                                }}
                                className="text-[#8892A4] hover:text-[#FF5B5B] p-1 rounded transition-colors"
                                title="Remove Merge Group"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {group.files.length > 0 ? (
                            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                               {group.files.map((gFile, fIdx) => (
                                 <div key={fIdx} className="flex items-center justify-between bg-[#0D0F14]/60 p-2 border border-[#252A36]/60 text-xs rounded-xl">
                                   <div className="flex items-center gap-2 min-w-0 flex-1">
                                     <span className="w-5 h-5 shrink-0 bg-[#6C63FF]/15 text-primary-accent text-[10px] font-bold font-mono rounded-full flex items-center justify-center border border-primary-accent/10">
                                       {fIdx + 1}
                                     </span>
                                     <span className="text-white truncate max-w-[140px] sm:max-w-[200px]" title={gFile.name}>{gFile.name}</span>
                                     <span className="text-[#8892A4] font-mono shrink-0 text-[10px]">{formatFileSize(gFile.size)}</span>
                                   </div>
                                   <div className="flex items-center gap-1 shrink-0 ml-2">
                                     <button
                                       type="button"
                                       onClick={(e) => { e.preventDefault(); moveGroupFile(group.id, fIdx, 'up'); }}
                                       disabled={fIdx === 0}
                                       className="p-1 px-1.5 text-text-sub hover:text-secondary-accent disabled:opacity-30 bg-[#1B202E] border border-border-dark rounded cursor-pointer transition-all"
                                       title="Move File Up"
                                     >
                                       <ArrowUp className="w-3.5 h-3.5" />
                                     </button>
                                     <button
                                       type="button"
                                       onClick={(e) => { e.preventDefault(); moveGroupFile(group.id, fIdx, 'down'); }}
                                       disabled={fIdx === group.files.length - 1}
                                       className="p-1 px-1.5 text-text-sub hover:text-secondary-accent disabled:opacity-30 bg-[#1B202E] border border-border-dark rounded cursor-pointer transition-all"
                                       title="Move File Down"
                                     >
                                       <ArrowDown className="w-3.5 h-3.5" />
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => {
                                         setMergeGroups(prev => prev.map(g => {
                                           if (g.id === group.id) {
                                             return { ...g, files: g.files.filter((_, i) => i !== fIdx) };
                                           }
                                           return g;
                                         }));
                                       }}
                                       className="p-1 px-1.5 text-[#8892A4] hover:text-[#FF5B5B] bg-[#1B202E] border border-border-dark rounded cursor-pointer ml-1 transition-all"
                                       title="Remove file"
                                     >
                                       <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                   </div>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#8892A4] mb-3 italic">No PDFs added yet.</p>
                          )}

                          <input
                            type="file"
                            multiple
                            accept=".pdf"
                            id={`file-input-${group.id}`}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                addFilesToMergeGroup(group.id, Array.from(e.target.files));
                                e.target.value = '';
                              }
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`file-input-${group.id}`)?.click()}
                            className="w-full py-2 bg-[#6C63FF]/5 hover:bg-[#6C63FF]/15 border border-dashed border-[#6C63FF]/30 hover:border-[#6C63FF]/60 text-[#6C63FF] text-[12px] font-medium rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                          >
                            Select PDFs for this group
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Standard Batch list */
                  <>
                    {batchFiles.length === 0 ? (
                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('bg-[#6C63FF]/10', 'border-[#6C63FF]', 'shadow-[0_0_15px_rgba(108,99,255,0.25)]');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-[#6C63FF]/10', 'border-[#6C63FF]', 'shadow-[0_0_15px_rgba(108,99,255,0.25)]');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-[#6C63FF]/10', 'border-[#6C63FF]', 'shadow-[0_0_15px_rgba(108,99,255,0.25)]');
                          if (e.dataTransfer.files) {
                            addFilesToBatchQueue(Array.from(e.dataTransfer.files));
                          }
                        }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.multiple = true;
                          input.accept = fileConfig.types.join(',');
                          input.onchange = (e) => {
                            const files = (e.target as HTMLInputElement).files;
                            if (files) {
                              addFilesToBatchQueue(Array.from(files));
                            }
                          };
                          input.click();
                        }}
                        className="border-2 border-dashed border-[#6C63FF]/40 bg-[#6C63FF]/2 rounded-2xl p-10 text-center cursor-pointer hover:border-[#6C63FF] hover:bg-[#6C63FF]/5 hover:shadow-[0_0_10px_rgba(108,99,255,0.15)] transition-all duration-200"
                      >
                        <div className="w-14 h-14 bg-[#6C63FF]/10 rounded-full mx-auto flex items-center justify-center text-[#6C63FF] mb-4">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </div>
                        <h3 className="text-white font-display font-bold text-[15px] mb-1">
                          Drag & drop multiple files here
                        </h3>
                        <p className="text-[#8892A4] text-xs font-sans">
                          or click to browse from device
                        </p>
                        <p className="text-[10px] text-[#8892A4]/60 mt-3 font-mono">
                          Up to 20 files · Max 50MB per file
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#161A23] border border-[#252A36] rounded-xl p-5 text-left">
                        <div className="flex justify-between items-center pb-3 border-b border-[#252A36] mb-4">
                          <div>
                            <h4 className="text-white text-sm font-bold font-display">Uploaded Queue</h4>
                            <span className="text-xs text-[#8892A4] font-semibold">{getBatchTotalInfo()}</span>
                          </div>
                          
                          {batchFiles.length < 20 && (
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = true;
                                input.accept = fileConfig.types.join(',');
                                input.onchange = (e) => {
                                  const files = (e.target as HTMLInputElement).files;
                                  if (files) addFilesToBatchQueue(Array.from(files));
                                };
                                input.click();
                              }}
                              className="px-3 py-1.5 border border-[#6C63FF]/50 hover:border-[#6C63FF] text-[#6C63FF] text-xs font-bold rounded-lg cursor-pointer hover:bg-[#6C63FF]/5 transition-colors"
                            >
                              + Add More Files
                            </button>
                          )}
                        </div>

                        {/* Instruction Banner */}
                        {batchFiles.length > 0 && (
                          <div className="bg-[#6C63FF]/8 border-l-3 border-[#6C63FF] rounded-lg p-2.5 px-3.5 flex items-start gap-2 mb-3.5 text-left">
                            <span className="text-[#6C63FF] text-sm mt-0.5">ℹ</span>
                            <p className="text-[11px] text-text-sub leading-relaxed font-sans font-medium">
                              Drag files to arrange execution order. Processing will occur top to bottom.
                            </p>
                          </div>
                        )}

                        <div ref={batchContainerRef} className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
                          {batchFiles.map((file, idx) => {
                            const isExceedLimit = file.size > 50 * 1024 * 1024;
                            const isSelected = selectedBatchIndices.includes(idx);
                            return (
                              <div 
                                key={file.name + '-' + idx} 
                                data-index={idx} 
                                onClick={(e) => handleRowClick(idx, e)}
                                className={`draggable-row flex justify-between items-center p-3 rounded-xl border text-xs transition-colors cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-[var(--accent)]/10 border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-md shadow-[var(--accent)]/5' 
                                    : 'bg-[#0D0F14]/60 border-[#252A36]/60 text-white hover:border-[var(--accent)]/40'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {/* Handle */}
                                  <div 
                                    className="drag-handle p-1 text-text-sub hover:text-primary-accent transition-colors duration-200 cursor-grab active:cursor-grabbing select-none shrink-0 group/tooltip relative"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Drag to reorder ${file.name}`}
                                  >
                                    <svg className="w-3.5 h-4.5 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 16 20" fill="currentColor">
                                      <circle cx="5" cy="4" r="1.5" />
                                      <circle cx="5" cy="10" r="1.5" />
                                      <circle cx="5" cy="16" r="1.5" />
                                      <circle cx="11" cy="4" r="1.5" />
                                      <circle cx="11" cy="10" r="1.5" />
                                      <circle cx="11" cy="16" r="1.5" />
                                    </svg>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none delay-500">
                                      Drag to reorder
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden focus-within:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none">
                                      Space to pick up, Arrows to move, Space to drop
                                    </div>
                                  </div>

                                  <span className="position-badge shrink-0 w-5 h-5 bg-[#6C63FF]/15 text-primary-accent text-[10px] font-bold font-mono rounded-full flex items-center justify-center border border-primary-accent/15">
                                    {idx + 1}
                                  </span>

                                  {getFileIcon(file.name)}
                                  <span className="text-white truncate max-w-[140px] sm:max-w-[200px]" title={file.name}>
                                    {file.name}
                                  </span>
                                  <span className="text-[#8892A4] font-mono shrink-0">{formatFileSize(file.size)}</span>
                                  {isExceedLimit && (
                                    <span className="text-xs text-[#FF5B5B] bg-[#FF5B5B]/10 px-2 py-0.5 rounded font-bold shrink-0 border border-[#FF5B5B]/20">
                                      ⚠️ Skip (&gt;50MB)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); moveBatchFile(idx, 'up'); }}
                                    disabled={idx === 0}
                                    className="p-1 px-1.5 text-text-sub hover:text-secondary-accent disabled:opacity-30 bg-[#1B202E] border border-border-dark rounded cursor-pointer transition-all"
                                    title="Move File Up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); moveBatchFile(idx, 'down'); }}
                                    disabled={idx === batchFiles.length - 1}
                                    className="p-1 px-1.5 text-text-sub hover:text-secondary-accent disabled:opacity-30 bg-[#1B202E] border border-border-dark rounded cursor-pointer transition-all"
                                    title="Move File Down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBatchFiles(prev => prev.filter((_, i) => i !== idx));
                                    }}
                                    className="p-1 px-1.5 text-[#8892A4] hover:text-[#FF5B5B] bg-[#1B202E] border border-border-dark rounded cursor-pointer ml-1 transition-all"
                                    title="Remove file"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {batchFiles.length >= 20 && (
                          <div className="text-[11px] text-[#FF5B5B] font-semibold bg-[#FF5B5B]/10 p-2.5 rounded-lg border border-[#FF5B5B]/20 text-center mb-4">
                            ⚠️ Maximum batch file limit of 20 reached.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Batch Warnings */}
                {batchWarnings.length > 0 && (
                  <div className="mt-4 space-y-1 p-3 rounded-xl bg-yellow-950/20 border border-yellow-700/30 text-yellow-200 text-left">
                    {batchWarnings.map((warn, i) => (
                      <p key={i} className="text-xs">• {warn}</p>
                    ))}
                  </div>
                )}

                {/* Render configuration settings card */}
                {renderOptionsForm()}

                {/* Process Button */}
                {isBatchModeProcessReady() && (
                  <div className="mt-8 pt-6 border-t border-border-dark">
                    <button
                      type="button"
                      onClick={handleProcessBatch}
                      className="w-full py-4 bg-[#6C63FF] hover:bg-[#6C63FF]/90 text-white font-display font-medium rounded-xl transition-all shadow-[0_4px_20px_rgba(108,99,255,0.25)] flex items-center justify-center gap-2 cursor-pointer text-base animate-glow-pulse"
                    >
                      {getBatchProcessButtonLabel()}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* SINGLE MODE CONTAINER BLOCK (ORIGINAL FLOW) */
          <>
            {/* Upload Zone Trigger - Hide if files loaded or showing preview */}
            {((activeTool !== 'jpeg-to-pdf' && activeTool !== 'merge-pdf' && selectedFiles.length === 0) ||
              (activeTool === 'jpeg-to-pdf' && reorderableImages.length === 0) ||
              (activeTool === 'merge-pdf' && reorderablePdfs.length === 0)) && !showPreview && (
              <UploadZone
                onFileSelected={handleFileChange}
                acceptedTypes={fileConfig.types}
                multiple={activeTool === 'jpeg-to-pdf' || activeTool === 'merge-pdf'}
                instructionText={fileConfig.types.join(', ')}
                activeTool={activeTool}
              />
            )}

            {/* Show single file summary detail */}
            {activeTool !== 'jpeg-to-pdf' && activeTool !== 'merge-pdf' && !showPreview && renderSelectedFileInfo()}

            {/* Render interactive sliders / options */}
            {!showPreview && renderOptionsForm()}

            {/* Collapsible How-To image paste instruction guide */}
            {hasRecentlyPasted && !showPreview && renderHowToPasteImageSection()}

            {/* Render integrated Preview Panel */}
            {showPreview && renderPreviewPanel()}

            {/* Handle Error reporting */}
            {processing.error && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-red-200 flex items-start gap-3 mt-4 text-left">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Execution Interrupted</p>
                  <p className="mt-0.5 opacity-90">{processing.error}</p>
                </div>
              </div>
            )}

            {/* BIG TRIGGER BUTTON - Hide when showing preview */}
            {!isProcessButtonDisabled() && !showPreview && activeTool !== 'image-enhance' && (
              <div className="mt-8 pt-6 border-t border-border-dark flex justify-end">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleProcess(); }}
                  className="px-8 py-4 bg-primary-accent hover:bg-primary-accent/90 text-text-light font-display font-medium rounded-xl transition-all shadow-[0_4px_20px_rgba(108,99,255,0.25)] flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  id="btn-process"
                >
                  <Sparkles className="w-5 h-5 text-[#00D4AA]" />
                  Stitch and Execute
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Visual history tracking overlays */}
      {flashColor && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-2xl transition-all duration-300 z-50 animate-pulse" 
          style={{ backgroundColor: flashColor }} 
        />
      )}

      {/* Mobile history bottom sheet */}
      <AnimatePresence>
        {windowWidth < 768 && mobileHistoryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileHistoryOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[75vh] bg-[#161A23] border-t border-border-dark rounded-t-2xl px-5 py-6 z-50 overflow-y-auto"
            >
              <div className="w-12 h-1 bg-[#252A36] rounded-full mx-auto mb-4" />
              {renderHistoryPanelContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Undo/Redo dynamic toast notifications */}
      <AnimatePresence>
        {undoToast && undoToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            id="undo-toast"
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[10px] bg-[#161A23] border border-border-dark/85 flex items-center gap-2 font-sans font-medium text-[13px] text-text-light shadow-2xl ${
              undoToast.type === 'undo' ? 'border-l-[3px] border-l-[#6C63FF]' :
              undoToast.type === 'redo' ? 'border-l-[3px] border-l-[#00D4AA]' : ''
            }`}
          >
            {undoToast.type === 'undo' && <span className="text-[#6C63FF] text-base font-semibold leading-none">↩</span>}
            {undoToast.type === 'redo' && <span className="text-[#00D4AA] text-base font-semibold leading-none">↪</span>}
            <span>{undoToast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paste Success floating banner */}
      <AnimatePresence>
        {pasteSuccessBadge && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#161A23] border border-[#00D4AA] rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 z-50 max-w-sm w-[90%]"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-center bg-[#00D4AA]/10 p-2 rounded-lg text-[#00D4AA]">
              <Clipboard className="w-5 h-5 flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-text-light">Image pasted from clipboard!</p>
              <p className="text-xs text-text-sub truncate">
                {pasteSuccessBadge.filename} &middot; {formatSize(pasteSuccessBadge.size)}
              </p>
              {pasteSuccessBadge.conversionNote && (
                <p className="text-[11px] text-[#00D4AA] mt-0.5 font-medium leading-tight">
                  {pasteSuccessBadge.conversionNote}
                </p>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => setPasteSuccessBadge(null)} 
              className="text-text-sub hover:text-text-light font-bold text-lg ml-1 cursor-pointer"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Cursor Tooltip for PDF/other tools */}
      {cursorTooltip?.visible && (
        <div
          style={{
            position: 'fixed',
            left: `${cursorTooltip.x}px`,
            top: `${cursorTooltip.y}px`,
          }}
          className="bg-[#161A23] border border-border-dark rounded-lg p-2.5 px-3.5 text-xs text-text-light shadow-2xl z-50 pointer-events-none max-w-[210px] space-y-1 block animate-fade-in font-sans leading-normal"
        >
          <div className="font-bold flex items-center gap-1.5 text-yellow-500">
            <span>📋</span> Paste works in Image tools
          </div>
          <p className="text-[11px] text-text-sub">
            Switch to Image Enhancer or Compressor to paste images.
          </p>
        </div>
      )}
      </div>

      {/* 4. HOW IT WORKS (3 STEPS) */}
      {toolContent && toolContent.steps && toolContent.steps.length > 0 && (
        <div className="w-full max-w-3xl mx-auto mt-6 text-left pr-4 pl-4 md:pl-0">
          <h3 className="text-xl sm:text-2xl font-display font-extrabold text-text-light mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-[#6C63FF] rounded-full inline-block" />
            How To Use This Tool
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {toolContent.steps.map((step, idx) => (
              <div key={idx} className="bg-surface-dark border border-border-dark rounded-xl p-5 hover:border-[#6C63FF]/30 transition-all relative">
                <div className="absolute top-4 right-5 text-4xl font-display font-black text-[#6C63FF]/15">
                  0{idx + 1}
                </div>
                <h4 className="text-sm font-display font-bold text-text-light mb-2 pr-6">
                  {step.title}
                </h4>
                <p className="text-xs sm:text-[13px] text-text-sub leading-relaxed font-sans">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. KEY FEATURES */}
      {toolContent && toolContent.features && toolContent.features.length > 0 && (
        <div className="w-full max-w-3xl mx-auto text-left mt-6 pr-4 pl-4 md:pl-0">
          <h3 className="text-xl sm:text-2xl font-display font-extrabold text-text-light mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-[#00D4AA] rounded-full inline-block" />
            Key Features & Benefits
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {toolContent.features.map((feat, idx) => {
              const [title, desc] = feat.split(': ');
              return (
                <div key={idx} className="flex gap-3 bg-surface-dark/40 border border-[#252A36]/50 rounded-xl p-4">
                  <div className="w-8 h-8 rounded-lg bg-[#00D4AA]/8 border border-[#00D4AA]/20 flex items-center justify-center text-[#00D4AA] text-sm flex-shrink-0 mt-0.5">
                     ✓
                  </div>
                  <div>
                    <h4 className="text-[13px] font-display font-bold text-text-light">
                      {title}
                    </h4>
                    <p className="text-xs text-text-sub mt-0.5 leading-relaxed font-sans">
                      {desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. COLLAPSIBLE FAQ */}
      {toolContent && toolContent.faqs && toolContent.faqs.length > 0 && (
        <div className="w-full max-w-3xl mx-auto text-left mt-6 pr-4 pl-4 md:pl-0">
          <h3 className="text-xl sm:text-2xl font-display font-extrabold text-text-light mb-2 flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-[#6C63FF] rounded-full inline-block" />
            Frequently Asked Questions
          </h3>
          <p className="text-[13px] text-text-sub mb-6 max-w-lg font-sans">
            Have questions about processing files? Learn details about privacy, compatibility, performance, and formatting rules.
          </p>
          <div className="space-y-3">
            {toolContent.faqs.map((faq, idx) => (
              <FaqItemComponent key={idx} faq={faq} idx={idx} />
            ))}
          </div>
        </div>
      )}

      {/* 7. RELATED TOOLS SECTION */}
      {toolContent && toolContent.relatedTools && toolContent.relatedTools.length > 0 && (
        <div className="w-full max-w-3xl mx-auto text-left mt-6 pb-8 pr-4 pl-4 md:pl-0">
          <h3 className="text-lg font-display font-extrabold text-text-light mb-4 flex items-center gap-2.5">
            <span className="w-1.5 h-5 bg-[#8892A4] rounded-full inline-block" />
            More Utility Tools You Might Like
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {toolContent.relatedTools.map((related, idx) => (
              <button
                key={idx}
                type="button"
                data-navigate={toolToUrlMap[related.id]}
                onClick={(e) => { e.preventDefault(); }}
                className="flex items-center justify-between p-4 bg-surface-dark hover:bg-[#161A23]/50 border border-[#252A36] hover:border-[#6C63FF]/35 rounded-xl transition-all cursor-pointer text-left group"
              >
                <div>
                  <h4 className="text-xs uppercase font-mono text-[#8892A4] tracking-wide">
                    {related.id.startsWith('pdf') ? 'PDF Software' : related.id.includes('to') ? 'File Converter' : 'Image Optimizer'}
                  </h4>
                  <p className="text-[13px] font-display font-bold text-text-light mt-0.5 group-hover:text-[#6C63FF] transition-colors leading-snug">
                    {related.name}
                  </p>
                </div>
                <span className="text-[#8892A4] group-hover:text-[#6C63FF] transform group-hover:translate-x-1.5 transition-all text-sm leading-none ml-2">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BLOG/TIPS SECTION (ALL TOOL PAGES) */}
      {activeTool !== 'home' && (activeTool as string) !== 'privacy' && (
        <ToolPageBlogSection toolId={activeTool as Exclude<ToolId, 'home'>} />
      )}
    </div>
  );
}

// =========================================================================
// HELPER COMPONENT RENDERERS FOR PREVIEW SEGMENTS
// =========================================================================

function PdfPagePreview({ pdfUrl, pageNumber = 1, onLoaded }: { pdfUrl: string, pageNumber?: number, onLoaded?: (num: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      setErrorMsg("PDF reader component initialized...");
      return;
    }

    setLoading(true);
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then((pdf: any) => {
      if (!active) return;
      if (onLoaded) {
        onLoaded(pdf.numPages);
      }
      return pdf.getPage(Math.min(pageNumber, pdf.numPages)).then((page: any) => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale: 1.0 });
        const scale = 380 / viewport.width;
        const scaledViewport = page.getViewport({ scale: Math.max(0.7, Math.min(1.2, scale)) });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport: scaledViewport,
        };
        return page.render(renderContext).promise.then(() => {
          if (active) setLoading(false);
        });
      });
    }).catch((err: any) => {
      console.error("PDF Preview Error:", err);
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [pdfUrl, pageNumber]);

  return (
    <div className="relative flex justify-center items-center py-2 min-h-[140px] w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0D0F14]/50 backdrop-blur-sm z-10 rounded-lg">
          <div className="w-6 h-6 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {errorMsg ? (
        <div className="text-[10px] text-[#8892A4] font-mono italic">{errorMsg}</div>
      ) : (
        <canvas ref={canvasRef} className="rounded-lg shadow-lg border border-[#252A36] max-w-full" />
      )}
    </div>
  );
}

function ImageCompareSlider({ originalUrl, compressedUrl, originalSize, compressedSize }: { originalUrl: string | null, compressedUrl: string | null, originalSize: number, compressedSize: number }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onPointerMove = (e: PointerEvent) => {
      handleMove(e.clientX);
    };
    const onPointerUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging]);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="md:hidden flex flex-col gap-4 w-full text-left">
        <div className="bg-[#11141D] p-3 rounded-xl border border-border-dark text-center">
          <p className="text-[10px] uppercase tracking-wider font-mono text-text-sub mb-2">Original</p>
          <img src={originalUrl || null} className="max-h-60 mx-auto rounded-lg object-contain" alt="Original" />
          <p className="text-xs font-mono font-medium text-text-[#8892A4] mt-2">{formatSize(originalSize)}</p>
        </div>
        <div className="bg-[#11141D] p-3 rounded-xl border border-border-dark text-center">
          <p className="text-[10px] uppercase tracking-wider font-mono text-secondary-accent mb-2">Compressed</p>
          <img src={compressedUrl || null} className="max-h-60 mx-auto rounded-lg object-contain" alt="Compressed" />
          <p className="text-xs font-mono font-bold text-secondary-accent mt-2">{formatSize(compressedSize)}</p>
        </div>
      </div>

      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="hidden md:block relative w-full h-[380px] bg-[#11141D] rounded-xl overflow-hidden border border-[#252A36] cursor-ew-resize select-none"
      >
        <div className="absolute inset-0">
          <img src={originalUrl || null} className="w-full h-full object-contain" alt="Original" />
          <div className="absolute bottom-4 left-4 bg-bg-dark/80 backdrop-blur px-3 py-1.5 rounded-lg border border-[#252A36] text-xs font-mono text-text-light">
            Original: {formatSize(originalSize)}
          </div>
        </div>

        <div 
          className="absolute inset-y-0 right-0 left-0"
          style={{ clipPath: `polygon(${sliderPos}% 0%, 100% 0%, 100% 100%, ${sliderPos}% 100%)` }}
        >
          <img src={compressedUrl || null} className="w-full h-full object-contain" alt="Compressed" />
          <div className="absolute bottom-4 right-4 bg-[#0D0F14]/90 backdrop-blur px-3 py-1.5 rounded-lg border border-secondary-accent/20 text-xs font-mono text-secondary-accent font-bold">
            Compressed: {formatSize(compressedSize)}
          </div>
        </div>

        <div 
          className="absolute inset-y-0 w-1 bg-[#00D4AA] shadow-[0_0_8px_rgba(0,212,170,0.5)] pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#00D4AA] text-[#0D0F14] border border-[#0D0F14] flex items-center justify-center shadow-lg">
            <span className="text-[10px] font-bold select-none">↔</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function JpegToPdfPreview({ pdfUrl, images }: { pdfUrl: string, images: ReorderableFile[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(images.length);

  return (
    <div className="w-full flex flex-col gap-4 text-left animate-fade-in animate-once">
      <div className="bg-[#11141D] rounded-xl p-4 border border-border-dark flex flex-col items-center">
        <span className="text-xs font-mono text-secondary-accent mb-3">Page {currentPage} of {totalPages}</span>
        <div className="max-h-[380px] overflow-y-auto w-full flex justify-center">
          <PdfPagePreview pdfUrl={pdfUrl} pageNumber={currentPage} onLoaded={setTotalPages} />
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-[#252A36]">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => { e.preventDefault(); setCurrentPage(idx + 1); }}
            className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border transition-all cursor-pointer ${
              currentPage === idx + 1
                ? 'border-secondary-accent ring-2 ring-secondary-accent/20 scale-95'
                : 'border-border-dark hover:border-text-sub'
            }`}
          >
            <img src={img.previewUrl || null} className="w-full h-full object-cover select-none" alt={`Thumbnail ${idx + 1}`} />
            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-mono text-center text-text-light py-0.5" style={{ pointerEvents: 'none' }}>
              Page {idx + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WordToPdfPreview({ pdfUrl }: { pdfUrl: string }) {
  const [totalPages, setTotalPages] = useState(1);

  return (
    <div className="bg-[#11141D] rounded-xl p-4 border border-border-dark flex flex-col items-center">
      <span className="text-xs font-mono text-secondary-accent mb-3 font-semibold">Page 1 of {totalPages} pages</span>
      <div className="max-h-[380px] overflow-y-auto w-full flex justify-center">
        <PdfPagePreview pdfUrl={pdfUrl} pageNumber={1} onLoaded={setTotalPages} />
      </div>
    </div>
  );
}

function ExcelPreview({ data }: { data: any[][] }) {
  const rowCount = data.length;
  const colCount = data[0]?.length || 0;
  
  const previewRows = data.slice(0, 8);
  const maxColsToShow = Math.min(6, colCount);

  return (
    <div className="w-full flex flex-col gap-3 text-left">
      <span className="text-xs font-mono font-bold text-secondary-accent">
        Preview of Sheet 1 — {rowCount} rows × {colCount} columns
      </span>
      <div className="w-full overflow-x-auto rounded-xl border border-[#252A36] bg-[#11141D]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#00D4AA]/10 border-b border-[#252A36]">
              {Array.from({ length: maxColsToShow }).map((_, cIdx) => (
                <th key={cIdx} className="p-3 font-display font-bold text-secondary-accent text-xs">
                  {previewRows[0]?.[cIdx] !== undefined ? String(previewRows[0][cIdx]) : `Col ${cIdx + 1}`}
                </th>
              ))}
              {colCount > maxColsToShow && (
                <th className="p-3 text-text-sub italic font-normal text-xs font-mono">... {colCount - maxColsToShow} cols</th>
              )}
            </tr>
          </thead>
          <tbody>
            {previewRows.slice(1).map((row, rIdx) => (
              <tr 
                key={rIdx} 
                className={`border-b border-[#252A36]/40 ${
                  rIdx % 2 === 0 ? 'bg-[#161a23]/40' : 'bg-transparent'
                }`}
              >
                {Array.from({ length: maxColsToShow }).map((_, cIdx) => (
                  <td key={cIdx} className="p-3 font-mono text-[#F0F2F8]/90 truncate max-w-[120px]">
                    {row[cIdx] !== undefined ? String(row[cIdx]) : ''}
                  </td>
                ))}
                {colCount > maxColsToShow && (
                  <td className="p-3 text-[#8892A4] italic text-center">• • •</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rowCount > 8 && (
        <span className="text-[10px] font-mono text-[#8892A4] text-center italic mt-1">
          Showing first 8 rows of spreadsheet.
        </span>
      )}
    </div>
  );
}

function Lightbox({ 
  images, 
  activeIndex, 
  onClose, 
  onNext, 
  onPrev 
}: { 
  images: { url: string; index: number }[], 
  activeIndex: number, 
  onClose: () => void, 
  onNext: () => void, 
  onPrev: () => void 
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  const activeImg = images[activeIndex];
  if (!activeImg) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div className="absolute top-4 left-6 text-sm font-mono text-[#8892A4]">
        Page {activeImg.index} of {images.length}
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-6 text-[#F0F2F8] hover:text-white text-3xl font-bold cursor-pointer bg-white/5 hover:bg-white/10 w-11 h-11 rounded-full flex items-center justify-center transition-all focus:outline-none"
      >
        ×
      </button>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-6 top-1/2 -translate-y-1/2 text-white bg-white/5 hover:bg-white/15 w-12 h-12 rounded-full flex items-center justify-center transition-all text-xl cursor-pointer pointer-events-auto"
        >
          ‹
        </button>
      )}

      <div 
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={activeImg.url || null} 
          className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl select-none" 
          alt={`Page ${activeImg.index}`} 
        />
      </div>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-6 top-1/2 -translate-y-1/2 text-white bg-white/5 hover:bg-white/15 w-12 h-12 rounded-full flex items-center justify-center transition-all text-xl cursor-pointer pointer-events-auto"
        >
          ›
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[#8892A4]">
        Navigate using keyboard arrow keys ← / →
      </div>
    </div>
  );
}

function PdfToImagePreview({ images, onReorder }: { images: { url: string; index: number }[], onReorder: (newImages: { url: string; index: number }[]) => void }) {
  const [lightboxActiveIdx, setLightboxActiveIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || images.length === 0) return;
    const dl = new DragList(containerRef.current, {
      itemSelector: '.draggable-card',
      handleSelector: '.drag-handle',
      isGrid: true,
      onReorder: (newIndices: number[]) => {
        const reordered = newIndices.map(idx => images[idx]);
        onReorder(reordered);
      }
    });
    return () => {
      dl.destroy();
    };
  }, [images, onReorder]);

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const list = [...images];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    onReorder(list);
  };

  return (
    <div className="w-full flex flex-col gap-4 text-left animate-fade-in animate-once">
      <div className="flex flex-col gap-1.5 bg-[#11141D] px-4 py-3 rounded-lg border border-border-dark text-xs">
        <div className="flex justify-between items-center text-text-sub font-mono">
          <span>Click any thumbnail image to view in lightbox preview slider</span>
          <span className="text-[#00D4AA] font-bold">{images.length} pages converted</span>
        </div>
        <p className="text-[10px] text-text-muted font-semibold flex items-center gap-1">
          ↕ Reorder images before downloading. ZIP will contain files in this sequence.
        </p>
      </div>

      <div ref={containerRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[12px] max-h-96 overflow-y-auto pr-1">
        {images.map((img, idx) => (
          <div 
            key={img.url + '-' + idx}
            data-index={idx}
            className="draggable-card relative bg-[#11141D] rounded-xl border border-border-dark p-2 hover:border-[#00D4AA]/40 hover:scale-[1.03] transition-all duration-150 flex flex-col items-center group cursor-pointer"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('.drag-handle') || (e.target as HTMLElement).closest('.arrow-controls')) return;
              setLightboxActiveIdx(idx);
            }}
          >
            <div className="w-full aspect-square overflow-hidden rounded-lg bg-[#0D0F14] flex items-center justify-center relative">
              <img src={img.url || null} className="max-h-full max-w-full object-contain rounded-lg" alt={`Page ${img.index}`} />
              
              {/* Drag handle */}
              <div 
                className="drag-handle absolute top-0 left-0 bg-[rgba(0,0,0,0.5)] rounded-br-md p-1.5 md:p-2 text-text-sub hover:text-primary-accent transition-colors cursor-grab active:cursor-grabbing select-none flex items-center justify-center group/tooltip"
                role="button"
                tabIndex={0}
                aria-label={`Drag to reorder Page ${img.index}`}
              >
                <svg className="w-3.5 h-4.5 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 16 20" fill="currentColor">
                  <circle cx="5" cy="4" r="1.5" />
                  <circle cx="5" cy="10" r="1.5" />
                  <circle cx="5" cy="16" r="1.5" />
                  <circle cx="11" cy="4" r="1.5" />
                  <circle cx="11" cy="10" r="1.5" />
                  <circle cx="11" cy="16" r="1.5" />
                </svg>
                <div className="absolute top-full left-0 mt-1 hidden group-hover/tooltip:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none delay-500">
                  Drag to reorder
                </div>
                <div className="absolute top-full left-0 mt-1 hidden focus-within:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none">
                  Space to pick, Arrows to move, Space to drop
                </div>
              </div>

              {/* Arrow controls */}
              <div className="arrow-controls absolute bottom-1.5 left-1.5 flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-all z-20">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveImage(idx, 'up'); }}
                  disabled={idx === 0}
                  className="p-1 bg-[#161925]/90 hover:bg-[#6C63FF] disabled:opacity-30 disabled:hover:bg-[#161925]/90 text-white rounded border border-border-dark cursor-pointer flex items-center justify-center"
                  title="Move Previous"
                >
                  <ArrowUp className="w-3 h-3 -rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveImage(idx, 'down'); }}
                  disabled={idx === images.length - 1}
                  className="p-1 bg-[#161925]/90 hover:bg-[#6C63FF] disabled:opacity-30 disabled:hover:bg-[#161925]/90 text-white rounded border border-border-dark cursor-pointer flex items-center justify-center"
                  title="Move Next"
                >
                  <ArrowDown className="w-3 h-3 -rotate-90" />
                </button>
              </div>

              {/* Position badge */}
              <span className="position-badge absolute top-1.5 right-1.5 w-5 h-5 bg-[#6C63FF] text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center border border-[#6C63FF]/30 shadow">
                {idx + 1}
              </span>
            </div>
            <span className="text-xs font-mono text-[#8892A4] mt-2 block">Page {img.index}</span>
          </div>
        ))}
      </div>

      {lightboxActiveIdx !== null && (
        <Lightbox 
          images={images}
          activeIndex={lightboxActiveIdx}
          onClose={() => setLightboxActiveIdx(null)}
          onNext={() => setLightboxActiveIdx(prev => prev === null ? null : (prev + 1) % images.length)}
          onPrev={() => setLightboxActiveIdx(prev => prev === null ? null : (prev - 1 + images.length) % images.length)}
        />
      )}
    </div>
  );
}

function PdfToWordPreview({ text }: { text: string }) {
  const charactersCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const clampedText = text.substring(0, 500);

  return (
    <div className="w-full flex flex-col gap-3 text-left">
      <div className="flex justify-between font-mono text-xs text-secondary-accent px-1">
        <span>Extracted text — first 500 characters</span>
        <span className="text-[#8892A4] font-normal">Approx. {wordCount} words total</span>
      </div>

      <div className="w-full bg-[#11141D] p-4 rounded-xl border border-border-dark max-h-[180px] overflow-y-auto text-left font-mono text-xs text-text-light/90 leading-relaxed whitespace-pre-wrap select-all">
        {clampedText || "No readable plain-text segments extracted."}
        {charactersCount > 500 && " ... [truncated output]"}
      </div>

      <p className="text-[10px] font-mono text-center text-text-sub bg-white/5 border border-white/5 py-2 px-3 rounded-lg leading-normal">
        ⚠️ <span className="font-bold text-text-light">Disclaimer:</span> Document layouts & rich structural typography elements may vary depending on word processor versions. Download to review the full MS Word file.
      </p>
    </div>
  );
}

function MergePdfPreview({ pdfUrl, reorderableFiles }: { pdfUrl: string, reorderableFiles: ReorderableFile[] }) {
  const [totalPages, setTotalPages] = useState(1);

  return (
    <div className="w-full flex flex-col gap-4 text-left">
      <div className="flex justify-between items-center bg-[#11141D] px-4 py-2.5 rounded-lg border border-border-dark text-xs text-[#8892A4] font-mono">
        <span>Merged from {reorderableFiles.length} files</span>
        <span>Page 1 of <span className="text-[#00D4AA] font-bold">{totalPages}</span> pages</span>
      </div>

      <div className="bg-[#11141D] rounded-xl p-4 border border-border-dark flex items-center justify-center">
        <div className="max-h-[380px] overflow-y-auto w-full flex justify-center">
          <PdfPagePreview pdfUrl={pdfUrl} pageNumber={1} onLoaded={setTotalPages} />
        </div>
      </div>
    </div>
  );
}

function SplitPdfPreview({ 
  parts, 
  onReorder 
}: { 
  parts: { name: string; range: string; estSize: number; blob: Blob }[], 
  onReorder: (newParts: { name: string; range: string; estSize: number; blob: Blob }[]) => void 
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || parts.length === 0) return;
    const dl = new DragList(containerRef.current, {
      itemSelector: '.draggable-row',
      handleSelector: '.drag-handle',
      onReorder: (newIndices: number[]) => {
        const reordered = newIndices.map(idx => parts[idx]);
        onReorder(reordered);
      }
    });
    return () => {
      dl.destroy();
    };
  }, [parts, onReorder]);

  const handleMovePart = (index: number, direction: 'up' | 'down') => {
    const list = [...parts];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    onReorder(list);
  };

  const handleDownloadSingle = (part: typeof parts[0]) => {
    const url = URL.createObjectURL(part.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = part.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="w-full flex flex-col gap-4 text-left animate-fade-in">
      <div className="flex flex-col gap-1.5 bg-[#11141D] px-4 py-3 rounded-lg border border-border-dark text-xs">
        <div className="flex justify-between items-center text-text-sub font-mono">
          <span>Split Parts: <span className="text-[#00D4AA] font-bold">{parts.length} files</span> ready in zip package</span>
        </div>
        <p className="text-[10px] text-text-muted font-semibold">
          ↕ Reordering changes the ZIP file sequence only.
        </p>
      </div>

      <div ref={containerRef} className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
        {parts.map((item, idx) => (
          <div 
            key={item.name + '-' + idx}
            data-index={idx}
            className="draggable-row bg-[#11141D] p-3 rounded-xl border-l-4 border-l-[#6C63FF] border-[#252A36] flex justify-between items-center gap-4 transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Drag handle */}
              <div 
                className="drag-handle p-1.5 text-text-sub hover:text-primary-accent transition-colors cursor-grab active:cursor-grabbing select-none shrink-0 group/tooltip relative"
                role="button"
                tabIndex={0}
                aria-label={`Drag to reorder ${item.name}`}
              >
                <svg className="w-4 h-5 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 16 20" fill="currentColor">
                  <circle cx="5" cy="4" r="1.5" />
                  <circle cx="5" cy="10" r="1.5" />
                  <circle cx="5" cy="16" r="1.5" />
                  <circle cx="11" cy="4" r="1.5" />
                  <circle cx="11" cy="10" r="1.5" />
                  <circle cx="11" cy="16" r="1.5" />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none delay-500">
                  Drag to reorder
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden focus-within:block bg-[#161925] text-white text-[9px] py-1 px-1.5 rounded border border-[#252A36] whitespace-nowrap shadow-xl z-50 pointer-events-none">
                  Space to pick, Arrows to move, Space to drop
                </div>
              </div>

              {/* Position badge */}
              <span className="position-badge shrink-0 w-6 h-6 bg-[#6C63FF] text-white text-[11px] font-bold font-mono rounded-full flex items-center justify-center border border-[#6C63FF]/20 shadow">
                {idx + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text-light truncate font-display">{item.name}</p>
                <p className="text-[10px] text-text-sub font-mono mt-0.5">{item.range} · {formatSize(item.estSize)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleMovePart(idx, 'up'); }}
                disabled={idx === 0}
                className="p-1 px-1.5 text-text-sub hover:text-secondary-accent disabled:opacity-30 bg-[#1B202E] border border-border-dark rounded cursor-pointer transition-all"
                title="Move File Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleMovePart(idx, 'down'); }}
                disabled={idx === parts.length - 1}
                className="p-1 px-1.5 text-text-sub hover:text-secondary-accent disabled:opacity-30 bg-[#1B202E] border border-border-dark rounded cursor-pointer transition-all"
                title="Move File Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              
              <button
                type="button"
                onClick={() => handleDownloadSingle(item)}
                className="p-1.5 px-3 bg-[#6C63FF]/15 hover:bg-[#6C63FF]/30 text-[#6C63FF] text-[11px] font-bold rounded-lg border border-[#6C63FF]/25 transition-all text-center flex items-center gap-1 shrink-0 cursor-pointer ml-1"
                title="Download part individually"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsDisplay({ originalSize, outputSize, savedText, customLabel, customValue }: { originalSize?: number, outputSize?: number, savedText?: string, customLabel?: string, customValue?: string }) {
  const hasReduction = originalSize !== undefined && outputSize !== undefined && originalSize > 0 && outputSize > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-[#11141D] p-4 rounded-xl border border-border-dark/60 text-center text-left">
      {hasReduction ? (
        <>
          <div className="p-1 text-center">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-text-sub mb-1">Before Size</span>
            <span className="text-sm font-mono text-text-light font-medium">{formatSize(originalSize!)}</span>
          </div>
          <div className="p-1 border-l border-border-dark/60 text-center">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-[#00D4AA] mb-1">After Size</span>
            <span className="text-sm font-mono text-secondary-accent font-bold">{formatSize(outputSize!)}</span>
          </div>
          <div className="col-span-2 md:col-span-1 p-1 border-t md:border-t-0 md:border-l border-border-dark/60 text-center">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-[#6C63FF] mb-1">Savings</span>
            <span className="text-sm font-mono text-[#6C63FF] font-extrabold">
              {savedText || `${Math.max(1, Math.round(((originalSize! - outputSize!) / originalSize!) * 100))}% Saved`}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="p-1 text-center">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-text-sub mb-1">Source File</span>
            <span className="text-xs font-semibold text-text-light truncate block max-w-[160px] mx-auto font-display">Completed</span>
          </div>
          <div className="p-1 border-l border-[#252A36] text-center">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-[#00D4AA] mb-1">Output Size</span>
            <span className="text-sm font-mono text-[#00D4AA] font-bold">
              {outputSize ? formatSize(outputSize) : 'Direct Stream'}
            </span>
          </div>
          <div className="col-span-2 md:col-span-1 p-1 border-t md:border-t-0 md:border-l border-[#252A36] text-center">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-[#6C63FF] mb-1">{customLabel || 'Format Info'}</span>
            <span className="text-xs font-mono text-[#6C63FF] font-extrabold truncate block max-w-[160px] mx-auto">
              {customValue || 'Sandboxed PDF'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
