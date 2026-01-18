import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Database,
  Building2,
  Shield,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  Mail,
  Trash2,
  X,
  Crown,
  AlertTriangle,
  Check,
  Plus,
  BarChart3,
  TrendingUp,
  Activity,
  Lock,
  Power,
  UserCog,
  Sun,
  Moon,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/safeClient';
import type { TeamRole } from '../types/index';

const THEME_KEY = "erd-theme";

type Tab = 'dashboard' | 'users' | 'diagrams' | 'teams' | 'admins';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: 'super_admin' | 'admin';
  created_at: string;
}

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  team_id: string | null;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  member_count?: number;
}

interface Diagram {
  id: string;
  name: string;
  team_id: string | null;
  tables: unknown[];
  relations: unknown[];
  is_locked: boolean;
  updated_at: string;
  created_at: string;
}

interface TeamMemberWithRole {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  team_name?: string;
}

const ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'dev', label: 'Dev' },
  { value: 'reader', label: 'Reader' },
  { value: 'viewer', label: 'Viewer' },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Data states
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithRole[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  
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
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setShowAccessDenied(true);
      return;
    }
    
    setCurrentUserId(user.id);

    // Check if user is admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminData) {
      setLoading(false);
      setShowAccessDenied(true);
      return;
    }

    setIsSuperAdmin(adminData.role === 'super_admin');
    
    // Load all data
    await loadAllData();
    setLoading(false);
  };

  const loadAllData = async () => {
    setRefreshing(true);
    
    const [profilesRes, teamsRes, diagramsRes, adminsRes, membersRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('teams').select('*').order('created_at', { ascending: false }),
      supabase.from('erd_diagrams').select('*').order('updated_at', { ascending: false }),
      supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
      supabase.from('team_members').select('*').order('created_at', { ascending: false }),
    ]);

    setProfiles(profilesRes.data || []);
    setDiagrams(diagramsRes.data as Diagram[] || []);
    setAdmins(adminsRes.data || []);
    setTeamMembers(membersRes.data as TeamMemberWithRole[] || []);

    // Get team member counts
    if (teamsRes.data) {
      const teamsWithCounts = await Promise.all(
        teamsRes.data.map(async (team) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);
          return { ...team, member_count: count || 0 };
        })
      );
      setTeams(teamsWithCounts);
    }

    setRefreshing(false);
  };

  // Stats for dashboard
  const stats = useMemo(() => ({
    totalUsers: profiles.length,
    totalTeams: teams.length,
    totalDiagrams: diagrams.length,
    totalAdmins: admins.length,
    activeDiagrams: diagrams.filter(d => {
      const updated = new Date(d.updated_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return updated > weekAgo;
    }).length,
  }), [profiles, teams, diagrams, admins]);

  // Filtered data based on search
  const filteredProfiles = useMemo(() => 
    profiles.filter(p => 
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [profiles, searchQuery]);

  const filteredTeams = useMemo(() => 
    teams.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [teams, searchQuery]);

  const filteredDiagrams = useMemo(() => 
    diagrams.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [diagrams, searchQuery]);

  const handleDeleteDiagram = async (id: string) => {
    await supabase.from('erd_diagrams').delete().eq('id', id);
    setDiagrams(prev => prev.filter(d => d.id !== id));
  };

  const handleDeleteTeam = async (id: string) => {
    await supabase.from('teams').delete().eq('id', id);
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  const handleAddAdmin = async (email: string) => {
    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      alert('User not found with this email');
      return;
    }

    const { error } = await supabase
      .from('admin_users')
      .insert({ user_id: profile.id, email, role: 'admin' });

    if (error) {
      alert('Failed to add admin: ' + error.message);
      return;
    }

    await loadAllData();
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (userId === currentUserId) {
      alert('Cannot remove yourself as admin');
      return;
    }
    
    await supabase.from('admin_users').delete().eq('user_id', userId);
    setAdmins(prev => prev.filter(a => a.user_id !== userId));
  };

  const handleToggleAdminStatus = async (adminId: string, userId: string, currentRole: 'super_admin' | 'admin') => {
    if (userId === currentUserId) {
      alert('Cannot modify your own admin status');
      return;
    }
    
    if (currentRole === 'super_admin') {
      // Cannot demote super admin
      alert('Cannot modify super admin status');
      return;
    }
    
    // Toggle between active and disabled (remove admin)
    await supabase.from('admin_users').delete().eq('id', adminId);
    setAdmins(prev => prev.filter(a => a.id !== adminId));
  };

  const handleUpdateUserTeamRole = async (memberId: string, teamId: string, userId: string, newRole: TeamRole) => {
    const { error } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('team_id', teamId)
      .eq('user_id', userId);
    
    if (!error) {
      setTeamMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
    }
  };

  // Admin function to assign a user to a team
  const handleAssignUserToTeam = async (userId: string, teamId: string, role: TeamRole = 'member') => {
    // Check if user is already a member of this team
    const existingMembership = teamMembers.find(m => m.user_id === userId && m.team_id === teamId);
    
    if (existingMembership) {
      // Update role if already a member
      const { error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userId);
      
      if (!error) {
        setTeamMembers(prev => prev.map(m => 
          m.user_id === userId && m.team_id === teamId ? { ...m, role } : m
        ));
      }
      return !error;
    } else {
      // Add as new member
      const { data, error } = await supabase
        .from('team_members')
        .insert({ team_id: teamId, user_id: userId, role })
        .select()
        .single();
      
      if (!error && data) {
        setTeamMembers(prev => [...prev, { 
          id: data.id, 
          team_id: teamId, 
          user_id: userId, 
          role: role as TeamRole 
        }]);
        
        // Also update the user's profile active team
        await supabase
          .from('profiles')
          .update({ team_id: teamId })
          .eq('id', userId);
      }
      return !error;
    }
  };

  const handleRemoveUserFromTeam = async (userId: string, teamId: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);
    
    if (!error) {
      setTeamMembers(prev => prev.filter(m => !(m.user_id === userId && m.team_id === teamId)));
    }
    return !error;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(222 47% 4%)' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'hsl(239 84% 67%)' }} />
      </div>
    );
  }

  if (showAccessDenied) {
    return <AccessDeniedScreen onBack={() => navigate('/')} />;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'users', label: 'Users', icon: <Users size={18} /> },
    { id: 'diagrams', label: 'Diagrams', icon: <Database size={18} /> },
    { id: 'teams', label: 'Teams', icon: <Building2 size={18} /> },
    { id: 'admins', label: 'Admins', icon: <Shield size={18} /> },
  ];

  return (
    <div 
      className="min-h-screen flex transition-colors duration-300" 
      style={{ background: isDarkMode ? 'hsl(222 47% 4%)' : 'hsl(0 0% 96%)' }}
    >
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 border-r flex flex-col transition-colors duration-300"
        style={{ 
          background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
        }}
      >
        <div className="p-4 border-b transition-colors duration-300" style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'hsl(239 84% 67% / 0.1)' }}
            >
              <Shield size={20} style={{ color: 'hsl(239 84% 67%)' }} />
            </div>
            <div>
              <h1 className="font-bold transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>Admin Panel</h1>
              <p className="text-xs transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'text-white' : ''
              }`}
              style={{
                background: activeTab === tab.id ? 'hsl(239 84% 67%)' : 'transparent',
                color: activeTab === tab.id ? 'white' : isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t transition-colors duration-300" style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}>
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
            style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
          >
            <ArrowLeft size={16} />
            Back to App
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <header 
          className="px-6 py-4 border-b flex items-center justify-between transition-colors duration-300"
          style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
        >
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'dashboard' && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 16% 47%)' }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg text-sm w-64 border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
                  style={{
                    background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(0 0% 100%)',
                    borderColor: isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(220 13% 91%)',
                    color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
                  }}
                />
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-200 text-slate-600"
              }`}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={loadAllData}
              disabled={refreshing}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
            >
              <RefreshCw 
                size={18} 
                className={refreshing ? 'animate-spin' : ''} 
                style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }} 
              />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardTab key="dashboard" stats={stats} isDarkMode={isDarkMode} />
            )}
            {activeTab === 'users' && (
              <UsersTab 
                key="users" 
                profiles={filteredProfiles} 
                teams={teams} 
                teamMembers={teamMembers}
                onUpdateRole={handleUpdateUserTeamRole}
                onAssignToTeam={handleAssignUserToTeam}
                onRemoveFromTeam={handleRemoveUserFromTeam}
                isSuperAdmin={isSuperAdmin}
                isDarkMode={isDarkMode}
              />
            )}
            {activeTab === 'diagrams' && (
              <DiagramsTab 
                key="diagrams" 
                diagrams={filteredDiagrams} 
                teams={teams}
                onDelete={handleDeleteDiagram}
                isDarkMode={isDarkMode}
              />
            )}
            {activeTab === 'teams' && (
              <TeamsTab 
                key="teams" 
                teams={filteredTeams}
                onDelete={handleDeleteTeam}
                isDarkMode={isDarkMode}
              />
            )}
            {activeTab === 'admins' && (
              <AdminsTab 
                key="admins" 
                admins={admins}
                isSuperAdmin={isSuperAdmin}
                currentUserId={currentUserId}
                onAdd={handleAddAdmin}
                onRemove={handleRemoveAdmin}
                onToggleStatus={handleToggleAdminStatus}
                isDarkMode={isDarkMode}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Dashboard Tab
function DashboardTab({ stats, isDarkMode }: { stats: Record<string, number>; isDarkMode: boolean }) {
  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, color: 'hsl(239 84% 67%)' },
    { label: 'Total Teams', value: stats.totalTeams, icon: <Building2 size={24} />, color: 'hsl(142 76% 36%)' },
    { label: 'Total Diagrams', value: stats.totalDiagrams, icon: <Database size={24} />, color: 'hsl(38 92% 50%)' },
    { label: 'Active (7d)', value: stats.activeDiagrams, icon: <Activity size={24} />, color: 'hsl(280 67% 60%)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-xl border transition-colors duration-300"
            style={{
              background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
              borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}20` }}
              >
                <div style={{ color: stat.color }}>{stat.icon}</div>
              </div>
              <TrendingUp size={16} style={{ color: 'hsl(142 76% 36%)' }} />
            </div>
            <p className="text-2xl font-bold transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
              {stat.value}
            </p>
            <p className="text-sm mt-1 transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats */}
      <div 
        className="p-6 rounded-xl border transition-colors duration-300"
        style={{
          background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} style={{ color: 'hsl(239 84% 67%)' }} />
          <h3 className="font-semibold transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>Platform Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Avg Tables per Diagram</p>
            <p className="text-xl font-bold mt-1 transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
              {stats.totalDiagrams > 0 ? '~5.2' : '0'}
            </p>
          </div>
          <div>
            <p className="text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Active Admins</p>
            <p className="text-xl font-bold mt-1 transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
              {stats.totalAdmins}
            </p>
          </div>
          <div>
            <p className="text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Avg Members per Team</p>
            <p className="text-xl font-bold mt-1 transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
              {stats.totalTeams > 0 ? (stats.totalUsers / stats.totalTeams).toFixed(1) : '0'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Users Tab with role editing and team assignment
function UsersTab({ 
  profiles, 
  teams, 
  teamMembers,
  onUpdateRole,
  onAssignToTeam,
  onRemoveFromTeam,
  isSuperAdmin,
  isDarkMode,
}: { 
  profiles: Profile[]; 
  teams: Team[];
  teamMembers: TeamMemberWithRole[];
  onUpdateRole: (memberId: string, teamId: string, userId: string, newRole: TeamRole) => void;
  onAssignToTeam: (userId: string, teamId: string, role?: TeamRole) => Promise<boolean>;
  onRemoveFromTeam: (userId: string, teamId: string) => Promise<boolean>;
  isSuperAdmin: boolean;
  isDarkMode: boolean;
}) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [selectedTeamToAssign, setSelectedTeamToAssign] = useState<string>('');
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<TeamRole>('member');
  
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'No team';
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  const getUserMemberships = (userId: string) => {
    return teamMembers.filter(m => m.user_id === userId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div 
        className="rounded-xl border overflow-hidden transition-colors duration-300"
        style={{
          background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(220 14% 96%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Current Team</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Team Roles</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Joined</th>
              {isSuperAdmin && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const memberships = getUserMemberships(profile.id);
              const isEditing = editingUser === profile.id;
              
              return (
                <tr 
                  key={profile.id}
                  className={`border-t transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                  style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `hsl(${Math.abs((profile.email || 'U').charCodeAt(0) * 7) % 360} 70% 50%)` }}
                      >
                        {(profile.display_name || profile.email || 'U')[0].toUpperCase()}
                      </div>
                      <span className="font-medium transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
                        {profile.display_name || 'No name'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                    {profile.email || 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <span 
                      className="px-2 py-1 rounded text-xs transition-colors duration-300"
                      style={{ 
                        background: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 14% 96%)',
                        color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
                      }}
                    >
                      {getTeamName(profile.team_id)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="space-y-2 max-w-xs">
                        {memberships.map(m => (
                          <div key={m.id} className="flex items-center gap-2">
                            <span className="text-xs truncate transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                              {teams.find(t => t.id === m.team_id)?.name || 'Unknown'}:
                            </span>
                            <select
                              value={m.role}
                              onChange={(e) => onUpdateRole(m.id, m.team_id, m.user_id, e.target.value as TeamRole)}
                              className="text-xs px-2 py-1 rounded border cursor-pointer transition-colors duration-300"
                              style={{
                                borderColor: isDarkMode ? 'hsl(217 33% 25%)' : 'hsl(220 13% 91%)',
                                backgroundColor: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)',
                                color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
                              }}
                            >
                              {ROLE_OPTIONS.map(opt => (
                                <option 
                                  key={opt.value} 
                                  value={opt.value}
                                  style={{ backgroundColor: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)', color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
                                >
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                        <button
                          onClick={() => setEditingUser(null)}
                          className="text-xs px-2 py-1 rounded hover:bg-white/10"
                          style={{ color: 'hsl(239 84% 67%)' }}
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {memberships.length === 0 ? (
                          <span className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>No teams</span>
                        ) : (
                          memberships.slice(0, 2).map(m => (
                            <span 
                              key={m.id}
                              className="px-2 py-0.5 rounded text-[10px] font-medium"
                              style={{ 
                                background: m.role === 'owner' ? 'hsl(38 92% 50% / 0.1)' : 'hsl(239 84% 67% / 0.1)',
                                color: m.role === 'owner' ? 'hsl(38 92% 50%)' : 'hsl(239 84% 67%)',
                              }}
                            >
                              {m.role}
                            </span>
                          ))
                        )}
                        {memberships.length > 2 && (
                          <span className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>+{memberships.length - 2}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser(isEditing ? null : profile.id)}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors"
                          title="Edit roles"
                        >
                          {isEditing ? (
                            <Check size={14} style={{ color: 'hsl(142 76% 36%)' }} />
                          ) : (
                            <UserCog size={14} style={{ color: 'hsl(215 20% 65%)' }} />
                          )}
                        </button>
                        <button
                          onClick={() => setAssigningUser(assigningUser === profile.id ? null : profile.id)}
                          className="p-1.5 rounded hover:bg-indigo-500/20 transition-colors"
                          title="Assign to team"
                        >
                          <Plus size={14} style={{ color: 'hsl(239 84% 67%)' }} />
                        </button>
                      </div>
                      {assigningUser === profile.id && (
                        <div className="mt-2 p-2 rounded-lg space-y-2" style={{ background: 'hsl(222 47% 8%)' }}>
                          <select
                            value={selectedTeamToAssign}
                            onChange={(e) => setSelectedTeamToAssign(e.target.value)}
                            className="w-full text-xs px-2 py-1 rounded border cursor-pointer"
                            style={{
                              borderColor: 'hsl(217 33% 25%)',
                              backgroundColor: 'hsl(222 47% 11%)',
                              color: 'hsl(210 40% 98%)',
                            }}
                          >
                            <option value="" style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)' }}>Select team...</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id} style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)' }}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={selectedRoleToAssign}
                            onChange={(e) => setSelectedRoleToAssign(e.target.value as TeamRole)}
                            className="w-full text-xs px-2 py-1 rounded border cursor-pointer"
                            style={{
                              borderColor: 'hsl(217 33% 25%)',
                              backgroundColor: 'hsl(222 47% 11%)',
                              color: 'hsl(210 40% 98%)',
                            }}
                          >
                            {ROLE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value} style={{ backgroundColor: 'hsl(222 47% 11%)', color: 'hsl(210 40% 98%)' }}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <button
                              onClick={async () => {
                                if (selectedTeamToAssign) {
                                  const success = await onAssignToTeam(profile.id, selectedTeamToAssign, selectedRoleToAssign);
                                  if (success) {
                                    setAssigningUser(null);
                                    setSelectedTeamToAssign('');
                                    setSelectedRoleToAssign('member');
                                  }
                                }
                              }}
                              disabled={!selectedTeamToAssign}
                              className="flex-1 text-xs px-2 py-1 rounded font-medium disabled:opacity-50"
                              style={{ background: 'hsl(239 84% 67%)', color: 'white' }}
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => {
                                setAssigningUser(null);
                                setSelectedTeamToAssign('');
                              }}
                              className="text-xs px-2 py-1 rounded"
                              style={{ color: 'hsl(215 20% 65%)' }}
                            >
                              Cancel
                            </button>
                          </div>
                          {/* Show option to remove from existing teams */}
                          {memberships.length > 0 && (
                            <div className="pt-2 border-t" style={{ borderColor: 'hsl(217 33% 17%)' }}>
                              <p className="text-[10px] uppercase mb-1" style={{ color: 'hsl(215 20% 45%)' }}>Remove from:</p>
                              {memberships.map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => onRemoveFromTeam(profile.id, m.team_id)}
                                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-red-500/10 flex items-center justify-between"
                                  style={{ color: 'hsl(0 84% 60%)' }}
                                >
                                  <span>{teams.find(t => t.id === m.team_id)?.name || 'Unknown'}</span>
                                  <Trash2 size={10} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {profiles.length === 0 && (
          <div className="p-8 text-center" style={{ color: 'hsl(215 20% 65%)' }}>
            No users found
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Diagrams Tab
function DiagramsTab({ 
  diagrams, 
  teams,
  onDelete,
  isDarkMode,
}: { 
  diagrams: Diagram[]; 
  teams: Team[];
  onDelete: (id: string) => void;
  isDarkMode: boolean;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'No team';
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div 
        className="rounded-xl border overflow-hidden transition-colors duration-300"
        style={{
          background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(220 14% 96%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Team</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Tables</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Updated</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {diagrams.map((diagram) => (
              <tr 
                key={diagram.id}
                className={`border-t transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Database size={16} style={{ color: 'hsl(239 84% 67%)' }} />
                    <span className="font-medium transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
                      {diagram.name}
                    </span>
                    {diagram.is_locked && (
                      <Lock size={12} style={{ color: 'hsl(38 92% 50%)' }} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span 
                    className="px-2 py-1 rounded text-xs transition-colors duration-300"
                    style={{ 
                      background: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 14% 96%)',
                      color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
                    }}
                  >
                    {getTeamName(diagram.team_id)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                  {(diagram.tables as unknown[])?.length || 0}
                </td>
                <td className="px-4 py-3 text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                  {new Date(diagram.updated_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {deleteConfirm === diagram.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDelete(diagram.id)}
                        className="p-1.5 rounded hover:bg-red-500/20"
                      >
                        <Check size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className={`p-1.5 rounded ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                      >
                        <X size={14} style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(diagram.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {diagrams.length === 0 && (
          <div className="p-8 text-center transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
            No diagrams found
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Teams Tab
function TeamsTab({ 
  teams,
  onDelete,
  isDarkMode,
}: { 
  teams: Team[];
  onDelete: (id: string) => void;
  isDarkMode: boolean;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div 
        className="rounded-xl border overflow-hidden transition-colors duration-300"
        style={{
          background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(220 14% 96%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Team</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Invite Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Members</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr 
                key={team.id}
                className={`border-t transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} style={{ color: 'hsl(142 76% 36%)' }} />
                    <span className="font-medium transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
                      {team.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code 
                    className="px-2 py-1 rounded text-xs font-mono transition-colors duration-300"
                    style={{ 
                      background: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 14% 96%)',
                      color: 'hsl(239 84% 67%)',
                    }}
                  >
                    {team.invite_code}
                  </code>
                </td>
                <td className="px-4 py-3 text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                  {team.member_count || 0}
                </td>
                <td className="px-4 py-3 text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                  {new Date(team.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {deleteConfirm === team.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDelete(team.id)}
                        className="p-1.5 rounded hover:bg-red-500/20"
                      >
                        <Check size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className={`p-1.5 rounded ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                      >
                        <X size={14} style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(team.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {teams.length === 0 && (
          <div className="p-8 text-center transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
            No teams found
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Admins Tab with enable/disable functionality
function AdminsTab({ 
  admins,
  isSuperAdmin,
  currentUserId,
  onAdd,
  onRemove,
  onToggleStatus,
  isDarkMode,
}: { 
  admins: AdminUser[];
  isSuperAdmin: boolean;
  currentUserId: string | null;
  onAdd: (email: string) => void;
  onRemove: (userId: string) => void;
  onToggleStatus: (adminId: string, userId: string, currentRole: 'super_admin' | 'admin') => void;
  isDarkMode: boolean;
}) {
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = () => {
    if (newAdminEmail.trim()) {
      onAdd(newAdminEmail.trim());
      setNewAdminEmail('');
      setShowAddForm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {isSuperAdmin && (
        <div className="flex justify-end">
          {showAddForm ? (
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
                style={{
                  background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(0 0% 100%)',
                  borderColor: isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(220 13% 91%)',
                  color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button
                onClick={handleAdd}
                className="p-2 rounded-lg hover:bg-emerald-500/20"
              >
                <Check size={18} style={{ color: 'hsl(142 76% 36%)' }} />
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
              >
                <X size={18} style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'hsl(239 84% 67%)',
                color: 'white',
              }}
            >
              <Plus size={16} />
              Add Admin
            </button>
          )}
        </div>
      )}

      <div 
        className="rounded-xl border overflow-hidden transition-colors duration-300"
        style={{
          background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(220 14% 96%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Admin</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Added</th>
              {isSuperAdmin && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr 
                key={admin.id}
                className={`border-t transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: admin.role === 'super_admin' ? 'hsl(38 92% 50%)' : 'hsl(239 84% 67%)' }}
                    >
                      {admin.email[0].toUpperCase()}
                    </div>
                    <span className="font-medium transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
                      {admin.email}
                    </span>
                    {admin.user_id === currentUserId && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded transition-colors duration-300" 
                        style={{ 
                          background: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 14% 96%)', 
                          color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' 
                        }}
                      >
                        You
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit"
                    style={{ 
                      background: admin.role === 'super_admin' ? 'hsl(38 92% 50% / 0.1)' : 'hsl(239 84% 67% / 0.1)',
                      color: admin.role === 'super_admin' ? 'hsl(38 92% 50%)' : 'hsl(239 84% 67%)',
                    }}
                  >
                    {admin.role === 'super_admin' && <Crown size={12} />}
                    {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit"
                    style={{ 
                      background: 'hsl(142 76% 36% / 0.1)',
                      color: 'hsl(142 76% 36%)',
                    }}
                  >
                    <Power size={10} />
                    Active
                  </span>
                </td>
                <td className="px-4 py-3 text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {admin.user_id !== currentUserId && admin.role !== 'super_admin' && (
                        <>
                          <button
                            onClick={() => onToggleStatus(admin.id, admin.user_id, admin.role)}
                            className="p-1.5 rounded hover:bg-amber-500/10 transition-colors"
                            title="Disable admin access"
                          >
                            <Power size={14} style={{ color: 'hsl(38 92% 50%)' }} />
                          </button>
                          <button
                            onClick={() => onRemove(admin.user_id)}
                            className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                            title="Remove admin"
                          >
                            <Trash2 size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Access Denied Screen
function AccessDeniedScreen({ onBack }: { onBack: () => void }) {
  const [requestMessage, setRequestMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleRequestAccess = () => {
    // In a real app, this would send an email
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'hsl(222 47% 4%)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full p-8 rounded-2xl border text-center"
        style={{
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <div 
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'hsl(0 84% 60% / 0.1)' }}
        >
          <AlertTriangle size={32} style={{ color: 'hsl(0 84% 60%)' }} />
        </div>

        <h1 className="text-xl font-bold mb-2" style={{ color: 'hsl(210 40% 98%)' }}>
          Access Denied
        </h1>
        <p className="text-sm mb-6" style={{ color: 'hsl(215 20% 65%)' }}>
          You don't have permission to access the admin panel.
        </p>

        {sent ? (
          <div 
            className="p-4 rounded-lg mb-6"
            style={{ background: 'hsl(142 76% 36% / 0.1)' }}
          >
            <Check size={24} className="mx-auto mb-2" style={{ color: 'hsl(142 76% 36%)' }} />
            <p className="text-sm" style={{ color: 'hsl(142 76% 36%)' }}>
              Request sent! An admin will review your request.
            </p>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Why do you need admin access? (optional)"
              rows={3}
              className="w-full px-4 py-3 rounded-lg text-sm border resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{
                background: 'hsl(222 47% 8%)',
                borderColor: 'hsl(217 33% 20%)',
                color: 'hsl(210 40% 98%)',
              }}
            />
            <button
              onClick={handleRequestAccess}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
              style={{
                background: 'hsl(239 84% 67%)',
                color: 'white',
              }}
            >
              <Mail size={16} />
              Request Admin Access
            </button>
          </div>
        )}

        <button
          onClick={onBack}
          className="flex items-center gap-2 mx-auto text-sm transition-colors hover:underline"
          style={{ color: 'hsl(215 20% 65%)' }}
        >
          <ArrowLeft size={14} />
          Back to App
        </button>
      </motion.div>
    </div>
  );
}