import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { PersistStorage, StorageValue } from "zustand/middleware";

/** zustand `persist` adapter backed by IndexedDB via idb-keyval. */
export function createIdbStorage<T>(): PersistStorage<T> {
  return {
    async getItem(name: string): Promise<StorageValue<T> | null> {
      const v = await idbGet(name);
      if (!v) return null;
      try {
        return JSON.parse(v as string) as StorageValue<T>;
      } catch {
        return null;
      }
    },
    async setItem(name: string, value: StorageValue<T>) {
      await idbSet(name, JSON.stringify(value));
    },
    async removeItem(name: string) {
      await idbDel(name);
    },
  };
}
