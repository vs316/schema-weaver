import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Loader2, Mail, Lock, User, AlertCircle } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else {
            setError(signInError.message);
          }
        }
      } else {
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
          setMessage('Account created! You can now sign in.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
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
            ERD Builder
          </h1>
          <p style={{ color: 'hsl(215 20% 65%)' }}>
            {isLogin ? 'Sign in to access your diagrams' : 'Create an account to get started'}
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
            <span className="text-sm" style={{ color: 'hsl(142 76% 36%)' }}>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
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

          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'hsl(215 20% 65%)' }}
            >
              Password
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'hsl(239 84% 67%)',
              color: 'hsl(0 0% 100%)',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="text-sm transition-colors duration-200 hover:underline"
            style={{ color: 'hsl(239 84% 67%)' }}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
