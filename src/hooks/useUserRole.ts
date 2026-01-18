import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/safeClient';

export type UserRole = 'owner' | 'admin' | 'member' | 'dev' | 'reader' | 'viewer';

export function useUserRole(teamId: string | null) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!teamId) {
      setRole(null);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Use the get_user_role function
    const { data, error } = await supabase.rpc('get_user_role', {
      p_team_id: teamId,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Failed to fetch user role:', error);
      setRole('reader'); // Default to most restrictive role
    } else {
      setRole((data as UserRole) || 'reader');
    }
    
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  // Readers and viewers can ONLY add notes/questions/changes/fixes/comments - no table/column edits
  // They also cannot unlock diagrams or import JSON
  const canEdit = role !== null && !['reader', 'viewer'].includes(role);
  
  // canAddMetadata - for readers who can add notes, questions, changes, fixes, comments
  const canAddMetadata = role !== null && role !== 'viewer';
  
  // canManage - team management permissions
  const canManage = role !== null && ['owner', 'admin', 'member'].includes(role);
  
  // canDelete - ability to delete diagrams and manage teams
  const canDelete = role !== null && ['owner', 'admin'].includes(role);
  
  // canUnlock - ability to unlock locked diagrams (only non-readers/viewers)
  const canUnlock = role !== null && !['reader', 'viewer'].includes(role);
  
  // canImport - ability to import JSON schemas
  const canImport = role !== null && !['reader', 'viewer'].includes(role);
  
  const isOwner = role === 'owner';
  const isReaderOrViewer = role !== null && ['reader', 'viewer'].includes(role);

  return {
    role,
    loading,
    canEdit,
    canAddMetadata,
    canManage,
    canDelete,
    canUnlock,
    canImport,
    isOwner,
    isReaderOrViewer,
    refetch: fetchRole,
  };
}