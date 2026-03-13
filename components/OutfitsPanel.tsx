'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { db, type Outfit } from '@/lib/db';
import { useStore, type CanvasClothingLayer, type CanvasState } from '@/lib/store';
import { useToast } from './Toast';

interface OutfitsPanelProps {
  onClose: () => void;
}

export function OutfitsPanel({ onClose }: OutfitsPanelProps) {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const { sidebarItems, loadOutfitState, setSelectedLayer } = useStore();
  const { toast } = useToast();

  useEffect(() => {
    db.outfits.toArray().then((items) => {
      setOutfits(items.sort((a, b) => b.created.getTime() - a.created.getTime()));
      setLoading(false);
    });
  }, []);

  const handleLoad = useCallback(
    async (outfit: Outfit) => {
      const layers: CanvasClothingLayer[] = [];
      let missingItems = false;

      for (const l of outfit.layers) {
        const item = sidebarItems.find((s) => s.id === l.clothingItemId);
        if (!item) {
          missingItems = true;
          continue;
        }
        layers.push({
          instanceId: `${l.id}-loaded-${Date.now()}`,
          clothingItemId: l.clothingItemId,
          name: item.name,
          cutoutBlob: item.cutoutBlob,
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          rotation: l.rotation,
          zIndex: l.zIndex,
        });
      }

      const state: CanvasState = {
        dollCutoutBlob: outfit.dollPhotoBlob,
        dollOriginalBlob: outfit.dollPhotoBlob,
        layers,
        selectedInstanceId: null,
      };

      loadOutfitState(state);
      setSelectedLayer(null);

      if (missingItems) {
        toast('Some clothing items were no longer available.', 'warning');
      } else {
        toast('Outfit loaded!', 'success');
      }

      onClose();
    },
    [sidebarItems, loadOutfitState, setSelectedLayer, toast, onClose]
  );

  const handleDelete = useCallback(async (id: number) => {
    await db.outfits.delete(id);
    setOutfits((prev) => prev.filter((o) => o.id !== id));
    toast('Outfit deleted.', 'info');
  }, [toast]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Saved Outfits</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : outfits.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">No saved outfits yet.</p>
              <p className="mt-1 text-xs text-slate-400">Create an outfit and save it to see it here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {outfits.map((outfit) => (
                <OutfitRow
                  key={outfit.id}
                  outfit={outfit}
                  onLoad={() => handleLoad(outfit)}
                  onDelete={() => outfit.id && handleDelete(outfit.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OutfitRow({
  outfit,
  onLoad,
  onDelete,
}: {
  outfit: Outfit;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(outfit.dollPhotoBlob);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [outfit.dollPhotoBlob]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
      {thumbUrl && (
        <img src={thumbUrl} alt={outfit.name} className="h-14 w-14 rounded object-contain bg-slate-100 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-slate-700">{outfit.name}</p>
        <p className="text-xs text-slate-400">
          {outfit.created.toLocaleDateString()} · {outfit.layers.length} layers
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onLoad}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
        >
          Load
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
