import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Check,
  Crown,
  Shield,
  User,
  Settings,
  Loader2,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import type { TeamRole } from '../types/index';

interface TeamMembership {
  team_id: string;
  team_name: string;
  role: TeamRole;
  is_active: boolean;
  member_count: number;
}

interface TeamWorkspaceSwitcherProps {
  currentTeamId: string | null;
  onTeamSwitch: (teamId: string) => void;
  onOpenSettings: () => void;
}

const ROLE_ICONS: Record<TeamRole, React.ReactNode> = {
  owner: <Crown size={12} className="text-amber-500" />,
  admin: <Shield size={12} className="text-indigo-400" />,
  member: <User size={12} className="text-slate-400" />,
  viewer: <User size={12} className="text-slate-500" />,
};

export function TeamWorkspaceSwitcher({
  currentTeamId,
  onTeamSwitch,
  onOpenSettings,
}: TeamWorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [currentTeamId]);

  const fetchTeams = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch all teams the user is a member of
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setLoading(false);
      return;
    }

    const teamIds = memberships.map(m => m.team_id);

    // Fetch team details
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);

    // Get member counts
    const countPromises = teamIds.map(async (tid) => {
      const { count } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', tid);
      return { team_id: tid, count: count || 0 };
    });

    const counts = await Promise.all(countPromises);
    const countMap = new Map(counts.map(c => [c.team_id, c.count]));

    if (teamsData) {
      const teamsList: TeamMembership[] = teamsData.map(t => {
        const membership = memberships.find(m => m.team_id === t.id);
        return {
          team_id: t.id,
          team_name: t.name,
          role: (membership?.role || 'member') as TeamRole,
          is_active: t.id === currentTeamId,
          member_count: countMap.get(t.id) || 0,
        };
      });

      // Sort: active team first, then owner teams, then by name
      teamsList.sort((a, b) => {
        if (a.is_active) return -1;
        if (b.is_active) return 1;
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (a.role !== 'owner' && b.role === 'owner') return 1;
        return a.team_name.localeCompare(b.team_name);
      });

      setTeams(teamsList);
    }

    setLoading(false);
  };

  const handleSwitch = async (teamId: string) => {
    if (teamId === currentTeamId) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);

    // Update profile with new team_id
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', user.id);
    }

    setSwitching(false);
    setIsOpen(false);
    onTeamSwitch(teamId);
  };

  const activeTeam = teams.find(t => t.is_active);

  if (loading) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'hsl(var(--secondary))' }}
      >
        <Loader2 size={14} className="animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
        <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/5 border"
        style={{
          background: 'hsl(var(--secondary))',
          borderColor: isOpen ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))',
        }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
          style={{
            background: 'hsl(var(--primary) / 0.2)',
            color: 'hsl(var(--primary))',
          }}
        >
          {activeTeam?.team_name?.[0]?.toUpperCase() || 'T'}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium truncate max-w-[120px]" style={{ color: 'hsl(var(--foreground))' }}>
            {activeTeam?.team_name || 'Select Team'}
          </div>
          {activeTeam && (
            <div className="flex items-center gap-1 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {ROLE_ICONS[activeTeam.role]}
              <span>{activeTeam.member_count} members</span>
            </div>
          )}
        </div>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'hsl(var(--muted-foreground))' }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-64 rounded-lg border shadow-xl z-50 overflow-hidden"
              style={{
                background: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            >
              <div className="p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Your Workspaces
                </div>

                <div className="space-y-1 mt-1">
                  {teams.map((team) => (
                    <button
                      key={team.team_id}
                      onClick={() => handleSwitch(team.team_id)}
                      disabled={switching}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-left ${
                        team.is_active ? 'bg-primary/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: team.is_active ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--secondary))',
                          color: team.is_active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {team.team_name[0]?.toUpperCase() || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {team.role === 'owner' && <Crown size={10} className="text-amber-500 shrink-0" />}
                          <span 
                            className="text-sm font-medium truncate" 
                            style={{ color: 'hsl(var(--foreground))' }}
                          >
                            {team.team_name}
                          </span>
                        </div>
                        <div className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {team.member_count} member{team.member_count !== 1 ? 's' : ''} • {team.role}
                        </div>
                      </div>
                      {team.is_active && (
                        <Check size={14} style={{ color: 'hsl(var(--primary))' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t p-2" style={{ borderColor: 'hsl(var(--border))' }}>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors hover:bg-white/5"
                >
                  <Settings size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Manage Teams
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
