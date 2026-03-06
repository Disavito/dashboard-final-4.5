import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud } from 'lucide-react';

// Definimos estrictamente qué tipos se pueden subir manualmente
export type ManualDocumentType = 'Planos de ubicación' | 'Memoria descriptiva';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  socioId: string | null | undefined;
  socioName: string;
  documentType: ManualDocumentType | null; // Restringido a tipos manuales
  onUploadSuccess: () => void;
}

export function UploadDocumentModal({
  isOpen,
  onOpenChange,
  socioId,
  socioName,
  documentType,
  onUploadSuccess,
}: UploadDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !socioId || !documentType) {
      toast.warning('Por favor, selecciona un archivo para subir.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Subiendo "${documentType}"...`, {
      description: `Adjuntando archivo para ${socioName}.`,
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa.');

      // Determinar bucket
      const bucketName = documentType === 'Planos de ubicación' ? 'planos' : 'memoria-descriptiva';
      const filePath = `${socioId}/${Date.now()}-${selectedFile.name}`;

      // Subida a Storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, selectedFile);

      if (uploadError) throw new Error(`Error en Storage: ${uploadError.message}`);

      // URL Pública
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Registro en DB
      const { error: dbError } = await supabase
        .from('socio_documentos')
        .upsert(
          {
            socio_id: socioId,
            tipo_documento: documentType,
            link_documento: publicUrl,
          },
          { onConflict: 'socio_id, tipo_documento' }
        );

      if (dbError) throw dbError;

      toast.success(`Documento subido con éxito!`, { id: toastId });
      onUploadSuccess();
      onOpenChange(false);
      setSelectedFile(null);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error al subir el documento', {
        id: toastId,
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-3">
            <UploadCloud className="h-6 w-6" />
            Subir Documento Manual
          </DialogTitle>
          <DialogDescription className="text-textSecondary pt-1">
            Estás subiendo el documento de <span className="font-semibold text-accent">{documentType}</span> para el socio <span className="font-semibold text-accent">{socioName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="document-file" className="text-text">Archivo (PDF o Imagen)</Label>
            <Input
              id="document-file"
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="file:text-primary file:font-semibold hover:file:bg-primary/10"
              disabled={isUploading}
            />
            {selectedFile && <p className="text-sm text-textSecondary mt-2">Seleccionado: {selectedFile.name}</p>}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
            >
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar y Subir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
