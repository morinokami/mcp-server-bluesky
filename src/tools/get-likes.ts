import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const GetLikesArgumentsSchema = z.object({
	uri: z.string(),
	cid: z.string().optional(),
	limit: z.number().max(100).optional(),
	cursor: z.string().optional(),
});

export const getLikesTool: Tool = {
	name: "bluesky_get_likes",
	description: "Get likes for a post",
	inputSchema: {
		type: "object",
		properties: {
			uri: {
				type: "string",
				description: "The URI of the post to get likes for",
			},
			cid: {
				type: "string",
				description: "The CID of the post to get likes for",
			},
			limit: {
				type: "number",
				description: "The maximum number of likes to fetch",
			},
			cursor: {
				type: "string",
				description: "The cursor to use for pagination",
			},
		},
		required: ["uri"],
	},
};

export async function handleGetLikes(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { uri, cid, limit, cursor } = GetLikesArgumentsSchema.parse(args);

	const response = await agent.getLikes({ uri, cid, limit, cursor });

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
