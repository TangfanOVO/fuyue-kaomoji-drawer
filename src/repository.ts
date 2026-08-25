import type { KaomojiItem, KaomojiRepository } from "./types.js";

const transportControls = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const riskyScripts = /[\u0980-\u0dff\u0f00-\u0fff\u1000-\u109f\u1780-\u17ff]/u;
const invalid = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/u;

export function normalizeKaomoji(value: string) {
  return value.replace(transportControls, "").normalize("NFC").trim();
}

export function analyzeKaomoji(value: string) {
  const clean = normalizeKaomoji(value);
  const notes: string[] = [];
  if (invalid.test(clean)) notes.push("含有无法稳定传输的字符");
  if (/\p{Mark}{3,}/u.test(clean.normalize("NFD"))) notes.push("叠加符号较多，部分设备会显示成黑条");
  if (riskyScripts.test(clean)) notes.push("使用罕见字形，缺少字体时可能变成方块");
  const safe = clean.normalize("NFD").replace(/\p{Mark}/gu, "").replace(transportControls, "").replace(riskyScripts, "").normalize("NFC").trim();
  return {
    value: clean,
    compatibility: invalid.test(clean) ? "blocked" as const : notes.length ? "limited" as const : "stable" as const,
    compatibilityNotes: notes,
    safeValue: safe && safe !== clean ? safe : undefined,
  };
}

const starter = ["( ´▽｀)", "(T_T)", "(>_<)", "兞( ᵔ ⱼ ᵔ )兞", "( っˊᵕˋ)っ", "ᵛ˶• •˵ᵃ"];

export function createLocalKaomojiRepository(storageKey = "fuyue.kaomoji.v1"): KaomojiRepository {
  const read = (): KaomojiItem[] => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try { return JSON.parse(raw) as KaomojiItem[]; } catch { /* use starter */ }
    }
    return starter.map((value) => ({ ...analyzeKaomoji(value), categories: ["常用"], favorite: false, useCount: 0 }));
  };
  const write = (items: KaomojiItem[]) => window.localStorage.setItem(storageKey, JSON.stringify(items));
  return {
    async list() { return read().sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.compatibility.localeCompare(b.compatibility) || b.useCount - a.useCount); },
    async upsert(value, categories, label) {
      const analysis = analyzeKaomoji(value);
      const items = read();
      const previous = items.find((item) => item.value === analysis.value);
      const saved: KaomojiItem = { ...analysis, label, categories: [...new Set(categories)].slice(0, 8), favorite: previous?.favorite ?? false, useCount: previous?.useCount ?? 0 };
      write([saved, ...items.filter((item) => item.value !== saved.value)]);
      return saved;
    },
    async remove(value) { write(read().filter((item) => item.value !== value)); },
    async markUsed(value) { write(read().map((item) => item.value === value ? { ...item, useCount: item.useCount + 1 } : item)); },
    async setFavorite(value, favorite) { write(read().map((item) => item.value === value ? { ...item, favorite } : item)); },
  };
}
