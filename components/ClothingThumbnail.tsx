'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Pencil, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClothingCategory } from '@/lib/db';
import type { SidebarClothingItem } from '@/lib/store';
import { EraseBrushModal } from './EraseBrushModal';
import { ImproveCutoutPopover } from './ImproveCutoutPopover';

interface ClothingThumbnailProps {
  item: SidebarClothingItem;
  onPlace: () => void;
  onDelete: () => void;
  onUpdateName: (name: string) => void;
  onUpdateCategory: (cat: ClothingCategory) => void;
  onUpdateCutout: (blob: Blob) => void;
}

const CATEGORIES: ClothingCategory[] = ['Hat', 'Top', 'Bottom', 'Shoes', 'Accessory', 'Other'];

export function ClothingThumbnail({
  item,
  onPlace,
  onDelete,
  onUpdateName,
  onUpdateCategory,
  onUpdateCutout,
}: ClothingThumbnailProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const [showEraser, setShowEraser] = useState(false);
  const [showImprove, setShowImprove] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (item.isProcessing || !item.cutoutBlob) return;
    const url = URL.createObjectURL(item.cutoutBlob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.cutoutBlob, item.isProcessing]);

  useEffect(() => {
    setNameValue(item.name);
  }, [item.name]);

  const commitName = useCallback(() => {
    setEditingName(false);
    if (nameValue.trim() && nameValue !== item.name) {
      onUpdateName(nameValue.trim());
    }
  }, [nameValue, item.name, onUpdateName]);

  return (
    <>
      <div
        className="group relative flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 hover:border-slate-300 hover:shadow-sm transition-all"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail image */}
        <div
          className="relative flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden rounded bg-slate-100"
          onClick={!item.isProcessing ? onPlace : undefined}
        >
          {item.isProcessing ? (
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
          ) : blobUrl ? (
            <img
              ref={imgRef}
              src={blobUrl}
              alt={item.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : null}

          {/* Hover overlay with action buttons */}
          {!item.isProcessing && isHovered && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 rounded">
              <button
                title="Edit cutout (erase)"
                onClick={(e) => { e.stopPropagation(); setShowEraser(true); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 hover:bg-slate-100 shadow"
              >
                <Pencil size={14} />
              </button>
              <button
                title="Improve with remove.bg"
                onClick={(e) => { e.stopPropagation(); setShowImprove(true); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 hover:bg-slate-100 shadow"
              >
                <Sparkles size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex items-center gap-1">
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === 'Enter' && commitName()}
              className="flex-1 rounded border border-blue-300 px-1 py-0.5 text-xs outline-none"
            />
          ) : (
            <span
              className="flex-1 truncate text-xs text-slate-700 cursor-pointer hover:text-blue-600"
              title={item.name}
              onClick={() => setEditingName(true)}
            >
              {item.name}
            </span>
          )}
        </div>

        {/* Category + delete */}
        <div className="flex items-center gap-1">
          <select
            value={item.category}
            onChange={(e) => onUpdateCategory(e.target.value as ClothingCategory)}
            className="flex-1 rounded border border-slate-200 bg-white py-0.5 px-1 text-xs text-slate-600 outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {showEraser && (
        <EraseBrushModal
          item={item}
          onSave={(blob) => {
            onUpdateCutout(blob);
            setShowEraser(false);
          }}
          onClose={() => setShowEraser(false)}
        />
      )}

      {showImprove && (
        <ImproveCutoutPopover
          item={item}
          onSuccess={(blob) => {
            onUpdateCutout(blob);
            setShowImprove(false);
          }}
          onClose={() => setShowImprove(false)}
        />
      )}
    </>
  );
}
