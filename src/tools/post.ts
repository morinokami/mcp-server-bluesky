import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { AppBskyRichtextFacet, RichText } from "@atproto/api";
import { z } from "zod";

const MAX_POST_LENGTH = 300;

const PostArgumentsSchema = z.object({
	text: z.string()
		.min(1, "Post text cannot be empty")
		.max(MAX_POST_LENGTH, `Post text must be ${MAX_POST_LENGTH} characters or less`)
		.transform((text, ctx) => {
			// Add character count feedback as part of validation
			if (text.length > MAX_POST_LENGTH - 30 && text.length <= MAX_POST_LENGTH) {
				console.log(`Post is approaching character limit: ${text.length}/${MAX_POST_LENGTH}`);
			}
			return text;
		}),
	// Optional parent post parameters for replies
	replyTo: z.string().optional(),
	rootPostId: z.string().optional(),
});

export const postTool: Tool = {
	name: "bluesky_post",
	description: "Post a message or reply to another post with rich text support",
	inputSchema: {
		type: "object",
		properties: {
			text: {
				type: "string",
				description: `The text of the message (max ${MAX_POST_LENGTH} characters). Can include @mentions, URLs, and #hashtags which will be properly formatted as rich text.`,
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
	try {
		const { text, replyTo, rootPostId } = PostArgumentsSchema.parse(args);

		// Add character count feedback for the user
		const characterCount = text.length;
		const characterLimit = MAX_POST_LENGTH;
		const characterRemaining = characterLimit - characterCount;
		
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
			try {
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
			} catch (error) {
				throw new Error(`Failed to create reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		} else {
			// Standard post with optional rich text
			response = await agent.post({
				text: richText.text,
				facets: richText.facets,
			});
		}

		// Return success with post info and character count feedback
		return {
			content: [{ 
				type: "text", 
				text: `Post successful! URI: ${response.uri}\nCharacter count: ${characterCount}/${characterLimit} (${characterRemaining} characters remaining)`
			}],
		};
	} catch (error) {
		// Provide clear error feedback
		if (error instanceof z.ZodError) {
			// Format validation errors in a user-friendly way
			const errorMessages = error.errors.map(e => e.message).join(", ");
			return {
				content: [{ 
					type: "text", 
					text: `Post validation failed: ${errorMessages}`
				}],
			};
		} else if (error instanceof Error) {
			return {
				content: [{ 
					type: "text", 
					text: `Post failed: ${error.message}`
				}],
			};
		}
		
		// Unknown error
		return {
			content: [{ type: "text", text: "Post failed due to an unknown error" }],
		};
	}
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
