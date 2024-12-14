import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const GetPostThreadArgumentsSchema = z.object({
	uri: z.string(),
	depth: z.number().optional(),
	parentHeight: z.number().optional(),
});

export const getPostThreadTool: Tool = {
	name: "bluesky_get_post_thread",
	description: "Get a post thread",
	inputSchema: {
		type: "object",
		properties: {
			uri: {
				type: "string",
				description: "The URI of the post to get the thread for",
			},
			depth: {
				type: "number",
				description: "The levels of reply depth to fetch",
			},
			parentHeight: {
				type: "number",
				description: "The number of parent posts to include",
			},
		},
		required: ["uri"],
	},
};

export async function handleGetPostThread(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { uri, depth, parentHeight } = GetPostThreadArgumentsSchema.parse(args);

	const response = await agent.getPostThread({ uri, depth, parentHeight });

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
