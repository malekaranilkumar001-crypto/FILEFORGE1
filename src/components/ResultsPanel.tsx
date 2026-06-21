import { Check, Download, RefreshCw, FileText } from 'lucide-react';
import { formatSize } from '../utils/fileHelpers';

interface ResultsPanelProps {
  originalName: string;
  originalSize?: number;
  processedSize?: number;
  savingsPercent?: number;
  downloadUrl: string;
  downloadName: string;
  onReset: () => void;
  customStatsLabel?: string;
  customStatsValue?: string;
  message?: string;
}

export default function ResultsPanel({
  originalName,
  originalSize,
  processedSize,
  savingsPercent,
  downloadUrl,
  downloadName,
  onReset,
  customStatsLabel,
  customStatsValue,
  message = 'File processed successfully!'
}: ResultsPanelProps) {
  
  const hasCompressionStats = originalSize !== undefined && processedSize !== undefined;

  return (
    <div className="w-full bg-surface-dark border border-border-dark rounded-xl p-8 shadow-2xl animate-fade-in text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 bg-secondary-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-secondary-accent border border-secondary-accent/20">
        <Check className="w-8 h-8" />
      </div>

      <h3 className="text-2xl font-display font-bold text-text-light mb-2">
        Ready for Download
      </h3>
      <p className="text-sm text-text-sub mb-6">{message}</p>

      {/* Stats Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-[#1B202E] p-4 rounded-xl border border-border-dark">
        {hasCompressionStats ? (
          <>
            <div className="p-3 border-b md:border-b-0 md:border-r border-border-dark">
              <span className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1">
                Original Size
              </span>
              <span className="text-lg font-mono font-medium text-text-light">
                {formatSize(originalSize!)}
              </span>
            </div>
            
            <div className="p-3 border-b md:border-b-0 md:border-r border-border-dark">
              <span className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1">
                Optimized Size
              </span>
              <span className="text-lg font-mono font-bold text-secondary-accent">
                {formatSize(processedSize!)}
              </span>
            </div>

            <div className="p-3">
              <span className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1">
                Savings
              </span>
              <span className="text-lg font-mono font-bold text-primary-accent">
                {savingsPercent!}% Saved
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 border-b md:border-b-0 md:border-r border-border-dark col-span-2">
              <span className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1">
                Processed File Name
              </span>
              <span className="text-sm font-semibold text-text-light truncate block max-w-xs mx-auto">
                {downloadName}
              </span>
            </div>
            
            <div className="p-3 col-span-1">
              <span className="block text-xs uppercase tracking-wider text-text-sub font-display mb-1">
                {customStatsLabel || 'Status'}
              </span>
              <span className="text-base font-bold text-secondary-accent">
                {customStatsValue || 'Completed'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <a
          href={downloadUrl}
          download={downloadName}
          className="w-full sm:w-auto px-8 py-4 bg-secondary-accent hover:bg-secondary-accent/90 text-bg-dark font-display font-bold rounded-xl shadow-[0_4px_14px_rgba(0,212,170,0.3)] transition-all duration-200 flex items-center justify-center gap-2"
          id="btn-download-file"
        >
          <Download className="w-5 h-5" />
          Download File
        </a>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-6 py-4 bg-transparent border border-border-dark hover:border-primary-accent/40 text-text-light hover:text-primary-accent font-display font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          id="btn-process-another"
        >
          <RefreshCw className="w-4 h-4" />
          Process Another File
        </button>
      </div>
    </div>
  );
}
