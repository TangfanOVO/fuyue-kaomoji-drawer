import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { analyzeKaomoji } from "./repository.js";
import type { KaomojiItem, KaomojiRepository } from "./types.js";

const starter = ["( ´▽｀)", "(T_T)", "(>_<)", "兞( ᵔ ⱼ ᵔ )兞", "( っˊᵕˋ)っ", "ᵛ˶• •˵ᵃ"];

export function defaultKaomojiPath() {
  return resolve(process.env.FUYUE_KAOMOJI_PATH || resolve(homedir(), ".fuyue-kaomoji", "kaomoji.json"));
}

function freshStarter(): KaomojiItem[] {
  return starter.map((value) => ({
    ...analyzeKaomoji(value),
    categories: ["常用"],
    favorite: false,
    useCount: 0,
  }));
}

export function createFileKaomojiRepository(filePath = defaultKaomojiPath()): KaomojiRepository {
  const path = resolve(filePath);
  let writeQueue = Promise.resolve();

  const read = async (): Promise<KaomojiItem[]> => {
    try {
      const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
      if (!Array.isArray(parsed)) return freshStarter();
      return parsed.filter((item): item is KaomojiItem => Boolean(
        item && typeof item === "object" && typeof (item as KaomojiItem).value === "string",
      ));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return freshStarter();
      throw error;
    }
  };

  const write = async (items: KaomojiItem[]) => {
    writeQueue = writeQueue.then(async () => {
      await mkdir(dirname(path), { recursive: true });
      const temporary = `${path}.${process.pid}.tmp`;
      await writeFile(temporary, `${JSON.stringify(items, null, 2)}\n`, "utf8");
      await rename(temporary, path);
    });
    await writeQueue;
  };

  return {
    async list() {
      return (await read()).sort((a, b) =>
        Number(b.favorite) - Number(a.favorite)
        || b.useCount - a.useCount
        || a.compatibility.localeCompare(b.compatibility),
      );
    },
    async upsert(value, categories, label) {
      const analysis = analyzeKaomoji(value);
      const items = await read();
      const previous = items.find((item) => item.value === analysis.value);
      const saved: KaomojiItem = {
        ...analysis,
        label: label?.trim() || previous?.label,
        categories: [...new Set(categories.map((category) => category.trim()).filter(Boolean))].slice(0, 8),
        favorite: previous?.favorite ?? false,
        useCount: previous?.useCount ?? 0,
      };
      await write([saved, ...items.filter((item) => item.value !== saved.value)]);
      return saved;
    },
    async remove(value) {
      const clean = analyzeKaomoji(value).value;
      await write((await read()).filter((item) => item.value !== clean));
    },
    async markUsed(value) {
      const clean = analyzeKaomoji(value).value;
      await write((await read()).map((item) => item.value === clean ? { ...item, useCount: item.useCount + 1 } : item));
    },
    async setFavorite(value, favorite) {
      const clean = analyzeKaomoji(value).value;
      await write((await read()).map((item) => item.value === clean ? { ...item, favorite } : item));
    },
  };
}
