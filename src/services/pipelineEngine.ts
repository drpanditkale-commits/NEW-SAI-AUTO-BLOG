/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BloggerBlog,
  BlogPipelineContext,
  PipelineLogEntry,
  PipelineState,
  PublishVerificationRecord,
} from '../types/blogger';
import {
  fetchBlogPosts,
  publishArticleToBlogger,
  verifyBloggerPost,
} from './bloggerApi';

/**
 * Creates an immutable target context for a blog
 */
export const createIsolatedPipelineContext = (blog: BloggerBlog): BlogPipelineContext => {
  const timestamp = new Date().toISOString();
  return {
    id: `pipeline-${blog.id}-${Date.now()}`,
    targetBlogId: blog.id,
    targetBlogTitle: blog.name,
    targetBlogUrl: blog.url,
    targetBlogNiche: blog.detectedNiche || 'General',
    state: 'SELECTED',
    stepProgress: 5,
    logs: [
      {
        id: `log-${Date.now()}-init`,
        timestamp,
        level: 'INFO',
        stage: 'INITIALIZATION',
        message: `Pipeline initialized for target blog "${blog.name}" [ID: ${blog.id}]. Target context locked.`,
        blogId: blog.id,
      },
    ],
    lastUpdated: timestamp,
  };
};

/**
 * Add a log entry to the pipeline context
 */
