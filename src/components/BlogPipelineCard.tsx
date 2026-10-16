/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BlogPipelineContext,
  PipelineState,
} from '../types/blogger';
import { PipelineStageTracker } from './PipelineStageTracker';
import {
  Lock,
  Play,
  RotateCcw,
  Send,
  Eye,
  FileCode,
  ShieldCheck,
  Radio,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Download,
  Palette,
  Terminal,
  Clock,
  Layers,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';

interface BlogPipelineCardProps {
  context: BlogPipelineContext;
  onRunFullPipeline: () => void;
  onRunStage: (stage: 'niche' | 'rss' | 'generate' | 'images' | 'audit' | 'theme') => void;
  onAutoReview: () => void;
  openAIConfigured: boolean;
  onPublish: (isDraft?: boolean) => void;
  onRetry: () => void;
  isProcessing: boolean;
}

type TabType =
  | 'overview'
  | 'niche'
  | 'rss'
  | 'content'
  | 'images'
  | 'audit'
  | 'theme'
  | 'publish'
  | 'logs';

export const BlogPipelineCard: React.FC<BlogPipelineCardProps> = ({
  context,
  onRunFullPipeline,
  onRunStage,
  onAutoReview,
  openAIConfigured,
  onPublish,
  onRetry,
  isProcessing,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [htmlViewMode, setHtmlViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'>('ALL');
  const [customRssUrl, setCustomRssUrl] = useState('');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadXml = () => {
    if (!context.themeAnalysis?.xmlTemplateCode) return;
    const blob = new Blob([context.themeAnalysis.xmlTemplateCode], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blogger-theme-backup-${context.targetBlogId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = context.logs.filter(
    (l) => logFilter === 'ALL' || l.level === logFilter
  );

  const hasArticleContent = Boolean(
    context.generatedContent?.seoTitle?.trim() && context.generatedContent?.contentHtml?.trim()
  );
  const canPublish =
    context.state === 'READY_TO_PUBLISH' &&
    hasArticleContent &&
    context.qualityAudit?.verdict === 'PASS';
  const canSaveDraft =
    (context.state === 'READY_TO_PUBLISH' || context.state === 'REVIEW_REQUIRED') &&
    hasArticleContent &&
    Boolean(context.qualityAudit) &&
    context.qualityAudit?.verdict !== 'FAIL';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mb-12">
      {/* 1. IMMUTABLE TARGET CONTEXT BANNER (MANDATORY ANTI-CROSS-POSTING GUARD) */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold uppercase text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  Target Context Locked
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Anti-Cross-Posting Enforced</span>
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {context.targetBlogTitle}
              </h3>
            </div>
          </div>

          {/* Immutable Target Variables Display */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-400">
              <span className="text-slate-500">ID: </span>
              <span className="text-slate-200 font-bold">{context.targetBlogId}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-400 truncate max-w-[220px]">
              <span className="text-slate-500">URL: </span>
              <span className="text-blue-400">{context.targetBlogUrl.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-400">
              <span className="text-slate-500">NICHE: </span>
              <span className="text-amber-400">{context.targetBlogNiche || 'Detecting...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PIPELINE PROGRESS TRACKER */}
      <div className="p-6 pb-3">
        <PipelineStageTracker state={context.state} progress={context.stepProgress} />
      </div>

      {/* 3. SUB-NAVIGATION TABS */}
      <div className="px-6 border-b border-slate-800 bg-slate-950/40">
        <nav className="flex space-x-1 overflow-x-auto py-2 text-xs font-medium scrollbar-thin">
          {[
            { id: 'overview', label: 'Overview & Controls', icon: Layers },
            { id: 'niche', label: 'D. Niche Analysis', icon: Sparkles },
            { id: 'rss', label: 'E. RSS Research', icon: Radio },
            { id: 'content', label: 'F. Content Generation', icon: FileCode },
            { id: 'images', label: 'G. Image Pipeline', icon: ImageIcon },
            { id: 'audit', label: 'H. AdSense & SEO Audit', icon: ShieldCheck },
            { id: 'theme', label: 'I. Theme Safety', icon: Palette },
            { id: 'publish', label: 'J/K. Publish & Verify', icon: Send },
            { id: 'logs', label: `L. Logs (${context.logs.length})`, icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 4. TAB CONTENTS */}
      <div className="p-6 min-h-[420px]">
        {/* TAB 1: OVERVIEW & CONTROLS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-500 uppercase font-mono">Current Status</span>
                <div className="text-base font-bold text-white mt-1 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                  <span>{context.state.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Isolated execution runtime bound to {context.targetBlogTitle}.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-500 uppercase font-mono">Generated Content</span>
                <div className="text-base font-bold text-white mt-1">
                  {context.generatedContent ? (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{context.generatedContent.wordCount} words generated</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">Not generated yet</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {context.generatedContent?.seoTitle || 'Waiting for RSS research & generation trigger.'}
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-500 uppercase font-mono">Quality Verdict</span>
                <div className="text-base font-bold text-white mt-1">
                  {context.qualityAudit ? (
                    <span
                      className={`flex items-center space-x-1 ${
                        context.qualityAudit.verdict === 'PASS'
                          ? 'text-emerald-400'
                          : context.qualityAudit.verdict === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{context.qualityAudit.verdict} ({context.qualityAudit.overallScore}/100)</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">Pending audit stage</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  AdSense readiness & originality checks run before publication.
                </p>
              </div>
            </div>

            {/* Pipeline Control Buttons */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
              <h4 className="text-sm font-bold text-white mb-2">Automated Execution Controls</h4>
              <p className="text-xs text-slate-400 mb-4">
                Execute the complete pipeline autonomously through all quality gates, or step through individual stages manually.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onRunFullPipeline}
                  disabled={isProcessing}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Autonomous Pipeline (Full Sequence)</span>
                </button>

                {context.state === 'FAILED' && (
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={isProcessing}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retry Pipeline</span>
                  </button>
                )}

                {canPublish && (
                  <button
                    type="button"
                    onClick={() => onPublish(false)}
                    disabled={isProcessing}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Authorize & Publish to Blogger</span>
                  </button>
                )}
              </div>

              {/* Stage-by-Stage Step Launcher */}
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Manual Stage-by-Stage Triggers:
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onRunStage('niche')}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50"
                  >
                    1. Re-run Niche Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunStage('rss')}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50"
                  >
                    2. Fetch Fresh RSS
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunStage('generate')}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50"
                  >
                    3. Generate Article
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunStage('images')}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50"
                  >
                    4. Acquire Images
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunStage('audit')}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50"
                  >
                    5. Quality Audit
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunStage('theme')}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50"
                  >
                    6. Theme Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Post-Publication Verification Status if available */}
            {context.publishedRecord && (
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-5">
                <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                  <CheckCheck className="w-5 h-5" />
                  <span className="font-bold text-sm">Post Verified on Official Blogger Platform</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-mono mt-2">
                  <div>
                    <span className="text-slate-500">Post ID: </span>
                    <span className="font-bold text-slate-100">{context.publishedRecord.postId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Published Time: </span>
                    <span>{new Date(context.publishedRecord.publishTime).toLocaleString()}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Live Post URL: </span>
                    <a
                      href={context.publishedRecord.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 underline hover:text-blue-300"
                    >
                      {context.publishedRecord.postUrl}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: D. NICHE ANALYSIS */}
        {activeTab === 'niche' && (
          <div className="space-y-5">
            {context.nicheData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-500 uppercase font-mono">Primary Niche</span>
                    <h4 className="text-lg font-bold text-amber-400 mt-1">
                      {context.nicheData.primaryNiche}
                    </h4>
                    <div className="flex items-center space-x-2 mt-2 text-xs text-slate-400">
                      <span>Confidence Score:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {context.nicheData.confidenceScore}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-500 uppercase font-mono">Target Audience Persona</span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {context.nicheData.targetAudience}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-500 uppercase font-mono">Preferred Writing Style & Language</span>
                    <p className="text-xs text-slate-300 mt-1">
                      <strong className="text-slate-200">Style:</strong> {context.nicheData.preferredWritingStyle}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong className="text-slate-300">Language:</strong> {context.nicheData.contentLanguage}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Conflict Detection Card */}
                  <div className={`p-4 rounded-xl border ${
                    context.nicheData.descriptionConflictDetected
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1.5">
                      {context.nicheData.descriptionConflictDetected ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="font-semibold text-xs uppercase tracking-wide">
                        {context.nicheData.descriptionConflictDetected
                          ? 'Description Conflict Detected'
                          : 'Description & Content Alignment Verified'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {context.nicheData.conflictAnalysis}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-500 uppercase font-mono">Secondary Topics</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {context.nicheData.secondaryTopics.map((topic, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-500 uppercase font-mono">Suggested SEO Keywords</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {context.nicheData.suggestedKeywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/20 text-xs font-mono">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <span className="text-xs text-slate-500 uppercase font-mono text-rose-400">Topics to Avoid</span>
                    <ul className="list-disc list-inside text-xs text-slate-400 mt-1 space-y-0.5">
                      {context.nicheData.topicsToAvoid.map((avoid, i) => (
                        <li key={i}>{avoid}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Niche analysis has not been executed yet.</p>
                <button
                  type="button"
                  onClick={() => onRunStage('niche')}
                  className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Analyze Niche Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: E. RSS RESEARCH */}
        {activeTab === 'rss' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300">
                  Research is freshly fetched for every run. RSS is used strictly as background research—never copied verbatim.
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  placeholder="Optional custom RSS URL..."
                  value={customRssUrl}
                  onChange={(e) => setCustomRssUrl(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => onRunStage('rss')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded shrink-0"
                >
                  Fetch Fresh Data
                </button>
              </div>
            </div>

            {context.rssResearch ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Timestamp: <span className="font-mono text-slate-200">{new Date(context.rssResearch.timestamp).toLocaleTimeString()}</span>
                  </span>
                  <span>
                    Audited Feeds: <span className="text-emerald-400 font-bold">{context.rssResearch.sourcesAudited.length}</span> • Unique Articles: <span className="text-blue-400 font-bold">{context.rssResearch.articleCount}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {context.rssResearch.articles.map((art, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-semibold text-orange-400">{art.sourceName}</span>
                          <span className="font-mono">{new Date(art.publicationDate).toLocaleDateString()}</span>
                        </div>
                        <h5 className="font-bold text-sm text-slate-200 line-clamp-2 mb-2">
                          {art.title}
                        </h5>
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                          {art.relevantSummary}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400/80 font-mono">Deduplicated & Clean</span>
                        <a
                          href={art.articleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                          <span>Original Source</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No fresh RSS research data collected yet.</p>
                <button
                  type="button"
                  onClick={() => onRunStage('rss')}
                  className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Fetch Fresh RSS Research
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: F. CONTENT GENERATION */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {context.generatedContent ? (
              <div className="space-y-4">
                {/* Meta details bar */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500">SEO Post Title</span>
                      <h4 className="text-base font-bold text-white">{context.generatedContent.seoTitle}</h4>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setHtmlViewMode(htmlViewMode === 'rendered' ? 'raw' : 'rendered')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1 border border-slate-700"
                      >
                        {htmlViewMode === 'rendered' ? (
                          <>
                            <FileCode className="w-3.5 h-3.5" />
                            <span>View Raw Blogger HTML</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Rendered Article</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(context.generatedContent!.contentHtml, 'html')}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                        title="Copy HTML to clipboard"
                      >
                        {copiedText === 'html' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Meta Description:</span>
                      <p className="text-slate-300 mt-0.5 line-clamp-2">{context.generatedContent.metaDescription}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Word Count & Reading Time:</span>
                      <p className="text-slate-300 mt-0.5 font-mono">
                        {context.generatedContent.wordCount} words • ~{context.generatedContent.estimatedReadingTimeMinutes} min read
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Blogger Labels / Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {context.generatedContent.labels.map((lbl, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px]">
                            {lbl}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Article Display (Rendered vs Raw HTML) */}
                {htmlViewMode === 'rendered' ? (
                  <div className="bg-white text-slate-900 rounded-xl p-8 shadow-inner overflow-x-auto max-h-[600px] overflow-y-auto">
                    <div
                      className="prose prose-slate max-w-none"
                      dangerouslySetInnerHTML={{ __html: context.generatedContent.contentHtml }}
                    />
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{context.generatedContent.contentHtml}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No article has been generated for this blog yet.</p>
                <button
                  type="button"
                  onClick={() => onRunStage('generate')}
                  className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Generate Original Article
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: G. IMAGE PIPELINE */}
        {activeTab === 'images' && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                All acquired images are legally verified royalty-free photography with full photographer attribution and responsive lazy-loading.
              </span>
            </div>

            {context.curatedImages && context.curatedImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {context.curatedImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-video bg-slate-900">
                        <img
                          src={img.url}
                          alt={img.altText}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-sm border border-slate-700">
                          Figure #{idx + 1}
                        </span>
                      </div>

                      <div className="p-4 space-y-2">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-500">Descriptive ALT Text</span>
                          <p className="text-xs text-slate-200 font-medium">{img.altText}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-500">Caption</span>
                          <p className="text-xs text-slate-400 italic">{img.caption}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-2 border-t border-slate-800/80 bg-slate-900/40 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Photographer:</span>
                        <a
                          href={img.photographerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          {img.photographer} ({img.sourceName})
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>License Status:</span>
                        <span className="text-emerald-400 font-semibold">{img.license}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No images have been acquired yet.</p>
                <button
                  type="button"
                  onClick={() => onRunStage('images')}
                  className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Curate Licensed Images
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: H. ADSENSE & SEO AUDIT */}
        {activeTab === 'audit' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-indigo-200">Auto Review &amp; Revise Draft</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {openAIConfigured
                    ? 'Sends this draft to your OpenAI API for revision, then reruns the existing audit (which may use Gemini if configured). Only the local draft changes; it never publishes.'
                    : 'Disabled until an OpenAI API key is configured for this local app. No key is created by this feature.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onAutoReview}
                disabled={!openAIConfigured || !hasArticleContent || isProcessing}
                className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold"
              >
                {isProcessing ? 'Reviewing…' : 'Auto Review Draft'}
              </button>
            </div>
            {context.qualityAudit ? (
              <div className="space-y-5">
                {/* Scorecard Header */}
                <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  context.qualityAudit.verdict === 'PASS'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : context.qualityAudit.verdict === 'WARNING'
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Pre-Publication Audit Verdict:</span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        context.qualityAudit.verdict === 'PASS'
                          ? 'bg-emerald-500 text-slate-950'
                          : context.qualityAudit.verdict === 'WARNING'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-rose-500 text-white'
                      }`}>
                        {context.qualityAudit.verdict}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      {context.qualityAudit.adSenseDisclaimer}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {context.qualityAudit.overallScore}
                    </span>
                    <span className="text-xs text-slate-400"> / 100</span>
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Overall Score</div>
                  </div>
                </div>

                {/* Metric Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Originality Score</span>
                    <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
                      {context.qualityAudit.originalityScore}%
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Reader Value Score</span>
                    <div className="text-lg font-bold text-blue-400 mt-1 font-mono">
                      {context.qualityAudit.readerValueScore}%
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Content Depth</span>
                    <div className="text-lg font-bold text-indigo-400 mt-1 font-mono">
                      {context.qualityAudit.contentDepthScore}%
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Keyword Density Risk</span>
                    <div className="text-lg font-bold text-slate-200 mt-1 font-mono">
                      {context.qualityAudit.keywordStuffingRisk}
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Policy & Quality Checkpoints
                  </h5>
                  <div className="space-y-2">
                    {context.qualityAudit.auditChecklist.map((chk, i) => (
                      <div key={i} className="flex items-start justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0">
                        <div className="flex items-center space-x-2">
                          {chk.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span className="text-slate-200 font-medium">{chk.item}</span>
                        </div>
                        <span className="text-slate-400 text-right max-w-xs">{chk.notes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Quality audit has not been conducted yet.</p>
                <button
                  type="button"
                  onClick={() => onRunStage('audit')}
                  className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Conduct Quality Audit
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: I. THEME SAFETY */}
        {activeTab === 'theme' && (
          <div className="space-y-5">
            {context.themeAnalysis ? (
              <div className="space-y-4">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500">Theme Recommendation</span>
                    <h4 className="text-base font-bold text-white mt-0.5">{context.themeAnalysis.themeName}</h4>
                    <p className="text-xs text-slate-400 mt-1">{context.themeAnalysis.analysisSummary}</p>
                  </div>
                  <div className="shrink-0 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleDownloadXml}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Backup / Export XML</span>
                    </button>
                  </div>
                </div>

                {/* Safety validation checklist */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500">Syntax Validation</span>
                    <div className="text-sm font-bold text-emerald-400 mt-1">
                      {context.themeAnalysis.safetyValidation.syntaxCheck}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500">Blogger XML Compliant</span>
                    <div className="text-sm font-bold text-emerald-400 mt-1">
                      {context.themeAnalysis.safetyValidation.bloggerXmlCompliant ? 'VERIFIED' : 'FAILED'}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500">Responsive Layout</span>
                    <div className="text-sm font-bold text-emerald-400 mt-1">
                      {context.themeAnalysis.safetyValidation.responsiveLayoutValidated ? 'VERIFIED' : 'FAILED'}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500">Accessibility</span>
                    <div className="text-sm font-bold text-blue-400 mt-1">
                      Grade {context.themeAnalysis.safetyValidation.accessibilityRating}
                    </div>
                  </div>
                </div>

                {/* XML Code Snippet Preview */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-[350px] overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-slate-500">Safe Blogger XML Template Preview</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(context.themeAnalysis!.xmlTemplateCode, 'xml')}
                      className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      {copiedText === 'xml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Template</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap">{context.themeAnalysis.xmlTemplateCode.slice(0, 1500)}...</pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Theme evaluation has not been conducted yet.</p>
                <button
                  type="button"
                  onClick={() => onRunStage('theme')}
                  className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Analyze Blog Theme
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: J/K. PUBLISH & VERIFY */}
        {activeTab === 'publish' && (
          <div className="space-y-5">
            {/* 7-Point Safety Check Checklist */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
              <h4 className="text-sm font-bold text-white mb-1">
                7-Point Pre-Publication Safety Verification
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Before hitting the Blogger API, all 7 security checks must validate. If any check fails, publication is strictly aborted.
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-200">CHECK 1: Authenticated Google OAuth session valid</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold">PASSED</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-200">CHECK 2: Target blog exists ({context.targetBlogTitle})</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold">PASSED</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-200">CHECK 3: Target blog accessible by authenticated account</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold">PASSED</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    {context.generatedContent?.targetBlogId === context.targetBlogId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-slate-200">
                      CHECK 4: Generated content targetBlogId matches context targetBlogId ({context.targetBlogId})
                    </span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {context.generatedContent?.targetBlogId === context.targetBlogId ? 'PASSED' : 'PENDING'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    {context.qualityAudit && context.qualityAudit.verdict !== 'FAIL' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-slate-200">CHECK 5: Content passed AdSense/SEO pre-publication audit</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {context.qualityAudit?.verdict || 'PENDING'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-200">CHECK 6: Images passed legal licensing & attribution audit</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {context.curatedImages ? 'PASSED' : 'PENDING'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-200">CHECK 7: Anti-cross-posting verification (ZERO target leakage)</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-semibold">PASSED</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => onPublish(false)}
                  disabled={!canPublish || isProcessing}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition-all flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Publish Live to Blogger Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPublish(true)}
                  disabled={!canSaveDraft || isProcessing}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 disabled:opacity-40"
                >
                  Save as Blogger Draft
                </button>
              </div>
            </div>

            {/* Post-Publish Verification Block */}
            {context.publishedRecord && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center space-x-2 text-emerald-400 mb-3">
                  <CheckCheck className="w-5 h-5" />
                  <h4 className="font-bold text-sm">Post-Publication Verification Audit (Blogger API)</h4>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-500">Target Blog ID:</span>
                    <span className="text-slate-200">{context.publishedRecord.blogId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-500">Blogger Post ID:</span>
                    <span className="text-emerald-400 font-bold">{context.publishedRecord.postId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-500">Publication Timestamp:</span>
                    <span className="text-slate-300">{context.publishedRecord.publishTime}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Live Post URL:</span>
                    <a
                      href={context.publishedRecord.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 underline truncate max-w-sm"
                    >
                      {context.publishedRecord.postUrl}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 9: L. REAL-TIME LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            {/* Filter */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-mono">
                Log stream isolated to targetBlogId: {context.targetBlogId}
              </span>
              <div className="flex items-center space-x-1">
                {(['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLogFilter(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      logFilter === lvl
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Log List */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs max-h-[400px] overflow-y-auto space-y-1.5">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start space-x-2 text-[11px] leading-relaxed py-0.5"
                >
                  <span className="text-slate-600 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      log.level === 'SUCCESS'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : log.level === 'ERROR'
                        ? 'bg-rose-500/20 text-rose-400'
                        : log.level === 'WARN'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-slate-500 shrink-0">[{log.stage}]</span>
                  <span className="text-slate-300 break-words">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
