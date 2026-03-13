'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Konva from 'konva';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';
import { DollUploadZone } from '@/components/DollUploadZone';
import { CanvasShimmer } from '@/components/CanvasShimmer';
import { Toolbar } from '@/components/Toolbar';
import { ClothingLibrarySidebar } from '@/components/ClothingLibrarySidebar';
import { OutfitsPanel } from '@/components/OutfitsPanel';
import { StoragePanel } from '@/components/StoragePanel';
import { PhotoTipsModal } from '@/components/PhotoTipsModal';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import { useToast } from '@/components/Toast';
import type { SidebarClothingItem } from '@/lib/store';

// OutfitCanvas uses Konva which is SSR-incompatible
const OutfitCanvas = dynamic(
  () => import('@/components/OutfitCanvas').then((m) => m.OutfitCanvas),
  { ssr: false }
);

export default function Home() {
  const {
    canvas,
    isDollProcessing,
    showOutfitsPanel,
    showStoragePanel,
    showTipsModal,
    setDollProcessing,
    setDollCutout,
    clearDoll,
    setSidebarItems,
    setShowOutfitsPanel,
    setShowStoragePanel,
    setShowTipsModal,
  } = useStore();

  const { dollCutoutBlob } = canvas;
  const { removeBackground } = useBackgroundRemoval();
  const { toast } = useToast();
  const stageRef = useRef<Konva.Stage | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 700, height: 600 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Measure canvas container
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Load clothing items from Dexie on mount
  useEffect(() => {
    db.clothingItems.toArray().then((items) => {
      const sidebarItems: SidebarClothingItem[] = items.map((item) => ({
        id: item.id!,
        name: item.name,
        category: item.category,
        cutoutBlob: item.cutoutBlob,
        originalPhotoBlob: item.originalPhotoBlob,
        dateAdded: item.dateAdded,
        isProcessing: false,
      }));
      setSidebarItems(sidebarItems);
    });
  }, [setSidebarItems]);

  // Check first-run tips flag
  useEffect(() => {
    const seen = localStorage.getItem('hasSeenTips');
    if (!seen) {
      setShowTipsModal(true);
    }
  }, [setShowTipsModal]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { undo, redo, canvas: cs, removeLayer } = useStore.getState();
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (ctrl && e.key === 'e') {
        e.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
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
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && cs.selectedInstanceId) {
        // Don't delete when typing in an input
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.tagName === 'SELECT'
        ) return;
        e.preventDefault();
        removeLayer(cs.selectedInstanceId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleDollFile = useCallback(
    async (file: File) => {
      setDollProcessing(true);
      try {
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const cutout = await removeBackground(blob);
        setDollCutout(cutout, blob);
      } catch {
        toast('Background removal failed. Please try another photo.', 'error');
        setDollProcessing(false);
      }
    },
    [removeBackground, setDollCutout, setDollProcessing, toast]
  );

  const handleDismissTips = useCallback(() => {
    localStorage.setItem('hasSeenTips', '1');
    setShowTipsModal(false);
  }, [setShowTipsModal]);

  const showCanvas = !!dollCutoutBlob;
  const showUpload = !isDollProcessing && !showCanvas;
  const showShimmer = isDollProcessing;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* Toolbar */}
      <Toolbar stageRef={stageRef} onReplaceDoll={clearDoll} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas panel */}
        <div
          ref={canvasContainerRef}
          className="relative flex-1 overflow-hidden bg-[#F5F5F5]"
          style={{ minWidth: 0 }}
        >
          {showUpload && <DollUploadZone onFileSelected={handleDollFile} />}
          {showShimmer && <CanvasShimmer />}
          {showCanvas && canvasSize.width > 0 && (
            <OutfitCanvas
              stageRef={stageRef}
              width={canvasSize.width}
              height={canvasSize.height}
            />
          )}
        </div>

        {/* Clothing library sidebar */}
        <div className="w-72 shrink-0 overflow-hidden flex flex-col">
          <ClothingLibrarySidebar />
        </div>
      </div>

      {/* Modals */}
      {showOutfitsPanel && <OutfitsPanel onClose={() => setShowOutfitsPanel(false)} />}
      {showStoragePanel && (
        <StoragePanel
          onClose={() => setShowStoragePanel(false)}
          onShowTips={() => setShowTipsModal(true)}
        />
      )}
      {showTipsModal && <PhotoTipsModal onDismiss={handleDismissTips} />}
    </div>
  );
}
