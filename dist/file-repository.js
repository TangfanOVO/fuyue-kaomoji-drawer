import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { analyzeKaomoji, decodeKaomojiState, hydrateKaomojiState, normalizeKaomoji, normalizeKaomojiCategories, normalizeKaomojiCategoryOrder } from "./repository.js";
export function defaultKaomojiPath() {
    return resolve(process.env.FUYUE_KAOMOJI_PATH || resolve(homedir(), ".fuyue-kaomoji", "kaomoji.json"));
}
export function createFileKaomojiRepository(filePath = defaultKaomojiPath()) {
    const path = resolve(filePath);
    let writeQueue = Promise.resolve();
    const readState = async () => {
        try {
            return hydrateKaomojiState(decodeKaomojiState(JSON.parse(await readFile(path, "utf8"))));
        }
        catch (error) {
            if (error.code === "ENOENT")
                return hydrateKaomojiState(decodeKaomojiState(null));
            throw error;
        }
    };
    const write = async (state) => {
        writeQueue = writeQueue.then(async () => {
            await mkdir(dirname(path), { recursive: true });
            const temporary = `${path}.${process.pid}.tmp`;
            await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
            await rename(temporary, path);
        });
        await writeQueue;
    };
    return {
        async list() {
            return (await readState()).items.sort((a, b) => Number(b.favorite) - Number(a.favorite)
                || b.useCount - a.useCount
                || a.compatibility.localeCompare(b.compatibility));
        },
        async upsert(value, categories, label) {
            const cleanCategories = normalizeKaomojiCategories(categories);
            const analysis = analyzeKaomoji(value, cleanCategories);
            const state = await readState();
            const previous = state.items.find((item) => item.value === analysis.value);
            const saved = {
                ...analysis,
                label: label?.trim() || previous?.label,
                categories: cleanCategories,
                favorite: previous?.favorite ?? false,
                useCount: previous?.useCount ?? 0,
                lastUsedAt: previous?.lastUsedAt,
            };
            await write({ ...state, items: [saved, ...state.items.filter((item) => item.value !== saved.value)], removed: state.removed.filter((item) => item !== saved.value) });
            return saved;
        },
        async remove(value) {
            const state = await readState();
            const clean = normalizeKaomoji(value);
            await write({ ...state, items: state.items.filter((item) => item.value !== clean), removed: [...new Set([...state.removed, clean])] });
        },
        async markUsed(value) {
            const state = await readState();
            const clean = normalizeKaomoji(value);
            await write({ ...state, items: state.items.map((item) => item.value === clean ? { ...item, useCount: item.useCount + 1, lastUsedAt: new Date().toISOString() } : item) });
        },
        async setFavorite(value, favorite) {
            const state = await readState();
            const clean = normalizeKaomoji(value);
            await write({ ...state, items: state.items.map((item) => item.value === clean ? { ...item, favorite } : item) });
        },
        async getCategoryOrder() {
            return (await readState()).categoryOrder;
        },
        async setCategoryOrder(categories) {
            const state = await readState();
            await write({ ...state, categoryOrder: normalizeKaomojiCategoryOrder(categories) });
        },
        async mergeCatalog(entries) {
            const state = await readState();
            const removed = new Set(state.removed.map(normalizeKaomoji));
            const existing = new Set(state.items.map((item) => normalizeKaomoji(item.value)));
            const additions = [];
            for (const entry of entries) {
                const value = normalizeKaomoji(entry.value);
                if (!value || removed.has(value) || existing.has(value))
                    continue;
                const categories = normalizeKaomojiCategories(entry.categories);
                additions.push({
                    ...analyzeKaomoji(value, categories),
                    label: entry.label?.trim() || undefined,
                    categories,
                    favorite: false,
                    useCount: 0,
                });
                existing.add(value);
            }
            if (additions.length)
                await write({ ...state, items: [...additions, ...state.items] });
            return { added: additions.length, skipped: entries.length - additions.length };
        },
    };
}
