import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createFileKaomojiRepository } from "../dist/file-repository.js";
import { analyzeKaomoji, createLocalKaomojiRepository, defaultKaomojiItems, normalizeKaomoji, normalizeKaomojiCategories, rankKaomojiCategories, selectDiverseKaomoji, splitKaomojiCategories } from "../dist/index.js";

test("normalizes transport-only controls without changing the visible face", () => {
  assert.equal(normalizeKaomoji("\u200e( ´▽｀)\ufeff"), "( ´▽｀)");
});

test("flags stacked marks and keeps a stable-copy option", () => {
  const result = analyzeKaomoji("a\u0301\u0302\u0303");
  assert.equal(result.compatibility, "limited");
  assert.ok(result.compatibilityNotes.some((note) => note.includes("黑条")));
  assert.equal(result.safeValue, "a");
});

test("splits multiple categories with English and Chinese punctuation", () => {
  assert.deepEqual(splitKaomojiCategories("傲娇, 猫猫，开心、可爱/害羞"), ["傲娇", "猫猫", "开心", "可爱", "害羞"]);
});

test("merges legacy English labels into the Chinese taxonomy", () => {
  assert.deepEqual(normalizeKaomojiCategories(["shy", "害羞", "studying", "happy"]), ["害羞", "学习", "开心"]);
});

test("orders category tabs by private usage before fallback taxonomy", () => {
  const items = [
    { value: "a", categories: ["丑陋"], favorite: false, useCount: 0, compatibility: "stable", compatibilityNotes: [] },
    { value: "b", categories: ["猫猫"], favorite: false, useCount: 3, compatibility: "stable", compatibilityNotes: [] },
    { value: "c", categories: ["可爱"], favorite: false, useCount: 0, compatibility: "stable", compatibilityNotes: [] },
  ];
  assert.deepEqual(rankKaomojiCategories(items), ["猫猫", "可爱", "丑陋"]);
});

test("rotates AI picks away from the immediately repeated face", () => {
  const items = [
    { value: "a", categories: ["开心"], favorite: true, useCount: 20, compatibility: "stable", compatibilityNotes: [] },
    { value: "b", categories: ["开心"], favorite: false, useCount: 2, compatibility: "stable", compatibilityNotes: [] },
  ];
  assert.equal(selectDiverseKaomoji(items, ["a"], "balanced", () => 0)?.value, "b");
});

test("stores categories, favourites and hidden usage ranking locally", async () => {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  const repository = createLocalKaomojiRepository("test.drawer");
  await repository.upsert("(test-a)", ["猫猫", "开心"]);
  await repository.upsert("(test-b)", ["兔兔"]);
  await repository.markUsed("(test-b)");
  await repository.setFavorite("(test-a)", true);
  const items = await repository.list();
  assert.equal(items[0].value, "(test-a)");
  assert.deepEqual(items[0].categories, ["猫猫", "开心"]);
  assert.equal(items.find((item) => item.value === "(test-b)")?.useCount, 1);
});

test("ships a non-empty reviewed library and merges duplicate category tags", () => {
  const items = defaultKaomojiItems();
  assert.equal(items.length, 325);
  assert.ok(items.some((item) => item.categories.length > 1));
  assert.equal(new Set(items.map((item) => item.value)).size, items.length);
});

test("persists a private file library atomically", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "fuyue-kaomoji-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "kaomoji.json");
  const repository = createFileKaomojiRepository(file);
  await repository.upsert("(file-test)", ["开心", "猫猫"], "test face");
  await repository.markUsed("(file-test)");
  await repository.setFavorite("(file-test)", true);
  const saved = JSON.parse(await readFile(file, "utf8"));
  const item = saved.items.find((candidate) => candidate.value === "(file-test)");
  assert.equal(item.useCount, 1);
  assert.ok(item.lastUsedAt);
  assert.equal(item.favorite, true);
  assert.deepEqual(item.categories, ["开心", "猫猫"]);
  const defaultValue = (await repository.list())[0].value;
  await repository.remove(defaultValue);
  assert.equal((await repository.list()).some((candidate) => candidate.value === defaultValue), false);
});

test("exposes searchable MCP tools and increments hidden use frequency", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "fuyue-kaomoji-mcp-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "kaomoji.json");
  const client = new Client({ name: "kaomoji-test", version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/mcp-cli.js", import.meta.url))],
    env: { ...process.env, FUYUE_KAOMOJI_PATH: file },
    stderr: "pipe",
  });
  context.after(() => client.close());
  await client.connect(transport);

  const tools = await client.listTools();
  assert.ok(tools.tools.some((tool) => tool.name === "kaomoji_pick"));
  await client.callTool({ name: "kaomoji_add", arguments: { value: "(mcp-test)", categories: ["开心"], label: "mcp happy" } });
  await client.callTool({ name: "kaomoji_add", arguments: { value: "(mcp-test-2)", categories: ["开心"], label: "mcp happy" } });
  const first = await client.callTool({ name: "kaomoji_pick", arguments: { query: "mcp happy" } });
  const second = await client.callTool({ name: "kaomoji_pick", arguments: { query: "mcp happy" } });
  const firstValue = JSON.parse(first.content.find((part) => part.type === "text")?.text).item.value;
  const secondValue = JSON.parse(second.content.find((part) => part.type === "text")?.text).item.value;
  assert.notEqual(firstValue, secondValue);
  const saved = JSON.parse(await readFile(file, "utf8"));
  assert.equal(saved.items.filter((item) => item.label === "mcp happy").reduce((sum, item) => sum + item.useCount, 0), 2);
});
