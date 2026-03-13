'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DollUploadZoneProps {
  onFileSelected: (file: File) => void;
}

export function DollUploadZone({ onFileSelected }: DollUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.match(/^image\/(jpeg|png)$/)) return;
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-colors',
        isDragging ? 'bg-blue-50' : 'bg-[#F5F5F5]'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={onInputChange}
      />
      <div
        className={cn(
          'flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-12 py-16 text-center transition-colors',
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white/60'
        )}
      >
        <div className="rounded-full bg-slate-100 p-4">
          <Upload size={32} className="text-slate-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-700">Upload your doll photo</p>
          <p className="mt-1 text-sm text-slate-500">
            Drag & drop or click to browse
          </p>
          <p className="mt-1 text-xs text-slate-400">JPEG or PNG only</p>
        </div>
      </div>
    </div>
  );
}
