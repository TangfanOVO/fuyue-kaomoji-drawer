import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createFileKaomojiRepository } from "../dist/file-repository.js";
import { analyzeKaomoji, createLocalKaomojiRepository, normalizeKaomoji } from "../dist/index.js";

test("normalizes transport-only controls without changing the visible face", () => {
  assert.equal(normalizeKaomoji("\u200e( ´▽｀)\ufeff"), "( ´▽｀)");
});

test("flags stacked marks and keeps a stable-copy option", () => {
  const result = analyzeKaomoji("a\u0301\u0302\u0303");
  assert.equal(result.compatibility, "limited");
  assert.ok(result.compatibilityNotes.some((note) => note.includes("黑条")));
  assert.equal(result.safeValue, "a");
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

test("persists a private file library atomically", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "fuyue-kaomoji-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "kaomoji.json");
  const repository = createFileKaomojiRepository(file);
  await repository.upsert("(file-test)", ["开心", "猫猫"], "test face");
  await repository.markUsed("(file-test)");
  await repository.setFavorite("(file-test)", true);
  const saved = JSON.parse(await readFile(file, "utf8"));
  const item = saved.find((candidate) => candidate.value === "(file-test)");
  assert.equal(item.useCount, 1);
  assert.equal(item.favorite, true);
  assert.deepEqual(item.categories, ["开心", "猫猫"]);
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
  const result = await client.callTool({ name: "kaomoji_pick", arguments: { query: "mcp happy" } });
  const text = result.content.find((part) => part.type === "text")?.text;
  assert.equal(JSON.parse(text).item.value, "(mcp-test)");
  const saved = JSON.parse(await readFile(file, "utf8"));
  assert.equal(saved.find((item) => item.value === "(mcp-test)").useCount, 1);
});
