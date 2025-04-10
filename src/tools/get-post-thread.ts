import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Define proper types for the post thread data
interface BlueskyPostAuthor {
	did: string;
	handle: string;
	displayName?: string;
}

interface BlueskyPost {
	uri: string;
	cid: string;
	author: BlueskyPostAuthor;
	record: {
		text: string;
		[key: string]: unknown;
	};
	indexedAt: string;
	likeCount?: number;
	repostCount?: number;
	replyCount?: number;
}

interface ThreadNode {
	post?: BlueskyPost;
	parent?: ThreadNode;
	replies?: ThreadNode[];
}

interface ThreadResponse {
	data: {
		thread?: ThreadNode;
	};
}

const GetPostThreadArgumentsSchema = z.object({
	uri: z.string(),
	depth: z.number().optional(),
	parentHeight: z.number().optional(),
});

export const getPostThreadTool: Tool = {
	name: "bluesky_get_post_thread",
	description:
		"Get a complete conversation thread including the post, its parents, and replies",
	inputSchema: {
		type: "object",
		properties: {
			uri: {
				type: "string",
				description:
					"The URI of the post to get the thread for (e.g. at://did:plc:abcdef/app.bsky.feed.post/12345)",
			},
			depth: {
				type: "number",
				description:
					"The levels of reply depth to fetch below the post (default: 0, max: 1000). Set to a higher number like 10-20 to see all replies.",
			},
			parentHeight: {
				type: "number",
				description:
					"The number of parent posts to include above the post (default: 0, max: 1000). Set to a higher number like 10-20 to see the full conversation context.",
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

	// Set reasonable defaults if not provided
	const options = {
		uri,
		depth: depth ?? 5,
		parentHeight: parentHeight ?? 5,
	};

	try {
		const response = await agent.getPostThread(options);

		// Format the thread in a more readable way rather than raw JSON
		const formattedThread = formatThreadForDisplay(response as ThreadResponse);

		return {
			content: [{ type: "text", text: formattedThread }],
		};
	} catch (error) {
		// Improved error handling
		if (error instanceof Error) {
			return {
				content: [
					{
						type: "text",
						text: `Failed to retrieve post thread: ${error.message}. Please check that the URI is valid and the post exists.`,
					},
				],
			};
		}
		throw error;
	}
}

// Helper function to format thread data in a more readable way
function formatThreadForDisplay(response: ThreadResponse): string {
	try {
		if (!response.data?.thread) {
			return "No thread data available";
		}

		const thread = response.data.thread;
		let formattedOutput = "Thread:\n\n";

		// Process the thread recursively to create a readable display
		formattedOutput += formatThreadNode(thread, 0);

		return formattedOutput;
	} catch (error) {
		console.error("Error formatting thread:", error);
		return JSON.stringify(response);
	}
}

// Recursive function to format a thread node and its replies
function formatThreadNode(node: ThreadNode, level: number): string {
	if (!node) return "";

	const indent = "  ".repeat(level);
	let output = "";

	// Format the post if it exists in this node
	if (node.post) {
		const post = node.post;
		const author = post.author?.displayName || post.author?.handle || "Unknown";
		const text = post.record?.text || "No content";
		const timestamp = post.indexedAt
			? new Date(post.indexedAt).toLocaleString()
			: "Unknown time";

		output += `${indent}@${author}: ${text}\n`;
		output += `${indent}[Posted: ${timestamp}`;

		// Add like/repost counts if available
		if (post.likeCount) output += `, Likes: ${post.likeCount}`;
		if (post.repostCount) output += `, Reposts: ${post.repostCount}`;
		output += "]\n";

		// Add URI for reference
		output += `${indent}URI: ${post.uri}\n\n`;
	}

	// Process replies if they exist (using for...of instead of forEach)
	if (node.replies && node.replies.length > 0) {
		for (const reply of node.replies) {
			output += formatThreadNode(reply, level + 1);
		}
	}

	return output;
}
