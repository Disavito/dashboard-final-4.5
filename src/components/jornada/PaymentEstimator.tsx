import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Calendar as CalendarIcon, DollarSign, Clock } from 'lucide-react';

interface PaymentEstimatorProps {
  totalMinutes: number;
  colaboradorName: string;
}

const PaymentEstimator: React.FC<PaymentEstimatorProps> = ({ totalMinutes, colaboradorName }) => {
  const [baseSalary, setBaseSalary] = useState<number>(1025); // Sueldo mínimo por defecto
  const [workingDays, setWorkingDays] = useState<number>(22); // Promedio mensual
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);

  const stats = useMemo(() => {
    const totalHours = totalMinutes / 60;
    const totalWorkingHoursMonth = workingDays * hoursPerDay;
    const hourlyRate = baseSalary / totalWorkingHoursMonth;
    const estimatedPayment = totalHours * hourlyRate;

    return {
      totalHours: totalHours.toFixed(2),
      hourlyRate: hourlyRate.toFixed(2),
      estimatedPayment: estimatedPayment.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' }),
      progress: Math.min((totalHours / totalWorkingHoursMonth) * 100, 100)
    };
  }, [totalMinutes, baseSalary, workingDays, hoursPerDay]);

  return (
    <Card className="border-none shadow-2xl bg-[#171717] text-white rounded-[2.5rem] overflow-hidden">
      <CardHeader className="border-b border-white/5 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#9E7FFF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9E7FFF]/20">
              <Calculator className="text-white h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Estimador de Pago</CardTitle>
              <p className="text-sm text-gray-400 font-medium">Proyección para {colaboradorName}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#9E7FFF] block mb-1">Total Acumulado</span>
            <span className="text-3xl font-black tracking-tighter">{stats.estimatedPayment}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Sueldo Base (S/.)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E7FFF]" />
              <Input 
                type="number" 
                value={baseSalary} 
                onChange={(e) => setBaseSalary(Number(e.target.value))}
                className="h-12 pl-10 rounded-xl border-white/5 bg-white/5 font-bold focus:ring-[#9E7FFF] text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Días Laborables Mes</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E7FFF]" />
              <Input 
                type="number" 
                value={workingDays} 
                onChange={(e) => setWorkingDays(Number(e.target.value))}
                className="h-12 pl-10 rounded-xl border-white/5 bg-white/5 font-bold focus:ring-[#9E7FFF] text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Horas por Día</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E7FFF]" />
              <Input 
                type="number" 
                value={hoursPerDay} 
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
                className="h-12 pl-10 rounded-xl border-white/5 bg-white/5 font-bold focus:ring-[#9E7FFF] text-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Horas Totales</span>
            <span className="text-xl font-bold">{stats.totalHours}h</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Valor Hora</span>
            <span className="text-xl font-bold">S/. {stats.hourlyRate}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Meta Mensual</span>
            <span className="text-xl font-bold">{workingDays * hoursPerDay}h</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#9E7FFF]/10 border border-[#9E7FFF]/20">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#9E7FFF] block mb-1">Cumplimiento</span>
            <span className="text-xl font-bold text-[#9E7FFF]">{stats.progress.toFixed(1)}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
            <span>Progreso de Jornada</span>
            <span>{stats.totalHours} / {workingDays * hoursPerDay} Horas</span>
          </div>
          <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#9E7FFF] to-[#f472b6] transition-all duration-1000 ease-out"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentEstimator;
