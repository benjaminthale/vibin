import Dexie, { type Table } from 'dexie';

export type ClothingCategory = 'Hat' | 'Top' | 'Bottom' | 'Shoes' | 'Accessory' | 'Other';

export interface ClothingLayer {
  id: string;
  clothingItemId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface Outfit {
  id?: number;
  name: string;
  created: Date;
  dollPhotoBlob: Blob;
  layers: ClothingLayer[];
}

export interface ClothingItem {
  id?: number;
  name: string;
  category: ClothingCategory;
  cutoutBlob: Blob;
  originalPhotoBlob: Blob;
  dateAdded: Date;
}

class OutfitDesignerDB extends Dexie {
  outfits!: Table<Outfit, number>;
  clothingItems!: Table<ClothingItem, number>;

  constructor() {
    super('OutfitDesignerDB');
    this.version(1).stores({
      outfits: '++id, name, created',
      clothingItems: '++id, name, category, dateAdded',
    });
  }
}

export const db = new OutfitDesignerDB();
