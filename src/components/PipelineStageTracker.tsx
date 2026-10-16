/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Search,
  Radio,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  Send,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { PipelineState } from '../types/blogger';

interface PipelineStageTrackerProps {
  state: PipelineState;
  progress: number;
}

const STAGES = [
  { key: 'ANALYZING', label: 'Niche Analysis', icon: Search, sub: 'Topic & style scan' },
  { key: 'RSS_FETCHING', label: 'Fresh RSS Research', icon: Radio, sub: 'Real-time data feeds' },
  { key: 'GENERATING', label: 'Original Content', icon: FileText, sub: 'Semantic Blogger HTML' },
  { key: 'IMAGE_PROCESSING', label: 'Image Licensing', icon: ImageIcon, sub: 'Attributed media' },
  { key: 'QUALITY_CHECK', label: 'AdSense & SEO Audit', icon: ShieldAlert, sub: 'Quality gate check' },
  { key: 'PUBLISHING', label: 'Blogger API Publish', icon: Send, sub: '7-point verification' },
  { key: 'VERIFICATION', label: 'Post Verification', icon: Eye, sub: 'ID & ownership check' },
];

export const PipelineStageTracker: React.FC<PipelineStageTrackerProps> = ({ state, progress }) => {
  const getStageIndex = (currentState: PipelineState): number => {
    switch (currentState) {
      case 'DISCOVERED':
      case 'SELECTED':
        return 0;
      case 'ANALYZING':
        return 0;
      case 'NICHE_IDENTIFIED':
      case 'RSS_FETCHING':
        return 1;
      case 'RESEARCH_READY':
      case 'GENERATING':
        return 2;
      case 'IMAGE_PROCESSING':
        return 3;
      case 'QUALITY_CHECK':
        return 4;
      case 'READY_TO_PUBLISH':
      case 'PUBLISHING':
        return 5;
      case 'PUBLISHED':
      case 'VERIFICATION':
        return 6;
      case 'COMPLETED':
        return 7;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(state);
  const isFailed = state === 'FAILED';
  const isReviewRequired = state === 'REVIEW_REQUIRED';
  const isCompleted = state === 'COMPLETED';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pipeline Execution State:
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide flex items-center space-x-1.5 ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isFailed
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : isReviewRequired
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {isCompleted ? (
              <CheckCheck className="w-3.5 h-3.5" />
            ) : isFailed ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : isReviewRequired ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            <span>{state.replace(/_/g, ' ')}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span>Progress</span>
          <span className="font-mono font-semibold text-slate-200">{progress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            isFailed
              ? 'bg-rose-500'
              : isReviewRequired
              ? 'bg-amber-500'
              : isCompleted
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-blue-500 to-indigo-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = isCompleted || currentIndex > idx;
          const isCurrent = !isCompleted && !isFailed && !isReviewRequired && currentIndex === idx;
          const isCurrentReview = isReviewRequired && currentIndex === idx;
          const isCurrentFailed = isFailed && currentIndex === idx;

          return (
            <div
              key={stage.key}
              className={`p-2 rounded-lg border transition-all text-left flex flex-col justify-between ${
                isDone
                  ? 'bg-slate-800/80 border-emerald-500/40 text-slate-300'
                  : isCurrent
                  ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-sm shadow-blue-500/20 ring-1 ring-blue-500/50'
                  : isCurrentReview
                  ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                  : isCurrentFailed
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                  : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono opacity-70">0{idx + 1}</span>
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                ) : isCurrentReview ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                ) : isCurrentFailed ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Icon className="w-3.5 h-3.5 opacity-40" />
                )}
              </div>
              <div>
                <div className="text-[11px] font-semibold leading-tight line-clamp-1">
                  {stage.label}
                </div>
                <div className="text-[9px] text-slate-400 line-clamp-1">{stage.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
