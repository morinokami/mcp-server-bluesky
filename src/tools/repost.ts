import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const RepostArgumentsSchema = z.object({
	uri: z.string(),
	cid: z.string(),
});

export const repostTool: Tool = {
	name: "bluesky_repost",
	description: "Repost a post",
	inputSchema: {
		type: "object",
		properties: {
			uri: {
				type: "string",
				description: "The URI of the post to repost",
			},
			cid: {
				type: "string",
				description: "The CID of the post to repost",
			},
		},
		required: ["uri", "cid"],
	},
};

export async function handleRepost(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { uri, cid } = RepostArgumentsSchema.parse(args);

	const response = await agent.repost(uri, cid);

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
