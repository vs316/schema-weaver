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
import { supabase } from '../integrations/supabase/safeClient';
import type { TeamRole } from '../types/index';
import { useTheme } from './ThemeProvider';

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
  dev: <User size={12} className="text-emerald-400" />,
  reader: <User size={12} className="text-cyan-400" />,
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
  const [switching, setSwitching] = useState<string | null>(null);
  const { isDarkMode } = useTheme();

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
    const { data: memberships, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('Failed to fetch memberships:', membershipError);
      setLoading(false);
      return;
    }

    if (!memberships || memberships.length === 0) {
      setLoading(false);
      return;
    }

    const teamIds = memberships.map(m => m.team_id);

    // Fetch team details
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);

    if (teamsError) {
      console.error('Failed to fetch teams:', teamsError);
      setLoading(false);
      return;
    }

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

    setSwitching(teamId);

    // Update profile with new team_id
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', user.id);
    }

    setSwitching(null);
    setIsOpen(false);
    onTeamSwitch(teamId);
  };

  const activeTeam = teams.find(t => t.is_active);

  if (loading) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-300"
        style={{ background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(0 0% 100%)' }}
      >
        <Loader2 size={14} className="animate-spin" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }} />
        <span className="text-sm" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Loading...</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 border"
        style={{
          background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(0 0% 100%)',
          borderColor: isOpen 
            ? 'hsl(239 84% 67% / 0.5)' 
            : isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
          style={{
            background: 'hsl(239 84% 67% / 0.2)',
            color: 'hsl(239 84% 67%)',
          }}
        >
          {activeTeam?.team_name?.[0]?.toUpperCase() || 'T'}
        </div>
        <div className="text-left">
          <div 
            className="text-sm font-medium truncate max-w-[120px]" 
            style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
          >
            {activeTeam?.team_name || 'Select Team'}
          </div>
          {activeTeam && (
            <div 
              className="flex items-center gap-1 text-[10px]" 
              style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
            >
              {ROLE_ICONS[activeTeam.role]}
              <span>{activeTeam.member_count} members</span>
            </div>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }} />
        </motion.div>
      </motion.button>

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
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 w-64 rounded-lg border shadow-xl z-50 overflow-hidden"
              style={{
                background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
                borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
              }}
            >
              <div className="p-2">
                <div 
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1" 
                  style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
                >
                  Your Workspaces
                </div>

                <div className="space-y-1 mt-1">
                  {teams.map((team, index) => (
                    <motion.button
                      key={team.team_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSwitch(team.team_id)}
                      disabled={switching !== null}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-left ${
                        team.is_active ? '' : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                      }`}
                      style={{
                        background: team.is_active 
                          ? 'hsl(239 84% 67% / 0.1)' 
                          : 'transparent',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: team.is_active 
                            ? 'hsl(239 84% 67% / 0.2)' 
                            : isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(220 14% 96%)',
                          color: team.is_active 
                            ? 'hsl(239 84% 67%)' 
                            : isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)',
                        }}
                      >
                        {team.team_name[0]?.toUpperCase() || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {team.role === 'owner' && <Crown size={10} className="text-amber-500 shrink-0" />}
                          <span 
                            className="text-sm font-medium truncate" 
                            style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
                          >
                            {team.team_name}
                          </span>
                        </div>
                        <div 
                          className="text-[10px]" 
                          style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
                        >
                          {team.member_count} member{team.member_count !== 1 ? 's' : ''} • {team.role}
                        </div>
                      </div>
                      {switching === team.team_id ? (
                        <Loader2 size={14} className="animate-spin" style={{ color: 'hsl(239 84% 67%)' }} />
                      ) : team.is_active ? (
                        <Check size={14} style={{ color: 'hsl(239 84% 67%)' }} />
                      ) : null}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div 
                className="border-t p-2" 
                style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
              >
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors ${
                    isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                  }`}
                >
                  <Settings size={14} style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }} />
                  <span 
                    className="text-sm" 
                    style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
                  >
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
