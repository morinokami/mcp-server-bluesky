import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { AppBskyRichtextFacet, RichText } from "@atproto/api";
import { z } from "zod";

const PostArgumentsSchema = z.object({
	text: z.string().min(1).max(300),
	// Optional parent post parameters for replies
	replyTo: z.string().optional(),
	rootPostId: z.string().optional(),
});

export const postTool: Tool = {
	name: "bluesky_post",
	description: "Post a message or reply to another post",
	inputSchema: {
		type: "object",
		properties: {
			text: {
				type: "string",
				description: "The text of the message. Can include @mentions, URLs, and #hashtags which will be properly formatted as rich text.",
			},
			replyTo: {
				type: "string",
				description: "The AT URI of the post you're replying to (e.g. at://did:plc:abcdef/app.bsky.feed.post/12345)",
			},
			rootPostId: {
				type: "string",
				description: "The AT URI of the root post in a thread. If replying to a top-level post, this should match replyTo",
			},
		},
		required: ["text"],
	},
};

export async function handlePost(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { text, replyTo, rootPostId } = PostArgumentsSchema.parse(args);

	// Process text for rich text elements (mentions, links, hashtags)
	const richText = new RichText({ text });
	await richText.detectFacets(agent);

	// Prepare for post with rich text features and replies
	let response;

	if (replyTo) {
		// A reply requires both the post being replied to and the root of the thread
		if (!rootPostId) {
			throw new Error("When replying, both replyTo and rootPostId must be provided");
		}

		// For a reply, we get the CIDs and construct the reply parameters
		const parentCid = await getCidFromUri(agent, replyTo);
		const rootCid = await getCidFromUri(agent, rootPostId);

		response = await agent.post({
			text: richText.text,
			facets: richText.facets,
			reply: {
				parent: { uri: replyTo, cid: parentCid },
				root: { uri: rootPostId, cid: rootCid },
			},
		});
	} else {
		// Standard post with optional rich text
		response = await agent.post({
			text: richText.text,
			facets: richText.facets,
		});
	}

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}

// Helper function to get CID from a post URI
async function getCidFromUri(agent: AtpAgent, uri: string): Promise<string> {
	try {
		// Get the record directly using getRecord
		// Extract DID and record ID from the URI
		// Format: at://did:plc:xxx/app.bsky.feed.post/recordId
		const matches = uri.match(/at:\/\/(did:plc:[a-zA-Z0-9]+)\/([^\/]+)\/([a-zA-Z0-9]+)/);
		
		if (!matches || matches.length < 4) {
			throw new Error(`Invalid URI format: ${uri}`);
		}
		
		const did = matches[1];
		const collection = matches[2];
		const rkey = matches[3];
		
		// Get the record
		const record = await agent.api.com.atproto.repo.getRecord({
			repo: did,
			collection,
			rkey,
		});
		
		if (!record.data.cid) {
			throw new Error("CID not found in record");
		}
		
		return record.data.cid;
	} catch (error) {
		throw new Error(`Failed to get CID for URI ${uri}: ${error}`);
	}
}
