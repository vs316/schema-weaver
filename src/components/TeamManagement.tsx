import { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  RefreshCw,
  UserPlus,
  Loader2,
  X,
  Edit2,
  Save,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/safeClient';

interface Team {
  id: string;
  name: string;
  invite_code: string;
}

interface TeamMember {
  id: string;
  display_name: string | null;
  email: string | null;
}

interface TeamManagementProps {
  teamId: string | null;
  onTeamJoined?: (teamId: string) => void;
  onClose?: () => void;
}

export function TeamManagement({ teamId, onTeamJoined, onClose }: TeamManagementProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // Join team state
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    } else {
      setLoading(false);
    }
  }, [teamId]);

  const fetchTeamData = async () => {
    if (!teamId) return;

    setLoading(true);
    
    // Fetch team details
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError) {
      console.error('Failed to fetch team:', teamError);
      setLoading(false);
      return;
    }

    setTeam(teamData);
    setNewName(teamData.name);

    // Fetch team members
    const { data: membersData, error: membersError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .eq('team_id', teamId);

    if (!membersError && membersData) {
      setMembers(membersData);
    }

    setLoading(false);
  };

  const copyInviteCode = async () => {
    if (!team?.invite_code) return;
    
    await navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateInviteCode = async () => {
    setRegenerating(true);
    
    const { data, error } = await supabase.rpc('regenerate_team_invite_code');
    
    if (!error && data) {
      setTeam(prev => prev ? { ...prev, invite_code: data } : null);
    }
    
    setRegenerating(false);
  };

  const updateTeamName = async () => {
    if (!team || !newName.trim()) return;
    
    setSaving(true);
    
    const { error } = await supabase
      .from('teams')
      .update({ name: newName.trim() })
      .eq('id', team.id);

    if (!error) {
      setTeam(prev => prev ? { ...prev, name: newName.trim() } : null);
      setEditingName(false);
    }
    
    setSaving(false);
  };

  const joinTeam = async () => {
    if (!inviteCode.trim()) {
      setJoinError('Please enter an invite code');
      return;
    }

    setJoining(true);
    setJoinError(null);

    const { data, error } = await supabase.rpc('join_team_by_invite', {
      p_invite_code: inviteCode.trim().toLowerCase(),
    });

    if (error) {
      setJoinError('Failed to join team. Please try again.');
      setJoining(false);
      return;
    }

    const result = data as { success: boolean; error?: string; team_id?: string; team_name?: string };
    
    if (!result.success) {
      setJoinError(result.error || 'Invalid invite code');
      setJoining(false);
      return;
    }

    // Success - reload the page to reinitialize with new team
    onTeamJoined?.(result.team_id!);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(239 84% 67%)' }} />
      </div>
    );
  }

  // No team - show join/create options
  if (!teamId || !team) {
    return (
      <div 
        className="p-6 rounded-xl border"
        style={{ 
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <div className="text-center mb-6">
          <Users size={40} className="mx-auto mb-3" style={{ color: 'hsl(239 84% 67%)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'hsl(210 40% 98%)' }}>
            Join a Team
          </h2>
          <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 65%)' }}>
            Enter an invite code to collaborate with others
          </p>
        </div>

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
                setJoinError(null);
              }}
              placeholder="Enter invite code (e.g., a1b2c3d4)"
              className="w-full px-4 py-3 rounded-lg border text-sm"
              style={{ 
                background: 'hsl(222 47% 8%)',
                borderColor: 'hsl(217 33% 17%)',
                color: 'hsl(210 40% 98%)',
              }}
            />
          </div>

          {joinError && (
            <p className="text-sm" style={{ color: 'hsl(0 84% 60%)' }}>
              {joinError}
            </p>
          )}

          <button
            onClick={joinTeam}
            disabled={joining}
            className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
            style={{
              background: 'hsl(239 84% 67%)',
              color: 'hsl(0 0% 100%)',
              opacity: joining ? 0.7 : 1,
            }}
          >
            {joining ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <UserPlus size={18} />
            )}
            {joining ? 'Joining...' : 'Join Team'}
          </button>

          <div className="text-center text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
            Or continue without joining to create your own team
          </div>
        </div>
      </div>
    );
  }

  // Has team - show team management
  return (
    <div 
      className="p-6 rounded-xl border"
      style={{ 
        background: 'hsl(222 47% 6%)',
        borderColor: 'hsl(217 33% 17%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'hsl(239 84% 67% / 0.1)' }}
          >
            <Users size={20} style={{ color: 'hsl(239 84% 67%)' }} />
          </div>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-2 py-1 rounded border text-sm font-semibold"
                  style={{ 
                    background: 'hsl(222 47% 8%)',
                    borderColor: 'hsl(217 33% 17%)',
                    color: 'hsl(210 40% 98%)',
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateTeamName();
                    if (e.key === 'Escape') {
                      setEditingName(false);
                      setNewName(team.name);
                    }
                  }}
                />
                <button
                  onClick={updateTeamName}
                  disabled={saving}
                  className="p-1.5 rounded hover:bg-emerald-500/20"
                  title="Save"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" style={{ color: 'hsl(215 20% 65%)' }} />
                  ) : (
                    <Save size={14} style={{ color: 'hsl(142 76% 36%)' }} />
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNewName(team.name);
                  }}
                  className="p-1.5 rounded hover:bg-red-500/20"
                  title="Cancel"
                >
                  <X size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-semibold" style={{ color: 'hsl(210 40% 98%)' }}>
                  {team.name}
                </h2>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1 rounded hover:bg-white/10"
                  title="Edit team name"
                >
                  <Edit2 size={12} style={{ color: 'hsl(215 20% 65%)' }} />
                </button>
              </div>
            )}
            <p className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5"
          >
            <X size={18} style={{ color: 'hsl(215 20% 65%)' }} />
          </button>
        )}
      </div>

      {/* Invite Code Section */}
      <div 
        className="p-4 rounded-lg mb-4"
        style={{ background: 'hsl(222 47% 8%)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'hsl(215 20% 65%)' }}>
            Invite Code
          </span>
          <button
            onClick={regenerateInviteCode}
            disabled={regenerating}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/5"
            style={{ color: 'hsl(215 20% 65%)' }}
            title="Generate new code"
          >
            <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
            Regenerate
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <code
            className="flex-1 px-3 py-2 rounded font-mono text-lg tracking-wider text-center"
            style={{ 
              background: 'hsl(222 47% 4%)',
              color: 'hsl(239 84% 67%)',
            }}
          >
            {team.invite_code}
          </code>
          <button
            onClick={copyInviteCode}
            className="p-2.5 rounded-lg transition-colors"
            style={{ 
              background: copied ? 'hsl(142 76% 36% / 0.1)' : 'hsl(217 33% 17%)',
            }}
            title={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? (
              <Check size={18} style={{ color: 'hsl(142 76% 36%)' }} />
            ) : (
              <Copy size={18} style={{ color: 'hsl(215 20% 65%)' }} />
            )}
          </button>
        </div>
        
        <p className="text-xs mt-2" style={{ color: 'hsl(215 20% 65%)' }}>
          Share this code with others to invite them to your team
        </p>
      </div>

      {/* Team Members */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'hsl(215 20% 65%)' }}>
          Team Members
        </h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: 'hsl(222 47% 8%)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ 
                  background: `hsl(${Math.abs(member.id.charCodeAt(0) * 7) % 360} 70% 50%)`,
                  color: 'white',
                }}
              >
                {(member.display_name || member.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'hsl(210 40% 98%)' }}>
                  {member.display_name || 'Anonymous'}
                </p>
                {member.email && (
                  <p className="text-xs truncate" style={{ color: 'hsl(215 20% 65%)' }}>
                    {member.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact version for header/sidebar
interface TeamBadgeProps {
  teamId: string | null;
  onClick?: () => void;
}

export function TeamBadge({ teamId, onClick }: TeamBadgeProps) {
  const [team, setTeam] = useState<{ name: string; member_count: number } | null>(null);

  useEffect(() => {
    if (!teamId) return;

    const fetchTeam = async () => {
      const { data } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();

      if (data) {
        setTeam({ name: data.name, member_count: 1 });
      }
    };

    fetchTeam();
  }, [teamId]);

  if (!team) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5"
      style={{ 
        background: 'hsl(222 47% 8%)',
        border: '1px solid hsl(217 33% 17%)',
      }}
    >
      <Users size={14} style={{ color: 'hsl(239 84% 67%)' }} />
      <span className="truncate max-w-[120px]" style={{ color: 'hsl(210 40% 98%)' }}>
        {team.name}
      </span>
    </button>
  );
}
