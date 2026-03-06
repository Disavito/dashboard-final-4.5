import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, 
  Loader2, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  ArrowUpRight,
  Wallet,
  Filter,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Download
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Cuenta, Ingreso, Gasto } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import TransactionForm from '@/components/custom/TransactionForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type TimeFrame = 'daily' | 'monthly' | 'quarterly' | 'yearly';

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Cuenta[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, incRes, gasRes] = await Promise.all([
        supabase.from('cuentas').select('*').order('name'),
        supabase.from('ingresos').select('*').order('date', { ascending: true }),
        supabase.from('gastos').select('*').order('date', { ascending: true })
      ]);

      if (accRes.data) setAccounts(accRes.data);
      if (incRes.data) setIngresos(incRes.data);
      if (gasRes.data) setGastos(gasRes.data);
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Unificar todos los movimientos para el historial
  const allTransactions = useMemo(() => {
    const combined = [
      ...ingresos.map(i => ({ 
        id: `inc-${i.id}`, 
        date: i.date, 
        amount: i.transaction_type === 'Anulación' ? -i.amount : i.amount, 
        description: i.full_name || 'Ingreso General', 
        account: i.account, 
        type: 'income' as const,
        category: i.transaction_type,
        ref: i.receipt_number
      })),
      ...gastos.map(g => ({ 
        id: `exp-${g.id}`, 
        date: g.date, 
        amount: -Math.abs(g.amount), 
        description: g.description, 
        account: g.account, 
        type: 'expense' as const,
        category: g.category,
        ref: g.numero_gasto
      }))
    ];

    return combined
      .filter(t => {
        const matchesAccount = selectedAccount === 'all' || t.account === selectedAccount;
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (t.ref && t.ref.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesAccount && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ingresos, gastos, selectedAccount, searchTerm]);

  const stats = useMemo(() => {
    const filteredInc = selectedAccount === 'all' ? ingresos : ingresos.filter(i => i.account === selectedAccount);
    const filteredGas = selectedAccount === 'all' ? gastos : gastos.filter(g => g.account === selectedAccount);

    const totalIncome = filteredInc.reduce((acc, curr) => {
      if (curr.transaction_type === 'Anulación') return acc - curr.amount;
      return acc + curr.amount;
    }, 0);

    const totalExpenses = filteredGas.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

    return {
      balance: totalIncome - totalExpenses,
      income: totalIncome,
      expenses: totalExpenses,
      count: filteredInc.length + filteredGas.length
    };
  }, [ingresos, gastos, selectedAccount]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { name: string, ingresos: number, gastos: number }>();

    const processItem = (dateStr: string, amount: number, type: 'ingresos' | 'gastos') => {
      const date = parseISO(dateStr);
      let key = '';
      if (timeFrame === 'daily') key = format(date, 'dd/MM');
      else if (timeFrame === 'monthly') key = format(date, 'MMM yyyy', { locale: es });
      else if (timeFrame === 'quarterly') key = `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      else key = format(date, 'yyyy');

      if (!dataMap.has(key)) {
        dataMap.set(key, { name: key, ingresos: 0, gastos: 0 });
      }
      const current = dataMap.get(key)!;
      current[type] += Math.abs(amount);
    };

    ingresos
      .filter(i => selectedAccount === 'all' || i.account === selectedAccount)
      .forEach(i => processItem(i.date, i.transaction_type === 'Anulación' ? -i.amount : i.amount, 'ingresos'));
    
    gastos
      .filter(g => selectedAccount === 'all' || g.account === selectedAccount)
      .forEach(g => processItem(g.date, g.amount, 'gastos'));

    return Array.from(dataMap.values()).slice(-12);
  }, [ingresos, gastos, selectedAccount, timeFrame]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#9E7FFF]" />
        <p className="text-slate-500 mt-4 font-medium">Sincronizando estados financieros...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-slate-900 p-4 md:p-8 space-y-8">
      {/* Header Profesional */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 max-w-7xl mx-auto">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#9E7FFF] rounded-2xl shadow-lg shadow-[#9E7FFF]/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Cuentas & <span className="text-[#9E7FFF]">Tesorería</span></h1>
              <p className="text-slate-500 font-medium">Control centralizado de activos y flujos de caja</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[180px] border-none focus:ring-0 font-bold text-slate-700">
                <SelectValue placeholder="Todas las cuentas" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100">
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.name}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#9E7FFF] hover:bg-[#8B6EEF] text-white font-bold rounded-xl px-6 h-12 shadow-lg shadow-[#9E7FFF]/20 transition-all active:scale-95">
                <PlusCircle className="w-5 h-5 mr-2" /> Nuevo Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-none text-slate-900 max-w-2xl rounded-3xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Registrar Transacción</DialogTitle>
              </DialogHeader>
              <TransactionForm 
                onClose={() => setIsTransactionDialogOpen(false)} 
                onSuccess={fetchData} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Stats Grid - Estilo Apple/Stripe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-none shadow-sm rounded-[2rem] overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-20 h-20 text-emerald-500" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Saldo Neto Disponible</CardDescription>
              <CardTitle className="text-4xl font-black text-slate-900">
                {formatCurrency(stats.balance)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 w-fit px-3 py-1 rounded-full">
                <ArrowUpRight className="w-4 h-4" />
                <span>Capital en Sistema</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm rounded-[2rem]">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Ingresos Totales</CardDescription>
              <CardTitle className="text-4xl font-black text-[#9E7FFF]">
                {formatCurrency(stats.income)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <ArrowUpCircle className="w-4 h-4 text-[#9E7FFF]" />
                <span>Flujo de entrada acumulado</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm rounded-[2rem]">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Gastos & Egresos</CardDescription>
              <CardTitle className="text-4xl font-black text-pink-500">
                {formatCurrency(stats.expenses)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                <ArrowDownCircle className="w-4 h-4 text-pink-500" />
                <span>Salidas de caja registradas</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Charts & Accounts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Chart Section */}
          <Card className="xl:col-span-2 bg-white border-none shadow-sm rounded-[2.5rem] p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Análisis de Flujo</h3>
                <p className="text-slate-400 text-sm font-medium">Comparativa de Ingresos vs Gastos</p>
              </div>
              
              <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)} className="bg-slate-50 p-1 rounded-xl border border-slate-100">
                <TabsList className="bg-transparent border-none">
                  <TabsTrigger value="daily" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Día</TabsTrigger>
                  <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Mes</TabsTrigger>
                  <TabsTrigger value="quarterly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Trim.</TabsTrigger>
                  <TabsTrigger value="yearly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Año</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9E7FFF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#9E7FFF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f472b6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f472b6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `S/ ${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Area 
                    name="Ingresos"
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="#9E7FFF" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorInc)" 
                  />
                  <Area 
                    name="Gastos"
                    type="monotone" 
                    dataKey="gastos" 
                    stroke="#f472b6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorExp)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Accounts List & Distribution */}
          <div className="space-y-6">
            <h3 className="text-xl font-black px-2 flex items-center gap-2 text-slate-900 uppercase tracking-tight">
              <BarChart3 className="w-5 h-5 text-[#9E7FFF]" />
              Estado de Cuentas
            </h3>
            <div className="grid gap-4">
              {accounts.map(account => {
                const accountIncome = ingresos
                  .filter(i => i.account === account.name)
                  .reduce((acc, curr) => acc + (curr.transaction_type === 'Anulación' ? -curr.amount : curr.amount), 0);
                
                const accountExpenses = gastos
                  .filter(g => g.account === account.name)
                  .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

                const balance = accountIncome - accountExpenses;
                const percentage = stats.balance > 0 ? (balance / stats.balance) * 100 : 0;

                return (
                  <Card key={account.id} className="bg-white border-none shadow-sm rounded-2xl hover:ring-2 hover:ring-[#9E7FFF]/20 transition-all cursor-pointer overflow-hidden group">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-[#9E7FFF] transition-colors">{account.name}</h4>
                          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 border-none uppercase font-bold">{account.tipo}</Badge>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-lg font-black", balance >= 0 ? "text-emerald-600" : "text-pink-500")}>
                            {formatCurrency(balance)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Saldo Actual</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-slate-400">Distribución</span>
                          <span className="text-slate-600">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#9E7FFF] h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              
              <Button variant="outline" className="w-full border-dashed border-2 border-slate-200 text-slate-400 hover:text-[#9E7FFF] hover:border-[#9E7FFF] hover:bg-[#9E7FFF]/5 rounded-2xl h-14 font-bold transition-all">
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Transferir entre Cuentas
              </Button>
            </div>
          </div>
        </div>

        {/* Unified Transaction History */}
        <Card className="bg-white border-none shadow-sm rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Historial Unificado</h3>
              <p className="text-slate-400 text-sm font-medium">Todos los movimientos de tesorería</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Buscar por socio o recibo..." 
                  className="pl-10 bg-slate-50 border-none rounded-xl h-11 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="rounded-xl border-slate-200 h-11 font-bold text-slate-600">
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-4">Fecha</th>
                  <th className="px-8 py-4">Concepto / Referencia</th>
                  <th className="px-8 py-4">Cuenta</th>
                  <th className="px-8 py-4">Categoría</th>
                  <th className="px-8 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allTransactions.slice(0, 15).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <span className="text-sm font-semibold text-slate-600">{format(parseISO(t.date), 'dd MMM, yyyy', { locale: es })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-[#9E7FFF] transition-colors uppercase">
                          {t.description}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{t.ref || 'S/N'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 font-bold text-[10px]">
                        {t.account}
                      </Badge>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-1 rounded-md",
                        t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-pink-50 text-pink-600"
                      )}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className={cn(
                        "text-sm font-black",
                        t.amount >= 0 ? "text-emerald-600" : "text-pink-500"
                      )}>
                        {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allTransactions.length === 0 && (
              <div className="p-20 text-center">
                <p className="text-slate-400 font-bold">No se encontraron movimientos con los filtros aplicados</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Accounts;
