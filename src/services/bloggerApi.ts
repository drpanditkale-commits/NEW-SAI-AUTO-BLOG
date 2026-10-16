/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BloggerBlog, BloggerPost, PublishVerificationRecord } from '../types/blogger';

/**
 * Fetch all Blogger blogs owned/accessible by the authenticated Google account
 * using the official Blogger API v3 endpoint:
 * GET https://www.googleapis.com/blogger/v3/users/self/blogs
 */
export const fetchUserBlogs = async (accessToken: string): Promise<BloggerBlog[]> => {
  if (!accessToken) {
    throw new Error('Google OAuth token is missing. Please sign in again.');
  }

  const response = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Google OAuth session expired. Please re-authenticate.');
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Failed to fetch blogs from Blogger API (${response.status})`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((b: any) => ({
    id: b.id,
    name: b.name,
    description: b.description || '',
    url: b.url,
    published: b.published,
    updated: b.updated,
    posts: { totalItems: b.posts?.totalItems || 0 },
    pages: { totalItems: b.pages?.totalItems || 0 },
    locale: b.locale || { language: 'en' },
    status: b.status || 'LIVE',
    pipelineStatus: 'DISCOVERED',
  }));
};

/**
 * Fetch existing posts for a specific blog to analyze content patterns & tone
 * GET https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts?maxResults=10
 */
export const fetchBlogPosts = async (
  accessToken: string,
  blogId: string,
  maxResults = 10
): Promise<BloggerPost[]> => {
  if (!accessToken) {
    throw new Error('Google OAuth token is missing. Please sign in again.');
  }

  const response = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?maxResults=${maxResults}&fetchBodies=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    console.warn(`Unable to fetch posts for blog ${blogId}: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((p: any) => ({
    id: p.id,
    blog: { id: p.blog?.id || blogId },
    title: p.title,
    content: p.content,
    published: p.published,
    updated: p.updated,
    url: p.url,
    labels: p.labels || [],
    author: p.author,
  }));
};

/**
 * Publish an article to Blogger via the official Blogger API
 * POST https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts
 */
export const publishArticleToBlogger = async (
  accessToken: string,
  targetBlogId: string,
  postPayload: {
    title: string;
    content: string;
    labels: string[];
    isDraft?: boolean;
  }
): Promise<{ id: string; url: string; published: string }> => {
  if (!accessToken) {
    throw new Error('Google OAuth token is missing. Please sign in again.');
  }

  const response = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${targetBlogId}/posts?isDraft=${!!postPayload.isDraft}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        kind: 'blogger#post',
        blog: { id: targetBlogId },
        title: postPayload.title,
        content: postPayload.content,
        labels: postPayload.labels,
      }),
    }
  );

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.error?.message || `Failed to publish post via Blogger API (${response.status} ${response.statusText})`
    );
  }

  const post = await response.json();
  return {
    id: post.id,
    url: post.url,
    published: post.published || new Date().toISOString(),
  };
};

/**
 * Post-Publication Verification:
 * Query Blogger API to confirm the post actually exists and belongs to the specified TARGET_BLOG_ID
 * GET https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts/{postId}
 */
export const verifyBloggerPost = async (
  accessToken: string,
  targetBlogId: string,
  postId: string,
  blogTitle: string
): Promise<PublishVerificationRecord> => {
  if (!accessToken) {
    throw new Error('Google OAuth token is missing. Please sign in again.');
  }

  const response = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${targetBlogId}/posts/${postId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    return {
      blogId: targetBlogId,
      blogTitle,
      postId,
      postUrl: '',
      publishTime: new Date().toISOString(),
      pipelineStatus: 'FAILED',
      verificationStatus: 'FAILED',
    };
  }

  const post = await response.json();
  const returnedBlogId = post.blog?.id;

  if (returnedBlogId !== targetBlogId) {
    return {
      blogId: targetBlogId,
      blogTitle,
      postId,
      postUrl: post.url || '',
      publishTime: post.published || new Date().toISOString(),
      pipelineStatus: 'FAILED',
      verificationStatus: 'MISMATCH_DETECTED',
    };
  }

  return {
    blogId: targetBlogId,
    blogTitle,
    postId: post.id,
    postUrl: post.url,
    publishTime: post.published || new Date().toISOString(),
    pipelineStatus: 'COMPLETED',
    verificationStatus: 'CONFIRMED',
  };
};