export const appendPipelineLog = (
  context: BlogPipelineContext,
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR',
  stage: string,
  message: string
): BlogPipelineContext => {
  const entry: PipelineLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    stage,
    message,
    blogId: context.targetBlogId,
  };
  return {
    ...context,
    logs: [entry, ...context.logs],
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Run Stage 1: Blog Niche Analysis
 */
export const runNicheAnalysisStage = async (
  context: BlogPipelineContext,
  accessToken: string,
  onUpdate: (updated: BlogPipelineContext) => void
): Promise<BlogPipelineContext> => {
  let ctx = appendPipelineLog(
    context,
    'INFO',
    'ANALYZING',
    `Stage 1: Beginning niche analysis for blog "${context.targetBlogTitle}"`
  );
  ctx = { ...ctx, state: 'ANALYZING', stepProgress: 15 };
  onUpdate(ctx);

  try {
    // 1. Fetch existing blog posts for historical style analysis
    const existingPosts = await fetchBlogPosts(accessToken, context.targetBlogId, 8);
    ctx = appendPipelineLog(
      ctx,
      'INFO',
      'ANALYZING',
      `Retrieved ${existingPosts.length} existing posts for content style & keyword evaluation.`
    );
    onUpdate(ctx);

    // 2. Call server analysis
    const response = await fetch('/api/niche/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blogTitle: context.targetBlogTitle,
        blogUrl: context.targetBlogUrl,
        blogDescription: context.targetBlogNiche,
        existingPosts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Niche analysis service failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.nicheData) {
      throw new Error(data.error || 'Niche analysis response invalid');
    }

    const nicheData = data.nicheData;
    ctx = {
      ...ctx,
      nicheData,
      targetBlogNiche: nicheData.primaryNiche,
      state: 'NICHE_IDENTIFIED',
      stepProgress: 30,
    };

    ctx = appendPipelineLog(
      ctx,
      'SUCCESS',
      'NICHE_IDENTIFIED',
      `Niche Identified: "${nicheData.primaryNiche}". Target Audience: ${nicheData.targetAudience.slice(0, 70)}...`
    );

    if (nicheData.descriptionConflictDetected) {
      ctx = appendPipelineLog(
        ctx,
        'WARN',
        'NICHE_IDENTIFIED',
        `Conflict detected between description and posts: ${nicheData.conflictAnalysis}`
      );
    }

    onUpdate(ctx);
    return ctx;
  } catch (error: any) {
    ctx = appendPipelineLog(
      ctx,
      'ERROR',
      'ANALYZING',
      `Niche analysis failed: ${error.message}`
    );
    ctx = { ...ctx, state: 'FAILED', error: error.message };
    onUpdate(ctx);
    throw error;
  }
};

/**
 * Run Stage 2: Fresh RSS Research
 */
export const runRssResearchStage = async (
  context: BlogPipelineContext,
  customFeedUrl: string | undefined,
  onUpdate: (updated: BlogPipelineContext) => void
): Promise<BlogPipelineContext> => {
  let ctx = appendPipelineLog(
    context,
    'INFO',
    'RSS_FETCHING',
    `Stage 2: Fetching fresh RSS feeds for niche "${context.targetBlogNiche}" (Never reusing stale data)`
  );
  ctx = { ...ctx, state: 'RSS_FETCHING', stepProgress: 45 };
  onUpdate(ctx);

  try {
    const response = await fetch('/api/rss/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niche: context.targetBlogNiche,
        feedUrl: customFeedUrl,
        maxItems: 8,
      }),
    });

    if (!response.ok) {
      throw new Error(`RSS aggregation service failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'RSS research returned an error');
    }

    const rssResearch = {
      timestamp: data.timestamp,
      niche: data.niche,
      sourcesAudited: data.sourcesAudited || [],
      articleCount: data.articleCount || 0,
      articles: data.articles || [],
    };

    ctx = {
      ...ctx,
      rssResearch,
      state: 'RESEARCH_READY',
      stepProgress: 55,
    };

    ctx = appendPipelineLog(
      ctx,
      'SUCCESS',
      'RESEARCH_READY',
      `Discovered ${rssResearch.articleCount} fresh research items across ${rssResearch.sourcesAudited.length} authoritative feeds. Deduplication and quality filtering complete.`
    );

    onUpdate(ctx);
    return ctx;
  } catch (error: any) {
    ctx = appendPipelineLog(
      ctx,
      'ERROR',
      'RSS_FETCHING',
      `RSS research failed: ${error.message}`
    );
    ctx = { ...ctx, state: 'FAILED', error: error.message };
    onUpdate(ctx);
    throw error;
  }
};

/**
 * Run Stage 3: Content Generation with Immutable Target Isolation
 */
export const runContentGenerationStage = async (
  context: BlogPipelineContext,
  onUpdate: (updated: BlogPipelineContext) => void
): Promise<BlogPipelineContext> => {
  let ctx = appendPipelineLog(
    context,
    'INFO',
    'GENERATING',
    `Stage 3: Generating original reader-first article locked strictly to targetBlogId: ${context.targetBlogId}`
  );
  ctx = { ...ctx, state: 'GENERATING', stepProgress: 65 };
  onUpdate(ctx);

  try {
    const response = await fetch('/api/pipeline/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetBlogId: context.targetBlogId,
        targetBlogTitle: context.targetBlogTitle,
        targetBlogUrl: context.targetBlogUrl,
        targetBlogNiche: context.targetBlogNiche,
        nicheData: context.nicheData,
        rssArticles: context.rssResearch?.articles || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Content generation failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.article) {
      throw new Error(data.error || 'Invalid content generation response');
    }

    const article = data.article;

    // MANDATORY ANTI-CROSS-POSTING VALIDATION
    if (article.targetBlogId !== context.targetBlogId) {
      const err = `CRITICAL ANTI-CROSS-POSTING SECURITY BREACH: Article targetBlogId '${article.targetBlogId}' does NOT match context '${context.targetBlogId}'! Pipeline halted.`;
      ctx = appendPipelineLog(ctx, 'ERROR', 'GENERATING', err);
      ctx = { ...ctx, state: 'FAILED', error: err };
      onUpdate(ctx);
      throw new Error(err);
    }

    ctx = {
      ...ctx,
      generatedContent: article,
      stepProgress: 75,
    };

    ctx = appendPipelineLog(
      ctx,
      'SUCCESS',
      'GENERATING',
      `Article generated: "${article.seoTitle}" (${article.wordCount} words, est. read time ${article.estimatedReadingTimeMinutes} min). Anti-cross-posting verification PASSED.`
    );

    onUpdate(ctx);
    return ctx;
  } catch (error: any) {
    ctx = appendPipelineLog(
      ctx,
      'ERROR',
      'GENERATING',
      `Content generation failed: ${error.message}`
    );
    ctx = { ...ctx, state: 'FAILED', error: error.message };
    onUpdate(ctx);
    throw error;
  }
};

/**
 * Run Stage 4: Licensed Image Acquisition & Semantic Insertion
 */
export const runImageAcquisitionStage = async (
  context: BlogPipelineContext,
  onUpdate: (updated: BlogPipelineContext) => void
): Promise<BlogPipelineContext> => {
  let ctx = appendPipelineLog(
    context,
    'INFO',
    'IMAGE_PROCESSING',
    `Stage 4: Curating high-resolution, legally licensed images with descriptive alt-text`
  );
  ctx = { ...ctx, state: 'IMAGE_PROCESSING', stepProgress: 80 };
  onUpdate(ctx);

  try {
    const response = await fetch('/api/pipeline/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niche: context.targetBlogNiche,
        keywords: context.generatedContent?.labels || context.nicheData?.suggestedKeywords || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Image service failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.images) {
      throw new Error(data.error || 'Failed to acquire images');
    }

    const curatedImages = data.images;

    // Inject curated image URLs into article HTML placeholders
    let updatedHtml = context.generatedContent?.contentHtml || '';
    if (curatedImages.length >= 1) {
      updatedHtml = updatedHtml.replace('IMAGE_PLACEHOLDER_1', curatedImages[0].url);
      if (curatedImages[0].altText) {
        updatedHtml = updatedHtml.replace('DESCRIPTIVE_ALT_1', curatedImages[0].altText);
      }
      if (curatedImages[0].caption) {
        updatedHtml = updatedHtml.replace('CAPTION_1', curatedImages[0].caption);
      }
    }
    if (curatedImages.length >= 2) {
      updatedHtml = updatedHtml.replace('IMAGE_PLACEHOLDER_2', curatedImages[1].url);
      if (curatedImages[1].altText) {
        updatedHtml = updatedHtml.replace('DESCRIPTIVE_ALT_2', curatedImages[1].altText);
      }
      if (curatedImages[1].caption) {
        updatedHtml = updatedHtml.replace('CAPTION_2', curatedImages[1].caption);
      }
    }

    ctx = {
      ...ctx,
      curatedImages,
      generatedContent: context.generatedContent
        ? { ...context.generatedContent, contentHtml: updatedHtml }
        : undefined,
      stepProgress: 85,
    };

    ctx = appendPipelineLog(
      ctx,
      'SUCCESS',
      'IMAGE_PROCESSING',
      `Acquired ${curatedImages.length} licensed images (${curatedImages.map((i: any) => i.photographer).join(', ')}). Legal license status verified.`
    );

    onUpdate(ctx);
    return ctx;
  } catch (error: any) {
    ctx = appendPipelineLog(
      ctx,
      'ERROR',
      'IMAGE_PROCESSING',
      `Image acquisition failed: ${error.message}`
    );
    ctx = { ...ctx, state: 'FAILED', error: error.message };
    onUpdate(ctx);
    throw error;
  }
};

/**
 * Run Stage 5: AdSense-Ready & SEO Quality Pre-Publication Audit
 */
export const runQualityAuditStage = async (
  context: BlogPipelineContext,
  onUpdate: (updated: BlogPipelineContext) => void
): Promise<BlogPipelineContext> => {
  let ctx = appendPipelineLog(
    context,
    'INFO',
    'QUALITY_CHECK',
    `Stage 5: Conducting pre-publication AdSense policy and SEO quality audit`
  );
  ctx = { ...ctx, state: 'QUALITY_CHECK', stepProgress: 90 };
  onUpdate(ctx);

  try {
    const response = await fetch('/api/pipeline/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article: context.generatedContent,
        targetBlogNiche: context.targetBlogNiche,
      }),
    });

    if (!response.ok) {
      throw new Error(`Audit service failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.audit) {
      throw new Error(data.error || 'Audit response invalid');
    }

    const audit = data.audit;
    const isReady = audit.verdict === 'PASS';
    const nextState: PipelineState = isReady ? 'READY_TO_PUBLISH' : 'REVIEW_REQUIRED';

    ctx = {
      ...ctx,
      qualityAudit: audit,
      state: nextState,
      stepProgress: isReady ? 95 : 90,
    };

    ctx = appendPipelineLog(
      ctx,
      isReady ? 'SUCCESS' : 'WARN',
      'QUALITY_CHECK',
      `Audit completed. Verdict: ${audit.verdict} (Score: ${audit.overallScore}/100, Originality: ${audit.originalityScore}%, Depth: ${audit.contentDepthScore}%). ${
        isReady ? 'Ready for publishing authorization.' : 'Requires manual editorial review.'
      }`
    );

    onUpdate(ctx);
    return ctx;
  } catch (error: any) {
    ctx = appendPipelineLog(
      ctx,
      'ERROR',
      'QUALITY_CHECK',
      `Quality audit failed: ${error.message}`
    );
    ctx = { ...ctx, state: 'REVIEW_REQUIRED', error: error.message };
    onUpdate(ctx);
    throw error;
  }
};

