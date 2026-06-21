import React, { useState } from 'react';
import { ToolId } from '../types';
import { BLOG_DATA_MAP, BlogArticle } from '../utils/blogData';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface ToolPageBlogSectionProps {
  toolId: Exclude<ToolId, 'home'>;
}

const GRADIENT_TEMPLATES = [
  'linear-gradient(135deg, #6C63FF 0%, #9B8FFF 100%)',
  'linear-gradient(135deg, #00D4AA 0%, #00A882 100%)',
  'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
];

export default function ToolPageBlogSection({ toolId }: ToolPageBlogSectionProps) {
  // If no blog data exists for safety, render nothing
  const blogData = BLOG_DATA_MAP[toolId];
  if (!blogData) return null;

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggleExpand = (idx: number) => {
    if (expandedIndex === idx) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(idx);
    }
  };

  const renderParagraphs = (text: string) => {
    return text.split('\n\n').map((para, pIdx) => {
      // Check if paragraph is list structure
      if (para.includes('\n•') || para.startsWith('•') || para.startsWith('1.')) {
        return (
          <div key={pIdx} className="my-3 space-y-1.5">
            {para.split('\n').map((line, lIdx) => {
              const cleaned = line.replace(/^[•\d\.\s\-\*]+/, '').trim();
              if (!cleaned) return null;
              return (
                <div key={lIdx} className="flex items-start gap-2.5 font-sans text-[13.5px] text-[var(--text-primary)] leading-relaxed">
                  <span className="text-[var(--accent-secondary)] mt-1.5 shrink-0 select-none text-[10px]">●</span>
                  <span>{cleaned}</span>
                </div>
              );
            })}
          </div>
        );
      }
      
      // Check if it's a short subheading ending with colon
      if (para.endsWith(':') && para.length < 60) {
        return (
          <h4 key={pIdx} className="font-display font-extrabold text-[var(--accent)] text-[14px] mt-4 mb-2 tracking-wide uppercase">
            {para}
          </h4>
        );
      }

      return (
        <p key={pIdx} className="font-sans text-[13.5px] text-[var(--text-primary)] leading-[1.7] mb-3">
          {para}
        </p>
      );
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-left mt-8 pt-8 border-t border-border-dark/40 pb-12 pr-4 pl-4 md:pl-0 select-none">
      
      {/* 2. SECTION HEADER */}
      <div className="mb-8">
        <span className="text-[var(--accent-secondary)] uppercase text-[11px] font-mono tracking-[0.15em] font-bold block mb-1">
          TIPS & GUIDES
        </span>
        <h3 className="font-display text-2xl font-bold text-text-light flex items-center gap-2">
          <BookOpen className="w-5.5 h-5.5 text-[var(--accent)] shrink-0" />
          {blogData.sectionTitle}
        </h3>
        <div className="text-[var(--text-muted)] text-[13px] mt-1 flex items-center gap-1.5">
          <span>3 quick reads</span>
          <span className="text-border-dark select-none">•</span>
          <span>2 min each</span>
        </div>
      </div>

      {/* 3. BLOG CARD CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogData.articles.map((article: BlogArticle, idx: number) => {
          const isExpanded = expandedIndex === idx;
          const gradient = GRADIENT_TEMPLATES[idx % GRADIENT_TEMPLATES.length];

          return (
            <div
              key={idx}
              className={`bg-surface-dark border p-0 rounded-2xl overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between ${
                isExpanded 
                  ? 'border-[var(--accent)] hover:border-[var(--accent)] col-span-1 md:col-span-2 lg:col-span-3 shadow-[0_12px_32px_rgba(108,99,255,0.18)]' 
                  : 'border-border-dark hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(108,99,255,0.15)] hover:border-[var(--accent)]/40'
              }`}
              style={{
                transitionProperty: 'all',
              }}
            >
              <div>
                {/* Visual Top Banner */}
                <div 
                  className="h-20 w-full flex items-center justify-center relative select-none"
                  style={{ background: gradient }}
                >
                  {/* Absolute subtle background decorative shape */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] mix-blend-overlay"></div>
                  <span className="text-4xl relative z-10 filter drop-shadow">
                    {article.icon}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  <span className="inline-block bg-[#6C63FF]/10 text-[var(--accent)] rounded-full text-[11px] font-sans font-extrabold px-3 py-1 mb-3.5 select-none uppercase tracking-wide">
                    {article.category}
                  </span>

                  <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)] leading-[1.4] mb-2">
                    {article.title}
                  </h4>

                  {/* Body Content Transition - Show normal preview when collapsed, and full when expanded */}
                  {!isExpanded ? (
                    <p className="font-sans text-[13px] text-[var(--text-muted)] leading-[1.6] mb-4 overflow-hidden" 
                       style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', height: '60px' }}>
                      {article.preview}
                    </p>
                  ) : (
                    <div className="border-t border-border-dark mt-4 pt-4 animate-fade-in space-y-4">
                      
                      {/* Main Paragraphs of Full Content */}
                      <div className="text-[13.5px] text-[var(--text-primary)]">
                        {renderParagraphs(article.fullContent)}
                      </div>

                      {/* Display Pro Tip Box if Present */}
                      {article.proTip && (
                        <div className="bg-[#6C63FF]/8 border-l-3 border-l-[var(--accent)] p-3.5 rounded-r-xl select-none my-4">
                          <p className="text-[13px] text-[var(--text-primary)] leading-normal font-sans">
                            <span className="text-[var(--accent)] font-bold mr-1.5">💡 Pro Tip:</span>
                            {article.proTip}
                          </p>
                        </div>
                      )}

                      {/* Additional Helper Content if Present */}
                      {article.additionalContent && (
                        <div className="border-t border-border-dark/30 pt-3.5 mt-3 select-all">
                          <div className="text-[13px] text-[var(--text-muted)] leading-relaxed font-mono whitespace-pre-line bg-surface-secondary/40 p-3 rounded-xl border border-border-dark/40">
                            {article.additionalContent}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-transparent select-none bg-transparent">
                <span className="text-xs text-[var(--text-muted)] font-medium font-sans">
                  ⏱ 2 min read
                </span>
                
                <button
                  type="button"
                  onClick={() => handleToggleExpand(idx)}
                  className="text-[var(--accent)] text-[13px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      Read less <ChevronUp className="w-4 h-4 ml-0.5" />
                    </>
                  ) : (
                    <>
                      Read more <ChevronDown className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
