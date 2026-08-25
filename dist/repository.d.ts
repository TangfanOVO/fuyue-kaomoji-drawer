import type { KaomojiItem, KaomojiRepository } from "./types.js";
export type StoredKaomojiState = {
    version: 2;
    items: KaomojiItem[];
    removed: string[];
};
export declare function normalizeKaomoji(value: string): string;
export declare function analyzeKaomoji(value: string): {
    value: string;
    compatibility: "stable" | "limited" | "blocked";
    compatibilityNotes: string[];
    safeValue: string | undefined;
};
export declare function defaultKaomojiItems(): KaomojiItem[];
export declare function decodeKaomojiState(value: unknown): StoredKaomojiState;
export declare function hydrateKaomojiState(state: StoredKaomojiState): StoredKaomojiState;
export declare function createLocalKaomojiRepository(storageKey?: string): KaomojiRepository;
