import { useState } from 'react';
import { 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  FileSpreadsheet, 
  FileText, 
  FileJson, 
  Download, 
  Settings2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExportSociosDialogProps {
  data: any[];
  onClose: () => void;
}

const EXPORT_FIELDS = [
  { id: 'dni', label: 'DNI', category: 'Básico' },
  { id: 'fullName', label: 'Nombre Completo', category: 'Básico' },
  { id: 'localidad', label: 'Comunidad/Localidad', category: 'Básico' },
  { id: 'mz_lt', label: 'Manzana y Lote', category: 'Básico' },
  { id: 'receiptNumber', label: 'N° de Recibo', category: 'Financiero' },
  { id: 'status', label: 'Estado de Pago', category: 'Financiero' },
  { id: 'has_planos', label: 'Planos', category: 'Documentos' },
  { id: 'has_memoria', label: 'Memoria Descriptiva', category: 'Documentos' },
  { id: 'has_ficha', label: 'Ficha Técnica', category: 'Documentos' },
  { id: 'has_contrato', label: 'Contrato', category: 'Documentos' },
];

export default function ExportSociosDialog({ data, onClose }: ExportSociosDialogProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['dni', 'fullName', 'localidad', 'receiptNumber']);
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId) 
        : [...prev, fieldId]
    );
  };

  const prepareData = () => {
    return data.map(item => {
      const row: any = {};
      if (selectedFields.includes('dni')) row['DNI'] = item.dni;
      if (selectedFields.includes('fullName')) row['Socio'] = `${item.nombres} ${item.apellidoPaterno} ${item.apellidoMaterno}`;
      if (selectedFields.includes('localidad')) row['Localidad'] = item.localidad;
      if (selectedFields.includes('mz_lt')) row['Ubicación'] = `Mz: ${item.mz || '-'} Lt: ${item.lote || '-'}`;
      if (selectedFields.includes('receiptNumber')) row['N° Recibo'] = item.receiptNumber;
      if (selectedFields.includes('status')) row['Estado'] = item.status;
      
      if (selectedFields.includes('has_planos')) row['Planos'] = item.has_planos ? 'SÍ' : 'NO';
      if (selectedFields.includes('has_memoria')) row['Memoria'] = item.has_memoria ? 'SÍ' : 'NO';
      if (selectedFields.includes('has_ficha')) row['Ficha'] = item.has_ficha ? 'SÍ' : 'NO';
      if (selectedFields.includes('has_contrato')) row['Contrato'] = item.has_contrato ? 'SÍ' : 'NO';
      
      return row;
    });
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Selecciona al menos un campo para exportar');
      return;
    }

    setIsExporting(true);
    const exportData = prepareData();
    const fileName = `reporte_socios_${new Date().toISOString().split('T')[0]}`;

    try {
      if (format === 'xlsx' || format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Socios");
        
        if (format === 'xlsx') {
          XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } else {
          XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' });
        }
      } else if (format === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' });
        
        doc.setFontSize(18);
        doc.text('Reporte Detallado de Socios', 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);

        autoTable(doc, {
          startY: 35,
          head: [Object.keys(exportData[0])],
          body: exportData.map(row => Object.values(row)),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [158, 127, 255], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 249, 252] },
        });

        doc.save(`${fileName}.pdf`);
      }
      
      toast.success('Exportación completada con éxito');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el archivo');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8">
      <DialogHeader className="mb-8">
        <div className="w-12 h-12 bg-[#9E7FFF]/10 rounded-2xl flex items-center justify-center mb-4">
          <Settings2 className="h-6 w-6 text-[#9E7FFF]" />
        </div>
        <DialogTitle className="text-2xl font-black text-gray-900">Configurar Exportación</DialogTitle>
        <DialogDescription className="text-gray-500 font-medium">
          Selecciona los campos y el formato que deseas para tu reporte.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { id: 'csv', label: 'CSV', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { id: 'pdf', label: 'PDF', icon: FileJson, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id as any)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 relative",
                format === f.id 
                  ? "border-[#9E7FFF] bg-[#9E7FFF]/5 shadow-sm" 
                  : "border-gray-100 hover:border-gray-200 bg-white"
              )}
            >
              <div className={cn("p-2 rounded-xl", f.bg)}>
                <f.icon className={cn("h-6 w-6", f.color)} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-gray-700">{f.label}</span>
              {format === f.id && <CheckCircle2 className="h-4 w-4 text-[#9E7FFF] absolute top-2 right-2" />}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {['Básico', 'Financiero', 'Documentos'].map((category) => (
            <div key={category} className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100"></div>
                {category}
                <div className="h-px flex-1 bg-gray-100"></div>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EXPORT_FIELDS.filter(f => f.category === category).map((field) => (
                  <div 
                    key={field.id} 
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-xl border transition-colors cursor-pointer",
                      selectedFields.includes(field.id) ? "border-[#9E7FFF]/30 bg-[#9E7FFF]/5" : "border-gray-100 hover:bg-gray-50"
                    )}
                    onClick={() => toggleField(field.id)}
                  >
                    <Checkbox 
                      id={field.id} 
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                      className="data-[state=checked]:bg-[#9E7FFF] data-[state=checked]:border-[#9E7FFF]"
                    />
                    <Label htmlFor={field.id} className="text-sm font-bold text-gray-700 cursor-pointer flex-1">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter className="mt-10 gap-3">
        <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold text-gray-500">
          Cancelar
        </Button>
        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="bg-[#9E7FFF] hover:bg-[#8B6EEF] text-white rounded-xl font-bold px-8 h-12 shadow-lg shadow-[#9E7FFF]/20"
        >
          {isExporting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
          ) : (
            <><Download className="mr-2 h-4 w-4" /> Descargar Reporte</>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
