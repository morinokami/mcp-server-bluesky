import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const SearchPostsArgumentsSchema = z.object({
	q: z.string(),
	limit: z.number().max(100).optional(),
	cursor: z.string().optional(),
});

export const searchPostsTool: Tool = {
	name: "bluesky_search_posts",
	description: "Search posts",
	inputSchema: {
		type: "object",
		properties: {
			q: {
				type: "string",
				description: "The search query",
			},
			limit: {
				type: "number",
				description: "The maximum number of posts to fetch",
			},
			cursor: {
				type: "string",
				description: "The cursor to use for pagination",
			},
		},
		required: ["q"],
	},
};

export async function handleSearchPosts(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { q, limit, cursor } = SearchPostsArgumentsSchema.parse(args);

	const response = await agent.app.bsky.feed.searchPosts({ q, limit, cursor });

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
