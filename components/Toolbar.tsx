'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  Undo2, Redo2, Download, Save, FolderOpen, Settings, ArrowUp, ArrowDown,
  X, RefreshCw
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import Konva from 'konva';
import { db } from '@/lib/db';
import { useToast } from './Toast';

interface ToolbarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  onReplaceDoll: () => void;
}

export function Toolbar({ stageRef, onReplaceDoll }: ToolbarProps) {
  const {
    canvas,
    past,
    future,
    undo,
    redo,
    moveLayerForward,
    moveLayerBackward,
    removeLayer,
    setShowOutfitsPanel,
    setShowStoragePanel,
    setShowTipsModal,
    isSavingOutfit,
    setIsSavingOutfit,
    saveOutfitName,
    setSaveOutfitName,
  } = useStore();

  const { selectedInstanceId, dollCutoutBlob, layers } = canvas;
  const { toast } = useToast();
  const saveInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Hide transformer temporarily during export
    const transformers = stage.find('Transformer');
    transformers.forEach((t) => t.hide());
    stage.batchDraw();

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `outfit-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    transformers.forEach((t) => t.show());
    stage.batchDraw();
  }, [stageRef]);

  const handleSaveOutfit = useCallback(async () => {
    if (!dollCutoutBlob) {
      toast('Upload a doll photo first.', 'warning');
      return;
    }
    if (!saveOutfitName.trim()) {
      saveInputRef.current?.focus();
      return;
    }
    try {
      await db.outfits.add({
        name: saveOutfitName.trim(),
        created: new Date(),
        dollPhotoBlob: dollCutoutBlob,
        layers: layers.map((l) => ({
          id: l.instanceId,
          clothingItemId: l.clothingItemId,
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          rotation: l.rotation,
          zIndex: l.zIndex,
        })),
      });
      setSaveOutfitName('');
      setIsSavingOutfit(false);
      toast('Outfit saved!', 'success');
    } catch {
      toast('Failed to save outfit.', 'error');
    }
  }, [dollCutoutBlob, layers, saveOutfitName, setSaveOutfitName, setIsSavingOutfit, toast]);

  const hasDoll = !!dollCutoutBlob;
  const hasSelected = !!selectedInstanceId;

  return (
    <div className="flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-3 shrink-0">
      {/* Left group */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={<Undo2 size={16} />}
          label="Undo"
          disabled={past.length === 0}
          onClick={undo}
          shortcut="⌘Z"
        />
        <ToolbarButton
          icon={<Redo2 size={16} />}
          label="Redo"
          disabled={future.length === 0}
          onClick={redo}
          shortcut="⌘⇧Z"
        />
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Layer controls */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={<ArrowUp size={16} />}
          label="Bring forward"
          disabled={!hasSelected}
          onClick={() => selectedInstanceId && moveLayerForward(selectedInstanceId)}
        />
        <ToolbarButton
          icon={<ArrowDown size={16} />}
          label="Send backward"
          disabled={!hasSelected}
          onClick={() => selectedInstanceId && moveLayerBackward(selectedInstanceId)}
        />
        {hasSelected && (
          <ToolbarButton
            icon={<X size={16} />}
            label="Delete selected"
            className="text-red-500 hover:bg-red-50"
            onClick={() => selectedInstanceId && removeLayer(selectedInstanceId)}
          />
        )}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Save outfit */}
      {isSavingOutfit ? (
        <div className="flex items-center gap-2">
          <input
            ref={saveInputRef}
            autoFocus
            value={saveOutfitName}
            onChange={(e) => setSaveOutfitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveOutfit();
              if (e.key === 'Escape') { setIsSavingOutfit(false); setSaveOutfitName(''); }
            }}
            placeholder="Outfit name…"
            className="h-7 rounded border border-slate-300 px-2 text-sm outline-none focus:border-blue-400 w-36"
          />
          <button
            onClick={handleSaveOutfit}
            disabled={!saveOutfitName.trim()}
            className="h-7 rounded bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Save
          </button>
          <button
            onClick={() => { setIsSavingOutfit(false); setSaveOutfitName(''); }}
            className="h-7 rounded px-2 text-xs text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      ) : (
        <ToolbarButton
          icon={<Save size={16} />}
          label="Save outfit"
          disabled={!hasDoll}
          onClick={() => setIsSavingOutfit(true)}
        />
      )}

      <ToolbarButton
        icon={<FolderOpen size={16} />}
        label="Outfits"
        onClick={() => setShowOutfitsPanel(true)}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right group */}
      <div className="flex items-center gap-1">
        {hasDoll && (
          <ToolbarButton
            icon={<RefreshCw size={16} />}
            label="Replace doll photo"
            onClick={onReplaceDoll}
          />
        )}
        <ToolbarButton
          icon={<Download size={16} />}
          label="Export PNG"
          disabled={!hasDoll}
          onClick={handleExport}
          shortcut="⌘E"
        />
        <ToolbarButton
          icon={<Settings size={16} />}
          label="Settings"
          onClick={() => setShowStoragePanel(true)}
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  shortcut?: string;
  className?: string;
}

function ToolbarButton({ icon, label, disabled, onClick, shortcut, className }: ToolbarButtonProps) {
  return (
    <button
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
        className
      )}
    >
      {icon}
    </button>
  );
}
