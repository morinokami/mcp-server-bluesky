import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const DeletePostArgumentsSchema = z.object({
	postUri: z.string(),
});

export const deletePostTool: Tool = {
	name: "bluesky_delete_post",
	description: "Delete a post",
	inputSchema: {
		type: "object",
		properties: {
			postUri: {
				type: "string",
				description: "The URI of the post to delete",
			},
		},
		required: ["postUri"],
	},
};

export async function handleDeletePost(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { postUri } = DeletePostArgumentsSchema.parse(args);

	await agent.deletePost(postUri);

	return {
		content: [{ type: "text", text: "Successfully deleted the post" }],
	};
}
