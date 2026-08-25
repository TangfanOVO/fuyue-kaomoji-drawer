import type { KaomojiItem } from "./types.js";
export type KaomojiVariety = "steady" | "balanced" | "fresh";
export declare function selectDiverseKaomoji(ranked: KaomojiItem[], recentValues?: string[], variety?: KaomojiVariety, random?: () => number, now?: number): KaomojiItem | undefined;
