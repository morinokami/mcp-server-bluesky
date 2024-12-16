import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const FollowArgumentsSchema = z.object({
	followUri: z.string(),
});

export const deleteFollowTool: Tool = {
	name: "bluesky_delete_follow",
	description: "Unfollow a user",
	inputSchema: {
		type: "object",
		properties: {
			followUri: {
				type: "string",
				description: "The URI of the follow record to delete",
			},
		},
		required: ["followUri"],
	},
};

export async function handleDeleteFollow(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { followUri } = FollowArgumentsSchema.parse(args);

	await agent.deleteFollow(followUri);

	return {
		content: [{ type: "text", text: "Successfully deleted the follow" }],
	};
}
