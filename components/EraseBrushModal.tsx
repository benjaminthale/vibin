'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { SidebarClothingItem } from '@/lib/store';

interface EraseBrushModalProps {
  item: SidebarClothingItem;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

export function EraseBrushModal({ item, onSave, onClose }: EraseBrushModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = URL.createObjectURL(item.cutoutBlob);
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setLoaded(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [item.cutoutBlob]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const erase = useCallback((x: number, y: number, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  }, [brushSize]);

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!canvasRef.current) return;
      setIsDrawing(true);
      const pos = getPos(e, canvasRef.current);
      lastPos.current = pos;
      erase(pos.x, pos.y, canvasRef.current);
    },
    [getPos, erase]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !canvasRef.current) return;
      const pos = getPos(e, canvasRef.current);
      if (lastPos.current) {
        // Draw a line of circles for smooth erase
        const dx = pos.x - lastPos.current.x;
        const dy = pos.y - lastPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.floor(dist / 2));
        for (let i = 0; i <= steps; i++) {
          erase(
            lastPos.current.x + (dx * i) / steps,
            lastPos.current.y + (dy * i) / steps,
            canvasRef.current
          );
        }
      }
      lastPos.current = pos;
    },
    [isDrawing, getPos, erase]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/png');
  }, [onSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-[#222] text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs text-amber-300 font-medium">
              Changes are permanent and cannot be undone.
            </span>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-white/10">
          <span className="text-xs text-white/60">Brush size</span>
          <input
            type="range"
            min={5}
            max={60}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 h-1.5"
          />
          <span className="text-xs text-white/60 w-8 text-right">{brushSize}px</span>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#222]">
          {!loaded && (
            <div className="w-64 h-64 rounded-lg bg-white/10 animate-pulse" />
          )}
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[50vh] rounded cursor-crosshair"
            style={{ display: loaded ? 'block' : 'none', touchAction: 'none' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-white/60 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
