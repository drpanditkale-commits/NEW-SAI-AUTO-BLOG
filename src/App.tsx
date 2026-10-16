/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BlogDiscovery } from './components/BlogDiscovery';
import { BlogPipelineCard } from './components/BlogPipelineCard';
import { PublishConfirmationModal } from './components/PublishConfirmationModal';
import {
  GoogleUserProfile,
  BloggerBlog,
  BlogPipelineContext,
} from './types/blogger';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/auth';
import { fetchUserBlogs } from './services/bloggerApi';
import {
  createIsolatedPipelineContext,
  runNicheAnalysisStage,
  runRssResearchStage,
  runContentGenerationStage,
  runImageAcquisitionStage,
  runQualityAuditStage,
  runAutoReviewStage,
  runThemeAnalysisStage,
  executePublishOperation,
  appendPipelineLog,
} from './services/pipelineEngine';
import {
  ShieldAlert,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<GoogleUserProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [blogs, setBlogs] = useState<BloggerBlog[]>([]);
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Map of isolated pipeline contexts keyed by targetBlogId
  const [pipelineContexts, setPipelineContexts] = useState<Record<string, BlogPipelineContext>>({});
  const [isProcessingMap, setIsProcessingMap] = useState<Record<string, boolean>>({});
  const [openAIConfigured, setOpenAIConfigured] = useState(false);

  // Publishing confirmation modal state
  const [publishModal, setPublishModal] = useState<{
    isOpen: boolean;
    context: BlogPipelineContext | null;
    isDraft: boolean;
    isPublishing: boolean;
  }>({
    isOpen: false,
    context: null,
    isDraft: false,
    isPublishing: false,
  });

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    let isActive = true;
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : null))
      .then((health) => {
        if (isActive) setOpenAIConfigured(health?.openAIConfigured === true);
      })
      .catch(() => {
        if (isActive) setOpenAIConfigured(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  // Load user blogs
  const refreshBlogs = useCallback(async (token: string) => {
    setIsLoadingBlogs(true);
    setErrorBanner(null);
    try {
      const fetchedBlogs = await fetchUserBlogs(token);
      setBlogs(fetchedBlogs);
      if (fetchedBlogs.length > 0) {
        // Select first blog by default if none selected
        setSelectedBlogIds((prev) => (prev.length === 0 ? [fetchedBlogs[0].id] : prev));
        setActiveBlogId((prev) => prev || fetchedBlogs[0].id);

        // Initialize contexts for newly discovered blogs
        setPipelineContexts((prev) => {
          const next = { ...prev };
          fetchedBlogs.forEach((b) => {
            if (!next[b.id]) {
              next[b.id] = createIsolatedPipelineContext(b);
            }
          });
          return next;
        });
      } else {
        setErrorBanner('No Blogger blogs found for this Google account.');
      }
    } catch (err: any) {
      console.error('Error fetching blogs:', err);
      setErrorBanner(err.message || 'Failed to retrieve blogs from Google Blogger API.');
    } finally {
      setIsLoadingBlogs(false);
    }
  }, []);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (profile, token) => {
        setUser(profile);
        refreshBlogs(token);
      },
      () => {
        setUser(null);
        setBlogs([]);
        setSelectedBlogIds([]);
        setActiveBlogId(null);
        setPipelineContexts({});
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [refreshBlogs]);

  // Google Sign-In Handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorBanner(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        await refreshBlogs(result.accessToken);
        showToast('success', `Signed in as ${result.user.email}. Official Blogger permissions granted.`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        const message =
          'Google sign-in is blocked because localhost is not an authorized Firebase domain. Add localhost in Firebase Console under Authentication > Settings > Authorized domains, then reload and try again.';
        setErrorBanner(message);
        showToast('error', 'Authorize localhost in Firebase Authentication settings to sign in.');
      } else if (String(err?.code || '').startsWith('auth/api-key-not-valid')) {
        const message =
          'Firebase rejected the configured API key. Check that the Web API key belongs to the BLOGGER AUTO project, is enabled, and allows requests from localhost (including the Identity Toolkit API).';
        setErrorBanner(message);
        showToast('error', 'Check the BLOGGER AUTO Firebase Web API key and its restrictions.');
      } else if (err?.code === 'auth/popup-blocked') {
        const message =
          'The browser blocked the Google sign-in popup. Allow popups for localhost:3000 and try again.';
        setErrorBanner(message);
        showToast('error', 'Allow popups for localhost:3000 to continue Google sign-in.');
      } else {
        setErrorBanner(err.message || 'Google authentication failed.');
        showToast(
          'error',
          err?.code === 'auth/popup-closed-by-user'
            ? 'Google Sign-In popup was closed before sign-in completed.'
            : 'Google Sign-In failed.'
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setBlogs([]);
    setSelectedBlogIds([]);
    setActiveBlogId(null);
    setPipelineContexts({});
    showToast('info', 'Disconnected Google account and cleared OAuth token from memory.');
  };

  // Blog Selection
  const toggleSelectBlog = (blogId: string) => {
    setSelectedBlogIds((prev) =>
      prev.includes(blogId) ? prev.filter((id) => id !== blogId) : [...prev, blogId]
    );
  };

  const selectAllBlogs = () => setSelectedBlogIds(blogs.map((b) => b.id));
  const deselectAllBlogs = () => setSelectedBlogIds([]);

  // Update pipeline context helper
  const updatePipelineContext = (updated: BlogPipelineContext) => {
    setPipelineContexts((prev) => ({
      ...prev,
      [updated.targetBlogId]: updated,
    }));
  };

  // Full Autonomous Pipeline Execution for a Single Blog
  const runFullPipeline = async (blogId: string) => {
    const token = await getAccessToken();
    if (!token) {
      showToast('error', 'Google authentication required to execute publishing pipeline.');
      return;
    }

    const currentContext = pipelineContexts[blogId];
    if (!currentContext) return;

    setIsProcessingMap((prev) => ({ ...prev, [blogId]: true }));
    showToast('info', `Starting isolated pipeline for "${currentContext.targetBlogTitle}"...`);

    try {
      // Stage 1: Niche Analysis
      let ctx = await runNicheAnalysisStage(currentContext, token, updatePipelineContext);

      // Stage 2: Fresh RSS Research
      ctx = await runRssResearchStage(ctx, undefined, updatePipelineContext);

      // Stage 3: Content Generation
      ctx = await runContentGenerationStage(ctx, updatePipelineContext);

      // Stage 4: Licensed Images
      ctx = await runImageAcquisitionStage(ctx, updatePipelineContext);

      // Stage 5: Quality & AdSense Audit
      ctx = await runQualityAuditStage(ctx, updatePipelineContext);

      // Stage 6: Theme Safety Analysis
      ctx = await runThemeAnalysisStage(ctx, updatePipelineContext);

      showToast(
        'success',
        `Pipeline for "${ctx.targetBlogTitle}" reached state: ${ctx.state}. Ready for review!`
      );
    } catch (err: any) {
      console.error(`Pipeline error on blog ${blogId}:`, err);
      showToast('error', `Pipeline execution failed on blog ${blogId}: ${err.message}`);
    } finally {
      setIsProcessingMap((prev) => ({ ...prev, [blogId]: false }));
    }
  };

  // Parallel Isolated Execution for All Selected Blogs
  const runSelectedPipelines = async () => {
    if (selectedBlogIds.length === 0) return;
    showToast('info', `Launching ${selectedBlogIds.length} isolated pipelines concurrently...`);
    await Promise.allSettled(selectedBlogIds.map((id) => runFullPipeline(id)));
    showToast('success', 'All selected blog pipeline runs completed.');
  };

  // Manual Stage Execution
  const runSingleStage = async (
    blogId: string,
    stage: 'niche' | 'rss' | 'generate' | 'images' | 'audit' | 'theme'
  ) => {
    const token = await getAccessToken();
    if (!token) {
      showToast('error', 'Google authentication required.');
      return;
    }

    const currentContext = pipelineContexts[blogId];
    if (!currentContext) return;

    setIsProcessingMap((prev) => ({ ...prev, [blogId]: true }));
    try {
      switch (stage) {
        case 'niche':
          await runNicheAnalysisStage(currentContext, token, updatePipelineContext);
          break;
        case 'rss':
          await runRssResearchStage(currentContext, undefined, updatePipelineContext);
          break;
        case 'generate':
          await runContentGenerationStage(currentContext, updatePipelineContext);
          break;
        case 'images':
          await runImageAcquisitionStage(currentContext, updatePipelineContext);
          break;
        case 'audit':
          await runQualityAuditStage(currentContext, updatePipelineContext);
          break;
        case 'theme':
          await runThemeAnalysisStage(currentContext, updatePipelineContext);
          break;
      }
      showToast('success', `Completed ${stage} stage for "${currentContext.targetBlogTitle}".`);
    } catch (err: any) {
      showToast('error', `Stage ${stage} failed: ${err.message}`);
    } finally {
      setIsProcessingMap((prev) => ({ ...prev, [blogId]: false }));
    }
  };

  const runAutoReview = async (blogId: string) => {
    const currentContext = pipelineContexts[blogId];
    if (!currentContext?.generatedContent) return;
    if (!openAIConfigured) {
      showToast('info', 'Auto Review is unavailable until an OpenAI API key is configured on this local server.');
      return;
    }
    const confirmed = window.confirm(
      `Send the current draft for "${currentContext.targetBlogTitle}" to the configured OpenAI API for review and revision? The revised result will update only this local draft. The existing audit will then rerun and may use Gemini if configured. No Blogger post will be changed or published.`
    );
    if (!confirmed) return;

    setIsProcessingMap((prev) => ({ ...prev, [blogId]: true }));
    try {
      const reviewedContext = await runAutoReviewStage(currentContext, updatePipelineContext);
      showToast('success', `Draft revised and audited for "${reviewedContext.targetBlogTitle}". It remains unpublished.`);
    } catch (err: any) {
      showToast('error', `Auto Review failed: ${err.message}`);
    } finally {
      setIsProcessingMap((prev) => ({ ...prev, [blogId]: false }));
    }
  };

  // Open Publish Confirmation Dialog
  const handleRequestPublish = (blogId: string, isDraft: boolean = false) => {
    const ctx = pipelineContexts[blogId];
    if (!ctx) return;
    setPublishModal({
      isOpen: true,
      context: ctx,
      isDraft,
      isPublishing: false,
    });
  };

  // Confirm and Execute Publication
  const handleConfirmPublish = async () => {
    if (!publishModal.context) return;
    const blogId = publishModal.context.targetBlogId;
    const token = await getAccessToken();

    if (!token) {
      showToast('error', 'Google OAuth token is missing. Please sign in again.');
      return;
    }

    setPublishModal((prev) => ({ ...prev, isPublishing: true }));
    try {
      const result = await executePublishOperation(
        publishModal.context,
        token,
        publishModal.isDraft,
        updatePipelineContext
      );
      showToast(
        'success',
        `Successfully published to Blogger! Post verified with ID: ${result.publishedRecord?.postId}`
      );
      setPublishModal({ isOpen: false, context: null, isDraft: false, isPublishing: false });
    } catch (err: any) {
      console.error('Publish error:', err);
      showToast('error', `Publication aborted: ${err.message}`);
      setPublishModal((prev) => ({ ...prev, isPublishing: false }));
    }
  };

  const activeContext = activeBlogId ? pipelineContexts[activeBlogId] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* App Header */}
      <Header
        user={user}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        totalBlogs={blogs.length}
        activePipelines={
          Object.values(pipelineContexts).filter(
            (c) => c.state !== 'DISCOVERED' && c.state !== 'COMPLETED'
          ).length
        }
        completedPosts={
          Object.values(pipelineContexts).filter((c) => c.state === 'COMPLETED').length
        }
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold border ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                : notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                : 'bg-blue-950/90 text-blue-300 border-blue-500/40'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {errorBanner && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          </div>
        )}

        {/* System Overview Hero */}
        <div className="mb-8 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/30 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Isolated Multi-Blog Publishing Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Autonomous Blogger Automation & Quality Engine
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Strict 1-to-1 pipeline isolation protects your publications against cross-posting.
              Every run fetches fresh authoritative RSS research, conducts comprehensive niche identification, generates original semantic Blogger HTML, curates legally licensed photography, and performs a 12-point AdSense quality audit before publishing.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Rule 1: ZERO Google Passwords Handled</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Rule 2: In-Memory Token Security</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Rule 3: TargetBlogId Match Validation</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Rule 4: Official Blogger v3 REST API</span>
            </div>
          </div>
        </div>

        {/* Section B & C: Blogger Blog Discovery & Selection */}
        <BlogDiscovery
          blogs={blogs}
          selectedBlogIds={selectedBlogIds}
          isLoading={isLoadingBlogs}
          onRefresh={() => {
            getAccessToken().then((t) => {
              if (t) refreshBlogs(t);
              else handleLogin();
            });
          }}
          onToggleSelectBlog={toggleSelectBlog}
          onSelectAll={selectAllBlogs}
          onDeselectAll={deselectAllBlogs}
          onStartSinglePipeline={(blog) => {
            setActiveBlogId(blog.id);
            runFullPipeline(blog.id);
          }}
          onStartSelectedPipelines={runSelectedPipelines}
          activeBlogId={activeBlogId}
          onSetActiveBlogId={setActiveBlogId}
        />

        {/* Section D - M: Active Blog Pipeline View */}
        {activeContext ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Pipeline Console:
                </span>
                <span className="text-sm font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                  {activeContext.targetBlogTitle}
                </span>
              </div>

              {/* Quick switch between multiple running pipelines */}
              {blogs.length > 1 && (
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-slate-500 mr-1 hidden sm:inline">Switch Blog Console:</span>
                  {blogs.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setActiveBlogId(b.id)}
                      className={`px-2.5 py-1 rounded-md transition-all text-xs ${
                        activeBlogId === b.id
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {b.name.slice(0, 18)}...
                    </button>
                  ))}
                </div>
              )}
            </div>

            <BlogPipelineCard
              key={activeContext.id}
              context={activeContext}
              onRunFullPipeline={() => runFullPipeline(activeContext.targetBlogId)}
              onRunStage={(stg) => runSingleStage(activeContext.targetBlogId, stg)}
              onAutoReview={() => runAutoReview(activeContext.targetBlogId)}
              openAIConfigured={openAIConfigured}
              onPublish={(isDraft) => handleRequestPublish(activeContext.targetBlogId, isDraft)}
              onRetry={() => runFullPipeline(activeContext.targetBlogId)}
              isProcessing={!!isProcessingMap[activeContext.targetBlogId]}
            />
          </div>
        ) : (
          <div className="text-center py-12 border border-slate-800 rounded-2xl bg-slate-900/40">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Target Blog Selected</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a blog from the discovery list above to inspect or execute its isolated publishing pipeline.
            </p>
          </div>
        )}
      </main>

      {/* Publication Confirmation Modal */}
      <PublishConfirmationModal
        isOpen={publishModal.isOpen}
        context={publishModal.context}
        isDraft={publishModal.isDraft}
        onConfirm={handleConfirmPublish}
        onCancel={() =>
          setPublishModal({ isOpen: false, context: null, isDraft: false, isPublishing: false })
        }
        isPublishing={publishModal.isPublishing}
      />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">AutoBlog Studio</span>
            <span>• Official Google Blogger API v3 Publishing Platform</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>Security: Zero-Credential Storage</span>
            <span>•</span>
            <span>Anti-Cross-Posting Guarantee Active</span>
            <span>•</span>
            <span>AdSense Pre-Publication Audit</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
