import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FileText, History, FileX, Receipt } from 'lucide-react';

const tabs = [
  { name: 'Boletas', path: '/invoicing/boletas', icon: FileText },
  { name: 'Resumen Diario', path: '/invoicing/resumen-diario', icon: History },
  { name: 'Notas de Crédito', path: '/invoicing/notas-credito', icon: FileX },
  { name: 'Recibos', path: '/invoicing/recibos', icon: Receipt },
];

export default function InvoicingLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header de Facturación Optimizado para Móvil */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-8 py-6">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-6">Módulo de <span className="text-[#9E7FFF]">Facturación</span></h1>
          
          {/* Tabs con Scroll Horizontal en Móvil */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-[#9E7FFF] text-white shadow-lg shadow-[#9E7FFF]/30" 
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8">
        <Outlet />
      </div>
    </div>
  );
}
