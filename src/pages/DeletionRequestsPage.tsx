import React from 'react';
import DeletionRequestsTable from '@/components/documents/DeletionRequestsTable';
import { Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/context/UserContext';

const DeletionRequestsPage: React.FC = () => {
  const { loading: userLoading } = useUser();

  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-[#9E7FFF]" />
        <p className="mt-4 text-gray-400 font-medium">Cargando permisos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20">
      <header className="relative h-64 md:h-80 flex items-center overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ef4444]/10 to-transparent z-0"></div>
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <Trash2 className="w-full h-full text-[#ef4444]" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-red-50/20 text-red-600 border-none font-bold px-4 py-1 rounded-full">
              ADMINISTRACIÓN DE DOCUMENTOS
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter mb-4">
              Solicitudes de <span className="text-red-600">Eliminación</span>
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Gestiona y aprueba o rechaza las peticiones de borrado de documentos sensibles.
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 -mt-12 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          <DeletionRequestsTable />
        </div>
      </div>
    </div>
  );
};

export default DeletionRequestsPage;
