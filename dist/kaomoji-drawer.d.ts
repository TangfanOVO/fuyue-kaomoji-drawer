import type { KaomojiRepository, KaomojiReviewRepository } from "./types.js";
type KaomojiDrawerProps = {
    repository: KaomojiRepository;
    reviewRepository?: KaomojiReviewRepository;
    onInsert: (value: string) => void;
    title?: string;
};
export declare function splitKaomojiCategories(value: string): string[];
export declare function KaomojiDrawer({ repository, reviewRepository, onInsert, title }: KaomojiDrawerProps): import("react").JSX.Element;
export {};
