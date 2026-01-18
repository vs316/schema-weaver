import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/safeClient';
import { Loader2, Mail, Lock, User, AlertCircle, ArrowLeft, CheckCircle2, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

const THEME_KEY = "erd-theme";

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_KEY);
      return stored !== "light";
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    
    if (type === 'recovery' || accessToken) {
      setMode('reset-password');
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && mode !== 'reset-password') {
        navigate('/');
      }
    });
  }, [searchParams, navigate, mode]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset-password');
      } else if (event === 'SIGNED_IN' && session && mode !== 'reset-password') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else if (signInError.message.includes('Email not confirmed')) {
            setError('Please verify your email before signing in.');
          } else {
            setError(signInError.message);
          }
        }
      } else if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split('@')[0] },
          },
        });
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('This email is already registered. Please sign in instead.');
          } else {
            setError(signUpError.message);
          }
        } else {
          setMessage('Account created! Check your email for a verification link, or sign in directly.');
          setMode('login');
        }
      } else if (mode === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) {
          setError(resetError.message);
        } else {
          setMessage('Check your email for a password reset link.');
        }
      } else if (mode === 'reset-password') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
        } else {
          setMessage('Password updated successfully! Redirecting...');
          setTimeout(() => navigate('/'), 2000);
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
      case 'reset-password': return 'Set New Password';
      default: return 'Sign In';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signup': return 'Create an account to get started';
      case 'forgot-password': return 'Enter your email to receive a reset link';
      case 'reset-password': return 'Enter your new password';
      default: return 'Sign in to access your diagrams';
    }
  };

  const getSubmitText = () => {
    switch (mode) {
      case 'signup': return loading ? 'Creating account...' : 'Create Account';
      case 'forgot-password': return loading ? 'Sending...' : 'Send Reset Link';
      case 'reset-password': return loading ? 'Updating...' : 'Update Password';
      default: return loading ? 'Signing in...' : 'Sign In';
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
      isDarkMode ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" : "bg-gradient-to-br from-slate-100 via-white to-slate-100"
    }`}>
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setIsDarkMode(!isDarkMode)}
        className={`fixed top-4 right-4 p-3 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
          isDarkMode 
            ? "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50" 
            : "bg-white/50 border-slate-300 text-slate-600 hover:bg-white/70"
        }`}
        title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`w-full max-w-md rounded-2xl p-8 border backdrop-blur-xl transition-all duration-300 ${
          isDarkMode 
            ? "bg-slate-900/80 border-slate-700/50 shadow-2xl shadow-black/20" 
            : "bg-white/80 border-slate-200 shadow-xl shadow-slate-200/50"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-indigo-500/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-indigo-500">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            {getTitle()}
          </h1>
          <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
            {getSubtitle()}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-center gap-2 p-3 rounded-xl mb-6 border ${
                isDarkMode 
                  ? "bg-red-500/10 border-red-500/20 text-red-400" 
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-center gap-2 p-3 rounded-xl mb-6 border ${
                isDarkMode 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-emerald-50 border-emerald-200 text-emerald-600"
              }`}
            >
              <CheckCircle2 size={18} />
              <span className="text-sm">{message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Display Name
              </label>
              <div className="relative">
                <User size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700 text-slate-100 focus:border-indigo-500" 
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-400"
                  }`}
                />
              </div>
            </motion.div>
          )}

          {mode !== 'reset-password' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Email</label>
              <div className="relative">
                <Mail size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700 text-slate-100 focus:border-indigo-500" 
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-400"
                  }`}
                />
              </div>
            </motion.div>
          )}

          {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {mode === 'reset-password' ? 'New Password' : 'Password'}
              </label>
              <div className="relative">
                <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700 text-slate-100 focus:border-indigo-500" 
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-400"
                  }`}
                />
              </div>
            </motion.div>
          )}

          {mode === 'reset-password' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Confirm Password</label>
              <div className="relative">
                <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700 text-slate-100 focus:border-indigo-500" 
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-400"
                  }`}
                />
              </div>
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {getSubmitText()}
          </motion.button>
        </form>

        {mode === 'login' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-4 text-center">
            <button
              onClick={() => { setMode('forgot-password'); setError(null); setMessage(null); }}
              className={`text-sm transition-colors duration-200 hover:underline ${isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"}`}
            >
              Forgot your password?
            </button>
          </motion.div>
        )}

        {(mode === 'forgot-password' || mode === 'reset-password') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-4 text-center">
            <button
              onClick={() => { setMode('login'); setError(null); setMessage(null); }}
              className="flex items-center justify-center gap-1 text-sm transition-colors duration-200 hover:underline mx-auto text-indigo-500 hover:text-indigo-400"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </button>
          </motion.div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null); }}
              className="text-sm transition-colors duration-200 hover:underline text-indigo-500 hover:text-indigo-400"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
