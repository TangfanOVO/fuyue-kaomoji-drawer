import type { KaomojiCatalogOptions, KaomojiRepository, KaomojiReviewRepository } from "./types.js";
type KaomojiDrawerProps = {
    repository: KaomojiRepository;
    reviewRepository?: KaomojiReviewRepository;
    onInsert: (value: string) => void;
    title?: string;
    catalog?: KaomojiCatalogOptions | false;
};
export declare const initialKaomojiRenderLimit = 96;
export declare function splitKaomojiCategories(value: string): string[];
export declare function KaomojiDrawer({ repository, reviewRepository, onInsert, title, catalog }: KaomojiDrawerProps): import("react").JSX.Element;
export {};
