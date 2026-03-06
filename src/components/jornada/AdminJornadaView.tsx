import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAdminJornadas, getAllColaboradores, Jornada, Colaborador, calculateWorkedMinutesForJornada } from '@/lib/api/jornadaApi';
import { Calendar as CalendarIcon, Users, CalendarDays, Pencil, MessageSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import EditJornadaModal from './EditJornadaModal';
import PaymentEstimator from './PaymentEstimator';

type JornadaWithColaborador = Jornada & { colaboradores: Colaborador | null };

const AdminJornadaView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('month');
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJornada, setSelectedJornada] = useState<JornadaWithColaborador | null>(null);

  const { startDate, endDate } = useMemo(() => {
    const start =
      filterType === 'week'
        ? startOfWeek(selectedDate, { weekStartsOn: 1 })
        : filterType === 'month'
        ? startOfMonth(selectedDate)
        : selectedDate;
    const end =
      filterType === 'week'
        ? endOfWeek(selectedDate, { weekStartsOn: 1 })
        : filterType === 'month'
        ? endOfMonth(selectedDate)
        : selectedDate;
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [selectedDate, filterType]);

  const { data: colaboradores, isLoading: isLoadingColaboradores } = useQuery({
    queryKey: ['allColaboradores'],
    queryFn: getAllColaboradores,
  });

  const { data: jornadas } = useQuery({
    queryKey: ['adminJornadas', startDate, endDate, selectedColaboradorId],
    queryFn: () => getAdminJornadas({ startDate, endDate, colaboradorId: selectedColaboradorId }),
  });

  const totalMinutes = useMemo(() => {
    if (!jornadas) return 0;
    return jornadas.reduce((acc, j) => acc + calculateWorkedMinutesForJornada(j), 0);
  }, [jornadas]);

  const selectedColaboradorName = useMemo(() => {
    if (selectedColaboradorId === 'todos') return 'Todos';
    const col = colaboradores?.find(c => c.id === selectedColaboradorId);
    return col ? `${col.name} ${col.apellidos}` : 'Colaborador';
  }, [selectedColaboradorId, colaboradores]);

  const handleEditClick = (jornada: JornadaWithColaborador) => {
    setSelectedJornada(jornada);
    setIsModalOpen(true);
  };

  const getStatus = (jornada: JornadaWithColaborador): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (jornada.hora_fin_jornada) return { text: 'Finalizada', variant: 'default' };
    if (jornada.hora_fin_almuerzo) return { text: 'Trabajando', variant: 'secondary' };
    if (jornada.hora_inicio_almuerzo) return { text: 'En Almuerzo', variant: 'outline' };
    if (jornada.hora_inicio_jornada) return { text: 'Trabajando', variant: 'secondary' };
    return { text: 'Ausente', variant: 'destructive' };
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  const formatMinutesToHours = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const renderDateRange = () => {
    if (filterType === 'day') return format(selectedDate, "PPP", { locale: es });
    if (filterType === 'week') return `Semana del ${format(parseISO(startDate), "d 'de' LLL", { locale: es })} al ${format(parseISO(endDate), "d 'de' LLL, yyyy", { locale: es })}`;
    if (filterType === 'month') return format(selectedDate, "LLLL yyyy", { locale: es });
    return 'Elige una fecha';
  };

  return (
    <>
      <div className="space-y-8">
        {/* Filtros Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-none shadow-xl rounded-[2rem] bg-white">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Colaborador</label>
            <Select value={selectedColaboradorId} onValueChange={setSelectedColaboradorId} disabled={isLoadingColaboradores}>
              <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50 font-bold">
                <Users className="mr-2 h-4 w-4 text-[#9E7FFF]" />
                <SelectValue placeholder="Seleccionar colaborador" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="todos" className="font-bold">Todos los colaboradores</SelectItem>
                {colaboradores?.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-medium">{c.name} {c.apellidos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Periodo</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full h-12 justify-start text-left font-bold rounded-xl border-gray-100 bg-gray-50")}>
                  <CalendarIcon className="mr-2 h-4 w-4 text-[#9E7FFF]" />
                  <span>{renderDateRange()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => setSelectedDate(d || new Date())} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Vista</label>
            <ToggleGroup type="single" value={filterType} onValueChange={(value) => value && setFilterType(value as 'day' | 'week' | 'month')} className="w-full grid grid-cols-3 bg-gray-50 p-1 rounded-xl border border-gray-100">
              <ToggleGroupItem value="day" className="rounded-lg font-bold text-[10px] uppercase">Día</ToggleGroupItem>
              <ToggleGroupItem value="week" className="rounded-lg font-bold text-[10px] uppercase">Sem.</ToggleGroupItem>
              <ToggleGroupItem value="month" className="rounded-lg font-bold text-[10px] uppercase">Mes</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Estimador de Pago (Solo si hay un colaborador seleccionado) */}
        {selectedColaboradorId !== 'todos' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <PaymentEstimator 
              totalMinutes={totalMinutes} 
              colaboradorName={selectedColaboradorName} 
            />
          </div>
        )}

        {/* Tabla de Registros */}
        <div className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-black uppercase tracking-tight">Detalle de Asistencia</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
              <Info className="h-3.5 w-3.5" />
              {jornadas?.length || 0} registros encontrados
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Colaborador</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Fecha</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Estado</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Inicio</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Almuerzo</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Fin</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Horas</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jornadas && jornadas.length > 0 ? (
                  jornadas.map((jornada) => (
                    <TableRow key={jornada.id} className="group border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-bold text-sm">
                        {jornada.colaboradores?.name} {jornada.colaboradores?.apellidos}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-medium text-gray-500">
                        {format(parseISO(jornada.fecha), "dd/MM/yy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatus(jornada).variant} className="rounded-lg uppercase text-[9px] font-black tracking-widest px-2 py-0.5">
                          {getStatus(jornada).text}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-xs">{formatTime(jornada.hora_inicio_jornada)}</span>
                          {jornada.justificacion_inicio && (
                            <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 max-w-[100px]">
                              <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{jornada.justificacion_inicio}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs text-gray-400">
                        {formatTime(jornada.hora_inicio_almuerzo)} - {formatTime(jornada.hora_fin_almuerzo)}
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-xs">{formatTime(jornada.hora_fin_jornada)}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="font-mono font-black text-[#9E7FFF] bg-[#9E7FFF]/5 px-2 py-1 rounded-lg text-xs">
                          {formatMinutesToHours(calculateWorkedMinutesForJornada(jornada))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(jornada)} className="rounded-xl hover:bg-[#9E7FFF]/10 hover:text-[#9E7FFF]">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-300">
                        <CalendarDays className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-50">Sin registros en este periodo</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      {selectedJornada && (
        <EditJornadaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          jornada={selectedJornada}
          onSuccess={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default AdminJornadaView;
