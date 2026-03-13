import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ClothingCategory, ClothingItem } from './db';

export interface CanvasClothingLayer {
  instanceId: string;
  clothingItemId: number;
  name: string;
  cutoutBlob: Blob;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface CanvasState {
  dollCutoutBlob: Blob | null;
  dollOriginalBlob: Blob | null;
  layers: CanvasClothingLayer[];
  selectedInstanceId: string | null;
}

export interface SidebarClothingItem {
  id: number;
  name: string;
  category: ClothingCategory;
  cutoutBlob: Blob;
  originalPhotoBlob: Blob;
  dateAdded: Date;
  isProcessing?: boolean;
}

type HistoryEntry = CanvasState;

interface AppStore {
  // Canvas state
  canvas: CanvasState;

  // History
  past: HistoryEntry[];
  future: HistoryEntry[];

  // Sidebar clothing library
  sidebarItems: SidebarClothingItem[];
  searchQuery: string;
  categoryFilter: ClothingCategory | 'All';

  // UI state
  isDollProcessing: boolean;
  showOutfitsPanel: boolean;
  showStoragePanel: boolean;
  showTipsModal: boolean;
  saveOutfitName: string;
  isSavingOutfit: boolean;

  // Actions
  setDollProcessing: (v: boolean) => void;
  setDollCutout: (cutoutBlob: Blob, originalBlob: Blob) => void;
  clearDoll: () => void;

  addLayer: (layer: CanvasClothingLayer) => void;
  updateLayer: (instanceId: string, updates: Partial<CanvasClothingLayer>) => void;
  removeLayer: (instanceId: string) => void;
  setSelectedLayer: (instanceId: string | null) => void;
  moveLayerForward: (instanceId: string) => void;
  moveLayerBackward: (instanceId: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  setSidebarItems: (items: SidebarClothingItem[]) => void;
  addSidebarItem: (item: SidebarClothingItem) => void;
  updateSidebarItem: (id: number, updates: Partial<SidebarClothingItem>) => void;
  removeSidebarItem: (id: number) => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: ClothingCategory | 'All') => void;

  setShowOutfitsPanel: (v: boolean) => void;
  setShowStoragePanel: (v: boolean) => void;
  setShowTipsModal: (v: boolean) => void;
  setSaveOutfitName: (name: string) => void;
  setIsSavingOutfit: (v: boolean) => void;

