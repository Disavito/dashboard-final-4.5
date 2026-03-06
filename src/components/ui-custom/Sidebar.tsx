import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Settings as SettingsIcon, 
  Wallet, 
  FolderOpen, 
  ReceiptText,
  Calendar
} from 'lucide-react';
import { useUser } from '@/context/UserContext';

const allNavLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, isFinancial: false }, 
  { name: 'Socios Titulares', path: '/people', icon: Users, isFinancial: false },
  { name: 'Documentos', path: '/partner-documents', icon: FolderOpen, isFinancial: false },
  { name: 'Jornada', path: '/jornada', icon: Calendar, isFinancial: false },
  // Secciones Financieras (Solo Admin/Finanzas)
  { name: 'Facturación', path: '/invoicing', icon: ReceiptText, isFinancial: true },
  { name: 'Ingresos', path: '/income', icon: ArrowUpCircle, isFinancial: true },
  { name: 'Gastos', path: '/expenses', icon: ArrowDownCircle, isFinancial: true },
  { name: 'Cuentas', path: '/accounts', icon: Wallet, isFinancial: true },
  { name: 'Configuración', path: '/settings', icon: SettingsIcon, isFinancial: true },
];

const Sidebar: React.FC = () => {
  const { roles, loading } = useUser();

  const isAdminOrFinanzas = useMemo(() => {
    if (!roles) return false;
    return roles.some(role => ['admin', 'finanzas'].includes(role.toLowerCase()));
  }, [roles]);

  const visibleNavLinks = useMemo(() => {
    if (loading || !roles) return [];

    return allNavLinks.filter(link => {
      // Si es una ruta financiera, solo mostrar si es Admin o Finanzas
      if (link.isFinancial) {
        return isAdminOrFinanzas;
      }
      // Rutas básicas (Dashboard, Titulares, Documentos, Jornada) son visibles para todos los autorizados
      return true;
    });
  }, [roles, loading, isAdminOrFinanzas]);

  return (
    <aside className="w-64 bg-surface border-r border-border p-6 flex flex-col shadow-lg">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-primary tracking-tight">
          Financiero<span className="text-accent">.</span>
        </h2>
        <p className="text-textSecondary text-sm mt-1">Gestión Integral</p>
      </div>
      <nav className="flex-1">
        <ul className="space-y-3">
          {visibleNavLinks.map((link) => (
            <li key={link.name}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ease-in-out
                  ${isActive
                    ? 'bg-primary/20 text-primary font-semibold shadow-md transform scale-105'
                    : 'text-textSecondary hover:bg-muted/30 hover:text-foreground'
                  }`
                }
              >
                <link.icon className="h-5 w-5" />
                <span className="text-lg">{link.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto pt-6 border-t border-border/50 text-center text-textSecondary text-sm">
        <p>&copy; 2025 Bolt. Todos los derechos reservados.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
