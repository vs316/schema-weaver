import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Crown,
  Shield,
  User,
  Eye,
  Plus,
  ChevronRight,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/safeClient';
import type { TeamRole } from '../types/index';

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: TeamRole;
}

interface UserTeamMembership {
  team_id: string;
  team_name: string;
  invite_code: string;
  role: TeamRole;
  is_own_team: boolean;
  member_count: number;
}

interface TeamManagementProps {
  teamId: string | null;
  onTeamJoined?: (teamId: string) => void;
  onClose?: () => void;
}

const ROLE_ICONS: Record<TeamRole, React.ReactNode> = {
  owner: <Crown size={12} className="text-amber-500" />,
  admin: <Shield size={12} className="text-indigo-400" />,
  member: <User size={12} className="text-slate-400" />,
  dev: <User size={12} className="text-emerald-400" />,
  reader: <Eye size={12} className="text-cyan-400" />,
  viewer: <Eye size={12} className="text-slate-500" />,
};

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  dev: 'Dev',
  reader: 'Reader',
  viewer: 'Viewer',
};

export function TeamManagement({ teamId: _teamId, onTeamJoined, onClose }: TeamManagementProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [userTeams, setUserTeams] = useState<UserTeamMembership[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Map<string, TeamMember[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Join team state
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Leave team state
  const [leavingTeamId, setLeavingTeamId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);
    setCurrentUserEmail(user.email || null);

    // Fetch all teams the user is a member of
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id);

    if (memberships && memberships.length > 0) {
      const teamIds = memberships.map(m => m.team_id);
      
      // Fetch team details
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, invite_code')
        .in('id', teamIds);

      // For each team, count members
      const memberCountsPromises = teamIds.map(async (tid) => {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', tid);
        return { team_id: tid, count: count || 0 };
      });
      
      const memberCounts = await Promise.all(memberCountsPromises);
      const countMap = new Map(memberCounts.map(mc => [mc.team_id, mc.count]));

      if (teamsData) {
        const userTeamsList: UserTeamMembership[] = teamsData.map(t => {
          const membership = memberships.find(m => m.team_id === t.id);
          const role = (membership?.role || 'member') as TeamRole;
          return {
            team_id: t.id,
            team_name: t.name,
            invite_code: t.invite_code,
            role: role,
            is_own_team: role === 'owner',
            member_count: countMap.get(t.id) || 0,
          };
        });
        
        // Sort: own teams first, then by name
        userTeamsList.sort((a, b) => {
          if (a.is_own_team && !b.is_own_team) return -1;
          if (!a.is_own_team && b.is_own_team) return 1;
          return a.team_name.localeCompare(b.team_name);
        });
        
        setUserTeams(userTeamsList);
        
        // Auto-expand the first team (user's own team or first joined team)
        if (userTeamsList.length > 0) {
          setExpandedTeamId(userTeamsList[0].team_id);
          await fetchTeamMembers(userTeamsList[0].team_id);
        }
      }
    }

    setLoading(false);
  };

  const fetchTeamMembers = async (tid: string) => {
    const { data: membersData } = await supabase
      .from('team_members')
      .select('id, user_id, role')
      .eq('team_id', tid);

    if (membersData && membersData.length > 0) {
      const memberIds = membersData.map(m => m.user_id);
      
      // Fetch profile info for each member
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', memberIds);

      const enrichedMembers: TeamMember[] = membersData.map(m => {
        const profile = profiles?.find(p => p.id === m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          display_name: profile?.display_name || null,
          email: profile?.email || null,
          role: m.role as TeamRole,
        };
      });

      setTeamMembers(prev => new Map(prev).set(tid, enrichedMembers));
    } else {
      setTeamMembers(prev => new Map(prev).set(tid, []));
    }
  };

  const toggleTeamExpand = async (tid: string) => {
    if (expandedTeamId === tid) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(tid);
      if (!teamMembers.has(tid)) {
        await fetchTeamMembers(tid);
      }
    }
  };

  const copyInviteCode = async (code: string, teamId: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(teamId);
    setTimeout(() => setCopied(null), 2000);
  };

  const regenerateInviteCode = async (tid: string) => {
    setRegenerating(tid);
    const { data, error } = await supabase.rpc('regenerate_team_invite_code');
    if (!error && data) {
      setUserTeams(prev => prev.map(t => 
        t.team_id === tid ? { ...t, invite_code: data } : t
      ));
    }
    setRegenerating(null);
  };

  const updateTeamName = async (tid: string) => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('teams')
      .update({ name: newName.trim() })
      .eq('id', tid);
    if (!error) {
      setUserTeams(prev => prev.map(t => 
        t.team_id === tid ? { ...t, team_name: newName.trim() } : t
      ));
      setEditingTeamId(null);
    }
    setSaving(false);
  };

  const updateMemberRole = async (teamId: string, memberUserId: string, newRole: TeamRole) => {
    setUpdatingRole(memberUserId);
    const { data, error } = await supabase.rpc('update_member_role', {
      p_member_user_id: memberUserId,
      p_new_role: newRole,
    });
    if (!error && data) {
      const result = data as { success: boolean; error?: string };
      if (result.success) {
        setTeamMembers(prev => {
          const updated = new Map(prev);
          const members = updated.get(teamId) || [];
          updated.set(teamId, members.map(m =>
            m.user_id === memberUserId ? { ...m, role: newRole } : m
          ));
          return updated;
        });
      }
    }
    setUpdatingRole(null);
  };

  const leaveTeam = async (teamId: string) => {
    if (!currentUserId) return;
    
    setLeavingTeamId(teamId);
    
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', currentUserId);
    
    if (!error) {
      // Update profile if this was the active team
      const team = userTeams.find(t => t.team_id === teamId);
      if (team) {
        // Find another team to set as active, or null
        const otherTeam = userTeams.find(t => t.team_id !== teamId);
        await supabase
          .from('profiles')
          .update({ team_id: otherTeam?.team_id || null })
          .eq('id', currentUserId);
      }
      
      setShowLeaveConfirm(null);
      window.location.reload();
    }
    
    setLeavingTeamId(null);
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

    onTeamJoined?.(result.team_id!);
    window.location.reload();
  };

  const createNewTeam = async () => {
    if (!newTeamName.trim() || !currentUserEmail) return;
    
    setCreatingTeam(true);
    setCreateError(null);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreatingTeam(false);
      setCreateError('You must be logged in to create a team');
      return;
    }

    // Check if user already owns 3 teams
    const ownedTeams = userTeams.filter(t => t.is_own_team);
    if (ownedTeams.length >= 3) {
      setCreateError('You can own a maximum of 3 teams');
      setCreatingTeam(false);
      return;
    }

    try {
      // Create new team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({ name: newTeamName.trim() })
        .select()
        .single();

      if (teamError || !newTeam) {
        console.error('Failed to create team:', teamError);
        setCreateError(teamError?.message || 'Failed to create team');
        setCreatingTeam(false);
        return;
      }

      // Add user as owner
      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: newTeam.id,
        user_id: user.id,
        role: 'owner',
      });

      if (memberError) {
        console.error('Failed to add as owner:', memberError);
        setCreateError('Team created but failed to add you as owner');
        setCreatingTeam(false);
        return;
      }

      // Update profile with new team
      await supabase
        .from('profiles')
        .update({ team_id: newTeam.id })
        .eq('id', user.id);

      setNewTeamName('');
      setCreatingTeam(false);
      window.location.reload();
    } catch (err) {
      console.error('Team creation error:', err);
      setCreateError('An unexpected error occurred');
      setCreatingTeam(false);
    }
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center p-8"
      >
        <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(239 84% 67%)' }} />
      </motion.div>
    );
  }

  // No teams - show join/create options
  if (userTeams.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 rounded-xl border"
        style={{
          background: 'hsl(var(--card))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <div className="text-center mb-6">
          <Users size={40} className="mx-auto mb-3" style={{ color: 'hsl(var(--primary))' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Get Started
          </h2>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Create your own team or join an existing one
          </p>
        </div>

        <div className="space-y-6">
          {/* Create Team Section */}
          <div className="p-4 rounded-lg" style={{ background: 'hsl(var(--background))' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'hsl(var(--foreground))' }}>
              Create New Team
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => {
                  setNewTeamName(e.target.value);
                  setCreateError(null);
                }}
                placeholder="Team name"
                className="flex-1 px-3 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-primary/50"
                style={{
                  background: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTeamName.trim()) {
                    createNewTeam();
                  }
                }}
              />
              <button
                onClick={createNewTeam}
                disabled={creatingTeam || !newTeamName.trim()}
                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                }}
              >
                {creatingTeam ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create
              </button>
            </div>
            {createError && (
              <p className="text-xs mt-2" style={{ color: 'hsl(var(--destructive))' }}>
                {createError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
          </div>

          {/* Join Team Section */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Join with Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                setJoinError(null);
              }}
              placeholder="Enter invite code (e.g., a1b2c3d4)"
              className="w-full px-4 py-3 rounded-lg border text-sm font-mono tracking-wider transition-all focus:ring-2 focus:ring-primary/50"
              style={{
                background: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            />

            {joinError && (
              <p className="text-sm mt-2" style={{ color: 'hsl(var(--destructive))' }}>
                {joinError}
              </p>
            )}

            <button
              onClick={joinTeam}
              disabled={joining}
              className="w-full mt-3 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{
                background: 'hsl(var(--success))',
                color: 'hsl(var(--success-foreground))',
                opacity: joining ? 0.7 : 1,
              }}
            >
              {joining ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {joining ? 'Joining...' : 'Join Team'}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Has teams - show team list with expandable details
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border"
      style={{
        background: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'hsl(var(--primary) / 0.1)' }}
          >
            <Users size={20} style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <div>
            <h2 className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Your Teams
            </h2>
            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {userTeams.filter(t => t.is_own_team).length} owned, {userTeams.filter(t => !t.is_own_team).length} joined
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
          >
            <X size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        )}
      </div>

      {/* Teams List */}
      <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {userTeams.map((team) => {
            const isExpanded = expandedTeamId === team.team_id;
            const members = teamMembers.get(team.team_id) || [];
            const canManage = team.role === 'owner' || team.role === 'admin';

            return (
              <motion.div
                key={team.team_id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-lg border overflow-hidden transition-all"
                style={{ 
                  borderColor: isExpanded ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))',
                  background: 'hsl(var(--background))',
                }}
              >
                {/* Team Header - Clickable to expand */}
                <button
                  onClick={() => toggleTeamExpand(team.team_id)}
                  className="w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-white/5"
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {team.is_own_team && (
                        <Crown size={14} className="text-amber-500 shrink-0" />
                      )}
                      <span className="font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                        {team.team_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                      </span>
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>•</span>
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {ROLE_LABELS[team.role]}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t overflow-hidden"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <div className="p-4 space-y-4">
                        {/* Team Name Edit (for owners/admins) */}
                        {canManage && (
                          <div>
                            {editingTeamId === team.team_id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  className="flex-1 px-2 py-1 rounded border text-sm"
                                  style={{
                                    background: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    color: 'hsl(var(--foreground))',
                                  }}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') updateTeamName(team.team_id);
                                    if (e.key === 'Escape') setEditingTeamId(null);
                                  }}
                                />
                                <button
                                  onClick={() => updateTeamName(team.team_id)}
                                  disabled={saving}
                                  className="p-1.5 rounded hover:bg-emerald-500/20 transition-colors"
                                >
                                  {saving ? (
                                    <Loader2 size={14} className="animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
                                  ) : (
                                    <Save size={14} style={{ color: 'hsl(var(--success))' }} />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingTeamId(null)}
                                  className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                                >
                                  <X size={14} style={{ color: 'hsl(var(--destructive))' }} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingTeamId(team.team_id);
                                  setNewName(team.team_name);
                                }}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:bg-white/5"
                                style={{ color: 'hsl(var(--muted-foreground))' }}
                              >
                                <Edit2 size={12} />
                                Rename Team
                              </button>
                            )}
                          </div>
                        )}

                        {/* Invite Code (for owners/admins of their own teams) */}
                        {team.is_own_team && (
                          <div className="p-3 rounded-lg" style={{ background: 'hsl(var(--card))' }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Invite Code
                              </span>
                              {canManage && (
                                <button
                                  onClick={() => regenerateInviteCode(team.team_id)}
                                  disabled={regenerating === team.team_id}
                                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors hover:bg-white/5"
                                  style={{ color: 'hsl(var(--muted-foreground))' }}
                                >
                                  <RefreshCw size={10} className={regenerating === team.team_id ? 'animate-spin' : ''} />
                                  Regenerate
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <code
                                className="flex-1 px-3 py-2 rounded font-mono text-sm tracking-wider text-center"
                                style={{
                                  background: 'hsl(var(--background))',
                                  color: 'hsl(var(--primary))',
                                }}
                              >
                                {team.invite_code}
                              </code>
                              <button
                                onClick={() => copyInviteCode(team.invite_code, team.team_id)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  background: copied === team.team_id ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--secondary))',
                                }}
                              >
                                {copied === team.team_id ? (
                                  <Check size={16} style={{ color: 'hsl(var(--success))' }} />
                                ) : (
                                  <Copy size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Team Members */}
                        <div>
                          <h4 className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Team Members ({members.length})
                          </h4>
                          {members.length === 0 ? (
                            <p className="text-xs py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              Loading members...
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {members.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center gap-2 p-2 rounded-lg transition-colors"
                                  style={{ background: 'hsl(var(--card))' }}
                                >
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{
                                      background: `hsl(${Math.abs(member.user_id.charCodeAt(0) * 7) % 360} 70% 50%)`,
                                      color: 'white',
                                    }}
                                  >
                                    {(member.display_name || member.email || '?')[0].toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                                      {member.display_name || member.email?.split('@')[0] || 'Anonymous'}
                                      {member.user_id === currentUserId && (
                                        <span className="text-xs ml-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                          (you)
                                        </span>
                                      )}
                                    </p>
                                    {member.email && (
                                      <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        {member.email}
                                      </p>
                                    )}
                                  </div>

                                  {/* Role badge/selector */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {ROLE_ICONS[member.role]}
                                    {canManage && member.role !== 'owner' && member.user_id !== currentUserId ? (
                                      <select
                                        value={member.role}
                                        onChange={(e) => updateMemberRole(team.team_id, member.user_id, e.target.value as TeamRole)}
                                        disabled={updatingRole === member.user_id}
                                        className="text-xs px-1.5 py-0.5 rounded border cursor-pointer min-w-[80px]"
                                        style={{
                                          borderColor: 'hsl(217 33% 25%)',
                                          backgroundColor: 'hsl(222 47% 11%)',
                                          color: 'hsl(210 40% 98%)',
                                        }}
                                      >
                                        <option value="admin" style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)' }}>Admin</option>
                                        <option value="member" style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)' }}>Member</option>
                                        <option value="dev" style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)' }}>Dev</option>
                                        <option value="reader" style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)' }}>Reader</option>
                                        <option value="viewer" style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)' }}>Viewer</option>
                                      </select>
                                    ) : (
                                      <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        {ROLE_LABELS[member.role]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Leave Team Button (only for non-owners) */}
                        {!team.is_own_team && (
                          <div className="pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                            {showLeaveConfirm === team.team_id ? (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-3 rounded-lg space-y-3"
                                style={{ background: 'hsl(var(--destructive) / 0.1)' }}
                              >
                                <div className="flex items-start gap-2">
                                  <AlertTriangle size={16} style={{ color: 'hsl(var(--destructive))' }} className="shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                      Leave "{team.team_name}"?
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                      You will lose access to all diagrams in this team.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setShowLeaveConfirm(null)}
                                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                    style={{
                                      background: 'hsl(var(--secondary))',
                                      color: 'hsl(var(--foreground))',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => leaveTeam(team.team_id)}
                                    disabled={leavingTeamId === team.team_id}
                                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                    style={{
                                      background: 'hsl(var(--destructive))',
                                      color: 'hsl(var(--destructive-foreground))',
                                    }}
                                  >
                                    {leavingTeamId === team.team_id ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <LogOut size={12} />
                                    )}
                                    Leave Team
                                  </button>
                                </div>
                              </motion.div>
                            ) : (
                              <button
                                onClick={() => setShowLeaveConfirm(team.team_id)}
                                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded transition-colors hover:bg-red-500/10"
                                style={{ color: 'hsl(var(--destructive))' }}
                              >
                                <LogOut size={12} />
                                Leave Team
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Create New Team Button */}
        <div className="pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => {
                setNewTeamName(e.target.value);
                setCreateError(null);
              }}
              placeholder="New team name..."
              className="flex-1 px-3 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-primary/50"
              style={{
                background: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTeamName.trim()) {
                  createNewTeam();
                }
              }}
            />
            <button
              onClick={createNewTeam}
              disabled={creatingTeam || !newTeamName.trim()}
              className="px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              {creatingTeam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>
          {createError && (
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--destructive))' }}>
              {createError}
            </p>
          )}
          
          {/* Join Team */}
          <div className="mt-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setJoinError(null);
                }}
                placeholder="Invite code to join..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono transition-all focus:ring-2 focus:ring-primary/50"
                style={{
                  background: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <button
                onClick={joinTeam}
                disabled={joining || !inviteCode.trim()}
                className="px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'hsl(var(--success))',
                  color: 'hsl(var(--success-foreground))',
                }}
              >
                {joining ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Join
              </button>
            </div>
            {joinError && (
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--destructive))' }}>
                {joinError}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
