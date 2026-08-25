import { McpServer } from "@modelcontextprotocol/server";
import type { KaomojiRepository } from "./types.js";
export type BuildKaomojiMcpOptions = {
    repository?: KaomojiRepository;
    filePath?: string;
};
export declare function buildKaomojiMcpServer(options?: BuildKaomojiMcpOptions): McpServer;
