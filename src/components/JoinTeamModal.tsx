import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/safeClient';

interface JoinTeamModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function JoinTeamModal({ onClose, onSuccess }: JoinTeamModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('join_team_by_invite', {
        p_invite_code: inviteCode.trim().toLowerCase(),
      });

      if (rpcError) {
        setError('Failed to join team. Please try again.');
        setLoading(false);
        return;
      }

      const result = data as { success: boolean; error?: string; team_id?: string; team_name?: string };

      if (!result.success) {
        setError(result.error || 'Invalid invite code');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="rounded-xl p-6 max-w-sm w-full"
        style={{
          background: 'hsl(222 47% 6%)',
          border: '1px solid hsl(217 33% 17%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'hsl(210 40% 98%)' }}>
            Join Team
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10"
          >
            <X size={18} style={{ color: 'hsl(215 20% 65%)' }} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'hsl(215 20% 65%)' }}>
          Enter the invite code shared by your team administrator.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(215 20% 65%)' }}>
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                setError(null);
              }}
              placeholder="e.g., a1b2c3d4"
              className="w-full px-4 py-3 rounded-lg border text-sm font-mono tracking-wider"
              style={{
                background: 'hsl(222 47% 8%)',
                borderColor: error ? 'hsl(0 84% 60%)' : 'hsl(217 33% 17%)',
                color: 'hsl(210 40% 98%)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'hsl(0 84% 60%)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm"
              style={{
                background: 'hsl(217 33% 17%)',
                color: 'hsl(210 40% 98%)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
              style={{
                background: loading ? 'hsl(239 84% 50%)' : 'hsl(239 84% 67%)',
                color: 'hsl(0 0% 100%)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              {loading ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
