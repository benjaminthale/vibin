'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useStore, type SidebarClothingItem, type CanvasClothingLayer } from '@/lib/store';
import { db, type ClothingCategory } from '@/lib/db';
import { cn } from '@/lib/utils';
import { ClothingThumbnail } from './ClothingThumbnail';
import { LayerPanel } from './LayerPanel';
import { useToast } from './Toast';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';

const CATEGORIES: (ClothingCategory | 'All')[] = ['All', 'Hat', 'Top', 'Bottom', 'Shoes', 'Accessory', 'Other'];

export function ClothingLibrarySidebar() {
  const {
    sidebarItems,
    searchQuery,
    categoryFilter,
    canvas,
    addSidebarItem,
    updateSidebarItem,
    removeSidebarItem,
    setSearchQuery,
    setCategoryFilter,
    addLayer,
  } = useStore();

  const { toast } = useToast();
  const { removeBackground } = useBackgroundRemoval();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList) => {
      const validFiles = Array.from(files).filter((f) => f.type.match(/^image\/(jpeg|png)$/));
      if (!validFiles.length) return;

      // Process each file in parallel with its own "processing" placeholder
      await Promise.all(
        validFiles.map(async (file) => {
          const tempId = Date.now() + Math.random();
          const originalBlob = new Blob([await file.arrayBuffer()], { type: file.type });
          const baseName = file.name.replace(/\.[^.]+$/, '');

          // Add placeholder
          const placeholder: SidebarClothingItem = {
            id: tempId as unknown as number,
            name: baseName,
            category: 'Other',
            cutoutBlob: new Blob(),
            originalPhotoBlob: originalBlob,
            dateAdded: new Date(),
            isProcessing: true,
          };
          addSidebarItem(placeholder);

          try {
            const cutoutBlob = await removeBackground(originalBlob);

            // Save to Dexie
            const id = await db.clothingItems.add({
              name: baseName,
              category: 'Other',
              cutoutBlob,
              originalPhotoBlob: originalBlob,
              dateAdded: new Date(),
            });

            updateSidebarItem(tempId as unknown as number, {
              id,
              cutoutBlob,
              isProcessing: false,
            });
          } catch (err) {
            toast(`Failed to process ${baseName}`, 'error');
            removeSidebarItem(tempId as unknown as number);
          }
        })
      );
    },
    [addSidebarItem, updateSidebarItem, removeSidebarItem, removeBackground, toast]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleUpload(e.target.files);
        e.target.value = '';
      }
    },
    [handleUpload]
  );

  const handlePlace = useCallback(
    (item: SidebarClothingItem, stageWidth = 700, stageHeight = 600) => {
      const defaultH = stageHeight * 0.4;
      const layer: CanvasClothingLayer = {
        instanceId: `${item.id}-${Date.now()}`,
        clothingItemId: item.id,
        name: item.name,
        cutoutBlob: item.cutoutBlob,
        x: (stageWidth - defaultH * 0.75) / 2,
        y: (stageHeight - defaultH) / 2,
        width: defaultH * 0.75,
        height: defaultH,
        rotation: 0,
        zIndex: canvas.layers.length,
      };
      addLayer(layer);
    },
    [canvas.layers.length, addLayer]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await db.clothingItems.delete(id);
        removeSidebarItem(id);
        toast('Item deleted.', 'info');
      } catch {
        toast('Failed to delete item.', 'error');
      }
    },
    [removeSidebarItem, toast]
  );

  const handleUpdateName = useCallback(
    async (id: number, name: string) => {
      try {
        await db.clothingItems.update(id, { name });
        updateSidebarItem(id, { name });
      } catch {
        toast('Failed to update name.', 'error');
      }
    },
    [updateSidebarItem, toast]
  );

  const handleUpdateCategory = useCallback(
    async (id: number, category: ClothingCategory) => {
      try {
        await db.clothingItems.update(id, { category });
        updateSidebarItem(id, { category });
      } catch {
        toast('Failed to update category.', 'error');
      }
    },
    [updateSidebarItem, toast]
  );

  const handleUpdateCutout = useCallback(
    async (id: number, blob: Blob) => {
      try {
        await db.clothingItems.update(id, { cutoutBlob: blob });
        updateSidebarItem(id, { cutoutBlob: blob });
        toast('Cutout updated!', 'success');
      } catch {
        toast('Failed to update cutout.', 'error');
      }
    },
    [updateSidebarItem, toast]
  );

  // Filter items
  const filtered = sidebarItems.filter((item) => {
    const matchName = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchName && matchCat;
  });

  return (
    <div className="flex h-full flex-col bg-slate-50 border-l border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 shrink-0">
        <span className="text-sm font-semibold text-slate-700 flex-1">Clothing Library</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          Add item
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Search */}
      <div className="px-3 pt-2 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clothing…"
            className="w-full rounded border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-300"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1 px-3 py-2 shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
              categoryFilter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-full bg-slate-200 p-3">
              <Plus size={24} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              {sidebarItems.length === 0
                ? 'Add your first clothing item'
                : 'No items match your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((item) => (
              <ClothingThumbnail
                key={item.id}
                item={item}
                onPlace={() => handlePlace(item)}
                onDelete={() => handleDelete(item.id)}
                onUpdateName={(name) => handleUpdateName(item.id, name)}
                onUpdateCategory={(cat) => handleUpdateCategory(item.id, cat)}
                onUpdateCutout={(blob) => handleUpdateCutout(item.id, blob)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Layer panel at bottom */}
      <LayerPanel />
    </div>
  );
}