  loadOutfitState: (canvas: CanvasState) => void;
}

function snapshotCanvas(canvas: CanvasState): HistoryEntry {
  return {
    ...canvas,
    layers: canvas.layers.map((l) => ({ ...l })),
  };
}

export const useStore = create<AppStore>()(
  immer((set, get) => ({
    canvas: {
      dollCutoutBlob: null,
      dollOriginalBlob: null,
      layers: [],
      selectedInstanceId: null,
    },
    past: [],
    future: [],
    sidebarItems: [],
    searchQuery: '',
    categoryFilter: 'All',
    isDollProcessing: false,
    showOutfitsPanel: false,
    showStoragePanel: false,
    showTipsModal: false,
    saveOutfitName: '',
    isSavingOutfit: false,

    setDollProcessing: (v) => set((s) => { s.isDollProcessing = v; }),

    setDollCutout: (cutoutBlob, originalBlob) =>
      set((s) => {
        s.canvas.dollCutoutBlob = cutoutBlob;
        s.canvas.dollOriginalBlob = originalBlob;
        s.isDollProcessing = false;
      }),

    clearDoll: () =>
      set((s) => {
        s.canvas.dollCutoutBlob = null;
        s.canvas.dollOriginalBlob = null;
        s.canvas.layers = [];
        s.canvas.selectedInstanceId = null;
        s.past = [];
        s.future = [];
      }),

    pushHistory: () =>
      set((s) => {
        s.past.push(snapshotCanvas(s.canvas));
        s.future = [];
      }),

    addLayer: (layer) =>
      set((s) => {
        s.past.push(snapshotCanvas(s.canvas));
        s.future = [];
        s.canvas.layers.push(layer);
        s.canvas.selectedInstanceId = layer.instanceId;
      }),

    updateLayer: (instanceId, updates) =>
      set((s) => {
        const idx = s.canvas.layers.findIndex((l: CanvasClothingLayer) => l.instanceId === instanceId);
        if (idx !== -1) {
          Object.assign(s.canvas.layers[idx], updates);
        }
      }),

    removeLayer: (instanceId) =>
      set((s) => {
        s.past.push(snapshotCanvas(s.canvas));
        s.future = [];
        s.canvas.layers = s.canvas.layers.filter((l: CanvasClothingLayer) => l.instanceId !== instanceId);
        if (s.canvas.selectedInstanceId === instanceId) {
          s.canvas.selectedInstanceId = null;
        }
      }),

    setSelectedLayer: (instanceId) =>
      set((s) => { s.canvas.selectedInstanceId = instanceId; }),

    moveLayerForward: (instanceId) =>
      set((s) => {
        s.past.push(snapshotCanvas(s.canvas));
        s.future = [];
        const layers = s.canvas.layers as CanvasClothingLayer[];
        const idx = layers.findIndex((l: CanvasClothingLayer) => l.instanceId === instanceId);
        if (idx === -1) return;
        const maxZ = Math.max(...layers.map((l: CanvasClothingLayer) => l.zIndex));
        if (layers[idx].zIndex < maxZ) {
          const above = layers
            .filter((l: CanvasClothingLayer) => l.zIndex > layers[idx].zIndex)
            .sort((a: CanvasClothingLayer, b: CanvasClothingLayer) => a.zIndex - b.zIndex)[0];
          if (above) {
            const tmp = layers[idx].zIndex;
            layers[idx].zIndex = above.zIndex;
            above.zIndex = tmp;
          }
        }
      }),

    moveLayerBackward: (instanceId) =>
      set((s) => {
        s.past.push(snapshotCanvas(s.canvas));
        s.future = [];
        const layers = s.canvas.layers as CanvasClothingLayer[];
        const idx = layers.findIndex((l: CanvasClothingLayer) => l.instanceId === instanceId);
        if (idx === -1) return;
        const minZ = Math.min(...layers.map((l: CanvasClothingLayer) => l.zIndex));
        if (layers[idx].zIndex > minZ) {
          const below = layers
            .filter((l: CanvasClothingLayer) => l.zIndex < layers[idx].zIndex)
            .sort((a: CanvasClothingLayer, b: CanvasClothingLayer) => b.zIndex - a.zIndex)[0];
          if (below) {
            const tmp = layers[idx].zIndex;
            layers[idx].zIndex = below.zIndex;
            below.zIndex = tmp;
          }
        }
      }),

    reorderLayers: (fromIndex, toIndex) =>
      set((s) => {
        s.past.push(snapshotCanvas(s.canvas));
        s.future = [];
        const sorted = [...s.canvas.layers].sort(
          (a: CanvasClothingLayer, b: CanvasClothingLayer) => b.zIndex - a.zIndex
        );
        const [moved] = sorted.splice(fromIndex, 1);
        sorted.splice(toIndex, 0, moved);
        const maxZ = sorted.length - 1;
        sorted.forEach((layer: CanvasClothingLayer, i: number) => {
          const target = s.canvas.layers.find(
            (l: CanvasClothingLayer) => l.instanceId === layer.instanceId
          );
          if (target) target.zIndex = maxZ - i;
        });
      }),

    undo: () =>
      set((s) => {
        if (s.past.length === 0) return;
        const prev = s.past[s.past.length - 1];
        s.future.unshift(snapshotCanvas(s.canvas));
        s.past = s.past.slice(0, -1);
        s.canvas = { ...prev, layers: prev.layers.map((l: CanvasClothingLayer) => ({ ...l })) };
      }),

    redo: () =>
      set((s) => {
        if (s.future.length === 0) return;
        const next = s.future[0];
        s.past.push(snapshotCanvas(s.canvas));
        s.future = s.future.slice(1);
        s.canvas = { ...next, layers: next.layers.map((l: CanvasClothingLayer) => ({ ...l })) };
      }),

    setSidebarItems: (items) => set((s) => { s.sidebarItems = items as SidebarClothingItem[]; }),
    addSidebarItem: (item) => set((s) => { s.sidebarItems.push(item as SidebarClothingItem); }),
    updateSidebarItem: (id, updates) =>
      set((s) => {
        const idx = s.sidebarItems.findIndex((i: SidebarClothingItem) => i.id === id);
        if (idx !== -1) Object.assign(s.sidebarItems[idx], updates);
      }),
    removeSidebarItem: (id) =>
      set((s) => { s.sidebarItems = s.sidebarItems.filter((i: SidebarClothingItem) => i.id !== id); }),

    setSearchQuery: (q) => set((s) => { s.searchQuery = q; }),
    setCategoryFilter: (c) => set((s) => { s.categoryFilter = c; }),

    setShowOutfitsPanel: (v) => set((s) => { s.showOutfitsPanel = v; }),
    setShowStoragePanel: (v) => set((s) => { s.showStoragePanel = v; }),
    setShowTipsModal: (v) => set((s) => { s.showTipsModal = v; }),
    setSaveOutfitName: (name) => set((s) => { s.saveOutfitName = name; }),
    setIsSavingOutfit: (v) => set((s) => { s.isSavingOutfit = v; }),

    loadOutfitState: (canvas) =>
      set((s) => {
        s.canvas = canvas;
        s.past = [];
        s.future = [];
      }),
  }))
);
