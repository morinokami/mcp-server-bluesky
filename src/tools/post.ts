import type { AtpAgent } from "@atproto/api";
import { AppBskyRichtextFacet, RichText } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Note: Bluesky actually measures grapheme clusters, not JavaScript string length
// This is a rough approximation; the actual server may count slightly differently
const MAX_POST_LENGTH = 300;

// Define response type for Bluesky posts
interface PostResponse {
	uri: string;
	cid: string;
}

const PostArgumentsSchema = z.object({
	text: z
		.string()
		.min(1, "Post text cannot be empty")
		// We'll do custom validation after transforming the text to account for rich text elements
		.transform((text, ctx) => {
			// Normalize newlines to ensure consistent counting
			const normalizedText = text.replace(/\r\n/g, "\n");

			// For now, just return the normalized text
			// The actual character count validation will happen after facet detection
			return normalizedText;
		}),
	// Optional parent post parameters for replies
	replyTo: z.string().optional(),
	rootPostId: z.string().optional(),
});

export const postTool: Tool = {
	name: "bluesky_post",
	description:
		"Post a short message (up to 300 characters) or reply to another post with rich text support. For longer posts, use bluesky_create_draft instead.",
	inputSchema: {
		type: "object",
		properties: {
			text: {
				type: "string",
				description: `The text of the message (max ${MAX_POST_LENGTH} characters). Can include @mentions, URLs, and #hashtags which will be properly formatted as rich text. For posts longer than ${MAX_POST_LENGTH} characters, use bluesky_create_draft tool instead.`,
			},
			replyTo: {
				type: "string",
				description:
					"The AT URI of the post you're replying to (e.g. at://did:plc:abcdef/app.bsky.feed.post/12345)",
			},
			rootPostId: {
				type: "string",
				description:
					"The AT URI of the root post in a thread. If replying to a top-level post, this should match replyTo",
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

		// Process text for rich text elements (mentions, links, hashtags)
		const richText = new RichText({ text });
		await richText.detectFacets(agent);

		// Get the grapheme length - better approximation of what Bluesky uses
		// This accounts for the text AFTER rich text processing
		const graphemeLength = getGraphemeLength(richText.text);

		// Check if the post is too long AFTER processing
		if (graphemeLength > MAX_POST_LENGTH) {
			const overage = graphemeLength - MAX_POST_LENGTH;
			return {
				content: [
					{
						type: "text",
						text:
							`Post is too long. Please remove approximately ${overage} character${overage !== 1 ? "s" : ""}.\n` +
							`Current length: ${graphemeLength} (maximum: ${MAX_POST_LENGTH})\n\n` +
							`TIP: For posts longer than ${MAX_POST_LENGTH} characters, use the 'bluesky_create_draft' tool instead, which automatically splits long content into a thread.`,
					},
				],
			};
		}

		// Prepare for post with rich text features and replies
		let response: PostResponse;

		try {
			if (replyTo) {
				// A reply requires both the post being replied to and the root of the thread
				if (!rootPostId) {
					throw new Error(
						"When replying, both replyTo and rootPostId must be provided",
					);
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
		} catch (error) {
			// Check for character limit errors
			if (
				error instanceof Error &&
				(error.message.includes("too long") ||
					error.message.includes("character limit") ||
					error.message.includes("exceeds limit"))
			) {
				return {
					content: [
						{
							type: "text",
							text: `Post exceeds Bluesky's character limit. Please make your post shorter.\nCurrent grapheme count: ${graphemeLength} (maximum: ${MAX_POST_LENGTH})\n\nTIP: For longer posts, use the 'bluesky_create_draft' tool instead, which automatically splits content into a thread.`,
						},
					],
				};
			}

			// Other API errors
			throw error;
		}

		// Calculate characters remaining
		const characterRemaining = MAX_POST_LENGTH - graphemeLength;

		// Return success with post info and character count feedback
		return {
			content: [
				{
					type: "text",
					text:
						`Post successful! URI: ${response.uri}\n` +
						`Character count: ${graphemeLength}/${MAX_POST_LENGTH} (${characterRemaining} characters remaining)`,
				},
			],
		};
	} catch (error) {
		// Provide clear error feedback
		if (error instanceof z.ZodError) {
			// Format validation errors in a user-friendly way
			const errorMessages = error.errors.map((e) => e.message).join(", ");
			return {
				content: [
					{
						type: "text",
						text: `Post validation failed: ${errorMessages}`,
					},
				],
			};
		}
		if (error instanceof Error) {
			let errorMessage = error.message;

			// Improve common error messages
			if (errorMessage.includes("rate limit")) {
				errorMessage =
					"You have been rate limited by Bluesky. Please wait a moment before trying again.";
			} else if (
				errorMessage.includes("network") ||
				errorMessage.includes("timeout")
			) {
				errorMessage =
					"Network error when connecting to Bluesky. Please check your connection and try again.";
			}

			return {
				content: [
					{
						type: "text",
						text: `Post failed: ${errorMessage}`,
					},
				],
			};
		}

		// Unknown error
		return {
			content: [{ type: "text", text: "Post failed due to an unknown error" }],
		};
	}
}

// Helper function to get a better approximation of grapheme length
// This is a better approximation of how Bluesky counts characters
function getGraphemeLength(text: string): number {
	// Use Intl.Segmenter if available (modern browsers)
	if (typeof Intl !== "undefined" && Intl.Segmenter) {
		try {
			const segmenter = new Intl.Segmenter(undefined, {
				granularity: "grapheme",
			});
			const segments = segmenter.segment(text);
			return Array.from(segments).length;
		} catch (e) {
			// Fall back to string length on error
			console.error("Grapheme segmentation failed, using string length", e);
		}
	}

	// Basic handling for emoji and combining characters as fallback
	// This is a rough approximation when Intl.Segmenter is not available
	const emojiPattern = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
	const combiningPattern = /\p{M}/gu;

	// Replace emoji with single characters and remove combining marks
	const normalizedText = text
		.replace(emojiPattern, "*") // Count each emoji as one
		.replace(combiningPattern, ""); // Remove combining marks

	return normalizedText.length;
}

// Helper function to get CID from a post URI
async function getCidFromUri(agent: AtpAgent, uri: string): Promise<string> {
	try {
		// Get the record directly using getRecord
		// Extract DID and record ID from the URI
		// Format: at://did:plc:xxx/app.bsky.feed.post/recordId
		const matches = uri.match(
			/at:\/\/(did:plc:[a-zA-Z0-9]+)\/([^\/]+)\/([a-zA-Z0-9]+)/,
		);

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
