import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

// Define un tipo que coincide con la estructura real de los datos de Supabase en tiempo de ejecución.
// 'roles' es un OBJETO de rol, ya que la consulta 'select' de una FK
// devuelve el objeto relacionado directamente para cada fila de user_roles.
type SupabaseFetchedRolesData = {
  roles: {
    id: number;
    role_name: string;
  };
};

interface UserContextType {
  user: User | null;
  roles: string[] | null;
  permissions: Set<string> | null;
  loading: boolean;
}

// Usamos React.createContext explícitamente para evitar problemas de desestructuración en el runtime.
const UserContext = React.createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [permissions, setPermissions] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);

  // Usamos useCallback para memoizar esta función y evitar que se recree en cada render.
  const fetchUserAndRolesAndPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      console.log('UserContext: Fetched authUser:', authUser);

      if (authUser) {
        // 1. Obtener los roles del usuario, incluyendo el ID del rol
        const { data: userRolesDataRaw, error: userRolesError } = await supabase
          .from('user_roles')
          .select('roles(id, role_name)')
          .eq('user_id', authUser.id);

        if (userRolesError) {
          console.error('UserContext: Error fetching user roles:', userRolesError);
          throw userRolesError;
        }
        console.log('UserContext: Fetched userRolesDataRaw:', userRolesDataRaw);

        // Tratar los datos crudos como un array de 'any' para evitar la inferencia incorrecta de TypeScript
        const userRolesData: any[] = userRolesDataRaw || [];

        // Mapeo para obtener nombres de roles
        const fetchedRoles = userRolesData
          .map(item => (item as SupabaseFetchedRolesData).roles?.role_name)
          .filter(Boolean) as string[] || [];
        setRoles(fetchedRoles);
        console.log('UserContext: Processed fetchedRoles (names):', fetchedRoles);

        // 2. Obtener los permisos de recursos basados en los roles del usuario
        if (fetchedRoles.length > 0) {
          // Mapeo para obtener IDs de roles
          const roleIds = userRolesData
            .map(item => (item as SupabaseFetchedRolesData).roles?.id)
            .filter(Boolean) as number[];
          console.log('UserContext: Processed roleIds:', roleIds);

          if (roleIds.length === 0) {
              console.warn('UserContext: No role IDs found for user, setting empty permissions.');
              setPermissions(new Set());
              setLoading(false);
              return;
          }
          
          const { data: permissionsData, error: permissionsError } = await supabase
            .from('resource_permissions')
            .select('resource_path')
            .in('role_id', roleIds)
            .eq('can_access', true);

          if (permissionsError) {
            console.error('UserContext: Error fetching permissions:', permissionsError);
            throw permissionsError;
          }
          console.log('UserContext: Fetched permissionsData:', permissionsData);

          const fetchedPermissions = new Set(permissionsData?.map(p => p.resource_path) || []);
          
          // CRÍTICO: Asegurarse de que el dashboard principal siempre sea accesible si hay permisos
          if (fetchedPermissions.size > 0) {
            fetchedPermissions.add('/');
            // Añadir rutas comunes de navegación si existen permisos
            fetchedPermissions.add('/invoicing'); 
          }
          setPermissions(fetchedPermissions);
          console.log('UserContext: Final fetchedPermissions Set:', fetchedPermissions);

        } else {
          setPermissions(new Set());
          console.log('UserContext: No roles found, setting empty permissions.');
        }

      } else {
        setRoles(null);
        setPermissions(null);
        console.log('UserContext: No authenticated user, roles and permissions set to null.');
      }
    } catch (error) {
      console.error('UserContext: Global error fetching user, roles, or permissions:', error);
      setRoles(null);
      setPermissions(new Set()); // Aseguramos que sea un Set vacío en caso de error para evitar fallos
    } finally {
      setLoading(false);
      console.log('UserContext: Loading finished.');
    }
  }, []); 

  useEffect(() => {
    fetchUserAndRolesAndPermissions();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('UserContext: Auth state changed. Event:', event, 'Session:', session);
      
      if (session?.user) {
        if (event === 'SIGNED_IN' && user?.id === session.user.id) {
          setUser(session.user);
          console.log('UserContext: Session revalidated for same user, no full re-fetch.');
          setLoading(false); 
          return; 
        }

        setUser(session.user); 
        fetchUserAndRolesAndPermissions();
      } else {
        setUser(null);
        setRoles(null);
        setPermissions(new Set()); // Aseguramos Set vacío al cerrar sesión
        setLoading(false);
        console.log('UserContext: No authenticated user, roles and permissions set to null.');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserAndRolesAndPermissions, user?.id]); 

  return (
    <UserContext.Provider value={{ user, roles, permissions, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
