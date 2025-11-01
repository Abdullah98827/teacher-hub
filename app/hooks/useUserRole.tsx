import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

export type UserRole = 'admin' | 'teacher' | 'super_admin' | 'none';

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole('none');
        setLoading(false);
        return;
      }

      // Check user_roles table
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userRole) {
        // If admin or super_admin, set as admin
        if (userRole.role === 'admin' || userRole.role === 'super_admin') {
          setRole('admin');
        } else {
          setRole('teacher');
        }
      } else {
        setRole('none');
      }
      
      setLoading(false);
    };

    checkRole();
  }, []);

  return { role, loading };
};

export default () => null;