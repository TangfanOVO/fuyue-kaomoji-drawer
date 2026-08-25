import type { KaomojiCatalogOptions, KaomojiRepository } from "./types.js";
type StandaloneTarget = Element | string;
export type StandaloneMountOptions = {
    input?: HTMLInputElement | HTMLTextAreaElement | string;
    onInsert?: (value: string) => void;
    repository?: KaomojiRepository;
    storageKey?: string;
    title?: string;
    catalog?: KaomojiCatalogOptions | false;
};
export type StandaloneController = {
    repository: KaomojiRepository;
    unmount(): void;
};
export declare function mount(target: StandaloneTarget, options?: StandaloneMountOptions): StandaloneController;
export {};
