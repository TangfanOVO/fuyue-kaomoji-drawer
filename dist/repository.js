import { defaultKaomojiEntries } from "./default-library.js";
const transportControls = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const riskyScripts = /[\u0980-\u0dff\u0f00-\u0fff\u1000-\u109f\u1780-\u17ff]/u;
const invalid = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/u;
export function normalizeKaomoji(value) {
    return value.replace(transportControls, "").normalize("NFC").trim();
}
export function analyzeKaomoji(value) {
    const clean = normalizeKaomoji(value);
    const notes = [];
    if (invalid.test(clean))
        notes.push("含有无法稳定传输的字符");
    if (/\p{Mark}{3,}/u.test(clean.normalize("NFD")))
        notes.push("叠加符号较多，部分设备会显示成黑条");
    if (riskyScripts.test(clean))
        notes.push("使用罕见字形，缺少字体时可能变成方块");
    const safe = clean.normalize("NFD").replace(/\p{Mark}/gu, "").replace(transportControls, "").replace(riskyScripts, "").normalize("NFC").trim();
    return {
        value: clean,
        compatibility: invalid.test(clean) ? "blocked" : notes.length ? "limited" : "stable",
        compatibilityNotes: notes,
        safeValue: safe && safe !== clean ? safe : undefined,
    };
}
export function defaultKaomojiItems() {
    return defaultKaomojiEntries.map((entry) => ({
        ...analyzeKaomoji(entry.value),
        categories: [...entry.categories],
        favorite: false,
        useCount: 0,
    }));
}
export function decodeKaomojiState(value) {
    if (Array.isArray(value))
        return { version: 2, items: value, removed: [] };
    if (value && typeof value === "object" && Array.isArray(value.items)) {
        const state = value;
        return { version: 2, items: state.items, removed: Array.isArray(state.removed) ? state.removed : [] };
    }
    return { version: 2, items: [], removed: [] };
}
export function hydrateKaomojiState(state) {
    const removed = new Set(state.removed.map(normalizeKaomoji));
    const existing = new Map(state.items.map((item) => [normalizeKaomoji(item.value), item]));
    const items = defaultKaomojiItems()
        .filter((item) => !removed.has(item.value))
        .map((item) => existing.get(item.value) ?? item);
    const present = new Set(items.map((item) => item.value));
    for (const item of state.items) {
        const clean = normalizeKaomoji(item.value);
        if (!removed.has(clean) && !present.has(clean)) {
            items.push({ ...item, value: clean });
            present.add(clean);
        }
    }
    return { version: 2, items, removed: [...removed] };
}
export function createLocalKaomojiRepository(storageKey = "fuyue.kaomoji.v1") {
    const readState = () => {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
            try {
                return hydrateKaomojiState(decodeKaomojiState(JSON.parse(raw)));
            }
            catch { /* use defaults */ }
        }
        return hydrateKaomojiState(decodeKaomojiState(null));
    };
    const write = (state) => window.localStorage.setItem(storageKey, JSON.stringify(state));
    return {
        async list() {
            return readState().items.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.compatibility.localeCompare(b.compatibility) || b.useCount - a.useCount);
        },
        async upsert(value, categories, label) {
            const analysis = analyzeKaomoji(value);
            const state = readState();
            const previous = state.items.find((item) => item.value === analysis.value);
            const saved = {
                ...analysis,
                label: label?.trim() || previous?.label,
                categories: [...new Set(categories.map((item) => item.trim()).filter(Boolean))].slice(0, 8),
                favorite: previous?.favorite ?? false,
                useCount: previous?.useCount ?? 0,
            };
            write({ ...state, items: [saved, ...state.items.filter((item) => item.value !== saved.value)], removed: state.removed.filter((item) => item !== saved.value) });
            return saved;
        },
        async remove(value) {
            const state = readState();
            const clean = normalizeKaomoji(value);
            write({ ...state, items: state.items.filter((item) => item.value !== clean), removed: [...new Set([...state.removed, clean])] });
        },
        async markUsed(value) {
            const state = readState();
            write({ ...state, items: state.items.map((item) => item.value === value ? { ...item, useCount: item.useCount + 1 } : item) });
        },
        async setFavorite(value, favorite) {
            const state = readState();
            write({ ...state, items: state.items.map((item) => item.value === value ? { ...item, favorite } : item) });
        },
    };
}
