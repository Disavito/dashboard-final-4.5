import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  UserCheck,
  Settings as SettingsIcon,
  Loader2,
  FolderOpen,
  FileText,
  Clock,
  Menu,
  LogOut,
  // Trash2 // REMOVED: Trash2 icon is no longer needed in sidebar
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import NotificationBell from '@/components/ui/NotificationBell';

function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, loading } = useUser();
  // const isAdmin = roles?.includes('admin') ?? false; // isAdmin is no longer directly used for sidebar item visibility

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <Loader2 className="h-10 w-10 animate-spin text-[#9E7FFF]" />
    </div>
  );

  const navItems = [
    { name: 'Resumen', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Ingresos', path: '/income', icon: ArrowUpCircle },
    { name: 'Gastos', path: '/expenses', icon: ArrowDownCircle },
    { name: 'Titulares', path: '/people', icon: UserCheck },
    { name: 'Documentos', path: '/partner-documents', icon: FolderOpen },
    // { name: 'Solicitudes Eliminación', path: '/deletion-requests', icon: Trash2, requiresAdmin: true }, // REMOVED: Deletion Requests item from sidebar
    { name: 'Facturación', path: '/invoicing', icon: FileText },
    { name: 'Jornada', path: '/jornada', icon: Clock },
    { name: 'Cuentas', path: '/accounts', icon: Wallet },
    { name: 'Configuración', path: '/settings', icon: SettingsIcon },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#9E7FFF] rounded-xl flex items-center justify-center shadow-lg shadow-[#9E7FFF]/30">
            <Wallet className="text-white w-6 h-6" />
          </div>
          {!isCollapsed && (
            <span className="text-2xl font-black tracking-tighter text-gray-900">
              Fin<span className="text-[#9E7FFF]">Dash</span>
            </span>
          )}
        </Link>
      </div>

      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group",
                  isActive 
                    ? "bg-[#F0EEFF] text-[#9E7FFF] font-bold" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-[#9E7FFF]" : "text-gray-400 group-hover:text-gray-600")} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-gray-50">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-2xl"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/auth');
          }}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-bold">Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8F9FC] overflow-hidden">
      <aside className={cn(
        "hidden lg:block transition-all duration-300 ease-in-out",
        isCollapsed ? "w-24" : "w-72"
      )}>
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 flex items-center justify-between z-30">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden lg:flex text-gray-400"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          </div>

          <div className="flex items-center gap-6">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-gray-100 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-none">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-bold text-[#9E7FFF] uppercase tracking-widest mt-1">{roles?.[0] || 'Usuario'}</p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-[#F0EEFF]">
                <AvatarImage src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" />
                <AvatarFallback className="bg-[#9E7FFF] text-white font-bold">JD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;
