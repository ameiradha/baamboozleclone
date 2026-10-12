import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sound } from '../../services/soundService';

interface AuthModalProps {
  initialMode?: 'login' | 'register' | 'forgot_password';
  onSuccess: () => void;
  onCancel: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onSuccess, onCancel }) => {
  const { signInWithGoogle, registerWithEmail, loginWithEmail, resetPassword, loginAsDemoTeacher } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        sound.playVictory();
        onSuccess();
      } else if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Please enter your full name or title (e.g. Mr. Smith)');
        }
        await registerWithEmail(name, email, password);
        sound.playVictory();
        onSuccess();
      } else if (mode === 'forgot_password') {
        await resetPassword(email);
        setSuccessMessage('Password reset link sent to your email!');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Authentication failed. Please check your credentials.');
      sound.playIncorrect();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      sound.playVictory();
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in was cancelled or encountered an error.');
      sound.playIncorrect();
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    sound.playVictory();
    loginAsDemoTeacher();
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 p-6 sm:p-8 relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 font-fun">
            {mode === 'login' && 'Teacher Sign In'}
            {mode === 'register' && 'Create Teacher Account'}
            {mode === 'forgot_password' && 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'login' && 'Access your games, live lobbies, and classroom stats'}
            {mode === 'register' && 'Join QuizBattle Classroom and host team games'}
            {mode === 'forgot_password' && 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {/* Quick Demo Sign In Button (Ideal for testing) */}
        <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-center">
          <p className="text-xs font-semibold text-amber-900 mb-2">
            🚀 Want to test immediately without signing up?
          </p>
          <button
            type="button"
            onClick={handleDemoSignIn}
            className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>One-Click Demo Teacher Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 text-sm flex items-center justify-center gap-2 transition-all mb-4 cursor-pointer"
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
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-semibold">Or with email</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mr. Smith"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setError(null);
                    }}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot_password' && 'Send Reset Email'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center text-xs text-slate-600 border-t border-slate-100 pt-4">
          {mode === 'login' ? (
            <p>
              Don't have a teacher account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="font-bold text-indigo-600 hover:underline"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="font-bold text-indigo-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onCancel}
          className="mt-3 w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
