import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const GetProfileArgumentsSchema = z.object({
	actor: z.string().min(1),
});

export const getProfileTool: Tool = {
	name: "bluesky_get_profile",
	description: "Get a user's profile information",
	inputSchema: {
		type: "object",
		properties: {
			actor: {
				type: "string",
				description:
					"The DID (or handle) of the user whose profile you'd like to fetch",
			},
		},
		required: ["actor"],
	},
};

export async function handleGetProfile(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { actor } = GetProfileArgumentsSchema.parse(args);

	const response = await agent.getProfile({ actor });

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
