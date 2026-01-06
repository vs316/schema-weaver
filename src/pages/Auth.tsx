import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/safeClient';
import { Loader2, Mail, Lock, User, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';


type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

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

  // Check for password reset token in URL
  useEffect(() => {
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    
    // Handle Supabase auth callback (e.g., email verification, password reset)
    if (type === 'recovery' || accessToken) {
      setMode('reset-password');
    }
    
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && mode !== 'reset-password') {
        navigate('/');
      }
    });
  }, [searchParams, navigate, mode]);

  // Listen for auth state changes
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
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

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
        const redirectUrl = `${window.location.origin}/`;
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              display_name: displayName || email.split('@')[0],
            },
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

        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          setError(updateError.message);
        } else {
          setMessage('Password updated successfully! Redirecting...');
          setTimeout(() => navigate('/'), 2000);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', err);
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
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(222 47% 4%) 100%)' }}
    >
      <div 
        className="w-full max-w-md rounded-2xl p-8 border"
        style={{ 
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: 'hsl(210 40% 98%)' }}
          >
            {getTitle()}
          </h1>
          <p style={{ color: 'hsl(215 20% 65%)' }}>
            {getSubtitle()}
          </p>
        </div>

        {error && (
          <div 
            className="flex items-center gap-2 p-3 rounded-lg mb-6"
            style={{ background: 'hsl(0 84% 60% / 0.1)', border: '1px solid hsl(0 84% 60% / 0.2)' }}
          >
            <AlertCircle size={18} style={{ color: 'hsl(0 84% 60%)' }} />
            <span className="text-sm" style={{ color: 'hsl(0 84% 60%)' }}>{error}</span>
          </div>
        )}

        {message && (
          <div 
            className="flex items-center gap-2 p-3 rounded-lg mb-6"
            style={{ background: 'hsl(142 76% 36% / 0.1)', border: '1px solid hsl(142 76% 36% / 0.2)' }}
          >
            <CheckCircle2 size={18} style={{ color: 'hsl(142 76% 36%)' }} />
            <span className="text-sm" style={{ color: 'hsl(142 76% 36%)' }}>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'hsl(215 20% 65%)' }}
              >
                Display Name
              </label>
              <div className="relative">
                <User 
                  size={18} 
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'hsl(215 20% 65%)' }}
                />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{ 
                    background: 'hsl(222 47% 8%)',
                    borderColor: 'hsl(217 33% 17%)',
                    color: 'hsl(210 40% 98%)',
                  }}
                />
              </div>
            </div>
          )}

          {mode !== 'reset-password' && (
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'hsl(215 20% 65%)' }}
              >
                Email
              </label>
              <div className="relative">
                <Mail 
                  size={18} 
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'hsl(215 20% 65%)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{ 
                    background: 'hsl(222 47% 8%)',
                    borderColor: 'hsl(217 33% 17%)',
                    color: 'hsl(210 40% 98%)',
                  }}
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'hsl(215 20% 65%)' }}
              >
                {mode === 'reset-password' ? 'New Password' : 'Password'}
              </label>
              <div className="relative">
                <Lock 
                  size={18} 
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'hsl(215 20% 65%)' }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{ 
                    background: 'hsl(222 47% 8%)',
                    borderColor: 'hsl(217 33% 17%)',
                    color: 'hsl(210 40% 98%)',
                  }}
                />
              </div>
            </div>
          )}

          {mode === 'reset-password' && (
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'hsl(215 20% 65%)' }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock 
                  size={18} 
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'hsl(215 20% 65%)' }}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{ 
                    background: 'hsl(222 47% 8%)',
                    borderColor: 'hsl(217 33% 17%)',
                    color: 'hsl(210 40% 98%)',
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'hsl(239 84% 67%)',
              color: 'hsl(0 0% 100%)',
            }}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {getSubmitText()}
          </button>
        </form>

        {/* Forgot Password Link */}
        {mode === 'login' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode('forgot-password');
                setError(null);
                setMessage(null);
              }}
              className="text-sm transition-colors duration-200 hover:underline"
              style={{ color: 'hsl(215 20% 65%)' }}
            >
              Forgot your password?
            </button>
          </div>
        )}

        {/* Back to Login */}
        {(mode === 'forgot-password' || mode === 'reset-password') && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
                setMessage(null);
              }}
              className="flex items-center justify-center gap-1 text-sm transition-colors duration-200 hover:underline mx-auto"
              style={{ color: 'hsl(239 84% 67%)' }}
            >
              <ArrowLeft size={14} />
              Back to sign in
            </button>
          </div>
        )}

        {/* Toggle Login/Signup */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
                setMessage(null);
              }}
              className="text-sm transition-colors duration-200 hover:underline"
              style={{ color: 'hsl(239 84% 67%)' }}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}