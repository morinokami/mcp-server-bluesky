import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { RichText } from "@atproto/api";
import { z } from "zod";

// Note: Bluesky actually measures grapheme clusters, not JavaScript string length
// This is a rough approximation; the actual server may count slightly differently
const MAX_POST_LENGTH = 300;

const QuotePostArgumentsSchema = z.object({
	text: z.string()
		.min(1, "Quote text cannot be empty")
		// We'll validate length after processing the rich text
		.transform(text => text.replace(/\r\n/g, '\n')),
	uri: z.string()
		.min(1, "URI of the post to quote cannot be empty")
		.describe("The URI of the post to quote"),
	cid: z.string()
		.min(1, "CID of the post to quote cannot be empty")
		.describe("The CID of the post to quote"),
});

export const quotePostTool: Tool = {
	name: "bluesky_quote_post",
	description: "Quote another post with your own commentary",
	inputSchema: {
		type: "object",
		properties: {
			text: {
				type: "string",
				description: `Your commentary on the post you're quoting (max ${MAX_POST_LENGTH} characters). Can include @mentions, URLs, and #hashtags.`,
			},
			uri: {
				type: "string",
				description: "The URI of the post to quote (e.g. at://did:plc:abcdef/app.bsky.feed.post/12345)",
			},
			cid: {
				type: "string",
				description: "The CID of the post to quote (usually from a previous search or get-post-thread call)",
			},
		},
		required: ["text", "uri", "cid"],
	},
};

export async function handleQuotePost(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	try {
		const { text, uri, cid } = QuotePostArgumentsSchema.parse(args);
		
		// Process text for rich text elements (mentions, links, hashtags)
		const richText = new RichText({ text });
		await richText.detectFacets(agent);
		
		// Get the grapheme length - better approximation of what Bluesky uses
		const graphemeLength = getGraphemeLength(richText.text);
		
		// Check if the post is too long AFTER processing
		if (graphemeLength > MAX_POST_LENGTH) {
			const overage = graphemeLength - MAX_POST_LENGTH;
			return {
				content: [{ 
					type: "text", 
					text: `Quote post is too long. Please remove approximately ${overage} character${overage !== 1 ? 's' : ''}.\n` +
						  `Current length: ${graphemeLength} (maximum: ${MAX_POST_LENGTH})`
				}],
			};
		}
		
		try {
			// Create the quote post with the provided URI and CID
			const response = await agent.app.bsky.feed.post.create(
				{ repo: agent.session?.did || "" },
				{
					text: richText.text,
					facets: richText.facets,
					embed: {
						$type: "app.bsky.embed.record",
						record: {
							uri,
							cid,
						},
					},
					createdAt: new Date().toISOString(),
				}
			);
			
			// Calculate characters remaining
			const characterRemaining = MAX_POST_LENGTH - graphemeLength;
			
			return {
				content: [{ 
					type: "text", 
					text: `Quote post successful! Reference: ${response.uri}\n` +
						  `Character count: ${graphemeLength}/${MAX_POST_LENGTH} (${characterRemaining} characters remaining)`
				}],
			};
		} catch (error) {
			// Check for character limit errors
			if (error instanceof Error && 
				(error.message.includes("too long") || 
				 error.message.includes("character limit") ||
				 error.message.includes("exceeds limit"))) {
				return {
					content: [{ 
						type: "text", 
						text: `Quote post exceeds Bluesky's character limit. Please make your commentary shorter.\n` +
							  `Current grapheme count: ${graphemeLength} (maximum: ${MAX_POST_LENGTH})`
					}],
				};
			}
			
			// Check for invalid post errors
			if (error instanceof Error && 
				(error.message.includes("not found") || 
				 error.message.includes("invalid uri") ||
				 error.message.includes("invalid cid"))) {
				return {
					content: [{ 
						type: "text", 
						text: `Could not quote the post. The URI or CID might be invalid or the post might no longer exist.`
					}],
				};
			}
			
			// Other API errors
			throw error;
		}
	} catch (error) {
		// Provide clear error feedback
		if (error instanceof z.ZodError) {
			// Format validation errors in a user-friendly way
			const errorMessages = error.errors.map(e => e.message).join(", ");
			return {
				content: [{ 
					type: "text", 
					text: `Quote post validation failed: ${errorMessages}`
				}],
			};
		} else if (error instanceof Error) {
			let errorMessage = error.message;
			
			// Improve common error messages
			if (errorMessage.includes("rate limit")) {
				errorMessage = "You have been rate limited by Bluesky. Please wait a moment before trying again.";
			} else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
				errorMessage = "Network error when connecting to Bluesky. Please check your connection and try again.";
			}
			
			return {
				content: [{ 
					type: "text", 
					text: `Quote post failed: ${errorMessage}`
				}],
			};
		}
		
		// Unknown error
		return {
			content: [{ type: "text", text: "Quote post failed due to an unknown error" }],
		};
	}
}

// Helper function to get a better approximation of grapheme length
// This is a better approximation of how Bluesky counts characters
function getGraphemeLength(text: string): number {
	// Use Intl.Segmenter if available (modern browsers)
	if (typeof Intl !== 'undefined' && Intl.Segmenter) {
		try {
			const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
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
		.replace(emojiPattern, '*')  // Count each emoji as one
		.replace(combiningPattern, '');  // Remove combining marks
		
	return normalizedText.length;
}