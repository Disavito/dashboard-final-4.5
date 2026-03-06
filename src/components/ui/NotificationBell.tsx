import React from 'react';
import { Bell, FileText, ExternalLink, Clock, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePendingRequests from '@/hooks/usePendingRequests';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
    const { pendingRequests, pendingCount, canManageRequests } = usePendingRequests();

    if (!canManageRequests) return null;

    const hasPending = pendingCount > 0;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button 
                    className={cn(
                        "relative p-2.5 rounded-full transition-all duration-300 outline-none group",
                        "bg-white/5 hover:bg-primary/10 border border-white/10 shadow-lg",
                        "focus:ring-2 focus:ring-primary/50 active:scale-95"
                    )}
                >
                    <Bell className={cn(
                        "w-5 h-5 transition-all duration-300", 
                        hasPending 
                            ? 'text-primary fill-primary/20 animate-ring' 
                            : 'text-gray-400 group-hover:text-primary'
                    )} />
                    
                    {hasPending && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-[#171717] text-[10px] font-black text-white items-center justify-center shadow-sm">
                                {pendingCount}
                            </span>
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            
            <PopoverContent className="w-80 p-0 bg-[#1c1c1c] border-white/10 shadow-2xl z-[100]" align="end">
                <div className="p-4 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className="text-primary" />
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                            Solicitudes
                        </h3>
                    </div>
                    {hasPending && (
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase">
                            {pendingCount} Nuevas
                        </span>
                    )}
                </div>
                <Separator className="bg-white/5" />
                
                <ScrollArea className="h-[350px]">
                    {pendingRequests.length > 0 ? (
                        <div className="flex flex-col">
                            {pendingRequests.map((req) => (
                                <div 
                                    key={req.id} 
                                    className="p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-1 p-2 rounded-lg bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                                            <FileText size={16} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-[13px] font-bold text-white leading-tight">
                                                Eliminación de Documento
                                            </p>
                                            <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">
                                                {req.document_type} • {req.socio_details?.nombres}
                                            </p>
                                            <div className="flex items-center gap-2 pt-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 px-2 text-[10px] font-bold border-white/10 hover:bg-primary hover:text-white transition-colors"
                                                    asChild
                                                >
                                                    <a href={req.document_link} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink size={12} className="mr-1" /> REVISAR DOC
                                                    </a>
                                                </Button>
                                                <span className="text-[10px] text-gray-500 flex items-center ml-auto font-mono">
                                                    <Clock size={10} className="mr-1" />
                                                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
                            <div className="p-4 rounded-full bg-white/5 mb-4">
                                <Bell className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sin Pendientes</p>
                            <p className="text-xs text-gray-500 mt-1">El sistema está al día</p>
                        </div>
                    )}
                </ScrollArea>
                
                <Separator className="bg-white/5" />
                <div className="p-2">
                    <Button 
                        variant="ghost" 
                        className="w-full text-[11px] font-black text-primary hover:bg-primary/10 uppercase tracking-tighter" 
                        asChild
                    >
                        <Link to="/partner-documents?tab=requests">
                            Gestionar todas las solicitudes
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationBell;
