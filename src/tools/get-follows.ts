import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const GetFollowsArgumentsSchema = z.object({
	actor: z.string().min(1),
	limit: z.number().optional(),
	cursor: z.string().optional(),
});

export const getFollowsTool: Tool = {
	name: "bluesky_get_follows",
	description: "Get user's follows",
	inputSchema: {
		type: "object",
		properties: {
			actor: {
				type: "string",
				description:
					"The DID (or handle) of the user whose follow information you'd like to fetch",
			},
			limit: {
				type: "number",
				description: "The maximum number of follows to fetch",
			},
			cursor: {
				type: "string",
				description: "The cursor to use for pagination",
			},
		},
		required: ["actor"],
	},
};

export async function handleGetFollows(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { actor, limit, cursor } = GetFollowsArgumentsSchema.parse(args);

	const response = await agent.getFollows({ actor, limit, cursor });

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
