import manifestData from '../assets/vehicleManifest.json';
import type { VehicleDefinition } from './types';

export interface VehicleCatalog {
  vehicles: VehicleDefinition[];
  burnt: Record<string, string>;
}

class SpriteCache {
  private images: Map<string, HTMLImageElement> = new Map();
  private loaded: boolean = false;
  private catalog: VehicleCatalog;

  constructor() {
    this.catalog = manifestData as unknown as VehicleCatalog;
  }

  public getCatalog(): VehicleCatalog {
    return this.catalog;
  }

  public async preloadAll(): Promise<void> {
    if (this.loaded) return;

    const urls = new Set<string>();

    // Add all frames
    for (const v of this.catalog.vehicles) {
      for (const f of v.frames) {
        urls.add(f);
      }
    }

    // Add burnt wreckages
    for (const k in this.catalog.burnt) {
      urls.add(this.catalog.burnt[k]);
    }

    const promises = Array.from(urls).map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          this.images.set(url, img);
          resolve();
        };
        img.onerror = () => {
          // Resolve anyway so game doesn't hang
          resolve();
        };
      });
    });

    await Promise.all(promises);
    this.loaded = true;
  }

  public getImage(url: string): HTMLImageElement | null {
    const cached = this.images.get(url);
    if (cached && cached.complete) return cached;
    if (!this.images.has(url)) {
      const img = new Image();
      img.src = url;
      this.images.set(url, img);
      return img;
    }
    return cached || null;
  }

  public getBurntImage(vehicleCategoryOrId: string): HTMLImageElement | null {
    // Map to burnt key
    const clean = vehicleCategoryOrId.toLowerCase();
    const url = this.catalog.burnt[clean] || this.catalog.burnt['sport'] || this.catalog.burnt['sedan'];
    if (url) {
      return this.getImage(url);
    }
    return null;
  }
}

export const spriteCache = new SpriteCache();
