import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const PostArgumentsSchema = z.object({
	text: z.string().min(1).max(300),
});

export const postTool: Tool = {
	name: "bluesky_post",
	description: "Post a message",
	inputSchema: {
		type: "object",
		properties: {
			text: {
				type: "string",
				description: "The text of the message",
			},
		},
		required: ["text"],
	},
};

export async function handlePost(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { text } = PostArgumentsSchema.parse(args);

	const response = await agent.post({ text });

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
