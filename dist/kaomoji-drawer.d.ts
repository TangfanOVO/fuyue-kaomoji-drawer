import type { KaomojiRepository } from "./types.js";
export declare function KaomojiDrawer({ repository, onInsert, title }: {
    repository: KaomojiRepository;
    onInsert: (value: string) => void;
    title?: string;
}): import("react").JSX.Element;
