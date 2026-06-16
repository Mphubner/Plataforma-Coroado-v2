import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, folder = 'images', className = '' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 5MB.');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      },
      (error) => {
        console.error('Upload failed:', error);
        setIsUploading(false);
        alert('Erro ao fazer upload da imagem.');
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onChange(downloadURL);
        setIsUploading(false);
      }
    );
  };

  const clearImage = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-white/10 w-full max-w-sm aspect-video bg-black/40 flex items-center justify-center">
          <img src={value} alt="Uploaded preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={clearImage}
              className="rounded-full"
            >
              <X className="w-4 h-4 mr-2" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-sm aspect-video border-2 border-dashed border-white/20 rounded-xl bg-zinc-900/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-zinc-900 hover:border-primary/50 transition-colors relative overflow-hidden"
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-primary">
              <Loader2 className="w-8 h-8 animate-spin" />
              <div className="text-sm font-medium">{Math.round(progress)}%</div>
              <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white/70">Clique para enviar uma foto</p>
                <p className="text-xs text-white/40 mt-1">PNG, JPG ou WEBP até 5MB</p>
              </div>
            </>
          )}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
