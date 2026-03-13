'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Layers, GripVertical } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function LayerPanel() {
  const { canvas, setSelectedLayer, reorderLayers } = useStore();
  const { layers, selectedInstanceId } = canvas;
  const [isOpen, setIsOpen] = useState(true);

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      reorderLayers(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  }, [reorderLayers]);

  if (layers.length === 0) return null;

  return (
    <div className="border-t border-slate-200">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        onClick={() => setIsOpen((p) => !p)}
      >
        <Layers size={14} />
        <span>Layers ({layers.length})</span>
        <span className="ml-auto text-slate-400">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-px px-2 pb-2">
          {sortedLayers.map((layer, index) => (
            <div
              key={layer.instanceId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => setSelectedLayer(layer.instanceId)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors',
                selectedInstanceId === layer.instanceId
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <GripVertical size={12} className="text-slate-300 shrink-0" />
              <span className="flex-1 truncate">{layer.name}</span>
              <span className="text-slate-300 text-xs">{layer.zIndex}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
