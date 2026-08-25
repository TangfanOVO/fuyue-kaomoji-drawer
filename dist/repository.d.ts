import type { KaomojiRepository } from "./types.js";
export declare function normalizeKaomoji(value: string): string;
export declare function analyzeKaomoji(value: string): {
    value: string;
    compatibility: "stable" | "limited" | "blocked";
    compatibilityNotes: string[];
    safeValue: string | undefined;
};
export declare function createLocalKaomojiRepository(storageKey?: string): KaomojiRepository;
