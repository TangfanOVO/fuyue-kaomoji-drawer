export type KaomojiCompatibility = "stable" | "limited" | "blocked";

export type KaomojiItem = {
  value: string;
  label?: string;
  categories: string[];
  favorite: boolean;
  useCount: number;
  compatibility: KaomojiCompatibility;
  compatibilityNotes: string[];
  safeValue?: string;
};

export interface KaomojiRepository {
  list(): Promise<KaomojiItem[]>;
  upsert(value: string, categories: string[], label?: string): Promise<KaomojiItem>;
  remove(value: string): Promise<void>;
  markUsed(value: string): Promise<void>;
  setFavorite(value: string, favorite: boolean): Promise<void>;
}