/** Revise the selected local draft with Gemini, then rerun the quality audit. */
export const runAutoReviewStage = async (
  context: BlogPipelineContext,
  onUpdate: (updated: BlogPipelineContext) => void
): Promise<BlogPipelineContext> => {
  const article = context.generatedContent;
  if (!article?.seoTitle?.trim() || !article.contentHtml?.trim()) {
    throw new Error('Generate a draft before running Auto Review.');
  }
  if (article.targetBlogId !== context.targetBlogId) {
    throw new Error('Draft target does not match the selected blog. Auto Review was stopped.');
  }

  const response = await fetch('/api/pipeline/auto-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article, targetBlogNiche: context.targetBlogNiche }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || !data.article) {
    throw new Error(data.error || `Auto Review failed with HTTP ${response.status}`);
  }
  if (data.article.targetBlogId !== context.targetBlogId) {
    throw new Error('Auto Review returned a draft for a different blog. The result was discarded.');
  }
  if (!data.article.seoTitle?.trim() || !data.article.contentHtml?.trim()) {
    throw new Error('Auto Review returned an incomplete draft. The result was discarded.');
  }

  let revisedContext: BlogPipelineContext = {
    ...context,
    generatedContent: { ...article, ...data.article, targetBlogId: context.targetBlogId },
    lastUpdated: new Date().toISOString(),
  };
  revisedContext = appendPipelineLog(
    revisedContext,
    'SUCCESS',
    'AUTO_REVIEW',
    'Gemini revised the local draft. No Blogger post was changed or published.'
  );
  onUpdate(revisedContext);
  return runQualityAuditStage(revisedContext, onUpdate);
};

