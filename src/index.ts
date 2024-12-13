#!/usr/bin/env node

import { AtpAgent } from "@atproto/api";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
	getFollowersTool,
	getFollowsTool,
	getProfileTool,
	getTimelineTool,
	handleGetFollowers,
	handleGetFollows,
	handleGetProfile,
	handleGetTimeline,
	handlePost,
	postTool,
} from "./tools/index.js";

async function main() {
	const identifier = process.env.BLUESKY_USERNAME;
	const password = process.env.BLUESKY_PASSWORD;

	if (!identifier || !password) {
		console.error(
			"Please set BLUESKY_USERNAME and BLUESKY_PASSWORD environment variables",
		);
		process.exit(1);
	}

	const agent = new AtpAgent({ service: "https://bsky.social" });
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
			tools: [
				getFollowersTool,
				getFollowsTool,
				getProfileTool,
				getTimelineTool,
				postTool,
			],
		};
	});

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		try {
			if (name === getFollowersTool.name) {
				return handleGetFollowers(agent, args);
			}
			if (name === getFollowsTool.name) {
				return handleGetFollows(agent, args);
			}
			if (name === getProfileTool.name) {
				return handleGetProfile(agent, args);
			}
			if (name === getTimelineTool.name) {
				return handleGetTimeline(agent, args);
			}
			if (name === postTool.name) {
				return handlePost(agent, args);
			}

			throw new Error(`Unknown tool: ${name}`);
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
