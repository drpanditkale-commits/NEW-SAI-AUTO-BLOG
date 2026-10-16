/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GoogleUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface BloggerBlog {
  id: string;
  name: string;
  description?: string;
  url: string;
  published?: string;
  updated?: string;
  posts?: {
    totalItems: number;
    selfLink?: string;
  };
  pages?: {
    totalItems: number;
  };
  locale?: {
    language?: string;
    country?: string;
    variant?: string;
  };
  status?: string;
  detectedNiche?: string;
  themeStatus?: string;
  pipelineStatus?: PipelineState;
  existingPosts?: BloggerPost[];
}

export interface BloggerPost {
  id: string;
  blog: {
    id: string;
  };
  title: string;
  content?: string;
  published?: string;
  updated?: string;
  url?: string;
  labels?: string[];
  author?: {
    displayName?: string;
    url?: string;
  };
}

export interface BlogNicheAnalysis {
  primaryNiche: string;
  secondaryTopics: string[];
  targetAudience: string;
  contentLanguage: string;
  preferredWritingStyle: string;
  suggestedCategories: string[];
  topicsToAvoid: string[];
  suggestedKeywords: string[];
  descriptionConflictDetected: boolean;
  conflictAnalysis: string;
  confidenceScore: number;
}

export interface RSSArticle {
  sourceName: string;
  feedUrl: string;
  articleUrl: string;
  publicationDate: string;
  title: string;
  relevantSummary: string;
  guid: string;
}

export interface RSSResearchResult {
  timestamp: string;
  niche: string;
  sourcesAudited: {
    name: string;
    url: string;
    itemsFound: number;
    status: string;
  }[];
  articleCount: number;
  articles: RSSArticle[];
}

export interface CuratedImage {
  id: string;
  url: string;
  thumbnail: string;
  altText: string;
  caption: string;
  photographer: string;
  photographerUrl: string;
  sourceName: string;
  license: string;
  tags: string[];
}

export interface GeneratedArticle {
  targetBlogId: string;
  seoTitle: string;
  metaDescription: string;
  labels: string[];
  contentHtml: string;
  estimatedReadingTimeMinutes: number;
  wordCount: number;
  keyTakeaways: string[];
  primaryImagePrompt?: string;
  secondaryImagePrompt?: string;
}

export interface QualityCheckItem {
  item: string;
  passed: boolean;
  notes: string;
}

export interface QualityAuditResult {
  verdict: 'PASS' | 'WARNING' | 'FAIL';
  overallScore: number;
  originalityScore: number;
  readerValueScore: number;
  contentDepthScore: number;
  readabilityScore: number;
  mobileFriendlinessScore: number;
  keywordStuffingRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  prohibitedContentFound: boolean;
  plagiarismRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  auditChecklist: QualityCheckItem[];
  recommendations: string[];
  adSenseDisclaimer: string;
}

export interface ThemeSafetyValidation {
  syntaxCheck: 'PASSED' | 'FAILED';
  bloggerXmlCompliant: boolean;
  responsiveLayoutValidated: boolean;
  accessibilityRating: string;
}

export interface ThemeAnalysisResult {
  themeChangeRecommended: boolean;
  analysisSummary: string;
  themeName: string;
  colorPalette: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  features: string[];
  safetyValidation: ThemeSafetyValidation;
  xmlTemplateCode: string;
}

export type PipelineState =
  | 'DISCOVERED'
  | 'SELECTED'
  | 'ANALYZING'
  | 'NICHE_IDENTIFIED'
  | 'RSS_FETCHING'
  | 'RESEARCH_READY'
  | 'GENERATING'
  | 'IMAGE_PROCESSING'
  | 'QUALITY_CHECK'
  | 'READY_TO_PUBLISH'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'VERIFICATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVIEW_REQUIRED';

export interface PipelineLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  stage: string;
  message: string;
  blogId: string;
}

export interface PublishVerificationRecord {
  blogId: string;
  blogTitle: string;
  postId: string;
  postUrl: string;
  publishTime: string;
  pipelineStatus: PipelineState;
  verificationStatus: 'CONFIRMED' | 'MISMATCH_DETECTED' | 'FAILED';
}

export interface BlogPipelineContext {
  id: string;
  targetBlogId: string;
  targetBlogTitle: string;
  targetBlogUrl: string;
  targetBlogNiche?: string;
  state: PipelineState;
  stepProgress: number; // 0 to 100
  nicheData?: BlogNicheAnalysis;
  rssResearch?: RSSResearchResult;
  generatedContent?: GeneratedArticle;
  curatedImages?: CuratedImage[];
  qualityAudit?: QualityAuditResult;
  themeAnalysis?: ThemeAnalysisResult;
  publishedRecord?: PublishVerificationRecord;
  logs: PipelineLogEntry[];
  error?: string;
  lastUpdated: string;
}
