export type KaomojiCompatibility = "stable" | "limited" | "blocked";
export type KaomojiItem = {
    value: string;
    label?: string;
    categories: string[];
    favorite: boolean;
    useCount: number;
    lastUsedAt?: string;
    compatibility: KaomojiCompatibility;
    compatibilityNotes: string[];
    safeValue?: string;
};
export type KaomojiCandidate = {
    id: string | number;
    value: string;
    label?: string;
    suggestedCategories: string[];
    compatibility: KaomojiCompatibility;
    compatibilityNotes: string[];
    safeValue?: string;
};
export type KaomojiReviewDecision = "approved" | "rejected";
export type KaomojiAcceptedVersion = "original" | "compatible";
export interface KaomojiReviewRepository {
    listCandidates(): Promise<KaomojiCandidate[]>;
    reviewCandidate(id: KaomojiCandidate["id"], decision: KaomojiReviewDecision, options?: {
        acceptedVersion?: KaomojiAcceptedVersion;
        categories?: string[];
    }): Promise<void>;
}
export interface KaomojiRepository {
    list(): Promise<KaomojiItem[]>;
    upsert(value: string, categories: string[], label?: string): Promise<KaomojiItem>;
    remove(value: string): Promise<void>;
    markUsed(value: string): Promise<void>;
    setFavorite(value: string, favorite: boolean): Promise<void>;
    getCategoryOrder?(): Promise<string[]>;
    setCategoryOrder?(categories: string[]): Promise<void>;
}
