import { useState, useMemo } from 'react';
import { 
  Users, 
  Activity,
  Briefcase,
  TrendingUp,
  Wallet,
  PieChart as PieChartIcon,
  Lock,
  AlertCircle,
  RefreshCcw,
  XCircle,
  UserCheck,
  UserMinus,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Ingreso, Gasto, Colaborador, SocioTitular } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpecialTransactionsDialog } from '@/components/invoicing/SpecialTransactionsDialog';
import { cn, formatCurrency } from '@/lib/utils';
import { 
  format, 
  parseISO, 
  getQuarter as dateFnsGetQuarter, 
  getMonth, 
  getYear,
  startOfMonth,
  isAfter
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/context/UserContext';

const getQuarter = (date: Date): string => {
  const quarter = dateFnsGetQuarter(date);
  const year = getYear(date);
  return `Q${quarter}-${year}`;
};

const getSemester = (date: Date): string => {
  const month = getMonth(date);
  const semester = month < 6 ? 1 : 2;
  const year = getYear(date);
  return `S${semester}-${year}`;
};

function Dashboard() {
  const { roles, loading: authLoading } = useUser();
  const [filterPeriodType, setFilterPeriodType] = useState<'month' | 'quarter' | 'semester' | 'all'>('month');
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined);
  const [isSpecialDialogOpen, setIsSpecialDialogOpen] = useState(false);
  const [specialDialogType, setSpecialDialogType] = useState<'annulled' | 'returned'>('annulled');

  const isAdminOrFinanzas = useMemo(() => {
    if (!roles) return false;
    return roles.some(role => ['admin', 'finanzas'].includes(role.toLowerCase()));
  }, [roles]);

  const { data: ingresos } = useSupabaseData<Ingreso>({ tableName: 'ingresos' });
  const { data: gastos } = useSupabaseData<Gasto>({ tableName: 'gastos' });
  const { data: socios } = useSupabaseData<SocioTitular>({ tableName: 'socio_titulares' });
  const { data: colaboradores } = useSupabaseData<Colaborador>({ tableName: 'colaboradores' });

  const periodOptions = useMemo(() => {
    const dates = [...ingresos, ...gastos].map(i => parseISO(i.date));
    const months = Array.from(new Set(dates.map(d => format(d, 'yyyy-MM')))).sort().reverse().map(m => ({ value: m, label: format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: es }) }));
    const quarters = Array.from(new Set(dates.map(d => getQuarter(d)))).sort().reverse().map(q => ({ value: q, label: `Trimestre ${q.split('-')[0].replace('Q','')} - ${q.split('-')[1]}` }));
    const semesters = Array.from(new Set(dates.map(d => getSemester(d)))).sort().reverse().map(s => ({ value: s, label: `Semestre ${s.split('-')[0].replace('S','')} - ${s.split('-')[1]}` }));
    return { months, quarters, semesters };
  }, [ingresos, gastos]);

  const filteredData = useMemo(() => {
    const filterFn = (item: any) => {
      if (filterPeriodType === 'all' || !selectedPeriod) return true;
      const d = parseISO(item.date);
      if (filterPeriodType === 'month') return format(d, 'yyyy-MM') === selectedPeriod;
      if (filterPeriodType === 'quarter') return getQuarter(d) === selectedPeriod;
      if (filterPeriodType === 'semester') return getSemester(d) === selectedPeriod;
      return true;
    };
    const fIngresos = ingresos.filter(filterFn);
    const fGastos = gastos.filter(filterFn);
    const totalI = fIngresos.reduce((sum, i) => sum + i.amount, 0);
    const totalG = Math.abs(fGastos.reduce((sum, g) => sum + g.amount, 0));
    return { totalIngresos: totalI, totalGastos: totalG, balance: totalI - totalG, ingresos: fIngresos, gastos: fGastos };
  }, [ingresos, gastos, filterPeriodType, selectedPeriod]);

  const socioStats = useMemo(() => {
    const total = socios.length;
    const currentMonthStart = startOfMonth(new Date());
    const pagadosDnis = new Set(ingresos.filter(i => isAfter(parseISO(i.date), currentMonthStart) && i.amount > 0).map(i => i.dni));
    const pagadosCount = socios.filter(s => pagadosDnis.has(s.dni)).length;
    return { total, pagados: pagadosCount, pendientes: total - pagadosCount, porcentaje: total > 0 ? Math.round((pagadosCount / total) * 100) : 0 };
  }, [socios, ingresos]);

  const chartData = useMemo(() => {
    const monthly: Record<string, { ingresos: number; gastos: number }> = {};
    [...filteredData.ingresos, ...filteredData.gastos].forEach(item => {
      const key = format(parseISO(item.date), 'MMM yy', { locale: es });
      if (!monthly[key]) monthly[key] = { ingresos: 0, gastos: 0 };
      if ('receipt_number' in item) monthly[key].ingresos += item.amount;
      else monthly[key].gastos += Math.abs(item.amount);
    });
    return Object.entries(monthly).map(([name, data]) => ({ name, ...data }));
  }, [filteredData]);

  const specialStats = useMemo(() => {
    const annulled = ingresos.filter(i => i.transaction_type === 'Anulacion').length;
    const returned = Math.abs(ingresos.filter(i => i.transaction_type === 'Devolucion').reduce((s, i) => s + i.amount, 0));
    return { annulled, returned };
  }, [ingresos]);

  if (authLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FC]">
        <Loader2 className="w-12 h-12 text-[#9E7FFF] animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Cargando panel...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-[#F8F9FC] min-h-screen">
      <header className="relative h-64 md:h-72 flex items-center overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-[#9E7FFF]/5 via-transparent to-transparent z-0"></div>
        <div className="container mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <Badge className="mb-3 bg-[#9E7FFF]/10 text-[#9E7FFF] border-none font-bold px-4 py-1 rounded-full">
                SISTEMA DE GESTIÓN V2025
              </Badge>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                Panel de <span className="text-[#9E7FFF]">Administración</span>
              </h1>
              <p className="text-gray-500 font-medium mt-2">
                {isAdminOrFinanzas 
                  ? 'Consolidado completo de activos, equipo y flujo de caja.' 
                  : 'Resumen general de socios titulares registrados.'}
              </p>
            </div>
            <div className="bg-white shadow-sm border border-gray-100 p-1.5 rounded-2xl flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Activity className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="pr-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</p>
                <p className="text-sm font-black text-gray-900">En Línea</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-8 -mt-10 relative z-20">
        <Tabs defaultValue="titulares" className="space-y-8">
          {isAdminOrFinanzas && (
            <div className="flex justify-center">
              <TabsList className="bg-white/80 backdrop-blur-md border border-gray-200 p-1.5 rounded-[2rem] h-16 shadow-xl shadow-gray-200/50">
                <TabsTrigger value="titulares" className="rounded-[1.5rem] px-8 data-[state=active]:bg-[#9E7FFF] data-[state=active]:text-white font-bold text-gray-500 transition-all">
                  <Users className="w-4 h-4 mr-2" /> Titulares y Equipo
                </TabsTrigger>
                <TabsTrigger value="finanzas" className="rounded-[1.5rem] px-8 data-[state=active]:bg-[#9E7FFF] data-[state=active]:text-white font-bold text-gray-500 transition-all">
                  <Wallet className="w-4 h-4 mr-2" /> Finanzas y Balance
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          <TabsContent value="titulares" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={cn(
              "grid gap-6",
              isAdminOrFinanzas ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 max-w-2xl mx-auto"
            )}>
              <Card className={cn(
                "rounded-[2.5rem] border-none shadow-xl bg-white p-8 transition-all",
                !isAdminOrFinanzas && "ring-4 ring-[#9E7FFF]/10"
              )}>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-[#F0EEFF] rounded-2xl flex items-center justify-center"><Users className="text-[#9E7FFF] w-7 h-7" /></div>
                  <Badge className="bg-gray-100 text-gray-500 border-none font-bold">Total</Badge>
                </div>
                <h3 className="text-5xl font-black text-gray-900">{socioStats.total}</h3>
                <p className="text-gray-400 font-bold text-sm uppercase tracking-wider mt-2">Socios Titulares</p>
                {!isAdminOrFinanzas && (
                  <p className="text-gray-400 text-xs mt-4 italic">Acceso limitado: Solo visualización de conteo total.</p>
                )}
              </Card>

              {isAdminOrFinanzas && (
                <>
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center"><UserCheck className="text-emerald-500 w-7 h-7" /></div>
                      <Badge className="bg-emerald-100 text-emerald-600 border-none font-bold">{socioStats.porcentaje}%</Badge>
                    </div>
                    <h3 className="text-5xl font-black text-emerald-600">{socioStats.pagados}</h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wider mt-2">Pagos Mes Actual</p>
                  </Card>

                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center"><UserMinus className="text-amber-500 w-7 h-7" /></div>
                      <Badge className="bg-amber-100 text-amber-600 border-none font-bold">Pendiente</Badge>
                    </div>
                    <h3 className="text-5xl font-black text-amber-600">{socioStats.pendientes}</h3>
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-wider mt-2">Por Regularizar</p>
                  </Card>
                </>
              )}
            </div>

            {isAdminOrFinanzas && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center"><Briefcase className="text-[#9E7FFF] w-5 h-5" /></div>
                    <h2 className="text-2xl font-black text-gray-900">Equipo de Trabajo</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {colaboradores.slice(0, 4).map((colab) => (
                      <div key={colab.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between group hover:border-[#9E7FFF]/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-[#9E7FFF] group-hover:bg-[#F0EEFF]">{colab.name.charAt(0)}</div>
                          <div>
                            <p className="font-black text-gray-900">{colab.name}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase">{colab.cargo || 'Colaborador'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-xl bg-[#171717] p-8 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <PieChartIcon className="w-12 h-12 text-[#9E7FFF] mb-6" />
                    <h3 className="text-2xl font-black mb-2">Distribución</h3>
                    <p className="text-gray-400 font-medium mb-8">Participación de socios por comunidad.</p>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-300">Activos</span><span className="text-sm font-black">88%</span></div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#9E7FFF] w-[88%]" /></div>
                    </div>
                  </div>
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#9E7FFF]/10 rounded-full blur-3xl" />
                </Card>
              </div>
            )}
          </TabsContent>

          {isAdminOrFinanzas ? (
            <TabsContent value="finanzas" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center"><TrendingUp className="text-[#9E7FFF] w-5 h-5" /></div>
                  <h2 className="text-2xl font-black text-gray-900">Análisis de Flujo</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-[1.5rem] border border-gray-200 shadow-sm">
                  <Select value={filterPeriodType} onValueChange={(v: any) => { setFilterPeriodType(v); setSelectedPeriod(undefined); }}>
                    <SelectTrigger className="w-[140px] border-none bg-transparent font-bold text-gray-700 focus:ring-0"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="month">Mensual</SelectItem>
                      <SelectItem value="quarter">Trimestral</SelectItem>
                      <SelectItem value="semester">Semestral</SelectItem>
                      <SelectItem value="all">Histórico</SelectItem>
                    </SelectContent>
                  </Select>
                  {filterPeriodType !== 'all' && (
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-[180px] border-l border-gray-100 bg-transparent font-bold text-[#9E7FFF] focus:ring-0"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {filterPeriodType === 'month' && periodOptions.months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        {filterPeriodType === 'quarter' && periodOptions.quarters.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                        {filterPeriodType === 'semester' && periodOptions.semesters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-[2rem] border-none shadow-lg bg-white p-6">
                      <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-1">Ingresos</p>
                      <h4 className="text-2xl font-black text-emerald-700">{formatCurrency(filteredData.totalIngresos)}</h4>
                    </Card>
                    <Card className="rounded-[2rem] border-none shadow-lg bg-white p-6">
                      <p className="text-red-600 font-bold text-xs uppercase tracking-widest mb-1">Gastos</p>
                      <h4 className="text-2xl font-black text-red-700">{formatCurrency(filteredData.totalGastos)}</h4>
                    </Card>
                    <Card className={cn("rounded-[2rem] border-none shadow-lg p-6", filteredData.balance >= 0 ? "bg-[#F0EEFF]" : "bg-red-50")}>
                      <p className={cn("font-bold text-xs uppercase tracking-widest mb-1", filteredData.balance >= 0 ? "text-[#9E7FFF]" : "text-red-600")}>Balance Neto</p>
                      <h4 className={cn("text-2xl font-black", filteredData.balance >= 0 ? "text-[#9E7FFF]" : "text-red-700")}>{formatCurrency(filteredData.balance)}</h4>
                    </Card>
                  </div>

                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorIng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                            <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIng)" />
                          <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorGas)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center"><AlertCircle className="text-amber-500 w-5 h-5" /></div>
                    <h2 className="text-2xl font-black text-gray-900">Auditoría</h2>
                  </div>
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-6 space-y-4">
                    <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100 cursor-pointer hover:bg-white hover:shadow-md transition-all group" onClick={() => { setSpecialDialogType('returned'); setIsSpecialDialogOpen(true); }}>
                      <div className="flex items-center justify-between mb-2"><RefreshCcw className="w-5 h-5 text-[#9E7FFF]" /><Badge className="bg-amber-100 text-amber-600 border-none">Devoluciones</Badge></div>
                      <p className="text-2xl font-black text-red-600">{formatCurrency(specialStats.returned)}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase mt-1">Monto total devuelto</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100 cursor-pointer hover:bg-white hover:shadow-md transition-all group" onClick={() => { setSpecialDialogType('annulled'); setIsSpecialDialogOpen(true); }}>
                      <div className="flex items-center justify-between mb-2"><XCircle className="w-5 h-5 text-red-500" /><Badge className="bg-red-100 text-red-600 border-none">Anulaciones</Badge></div>
                      <p className="text-2xl font-black text-gray-900">{specialStats.annulled}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase mt-1">Boletas invalidadas</p>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ) : (
            <TabsContent value="finanzas" className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="w-10 h-10 text-gray-400" /></div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Acceso Restringido</h3>
                <p className="text-gray-500 font-medium">No tienes permisos para ver datos financieros.</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <SpecialTransactionsDialog isOpen={isSpecialDialogOpen} onClose={() => setIsSpecialDialogOpen(false)} type={specialDialogType} />
    </div>
  );
}

export default Dashboard;
