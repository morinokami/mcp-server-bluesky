#!/usr/bin/env node

import { AtpAgent } from "@atproto/api";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { handleToolCall, tools } from "./tools/index.js";

async function main() {
	const identifier = process.env.BLUESKY_USERNAME;
	const password = process.env.BLUESKY_PASSWORD;
	const service = process.env.BLUESKY_PDS_URL || "https://bsky.social";

	if (!identifier || !password) {
		console.error(
			"Please set BLUESKY_USERNAME and BLUESKY_PASSWORD environment variables",
		);
		process.exit(1);
	}

	const agent = new AtpAgent({ service });
	const loginResponse = await agent.login({
		identifier,
		password,
	});
	if (!loginResponse.success) {
		console.error("Failed to login to Bluesky");
		process.exit(1);
	}

	const server = new Server(
		{
			name: "Bluesky MCP Server",
			version: "0.0.1", // TODO: Sync with package.json
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools,
		};
	});

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		try {
			return handleToolCall(name, agent, args);
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new Error(
					`Invalid arguments: ${error.errors
						.map((e) => `${e.path.join(".")}: ${e.message}`)
						.join(", ")}`,
				);
			}

			throw error;
		}
	});

	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
