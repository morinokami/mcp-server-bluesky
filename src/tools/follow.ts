import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const FollowArgumentsSchema = z.object({
	subjectDid: z.string(),
});

export const followTool: Tool = {
	name: "bluesky_follow",
	description: "Follow a user",
	inputSchema: {
		type: "object",
		properties: {
			subjectDid: {
				type: "string",
				description: "The DID of the user to follow",
			},
		},
		required: ["subjectDid"],
	},
};

export async function handleFollow(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { subjectDid } = FollowArgumentsSchema.parse(args);

	const response = await agent.follow(subjectDid);

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
