/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Globe,
  ShieldCheck,
  CheckCircle2,
  Layers,
  LogOut,
  Flame,
} from 'lucide-react';
import { GoogleUserProfile } from '../types/blogger';

interface HeaderProps {
  user: GoogleUserProfile | null;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  totalBlogs: number;
  activePipelines: number;
  completedPosts: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isLoggingIn,
  onLogin,
  onLogout,
  totalBlogs,
  activePipelines,
  completedPosts,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">AutoBlog Studio</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Blogger v3
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Isolated Pipelines</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous Multi-Blog Publishing • Anti-Cross-Posting • AdSense Quality Audits
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden md:flex items-center space-x-4 bg-slate-800/60 border border-slate-700/60 rounded-full px-4 py-1.5 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>{totalBlogs} Blogs</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{activePipelines} Active Pipelines</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{completedPosts} Verified Posts</span>
            </div>
          </div>

          {/* Account & Auth Controls */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-slate-600 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-slate-200 leading-none">
                    {user.displayName || 'Authenticated User'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[140px] leading-tight">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Disconnect account and clear token from memory"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
