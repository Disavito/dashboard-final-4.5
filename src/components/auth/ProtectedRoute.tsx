import React, { useMemo } from 'react';
import { useUser } from '@/context/UserContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  resourcePath: string; 
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ resourcePath, children }) => {
  const { user, roles, permissions, loading } = useUser(); 

  const isAdminOrFinanzas = useMemo(() => {
    if (!roles) return false;
    return roles.some(role => ['admin', 'finanzas'].includes(role.toLowerCase()));
  }, [roles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // LÓGICA DE BLOQUEO ESTRICTO POR RUTA
  const financialPaths = ['/income', '/expenses', '/accounts', '/invoicing', '/settings'];
  const isRequestingFinancial = financialPaths.some(path => resourcePath.startsWith(path));

  // Si intenta entrar a algo financiero y no es Admin/Finanzas, bloqueamos de inmediato
  if (isRequestingFinancial && !isAdminOrFinanzas) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center bg-background text-text p-6">
        <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-error" />
        </div>
        <h1 className="text-4xl font-bold text-error">Acceso Denegado</h1>
        <p className="mt-4 text-lg text-textSecondary max-w-md">
          Esta sección contiene información financiera sensible y solo es accesible para personal de Administración o Finanzas.
        </p>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="mt-8 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
        >
          Volver al Panel Seguro
        </button>
      </div>
    );
  }

  // Verificación estándar por permisos de base de datos
  const isAuthorized = permissions?.has(resourcePath) ?? false;

  if (!isAuthorized && resourcePath !== '/dashboard') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center bg-background text-text">
        <h1 className="text-4xl font-bold text-error">Sin Permisos</h1>
        <p className="mt-4 text-lg text-textSecondary">
          No tienes los permisos necesarios para ver esta página.
        </p>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
