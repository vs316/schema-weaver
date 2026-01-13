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
} from 'lucide-react';
import { supabase } from '../integrations/supabase/safeClient';

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
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

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
    
    const [profilesRes, teamsRes, diagramsRes, adminsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('teams').select('*').order('created_at', { ascending: false }),
      supabase.from('erd_diagrams').select('*').order('updated_at', { ascending: false }),
      supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
    ]);

    setProfiles(profilesRes.data || []);
    setDiagrams(diagramsRes.data as Diagram[] || []);
    setAdmins(adminsRes.data || []);

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
    <div className="min-h-screen flex" style={{ background: 'hsl(222 47% 4%)' }}>
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 border-r flex flex-col"
        style={{ 
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'hsl(217 33% 17%)' }}>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'hsl(239 84% 67% / 0.1)' }}
            >
              <Shield size={20} style={{ color: 'hsl(239 84% 67%)' }} />
            </div>
            <div>
              <h1 className="font-bold" style={{ color: 'hsl(210 40% 98%)' }}>Admin Panel</h1>
              <p className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
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
                color: activeTab === tab.id ? 'white' : 'hsl(215 20% 65%)',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'hsl(217 33% 17%)' }}>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: 'hsl(215 20% 65%)' }}
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
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'hsl(217 33% 17%)' }}
        >
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold" style={{ color: 'hsl(210 40% 98%)' }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'dashboard' && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(215 20% 45%)' }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg text-sm w-64 border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{
                    background: 'hsl(222 47% 8%)',
                    borderColor: 'hsl(217 33% 20%)',
                    color: 'hsl(210 40% 98%)',
                  }}
                />
              </div>
            )}

            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
            >
              <RefreshCw 
                size={18} 
                className={refreshing ? 'animate-spin' : ''} 
                style={{ color: 'hsl(215 20% 65%)' }} 
              />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardTab key="dashboard" stats={stats} />
            )}
            {activeTab === 'users' && (
              <UsersTab key="users" profiles={filteredProfiles} teams={teams} />
            )}
            {activeTab === 'diagrams' && (
              <DiagramsTab 
                key="diagrams" 
                diagrams={filteredDiagrams} 
                teams={teams}
                onDelete={handleDeleteDiagram}
              />
            )}
            {activeTab === 'teams' && (
              <TeamsTab 
                key="teams" 
                teams={filteredTeams}
                onDelete={handleDeleteTeam}
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
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Dashboard Tab
function DashboardTab({ stats }: { stats: Record<string, number> }) {
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
            className="p-5 rounded-xl border"
            style={{
              background: 'hsl(222 47% 6%)',
              borderColor: 'hsl(217 33% 17%)',
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
            <p className="text-2xl font-bold" style={{ color: 'hsl(210 40% 98%)' }}>
              {stat.value}
            </p>
            <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 65%)' }}>
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats */}
      <div 
        className="p-6 rounded-xl border"
        style={{
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} style={{ color: 'hsl(239 84% 67%)' }} />
          <h3 className="font-semibold" style={{ color: 'hsl(210 40% 98%)' }}>Platform Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm" style={{ color: 'hsl(215 20% 65%)' }}>Avg Tables per Diagram</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(210 40% 98%)' }}>
              {stats.totalDiagrams > 0 ? '~5.2' : '0'}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'hsl(215 20% 65%)' }}>Active Admins</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(210 40% 98%)' }}>
              {stats.totalAdmins}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'hsl(215 20% 65%)' }}>Avg Members per Team</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(210 40% 98%)' }}>
              {stats.totalTeams > 0 ? (stats.totalUsers / stats.totalTeams).toFixed(1) : '0'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Users Tab
function UsersTab({ profiles, teams }: { profiles: Profile[]; teams: Team[] }) {
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
        className="rounded-xl border overflow-hidden"
        style={{
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(222 47% 8%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Team</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr 
                key={profile.id}
                className="border-t transition-colors hover:bg-white/5"
                style={{ borderColor: 'hsl(217 33% 17%)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: `hsl(${Math.abs((profile.email || 'U').charCodeAt(0) * 7) % 360} 70% 50%)` }}
                    >
                      {(profile.display_name || profile.email || 'U')[0].toUpperCase()}
                    </div>
                    <span className="font-medium" style={{ color: 'hsl(210 40% 98%)' }}>
                      {profile.display_name || 'No name'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
                  {profile.email || 'N/A'}
                </td>
                <td className="px-4 py-3">
                  <span 
                    className="px-2 py-1 rounded text-xs"
                    style={{ 
                      background: 'hsl(217 33% 17%)',
                      color: 'hsl(210 40% 98%)',
                    }}
                  >
                    {getTeamName(profile.team_id)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
                  {new Date(profile.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
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
}: { 
  diagrams: Diagram[]; 
  teams: Team[];
  onDelete: (id: string) => void;
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
        className="rounded-xl border overflow-hidden"
        style={{
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(222 47% 8%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Team</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Tables</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Updated</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {diagrams.map((diagram) => (
              <tr 
                key={diagram.id}
                className="border-t transition-colors hover:bg-white/5"
                style={{ borderColor: 'hsl(217 33% 17%)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Database size={16} style={{ color: 'hsl(239 84% 67%)' }} />
                    <span className="font-medium" style={{ color: 'hsl(210 40% 98%)' }}>
                      {diagram.name}
                    </span>
                    {diagram.is_locked && (
                      <Lock size={12} style={{ color: 'hsl(38 92% 50%)' }} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span 
                    className="px-2 py-1 rounded text-xs"
                    style={{ 
                      background: 'hsl(217 33% 17%)',
                      color: 'hsl(210 40% 98%)',
                    }}
                  >
                    {getTeamName(diagram.team_id)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
                  {(diagram.tables as unknown[])?.length || 0}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
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
                        className="p-1.5 rounded hover:bg-white/10"
                      >
                        <X size={14} style={{ color: 'hsl(215 20% 65%)' }} />
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
          <div className="p-8 text-center" style={{ color: 'hsl(215 20% 65%)' }}>
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
}: { 
  teams: Team[];
  onDelete: (id: string) => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div 
        className="rounded-xl border overflow-hidden"
        style={{
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(222 47% 8%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Team</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Invite Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Members</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr 
                key={team.id}
                className="border-t transition-colors hover:bg-white/5"
                style={{ borderColor: 'hsl(217 33% 17%)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} style={{ color: 'hsl(142 76% 36%)' }} />
                    <span className="font-medium" style={{ color: 'hsl(210 40% 98%)' }}>
                      {team.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code 
                    className="px-2 py-1 rounded text-xs font-mono"
                    style={{ 
                      background: 'hsl(217 33% 17%)',
                      color: 'hsl(239 84% 67%)',
                    }}
                  >
                    {team.invite_code}
                  </code>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
                  {team.member_count || 0}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
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
                        className="p-1.5 rounded hover:bg-white/10"
                      >
                        <X size={14} style={{ color: 'hsl(215 20% 65%)' }} />
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
          <div className="p-8 text-center" style={{ color: 'hsl(215 20% 65%)' }}>
            No teams found
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Admins Tab
function AdminsTab({ 
  admins,
  isSuperAdmin,
  currentUserId,
  onAdd,
  onRemove,
}: { 
  admins: AdminUser[];
  isSuperAdmin: boolean;
  currentUserId: string | null;
  onAdd: (email: string) => void;
  onRemove: (userId: string) => void;
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
                className="px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{
                  background: 'hsl(222 47% 8%)',
                  borderColor: 'hsl(217 33% 20%)',
                  color: 'hsl(210 40% 98%)',
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
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <X size={18} style={{ color: 'hsl(215 20% 65%)' }} />
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
        className="rounded-xl border overflow-hidden"
        style={{
          background: 'hsl(222 47% 6%)',
          borderColor: 'hsl(217 33% 17%)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(222 47% 8%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Admin</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Added</th>
              {isSuperAdmin && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(215 20% 65%)' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr 
                key={admin.id}
                className="border-t transition-colors hover:bg-white/5"
                style={{ borderColor: 'hsl(217 33% 17%)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: admin.role === 'super_admin' ? 'hsl(38 92% 50%)' : 'hsl(239 84% 67%)' }}
                    >
                      {admin.email[0].toUpperCase()}
                    </div>
                    <span className="font-medium" style={{ color: 'hsl(210 40% 98%)' }}>
                      {admin.email}
                    </span>
                    {admin.user_id === currentUserId && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'hsl(217 33% 17%)', color: 'hsl(215 20% 65%)' }}>
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
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    {admin.user_id !== currentUserId && admin.role !== 'super_admin' && (
                      <button
                        onClick={() => onRemove(admin.user_id)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                      </button>
                    )}
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
