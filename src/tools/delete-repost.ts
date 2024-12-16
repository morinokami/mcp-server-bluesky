import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const DeleteRepostArgumentsSchema = z.object({
	repostUri: z.string(),
});

export const deleteRepostTool: Tool = {
	name: "bluesky_delete_repost",
	description: "Delete a repost",
	inputSchema: {
		type: "object",
		properties: {
			repostUri: {
				type: "string",
				description: "The URI of the repost to delete",
			},
		},
		required: ["repostUri"],
	},
};

export async function handleDeleteRepost(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { repostUri } = DeleteRepostArgumentsSchema.parse(args);

	await agent.deleteRepost(repostUri);

	return {
		content: [{ type: "text", text: "Successfully deleted the repost" }],
	};
}
