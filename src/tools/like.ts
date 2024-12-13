import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const LikeArgumentsSchema = z.object({
	uri: z.string(),
	cid: z.string(),
});

export const likeTool: Tool = {
	name: "bluesky_like",
	description: "Like a post",
	inputSchema: {
		type: "object",
		properties: {
			uri: {
				type: "string",
				description: "The URI of the post to like",
			},
			cid: {
				type: "string",
				description: "The CID of the post to like",
			},
		},
		required: ["uri", "cid"],
	},
};

export async function handleLike(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { uri, cid } = LikeArgumentsSchema.parse(args);

	const response = await agent.like(uri, cid);

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
