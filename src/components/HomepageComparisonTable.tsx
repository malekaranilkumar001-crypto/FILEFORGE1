import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Sparkles, Check, X, AlertTriangle, ArrowRight } from 'lucide-react';

interface ValueCell {
  type: 'check' | 'lightning' | 'cross' | 'warning' | 'text';
  text: string;
}

interface FeatureComparison {
  featureName: string;
  tooltipText?: string;
  fileForge: ValueCell;
  ilovepdf: ValueCell;
  smallpdf: ValueCell;
}

const COMPARISON_DATA: FeatureComparison[] = [
  {
    featureName: "File Privacy",
    tooltipText: "Whether your files are uploaded to company servers during processing",
    fileForge: { type: 'check', text: "Never uploaded" },
    ilovepdf: { type: 'cross', text: "Uploaded to servers" },
    smallpdf: { type: 'cross', text: "Uploaded to servers" }
  },
  {
    featureName: "Account Required",
    fileForge: { type: 'check', text: "Never" },
    ilovepdf: { type: 'warning', text: "Optional (limits apply)" },
    smallpdf: { type: 'cross', text: "Required for most features" }
  },
  {
    featureName: "Cost",
    fileForge: { type: 'check', text: "100% Free Forever" },
    ilovepdf: { type: 'warning', text: "Free tier (limited)" },
    smallpdf: { type: 'warning', text: "Free tier (very limited)" }
  },
  {
    featureName: "File Size Limit",
    tooltipText: "Maximum size of files you can process",
    fileForge: { type: 'lightning', text: "Your device's RAM" },
    ilovepdf: { type: 'warning', text: "100MB (free)" },
    smallpdf: { type: 'cross', text: "5MB (free)" }
  },
  {
    featureName: "Batch Processing",
    fileForge: { type: 'check', text: "Free, up to 20 files" },
    ilovepdf: { type: 'cross', text: "Paid only" },
    smallpdf: { type: 'cross', text: "Paid only" }
  },
  {
    featureName: "Ads",
    fileForge: { type: 'warning', text: "Minimal ads" },
    ilovepdf: { type: 'cross', text: "Heavy ads" },
    smallpdf: { type: 'cross', text: "Heavy ads" }
  },
  {
    featureName: "Watermarks on Files",
    fileForge: { type: 'check', text: "Never" },
    ilovepdf: { type: 'check', text: "No" },
    smallpdf: { type: 'warning', text: "Sometimes (free tier)" }
  },
  {
    featureName: "Works Offline",
    tooltipText: "Can be used without internet after first visit (PWA)",
    fileForge: { type: 'check', text: "Yes (PWA)" },
    ilovepdf: { type: 'cross', text: "No" },
    smallpdf: { type: 'cross', text: "No" }
  },
  {
    featureName: "Number of Tools",
    fileForge: { type: 'lightning', text: "11 tools (growing)" },
    ilovepdf: { type: 'text', text: "25+ tools" },
    smallpdf: { type: 'text', text: "20+ tools" }
  },
  {
    featureName: "PDF Compression",
    fileForge: { type: 'check', text: "Free, unlimited" },
    ilovepdf: { type: 'warning', text: "2 files/day free" },
    smallpdf: { type: 'cross', text: "1 file/hour free" }
  },
  {
    featureName: "Image Tools",
    fileForge: { type: 'check', text: "Free, all tools" },
    ilovepdf: { type: 'cross', text: "Not available" },
    smallpdf: { type: 'warning', text: "Basic only" }
  },
  {
    featureName: "Processing Speed",
    fileForge: { type: 'lightning', text: "Instant (local)" },
    ilovepdf: { type: 'warning', text: "Depends on servers" },
    smallpdf: { type: 'warning', text: "Depends on servers" }
  },
  {
    featureName: "Mobile Friendly",
    fileForge: { type: 'check', text: "Fully responsive" },
    ilovepdf: { type: 'check', text: "Yes" },
    smallpdf: { type: 'check', text: "Yes" }
  },
  {
    featureName: "Data Collection",
    tooltipText: "Whether the service collects data about your files or usage",
    fileForge: { type: 'check', text: "None on files" },
    ilovepdf: { type: 'warning', text: "Usage analytics" },
    smallpdf: { type: 'cross', text: "Files + usage tracked" }
  },
  {
    featureName: "Undo/Redo in Tools",
    fileForge: { type: 'check', text: "Yes, full history" },
    ilovepdf: { type: 'cross', text: "No" },
    smallpdf: { type: 'cross', text: "No" }
  }
];

