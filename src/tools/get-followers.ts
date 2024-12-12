import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const GetFollowersArgumentsSchema = z.object({
	actor: z.string().min(1),
	limit: z.number().optional(),
	cursor: z.string().optional(),
});

export const getFollowersTool: Tool = {
	name: "bluesky_get_followers",
	description: "Get user's followers",
	inputSchema: {
		type: "object",
		properties: {
			actor: {
				type: "string",
				description:
					"The DID (or handle) of the user whose followers you'd like to fetch",
			},
			limit: {
				type: "number",
				description: "The maximum number of followers to fetch",
			},
			cursor: {
				type: "string",
				description: "The cursor to use for pagination",
			},
		},
		required: ["actor"],
	},
};

export async function handleGetFollowers(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { actor, limit, cursor } = GetFollowersArgumentsSchema.parse(args);

	const response = await agent.getFollowers({ actor, limit, cursor });

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
