/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Play,
  Layers,
  Search,
  BookOpen,
  Palette,
  CheckCircle2,
  FileText,
  Lock,
} from 'lucide-react';
import { BloggerBlog } from '../types/blogger';

interface BlogDiscoveryProps {
  blogs: BloggerBlog[];
  selectedBlogIds: string[];
  isLoading: boolean;
  onRefresh: () => void;
  onToggleSelectBlog: (blogId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onStartSinglePipeline: (blog: BloggerBlog) => void;
  onStartSelectedPipelines: () => void;
  activeBlogId: string | null;
  onSetActiveBlogId: (blogId: string) => void;
}

export const BlogDiscovery: React.FC<BlogDiscoveryProps> = ({
  blogs,
  selectedBlogIds,
  isLoading,
  onRefresh,
  onToggleSelectBlog,
  onSelectAll,
  onDeselectAll,
  onStartSinglePipeline,
  onStartSelectedPipelines,
  activeBlogId,
  onSetActiveBlogId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredBlogs = blogs.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.includes(searchTerm) ||
      (b.detectedNiche && b.detectedNiche.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Blogger Blog Discovery & Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {blogs.length} Connected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authenticated via official Google Blogger API session. Select blogs to execute strict, isolated 1-to-1 publishing pipelines.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Scan Blogs</span>
          </button>

          {selectedBlogIds.length > 0 && (
            <button
              type="button"
              onClick={onStartSelectedPipelines}
              className="inline-flex items-center space-x-2 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-lg shadow-md shadow-orange-600/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Isolated Pipelines ({selectedBlogIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Selection Tools */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search blogs by title, ID, or niche..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800"
          >
            Select All
          </button>
          <span className="text-slate-700">|</span>
          <button
            type="button"
            onClick={onDeselectAll}
            className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Blogs Grid */}
      {filteredBlogs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">No Blogger blogs found matching query.</p>
          <p className="text-xs text-slate-500 mt-1">
            Ensure your Google account owns or authors Blogger blogs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBlogs.map((blog) => {
            const isSelected = selectedBlogIds.includes(blog.id);
            const isActive = activeBlogId === blog.id;

            return (
              <div
                key={blog.id}
                onClick={() => onSetActiveBlogId(blog.id)}
                className={`relative rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-slate-800/90 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                    : isSelected
                    ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Top: Checkbox & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleSelectBlog(blog.id);
                        }}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="font-semibold text-sm text-white leading-tight line-clamp-1">
                        {blog.name}
                      </span>
                    </div>

                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {blog.status || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Blog Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 min-h-[32px]">
                    {blog.description || 'No public description configured on Blogger.'}
                  </p>

                  {/* Blog Meta Details */}
                  <div className="space-y-1.5 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-3">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>Blog ID:</span>
                      </span>
                      <div className="flex items-center space-x-1 font-mono text-slate-300">
                        <span>{blog.id}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(blog.id, e)}
                          className="hover:text-white"
                          title="Copy Blog ID"
                        >
                          {copiedId === blog.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Destination URL:</span>
                      <a
                        href={blog.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-400 hover:text-blue-300 flex items-center space-x-0.5 truncate max-w-[150px]"
                      >
                        <span className="truncate">{blog.url.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Detected Niche:</span>
                      <span className="font-medium text-amber-400 truncate max-w-[150px]">
                        {blog.detectedNiche || 'To Be Analyzed'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Total Posts / Pages:</span>
                      <span className="text-slate-300">
                        {blog.posts?.totalItems || 0} posts • {blog.pages?.totalItems || 0} pages
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Pipeline Status & Launch Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-slate-400 text-[11px]">
                      {blog.pipelineStatus || 'Ready'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartSinglePipeline(blog);
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:text-white bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-lg transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Pipeline</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