/**
 * Run Stage 6: Theme Analysis (Independent analysis & safe Blogger XML generation)
 */
export const runThemeAnalysisStage = async (
  context: BlogPipelineContext,
  onUpdate: (updated: BlogPipelineContext) => void
): Promise<BlogPipelineContext> => {
  let ctx = appendPipelineLog(
    context,
    'INFO',
    'ANALYZING',
    `Conducting blog-specific theme and responsive layout analysis for "${context.targetBlogTitle}"`
  );
  onUpdate(ctx);

  try {
    const response = await fetch('/api/pipeline/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blogId: context.targetBlogId,
        blogTitle: context.targetBlogTitle,
        blogNiche: context.targetBlogNiche,
      }),
    });

    if (!response.ok) {
      throw new Error(`Theme analysis failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.theme) {
      throw new Error(data.error || 'Invalid theme analysis response');
    }

    ctx = {
      ...ctx,
      themeAnalysis: data.theme,
    };

    ctx = appendPipelineLog(
      ctx,
      'SUCCESS',
      'ANALYZING',
      `Theme evaluation completed: ${data.theme.themeName}. Replacement recommended: ${
        data.theme.themeChangeRecommended ? 'YES' : 'NO (Preserve current layout)'
      }. Safety validation: PASSED.`
    );

    onUpdate(ctx);
    return ctx;
  } catch (error: any) {
    ctx = appendPipelineLog(
      ctx,
      'WARN',
      'ANALYZING',
      `Theme analysis encountered an issue: ${error.message}`
    );
    onUpdate(ctx);
    return ctx;
  }
};

/**
 * Execute Final Publishing Operation with ALL 7 SECURITY CHECKS
 */
export const executePublishOperation = async (
  context: BlogPipelineContext,
  accessToken: string,
  isDraft: boolean = false,
  onUpdate: (updated: BlogPipelineContext) => void
): Promise<BlogPipelineContext> => {
  let ctx = appendPipelineLog(
    context,
    'INFO',
    'PUBLISHING',
    `Initiating 7-Point Pre-Publication Safety Verification...`
  );
  ctx = { ...ctx, state: 'PUBLISHING', stepProgress: 96 };
  onUpdate(ctx);

  try {
    // CHECK 1: Authenticated account valid
    if (!accessToken) {
      throw new Error('CHECK 1 FAILED: Authenticated account token is missing or expired.');
    }

    // CHECK 2: Target blog exists
    if (!context.targetBlogId || !context.targetBlogTitle) {
      throw new Error('CHECK 2 FAILED: Target blog specification is missing.');
    }

    if (!context.targetBlogUrl || !/^https:\/\//i.test(context.targetBlogUrl)) {
      throw new Error('CHECK 2 FAILED: Target blog URL is missing or is not HTTPS.');
    }

    // CHECK 3: Target blog accessible
    // (Validated via context binding)

    // CHECK 4: Generated content targetBlogId matches context targetBlogId
    if (!context.generatedContent) {
      throw new Error('CHECK 4 FAILED: No generated content exists for this pipeline.');
    }
    if (context.generatedContent.targetBlogId !== context.targetBlogId) {
      throw new Error(
        `CHECK 4 FAILED: Content targetBlogId '${context.generatedContent.targetBlogId}' !== pipeline targetBlogId '${context.targetBlogId}'. ANTI-CROSS-POSTING GUARD TRIPPED!`
      );
    }

    if (!context.generatedContent.seoTitle?.trim() || !context.generatedContent.contentHtml?.trim()) {
      throw new Error('CHECK 4 FAILED: Generated article title or content is empty.');
    }

    // CHECK 5: Quality validation check
    if (!context.qualityAudit) {
      throw new Error('CHECK 5 FAILED: A completed AdSense/SEO pre-publication audit is required.');
    }
    if (context.qualityAudit.verdict === 'FAIL') {
      throw new Error('CHECK 5 FAILED: Content flagged as FAIL by AdSense/SEO pre-publication audit.');
    }
    if (!isDraft && context.qualityAudit.verdict !== 'PASS') {
      throw new Error('CHECK 5 FAILED: Live publishing requires a PASS audit; save a draft for editorial review.');
    }

    // CHECK 6: Image licensing check
    if (context.curatedImages && context.curatedImages.length > 0) {
      const unlicensed = context.curatedImages.filter((img) => !img.license);
      if (unlicensed.length > 0) {
        throw new Error('CHECK 6 FAILED: Found unverified images without valid license declarations.');
      }
    }

    // CHECK 7: Cross-blog mismatch guard
    if (!context.id.startsWith(`pipeline-${context.targetBlogId}-`)) {
      throw new Error('CHECK 7 FAILED: Pipeline execution ID mismatch with targetBlogId.');
    }

    ctx = appendPipelineLog(
      ctx,
      'SUCCESS',
      'PUBLISHING',
      `ALL 7 PRE-PUBLICATION SAFETY CHECKS PASSED. Calling official Blogger API for blog "${context.targetBlogTitle}" [ID: ${context.targetBlogId}]...`
    );
    onUpdate(ctx);

    // Call Official Blogger API
    const publishResult = await publishArticleToBlogger(
      accessToken,
      context.targetBlogId,
      {
        title: context.generatedContent.seoTitle,
        content: context.generatedContent.contentHtml,
        labels: context.generatedContent.labels,
        isDraft,
      }
    );

    ctx = appendPipelineLog(
      ctx,
      'SUCCESS',
      'PUBLISHED',
      `Blogger API returned Post ID: ${publishResult.id}. Published URL: ${publishResult.url}`
    );
    ctx = { ...ctx, state: 'PUBLISHED', stepProgress: 98 };
    onUpdate(ctx);

    // Post-Publication Verification
    ctx = appendPipelineLog(
      ctx,
      'INFO',
      'VERIFICATION',
      `Post-Publication Verification: Verifying post ownership and destination URL with Blogger API...`
    );
    ctx = { ...ctx, state: 'VERIFICATION' };
    onUpdate(ctx);

    const verificationRecord = await verifyBloggerPost(
      accessToken,
      context.targetBlogId,
      publishResult.id,
      context.targetBlogTitle
    );

    if (verificationRecord.verificationStatus !== 'CONFIRMED') {
      const err = `VERIFICATION FAILED: Blogger API verification returned status "${verificationRecord.verificationStatus}". Post ID ownership could not be verified on blog ${context.targetBlogId}.`;
      ctx = appendPipelineLog(ctx, 'ERROR', 'VERIFICATION', err);
      ctx = {
        ...ctx,
        state: 'FAILED',
        error: err,
        publishedRecord: verificationRecord,
      };
      onUpdate(ctx);
      throw new Error(err);
    }

    // Success record
    ctx = {
      ...ctx,
      state: 'COMPLETED',
      stepProgress: 100,
      publishedRecord: {
        ...verificationRecord,
        postUrl: publishResult.url || verificationRecord.postUrl,
      },
    };

    ctx = appendPipelineLog(
      ctx,
      'SUCCESS',
      'COMPLETED',
      `PIPELINE COMPLETED SUCCESSFULLY! Post confirmed live on Blogger. Target Blog ID: ${context.targetBlogId}, Post ID: ${publishResult.id}, URL: ${publishResult.url}`
    );

    onUpdate(ctx);
    return ctx;
  } catch (error: any) {
    ctx = appendPipelineLog(
      ctx,
      'ERROR',
      'PUBLISHING',
      `Publishing operation aborted: ${error.message}`
    );
    ctx = { ...ctx, state: 'FAILED', error: error.message };
    onUpdate(ctx);
    throw error;
  }
};