export default function HomepageComparisonTable() {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [isIntersected, setIsIntersected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Media query to set default viewMode
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setViewMode('table');
      } else {
        setViewMode('card');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersected(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (viewMode === 'table') {
      const timer = setTimeout(() => setShowScrollHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  const renderIcon = (type: ValueCell['type']) => {
    switch (type) {
      case 'check':
        return <Check className="w-4 h-4 text-[#00D4AA] shrink-0" />;
      case 'lightning':
        return <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />;
      case 'cross':
        return <X className="w-4 h-4 text-[#FF5B5B] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#F5A623] shrink-0" />;
      default:
        return null;
    }
  };

  const getValueColorClass = (cell: ValueCell, isFileForge: boolean) => {
    if (cell.type === 'check') return 'text-[#00D4AA] font-semibold';
    if (cell.type === 'lightning') return 'text-[var(--accent)] font-semibold';
    if (cell.type === 'cross') return 'text-[#FF5B5B]';
    if (cell.type === 'warning') return 'text-[#F5A623]';
    return isFileForge ? 'text-[#00D4AA] font-semibold' : 'text-[var(--text-muted)]';
  };

  const handleStartUsing = () => {
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="w-full py-16 border-t border-border-dark/30 mt-6 select-none">
      <div className="max-w-[900px] mx-auto px-4 md:px-0 space-y-8">
        
        {/* Header content specifications */}
        <div className="space-y-3 text-center">
          <span className="text-[var(--accent)] uppercase text-[11px] font-mono tracking-[0.15em] font-bold block mb-1">
            SEE THE DIFFERENCE
          </span>
          <h2 className="text-3xl sm:text-[32px] font-display font-bold text-[var(--text-primary)] tracking-tight">
            FileForge vs The Competition
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-[540px] mx-auto font-sans">
            Why thousands of users switched to FileForge from iLovePDF and Smallpdf
          </p>
        </div>

        {/* View Mode Toggle for Mobile Layouts */}
        <div className="flex justify-center md:hidden">
          <div className="inline-flex bg-surface-secondary p-1 rounded-xl border border-border-dark">
            <button
              onClick={() => setViewMode('card')}
              className={`px-4 py-2 text-xs font-display font-bold rounded-lg transition-all ${
                viewMode === 'card'
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-xs font-display font-bold rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Table View
            </button>
          </div>
        </div>

        {/* Table View Layout */}
        {viewMode === 'table' ? (
          <div className="space-y-4">
            <div className="w-full overflow-x-auto rounded-[20px] border border-border-dark shadow-[0_8px_40px_rgba(108,99,255,0.12)]">
              <table className="w-full min-width-[560px] border-collapse" style={{ minWidth: '680px' }}>
                <thead>
                  <tr className="border-b-2 border-border-dark select-none">
                    {/* Column 1 - Feature column */}
                    <th className="bg-surface-secondary text-left p-[18px_20px] w-[34%]">
                      <span className="text-[var(--text-muted)] text-[13px] uppercase tracking-[0.1em] font-bold">
                        Features
                      </span>
                    </th>
                    {/* Column 2 - FileForge (OUR product) */}
                    <th className="relative w-[22%] p-[18px_16px] text-center border-t-[3px] border-t-[var(--accent)]"
                        style={{
                          background: 'linear-gradient(180deg, rgba(108,99,255,0.15) 0%, rgba(108,99,255,0.05) 100%)'
                        }}>
                      <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
                        <span className="inline-block text-[10px] font-sans font-bold bg-[var(--accent)] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider scale-90">
                          ⭐ Best Choice
                        </span>
                        <span className="text-[15px] font-display font-bold text-[var(--accent)]">
                          FileForge
                        </span>
                      </div>
                    </th>
                    {/* Column 3 - iLovePDF */}
                    <th className="bg-surface-dark w-[22%] p-[18px_16px] text-center">
                      <span className="text-[14px] font-sans font-medium text-[var(--text-muted)]">
                        iLovePDF
                      </span>
                    </th>
                    {/* Column 4 - Smallpdf */}
                    <th className="bg-surface-dark w-[22%] p-[18px_16px] text-center">
                      <span className="text-[14px] font-sans font-medium text-[var(--text-muted)]">
                        Smallpdf
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_DATA.map((row, idx) => {
                    const oddBg = 'rgba(108,99,255,0.06)';
                    const evenBg = 'rgba(108,99,255,0.03)';
                    const rowBg = idx % 2 === 0 ? 'bg-surface-dark' : 'bg-surface-secondary';

                    return (
                      <tr
                        key={idx}
                        className={`${rowBg} group border-b border-border-dark last:border-b-0 hover:bg-surface-secondary/80 transition-colors duration-150`}
                        style={{
                          opacity: isIntersected ? 1 : 0,
                          transform: isIntersected ? 'translateY(0)' : 'translateY(20px)',
                          transition: 'opacity 400ms ease-out, transform 450ms ease-out, background-color 150ms',
                          transitionDelay: `${idx * 40}ms`,
                        }}
                      >
                        {/* Feature column cell with optional descriptive tooltip */}
                        <td className="p-[16px_20px] font-sans text-[14px] text-[var(--text-primary)]">
                          <div className="flex items-center gap-1.5">
                            <span>{row.featureName}</span>
                            {row.tooltipText && (
                              <span className="group/tooltip relative inline-flex cursor-help text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors z-20">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span className="pointer-events-none absolute bottom-full left-1/2 z-[100] mb-2 w-52 -translate-x-1/2 rounded-lg border border-[var(--accent)]/40 bg-surface-dark p-2 text-left font-sans text-xs font-normal leading-normal text-[var(--text-primary)] shadow-xl opacity-0 scale-95 translate-y-1 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-hover/tooltip:translate-y-0 transition-all duration-150 ease-out">
                                  {row.tooltipText}
                                  <span className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-surface-dark" />
                                  <span className="absolute top-full left-1/2 -ml-1 -z-10 border-4 border-transparent border-t-[var(--accent)]/40 translate-y-[1px]" />
                                </span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* FileForge cell */}
                        <td className="relative p-[16px_12px] text-center text-[13px] group-hover:bg-[#6C63FF]/8 transition-colors duration-150"
                            style={{
                              background: idx % 2 === 0 ? oddBg : evenBg
                            }}>
                          {/* absolute hover border design */}
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                          <div className="flex items-center justify-center gap-1.5">
                            {renderIcon(row.fileForge.type)}
                            <span className={getValueColorClass(row.fileForge, true)}>
                              {row.fileForge.text}
                            </span>
                          </div>
                        </td>

                        {/* iLovePDF cell */}
                        <td className="p-[16px_12px] text-center text-[13px]">
                          <div className="flex items-center justify-center gap-1.5">
                            {renderIcon(row.ilovepdf.type)}
                            <span className={getValueColorClass(row.ilovepdf, false)}>
                              {row.ilovepdf.text}
                            </span>
                          </div>
                        </td>

                        {/* Smallpdf cell */}
                        <td className="p-[16px_12px] text-center text-[13px]">
                          <div className="flex items-center justify-center gap-1.5">
                            {renderIcon(row.smallpdf.type)}
                            <span className={getValueColorClass(row.smallpdf, false)}>
                              {row.smallpdf.text}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Table Footer row specifications */}
                  <tr className="border-t border-border-dark bg-surface-dark/60">
                    <td className="p-[16px_20px]"></td>
                    <td className="p-[16px_12px] text-center"
                        style={{
                          background: 'rgba(108,99,255,0.05)'
                        }}>
                      <button
                        onClick={handleStartUsing}
                        className="px-4 py-2 bg-[var(--accent)] hover:brightness-110 text-white font-display text-[12px] font-bold rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        Start Using Free <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="p-[16px_12px] text-center">
                      <a
                        href="https://www.ilovepdf.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline font-medium"
                      >
                        Visit iLovePDF
                      </a>
                    </td>
                    <td className="p-[16px_12px] text-center">
                      <a
                        href="https://smallpdf.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline font-medium"
                      >
                        Visit Smallpdf
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Scroll Hint under Table view on Mobile */}
            {showScrollHint && (
              <div className="md:hidden text-center text-xs text-[var(--text-muted)] mt-2 animate-fade-out duration-500">
                ← Scroll to compare view →
              </div>
            )}
          </div>
        ) : (
          /* Mobile Card View (Highly responsive layout) */
          <div className="grid grid-cols-1 gap-4">
            {COMPARISON_DATA.map((row, idx) => (
              <div
                key={idx}
                className="bg-surface-dark border border-border-dark rounded-xl p-5 space-y-4 hover:border-[var(--accent)]/45 transition-all duration-300 relative overflow-hidden"
                style={{
                  opacity: isIntersected ? 1 : 0,
                  transform: isIntersected ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 400ms ease-out, transform 450ms ease-out',
                  transitionDelay: `${idx * 40}ms`,
                }}
              >
                {/* Feature label at top */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] font-display flex items-center gap-1.5">
                    {row.featureName}
                    {row.tooltipText && (
                      <span className="group/tooltip relative inline-flex cursor-help text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-[100] mb-2 w-52 -translate-x-1/2 rounded-lg border border-[var(--accent)]/40 bg-surface-dark p-2 text-left font-sans text-xs font-normal leading-normal text-[var(--text-primary)] shadow-xl opacity-0 scale-95 translate-y-1 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-hover/tooltip:translate-y-0 transition-all duration-150 ease-out">
                          {row.tooltipText}
                          <span className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-surface-dark" />
                          <span className="absolute top-full left-1/2 -ml-1 -z-10 border-4 border-transparent border-t-[var(--accent)]/40 translate-y-[1px]" />
                        </span>
                      </span>
                    )}
                  </h3>
                </div>

                {/* Values list */}
                <div className="space-y-2.5 text-xs">
                  {/* FileForge Row */}
                  <div className="flex items-center justify-between p-2.5 bg-[#6C63FF]/8 rounded-lg border-l-3 border-[var(--accent)]">
                    <span className="font-bold text-[var(--accent)]">FileForge</span>
                    <div className="flex items-center gap-1.5">
                      {renderIcon(row.fileForge.type)}
                      <span className={getValueColorClass(row.fileForge, true)}>
                        {row.fileForge.text}
                      </span>
                    </div>
                  </div>

                  {/* iLovePDF Row */}
                  <div className="flex items-center justify-between p-2 bg-surface-secondary/50 rounded-lg">
                    <span className="text-[var(--text-muted)] font-medium">iLovePDF</span>
                    <div className="flex items-center gap-1.5">
                      {renderIcon(row.ilovepdf.type)}
                      <span className={getValueColorClass(row.ilovepdf, false)}>
                        {row.ilovepdf.text}
                      </span>
                    </div>
                  </div>

                  {/* Smallpdf Row */}
                  <div className="flex items-center justify-between p-2 bg-surface-secondary/50 rounded-lg">
                    <span className="text-[var(--text-muted)] font-medium">Smallpdf</span>
                    <div className="flex items-center gap-1.5">
                      {renderIcon(row.smallpdf.type)}
                      <span className={getValueColorClass(row.smallpdf, false)}>
                        {row.smallpdf.text}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Mobile Footer CTA button cards */}
            <div className="bg-surface-secondary border border-border-dark p-5 rounded-xl space-y-4">
              <button
                onClick={handleStartUsing}
                className="w-full py-3 bg-[var(--accent)] hover:brightness-110 text-white font-display text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                Start Using FileForge Free <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-around text-xs text-[var(--text-muted)] font-medium select-none">
                <a href="https://www.ilovepdf.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text-primary)]">Visit iLovePDF</a>
                <span className="text-[#252A36]">|</span>
                <a href="https://smallpdf.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text-primary)]">Visit Smallpdf</a>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Disclaimer row specifications */}
        <p className="text-center text-[12px] text-[var(--text-muted)] leading-relaxed font-sans select-none max-w-2xl mx-auto">
          * Comparison based on publicly available free tier features as of 2025. Features may change — visit each site for current offerings.
        </p>

      </div>
    </div>
  );
}
