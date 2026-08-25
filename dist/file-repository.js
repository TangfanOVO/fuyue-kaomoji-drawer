import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { analyzeKaomoji, decodeKaomojiState, hydrateKaomojiState, normalizeKaomoji } from "./repository.js";
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
            const analysis = analyzeKaomoji(value);
            const state = await readState();
            const previous = state.items.find((item) => item.value === analysis.value);
            const saved = {
                ...analysis,
                label: label?.trim() || previous?.label,
                categories: [...new Set(categories.map((category) => category.trim()).filter(Boolean))].slice(0, 8),
                favorite: previous?.favorite ?? false,
                useCount: previous?.useCount ?? 0,
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
            await write({ ...state, items: state.items.map((item) => item.value === clean ? { ...item, useCount: item.useCount + 1 } : item) });
        },
        async setFavorite(value, favorite) {
            const state = await readState();
            const clean = normalizeKaomoji(value);
            await write({ ...state, items: state.items.map((item) => item.value === clean ? { ...item, favorite } : item) });
        },
    };
}
