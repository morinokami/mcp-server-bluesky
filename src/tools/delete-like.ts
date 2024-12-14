import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const DeleteLikeArgumentsSchema = z.object({
	likeUri: z.string(),
});

export const deleteLikeTool: Tool = {
	name: "bluesky_delete_like",
	description: "Delete a like",
	inputSchema: {
		type: "object",
		properties: {
			likeUri: {
				type: "string",
				description: "The URI of the like to delete",
			},
		},
		required: ["likeUri"],
	},
};

export async function handleDeleteLike(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { likeUri } = DeleteLikeArgumentsSchema.parse(args);

	await agent.deleteLike(likeUri);

	return {
		content: [{ type: "text", text: "Successfully deleted the like" }],
	};
}
