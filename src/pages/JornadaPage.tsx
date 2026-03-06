import { useUser } from '@/context/UserContext';
import { useQuery } from '@tanstack/react-query';
import { getColaboradorProfile } from '@/lib/api/jornadaApi';
import { Loader2, UserX } from 'lucide-react';
import ClockManager from '@/components/jornada/ClockManager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminJornadaView from '@/components/jornada/AdminJornadaView';
import AdminClockManager from '@/components/jornada/AdminClockManager';

const JornadaPage = () => {
  const { user, roles } = useUser();
  const isAdmin = roles?.includes('admin') || roles?.includes('finanzas_senior');

  const { data: colaborador, isLoading, isError } = useQuery({
    queryKey: ['colaboradorProfile', user?.id],
    queryFn: () => getColaboradorProfile(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#9E7FFF]" />
      </div>
    );
  }

  if (isError || !colaborador) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Alert variant="destructive" className="rounded-2xl border-none shadow-lg">
          <UserX className="h-5 w-5" />
          <AlertTitle className="font-black uppercase tracking-tight">Error de Perfil</AlertTitle>
          <AlertDescription className="font-medium">
            No se encontró un perfil de colaborador vinculado a tu cuenta. Contacta a soporte.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {isAdmin ? (
        <Tabs defaultValue="mi-jornada" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-100/50 p-1 rounded-2xl">
            <TabsTrigger value="mi-jornada" className="rounded-xl font-bold uppercase text-xs">Mi Jornada</TabsTrigger>
            <TabsTrigger value="seguimiento" className="rounded-xl font-bold uppercase text-xs">Seguimiento</TabsTrigger>
            <TabsTrigger value="registro-manual" className="rounded-xl font-bold uppercase text-xs">Admin</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mi-jornada" className="mt-0">
            {/* Contenedor centrado para que el ClockManager sea un recuadro */}
            <div className="flex justify-center items-start pt-4">
              <ClockManager colaborador={colaborador} />
            </div>
          </TabsContent>
          
          <TabsContent value="seguimiento">
            <AdminJornadaView />
          </TabsContent>
          
          <TabsContent value="registro-manual">
            <div className="flex justify-center items-start pt-4">
              <AdminClockManager />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex justify-center items-start pt-10">
          <ClockManager colaborador={colaborador} />
        </div>
      )}
    </div>
  );
};

export default JornadaPage;
