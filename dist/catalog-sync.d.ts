import type { KaomojiCatalogManifest, KaomojiCatalogOptions, KaomojiCatalogSyncState, KaomojiRepository } from "./types.js";
export declare const defaultKaomojiCatalogManifestUrl = "https://raw.githubusercontent.com/TangfanOVO/fuyue-kaomoji-drawer/main/catalog/manifest.json";
export declare const defaultKaomojiCatalogStateStorageKey = "fuyue.kaomoji.catalog.v1";
export declare const defaultKaomojiCatalogCheckIntervalMs: number;
export declare function readKaomojiCatalogSyncState(storageKey?: string): KaomojiCatalogSyncState;
export declare function writeKaomojiCatalogSyncState(state: KaomojiCatalogSyncState, storageKey?: string): void;
export declare function syncKaomojiCatalog(repository: KaomojiRepository, options?: KaomojiCatalogOptions): Promise<{
    manifest: KaomojiCatalogManifest;
    added: number;
    skipped: number;
}>;
export declare function shouldAutomaticallySync(state: KaomojiCatalogSyncState, options?: KaomojiCatalogOptions, now?: number): boolean;
