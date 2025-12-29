import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { Database, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, newSession: Session | null) => {
        if (newSession) {
          navigate('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: displayName || email.split('@')[0],
            },
          },
        });
        if (error) throw error;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (errorMessage.includes('User already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'hsl(222 47% 4%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'hsl(239 84% 67% / 0.2)' }}>
            <Database size={32} style={{ color: 'hsl(239 84% 67%)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(210 40% 98%)' }}>ERD Builder</h1>
          <p className="mt-2 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
            Collaborative database schema design
          </p>
        </div>

        {/* Form Card */}
        <div 
          className="rounded-2xl p-6 border"
          style={{ 
            background: 'hsl(222 47% 6%)',
            borderColor: 'hsl(217 33% 17%)',
          }}
        >
          <div className="flex mb-6 rounded-lg p-1" style={{ background: 'hsl(217 33% 17%)' }}>
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200"
              style={{
                background: isLogin ? 'hsl(239 84% 67%)' : 'transparent',
                color: isLogin ? 'hsl(0 0% 100%)' : 'hsl(215 20% 65%)',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200"
              style={{
                background: !isLogin ? 'hsl(239 84% 67%)' : 'transparent',
                color: !isLogin ? 'hsl(0 0% 100%)' : 'hsl(215 20% 65%)',
              }}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div 
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ 
                background: 'hsl(0 84% 60% / 0.1)',
                color: 'hsl(0 84% 60%)',
                border: '1px solid hsl(0 84% 60% / 0.2)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 65%)' }}>
                  Display Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(215 20% 65%)' }} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{
                      background: 'hsl(217 33% 17%)',
                      color: 'hsl(210 40% 98%)',
                      border: '1px solid hsl(217 33% 20%)',
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 65%)' }}>
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(215 20% 65%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{
                    background: 'hsl(217 33% 17%)',
                    color: 'hsl(210 40% 98%)',
                    border: '1px solid hsl(217 33% 20%)',
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 65%)' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(215 20% 65%)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2"
                  style={{
                    background: 'hsl(217 33% 17%)',
                    color: 'hsl(210 40% 98%)',
                    border: '1px solid hsl(217 33% 20%)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
              style={{
                background: 'hsl(239 84% 67%)',
                color: 'hsl(0 0% 100%)',
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium hover:underline"
            style={{ color: 'hsl(239 84% 67%)' }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
