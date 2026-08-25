import { useState } from 'react';
import { Sparkles, Shield, Users, MessageSquare, Zap, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signInWithGoogle, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign in popup was closed. Please try again.');
      } else {
        setError(err.message || 'Failed to sign in with Google');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="auth-modal-card"
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[2px] mb-3 shadow-lg shadow-violet-500/25">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black tracking-tighter text-white">IV</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Welcome to IVNN</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time social media & instant private messaging
          </p>
        </div>

        {/* Highlights */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                Real-Time Direct Messaging
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Chat and share photos across devices instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                Real Multi-User Network
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Discover registered creators and build connections.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl font-semibold text-sm bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-md active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          <span>Continue with Google</span>
        </button>

        <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-500 mt-4">
          Powered securely by Firebase Authentication & Firestore.
        </p>
      </div>
    </div>
  );
}
