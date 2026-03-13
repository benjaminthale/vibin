'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/db';
import { useStore } from '@/lib/store';
import { useToast } from './Toast';

interface StoragePanelProps {
  onClose: () => void;
  onShowTips: () => void;
}

export function StoragePanel({ onClose, onShowTips }: StoragePanelProps) {
  const [clothingCount, setClothingCount] = useState(0);
  const [outfitCount, setOutfitCount] = useState(0);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const { setSidebarItems, clearDoll } = useStore();
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const [clothing, outfits] = await Promise.all([
        db.clothingItems.count(),
        db.outfits.count(),
      ]);
      setClothingCount(clothing);
      setOutfitCount(outfits);

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStorageBytes(estimate.usage ?? null);
      }
    }
    load();
  }, []);

  const handleClearAll = useCallback(async () => {
    try {
      await db.clothingItems.clear();
      await db.outfits.clear();
      setSidebarItems([]);
      clearDoll();
      toast('All data cleared.', 'info');
      onClose();
    } catch {
      toast('Failed to clear data.', 'error');
    }
  }, [setSidebarItems, clearDoll, toast, onClose]);

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Settings & Storage</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Storage info */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex flex-col gap-1">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Storage</p>
            <div className="flex justify-between text-sm text-slate-700">
              <span>Clothing items</span>
              <span className="font-medium">{clothingCount}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-700">
              <span>Saved outfits</span>
              <span className="font-medium">{outfitCount}</span>
            </div>
            {storageBytes !== null && (
              <div className="flex justify-between text-sm text-slate-700">
                <span>Approx. usage</span>
                <span className="font-medium">{formatBytes(storageBytes)}</span>
              </div>
            )}
          </div>

          {/* Tips */}
          <button
            onClick={() => { onClose(); onShowTips(); }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
          >
            Show photography tips again
          </button>

          {/* Danger zone */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Danger Zone</p>
            {confirmClear ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">This will delete ALL clothing items and outfits. This cannot be undone.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearAll}
                    className="flex-1 rounded bg-red-600 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Yes, clear everything
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 rounded bg-white border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="rounded bg-red-100 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
              >
                Clear all data…
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
