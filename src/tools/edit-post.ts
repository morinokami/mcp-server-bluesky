import type { AtpAgent } from "@atproto/api";
import { RichText } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Maximum post length for Bluesky
const MAX_POST_LENGTH = 300;

// Define proper types for post details
interface PostResponse {
	uri: string;
	cid: string;
}

// Schema for editing a post
const EditPostArgumentsSchema = z.object({
	uri: z.string().min(1, "Post URI cannot be empty"),
	text: z.string().min(1, "New post text cannot be empty"),
	// If true, will add an edit marker to the post
	markAsEdit: z.boolean().optional().default(true),
});

export const editPostTool: Tool = {
	name: "bluesky_edit_post",
	description: "Edit a post (creates a new post that replaces the original)",
	inputSchema: {
		type: "object",
		properties: {
			uri: {
				type: "string",
				description: "The URI of the post to edit",
			},
			text: {
				type: "string",
				description: "The new text for the post (max 300 characters)",
			},
			markAsEdit: {
				type: "boolean",
				description:
					"Whether to mark this as an edit (adds '(edited)' or similar marker, default: true)",
			},
		},
		required: ["uri", "text"],
	},
};

export async function handleEditPost(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	try {
		const { uri, text, markAsEdit } = EditPostArgumentsSchema.parse(args);

		// First, get the original post to preserve its context
		const originalPost = await getPostDetails(agent, uri);
		if (!originalPost) {
			return {
				content: [
					{
						type: "text",
						text: "Could not find the original post. It may have been deleted or is inaccessible.",
					},
				],
			};
		}

		// Process text for rich text elements
		const displayText = markAsEdit ? `${text} (edited)` : text;
		const richText = new RichText({ text: displayText });
		await richText.detectFacets(agent);

		// Check length after processing
		const graphemeLength = getGraphemeLength(richText.text);
		if (graphemeLength > MAX_POST_LENGTH) {
			const overage = graphemeLength - MAX_POST_LENGTH;
			return {
				content: [
					{
						type: "text",
						text:
							`Edited post is too long. Please remove approximately ${overage} character${overage !== 1 ? "s" : ""}.\n` +
							`Current length: ${graphemeLength} (maximum: ${MAX_POST_LENGTH})`,
					},
				],
			};
		}

		try {
			// Create the post options with any type to avoid type issues
			// biome-ignore lint/suspicious/noExplicitAny: Required for compatibility with the Bluesky post API
			const postOptions: any = {
				text: richText.text,
				facets: richText.facets,
			};

			// Handle reply context if the original post was a reply
			if (originalPost.reply) {
				postOptions.reply = originalPost.reply;
			}

			// Create a record that shows this is an edit of a previous post
			if (markAsEdit) {
				postOptions.embed = {
					$type: "app.bsky.embed.record",
					record: {
						uri: uri,
						cid: originalPost.cid,
					},
				};
			}

			// Create the edited post
			const response = await agent.post(postOptions);

			// Now, delete the original post if successful
			try {
				await agent.deletePost(uri);

				return {
					content: [
						{
							type: "text",
							text: `Successfully edited post. Original post deleted and replaced with: ${response.uri}`,
						},
					],
				};
			} catch (deleteError) {
				// If we couldn't delete the original, let the user know but return success for the edit
				return {
					content: [
						{
							type: "text",
							text: `Created edited post (${response.uri}) but could not delete the original post. You may want to delete it manually.`,
						},
					],
				};
			}
		} catch (error) {
			if (error instanceof Error) {
				return {
					content: [
						{ type: "text", text: `Failed to edit post: ${error.message}` },
					],
				};
			}
			throw error;
		}
	} catch (error) {
		// Handle validation errors
		if (error instanceof z.ZodError) {
			const errorMessages = error.errors.map((e) => e.message).join(", ");
			return {
				content: [{ type: "text", text: `Invalid input: ${errorMessages}` }],
			};
		}
		if (error instanceof Error) {
			return {
				content: [{ type: "text", text: `Error: ${error.message}` }],
			};
		}

		return {
			content: [{ type: "text", text: "An unknown error occurred" }],
		};
	}
}

// Helper function to get post details
async function getPostDetails(agent: AtpAgent, uri: string) {
	try {
		// Extract post components from URI
		const matches = uri.match(
			/at:\/\/(did:plc:[a-zA-Z0-9]+)\/([^\/]+)\/([a-zA-Z0-9]+)/,
		);

		if (!matches || matches.length < 4) {
			throw new Error(`Invalid URI format: ${uri}`);
		}

		const did = matches[1];
		const collection = matches[2];
		const rkey = matches[3];

		// Get the post record
		const record = await agent.api.com.atproto.repo.getRecord({
			repo: did,
			collection,
			rkey,
		});

		if (!record.data || !record.data.value) {
			return null;
		}

		// Create a result object with needed info
		// biome-ignore lint/suspicious/noExplicitAny: Required to handle dynamic post structure
		const result: any = {
			uri,
			cid: record.data.cid,
		};

		// Extract values from the record
		// biome-ignore lint/suspicious/noExplicitAny: The record value structure is dynamic and varies
		const value = record.data.value as any;

		// Extract text
		if (value && typeof value === "object" && "text" in value) {
			result.text = String(value.text);
		}

		// Extract reply info
		if (value && typeof value === "object" && "reply" in value) {
			result.reply = value.reply;
		}

		// Extract facets
		if (value && typeof value === "object" && "facets" in value) {
			result.facets = value.facets;
		}

		return result;
	} catch (error) {
		console.error("Error getting post details:", error);
		return null;
	}
}

// Helper function to get a better approximation of grapheme length
function getGraphemeLength(text: string): number {
	// Use Intl.Segmenter if available
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

	// Fallback for environments without Intl.Segmenter
	return text.length;
}
