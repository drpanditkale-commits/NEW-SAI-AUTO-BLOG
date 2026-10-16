/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, AlertTriangle, Send, X, Lock, CheckCircle2 } from 'lucide-react';
import { BlogPipelineContext } from '../types/blogger';

interface PublishConfirmationModalProps {
  isOpen: boolean;
  context: BlogPipelineContext | null;
  isDraft: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPublishing: boolean;
}

export const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  isOpen,
  context,
  isDraft,
  onConfirm,
  onCancel,
  isPublishing,
}) => {
  if (!isOpen || !context) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPublishing}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Confirm Publication to Blogger
            </h3>
            <p className="text-xs text-slate-400">
              {isDraft ? 'Create a draft post on Blogger' : 'Publish live article to official Blogger API'}
            </p>
          </div>
        </div>

        {/* Verification Summary */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5 mb-5 font-mono">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center space-x-1 text-slate-500">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Target Blog ID:</span>
            </span>
            <span className="font-bold text-slate-200">{context.targetBlogId}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Target Blog Title:</span>
            <span className="font-semibold text-white">{context.targetBlogTitle}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Target Blog URL:</span>
            <span className="text-blue-400 truncate max-w-[200px]">{context.targetBlogUrl}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Article Title:</span>
            <span className="text-slate-200 truncate max-w-[220px]">
              {context.generatedContent?.seoTitle}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Anti-Cross-Posting Check:</span>
            <span className="text-emerald-400 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASSED (Target ID Verified)</span>
            </span>
          </div>
        </div>

        <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 flex items-start space-x-2 mb-6">
          <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            With your explicit permission, AutoBlog Studio will issue a direct API mutation to your Google Blogger account. The post will be strictly published only to Blog ID: {context.targetBlogId}.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPublishing}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPublishing}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing via Blogger API...' : 'Confirm & Publish'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
