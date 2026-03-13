'use client';

import React, { useCallback, useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import type { SidebarClothingItem } from '@/lib/store';
import { useToast } from './Toast';

interface ImproveCutoutPopoverProps {
  item: SidebarClothingItem;
  onSuccess: (blob: Blob) => void;
  onClose: () => void;
}

export function ImproveCutoutPopover({ item, onSuccess, onClose }: ImproveCutoutPopoverProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleImprove = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_REMOVEBG_API_KEY;
    if (!apiKey) {
      toast('No remove.bg API key found. Add NEXT_PUBLIC_REMOVEBG_API_KEY to .env.local', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image_file', item.originalPhotoBlob, 'image.png');
      formData.append('size', 'auto');

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': apiKey },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ errors: [{ title: 'Unknown error' }] }));
        throw new Error(err.errors?.[0]?.title ?? 'remove.bg API error');
      }

      const blob = await response.blob();
      onSuccess(blob);
      toast('Cutout improved!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to improve cutout.', 'error');
      setLoading(false);
    }
  }, [item.originalPhotoBlob, onSuccess, toast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Sparkles size={16} className="text-blue-500" />
          <span className="text-sm font-semibold text-slate-700 flex-1">Improve cutout</span>
          <button onClick={onClose} disabled={loading} className="rounded p-1 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4 flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            This will re-process your photo using remove.bg (~$0.20/image). Results are usually sharper for complex fabrics.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleImprove}
              disabled={loading}
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
