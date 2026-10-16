<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2a4bf7d1-7173-4471-a3ac-0c9fec79471b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure server-side API keys in `.env` if you use AI features. Gemini uses `GEMINI_API_KEY`; Auto Review uses `OPENAI_API_KEY`.
3. Run the app:
   `npm run dev`

## Authentication and configuration

The app uses Firebase Authentication with Google sign-in and requests Blogger access when the user signs in. Firebase web-app settings are read from `VITE_FIREBASE_*` variables when provided; otherwise, the existing `firebase-applet-config.json` remains the compatibility fallback.

For local setup, copy `.env.example` to `.env` for server-side keys and `.env.local` for Firebase web-app values. Auto Review uses OpenAI's Responses API with `gpt-5.4-mini` by default; usage may incur API charges. You can set `OPENAI_MODEL` to another model available to your API account. The `VITE_` values are shipped to the browser and are public configuration, not private secrets. Do not put private API keys in `.env.local` or use a `VITE_` prefix for them. Gemini continues to use the server-side `GEMINI_API_KEY` for its existing features.

Before using live Google sign-in, an administrator must verify that Google sign-in is enabled for the Firebase Authentication project and that the OAuth client is configured for the app's deployed domain and required Blogger scope. This repository change does not alter Firebase or Google Cloud settings and does not create credentials.

## Publishing safeguards

Live publishing is enabled only when generated content is present and its pre-publication audit returns `PASS`. Content with an audit `WARNING` can be saved as a Blogger draft for editorial review; missing or failed audits block both live publishing and draft creation. Every publish attempt also checks the target blog identity, HTTPS URL, non-empty article, and pipeline-to-blog binding before calling the publishing adapter.
