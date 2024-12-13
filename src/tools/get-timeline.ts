import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const GetTimelineArgumentsSchema = z.object({
	algorithm: z.string().optional(),
	limit: z.number().max(100).optional(),
	cursor: z.string().optional(),
});

export const getTimelineTool: Tool = {
	name: "bluesky_get_timeline",
	description: "Get user's timeline",
	inputSchema: {
		type: "object",
		properties: {
			algorithm: {
				type: "string",
				description: "The algorithm to use for timeline generation",
			},
			limit: {
				type: "number",
				description: "The maximum number of posts to fetch",
			},
			cursor: {
				type: "string",
				description: "The cursor to use for pagination",
			},
		},
	},
};

export async function handleGetTimeline(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { algorithm, limit, cursor } = GetTimelineArgumentsSchema.parse(args);

	const response = await agent.getTimeline({ algorithm, limit, cursor });

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
