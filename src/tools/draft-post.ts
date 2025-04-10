import type { AtpAgent } from "@atproto/api";
import { RichText } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Maximum post length for Bluesky
const MAX_POST_LENGTH = 300;

// Draft storage (in-memory)
// This will reset when the server restarts
interface DraftPost {
	content: string;
	title?: string;
	chunks?: string[];
	createdAt: string;
	updatedAt: string;
}

// Store for drafts with a Map
const drafts = new Map<string, DraftPost>();

// Schema for creating a draft
const CreateDraftArgumentsSchema = z.object({
	content: z.string().min(1, "Draft content cannot be empty"),
	title: z.string().optional(),
});

// Schema for retrieving a draft
const GetDraftArgumentsSchema = z.object({
	draftId: z.string().min(1, "Draft ID cannot be empty"),
});

// Schema for listing drafts
const ListDraftsArgumentsSchema = z.object({
	limit: z.number().min(1).max(50).optional().default(10),
});

// Schema for publishing a draft
const PublishDraftArgumentsSchema = z.object({
	draftId: z.string().min(1, "Draft ID cannot be empty"),
});

// Schema for deleting a draft
const DeleteDraftArgumentsSchema = z.object({
	draftId: z.string().min(1, "Draft ID cannot be empty"),
});

// Export tool definitions
export const createDraftTool: Tool = {
	name: "bluesky_create_draft",
	description:
		"CREATE LONG POSTS (>300 CHARACTERS): Create a draft post of any length that will be intelligently split into a thread when published. Use this for posting content longer than 300 characters.",
	inputSchema: {
		type: "object",
		properties: {
			content: {
				type: "string",
				description:
					"The content of your draft post, can be of ANY LENGTH (unlimited) and will be automatically split into multiple posts with smart sentence/paragraph boundaries",
			},
			title: {
				type: "string",
				description:
					"Optional title for the draft (for your reference only, won't be published)",
			},
		},
		required: ["content"],
	},
};

export const listDraftsTool: Tool = {
	name: "bluesky_list_drafts",
	description: "List all available draft posts",
	inputSchema: {
		type: "object",
		properties: {
			limit: {
				type: "number",
				description:
					"Maximum number of drafts to return (default: 10, max: 50)",
			},
		},
	},
};

export const getDraftTool: Tool = {
	name: "bluesky_get_draft",
	description: "Get a specific draft post by ID",
	inputSchema: {
		type: "object",
		properties: {
			draftId: {
				type: "string",
				description: "The ID of the draft to retrieve",
			},
		},
		required: ["draftId"],
	},
};

export const publishDraftTool: Tool = {
	name: "bluesky_publish_draft",
	description:
		"Publish a long draft post as a thread (automatically splits content longer than 300 characters into multiple posts)",
	inputSchema: {
		type: "object",
		properties: {
			draftId: {
				type: "string",
				description: "The ID of the draft to publish as a thread",
			},
		},
		required: ["draftId"],
	},
};

export const deleteDraftTool: Tool = {
	name: "bluesky_delete_draft",
	description: "Delete a draft post",
	inputSchema: {
		type: "object",
		properties: {
			draftId: {
				type: "string",
				description: "The ID of the draft to delete",
			},
		},
		required: ["draftId"],
	},
};

// Handler functions
export async function handleCreateDraft(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	try {
		const { content, title } = CreateDraftArgumentsSchema.parse(args);

		// Generate a random ID for the draft
		const draftId = generateDraftId();
		const now = new Date().toISOString();

		// Store the draft
		const draft: DraftPost = {
			content,
			title,
			createdAt: now,
			updatedAt: now,
		};

		// Split the content into chunks suitable for posting
		draft.chunks = splitContentIntoChunks(content);

		// Save the draft
		drafts.set(draftId, draft);

		// Preview how the thread will appear
		const preview =
			draft.chunks
				?.map(
					(chunk, index) =>
						`Post ${index + 1}/${draft.chunks?.length}: ${chunk.length} chars\n${chunk}`,
				)
				.join("\n\n---\n\n") || "";

		return {
			content: [
				{
					type: "text",
					text: `Draft created with ID: ${draftId}\n\nPreview of thread (${draft.chunks?.length || 0} posts):\n\n${preview}`,
				},
			],
		};
	} catch (error) {
		return handleError(error);
	}
}

export async function handleListDrafts(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	try {
		const { limit } = ListDraftsArgumentsSchema.parse(args);

		if (drafts.size === 0) {
			return {
				content: [
					{
						type: "text",
						text: "No drafts available. Create a draft first with bluesky_create_draft.",
					},
				],
			};
		}

		// Format the drafts list
		let draftList = "";
		let count = 0;

		for (const [id, draft] of drafts.entries()) {
			if (count >= limit) break;

			const createdDate = new Date(draft.createdAt).toLocaleString();
			const title = draft.title || "Untitled";
			const contentPreview =
				draft.content.length > 50
					? `${draft.content.substring(0, 47)}...`
					: draft.content;
			const postCount = draft.chunks?.length || 0;

			draftList += `ID: ${id}\nTitle: ${title}\nCreated: ${createdDate}\nPosts: ${postCount}\nPreview: ${contentPreview}\n\n`;
			count++;
		}

		return {
			content: [
				{
					type: "text",
					text: `Available drafts (${Math.min(drafts.size, limit)} of ${drafts.size}):\n\n${draftList}`,
				},
			],
		};
	} catch (error) {
		return handleError(error);
	}
}

export async function handleGetDraft(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	try {
		const { draftId } = GetDraftArgumentsSchema.parse(args);

		const draft = drafts.get(draftId);
		if (!draft) {
			return {
				content: [
					{ type: "text", text: `Draft with ID ${draftId} not found.` },
				],
			};
		}

		// Format the draft preview with all chunks
		const preview = draft.chunks
			?.map(
				(chunk, index) =>
					`Post ${index + 1}/${draft.chunks?.length}: ${chunk.length} chars\n${chunk}`,
			)
			.join("\n\n---\n\n");

		const createdDate = new Date(draft.createdAt).toLocaleString();
		const updatedDate = new Date(draft.updatedAt).toLocaleString();
		const title = draft.title || "Untitled";

		return {
			content: [
				{
					type: "text",
					text: `Draft ID: ${draftId}\nTitle: ${title}\nCreated: ${createdDate}\nUpdated: ${updatedDate}\nPosts: ${draft.chunks?.length}\n\nContent:\n\n${preview}`,
				},
			],
		};
	} catch (error) {
		return handleError(error);
	}
}

export async function handlePublishDraft(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	try {
		const { draftId } = PublishDraftArgumentsSchema.parse(args);

		const draft = drafts.get(draftId);
		if (!draft) {
			return {
				content: [
					{ type: "text", text: `Draft with ID ${draftId} not found.` },
				],
			};
		}

		if (!draft.chunks || draft.chunks.length === 0) {
			return {
				content: [{ type: "text", text: "Draft has no content to publish." }],
			};
		}

		// Publish the thread
		let parentUri: string | undefined;
		let rootUri: string | undefined;
		const postUris: string[] = [];

		// Process each chunk in sequence to create a thread
		for (const chunk of draft.chunks) {
			// Process for rich text
			const richText = new RichText({ text: chunk });
			await richText.detectFacets(agent);

			try {
				let response: { uri: string; cid: string };

				if (!parentUri) {
					// First post in the thread
					response = await agent.post({
						text: richText.text,
						facets: richText.facets,
					});

					// Save the root URI for later posts
					rootUri = response.uri;
				} else {
					// Reply to previous post in the thread
					const parentCid = await getCidFromUri(agent, parentUri);

					// rootUri should always be defined at this point since we set it from the first post
					// but we'll add a safety check just to be sure
					if (!rootUri) {
						throw new Error("Root post URI is missing for a thread reply");
					}

					const rootCid = await getCidFromUri(agent, rootUri);

					response = await agent.post({
						text: richText.text,
						facets: richText.facets,
						reply: {
							parent: { uri: parentUri, cid: parentCid },
							root: { uri: rootUri, cid: rootCid },
						},
					});
				}

				// Update for next post in thread
				parentUri = response.uri;
				postUris.push(response.uri);

				// Short delay to ensure proper ordering
				await new Promise((resolve) => setTimeout(resolve, 500));
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error publishing post ${postUris.length + 1}/${draft.chunks.length}: ${error instanceof Error ? error.message : "Unknown error"}\n\nAlready published ${postUris.length} posts.`,
						},
					],
				};
			}
		}

		// Delete the draft after successful publishing
		drafts.delete(draftId);

		return {
			content: [
				{
					type: "text",
					text: `Successfully published thread with ${postUris.length} posts.\nRoot post: ${postUris[0]}`,
				},
			],
		};
	} catch (error) {
		return handleError(error);
	}
}

export async function handleDeleteDraft(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	try {
		const { draftId } = DeleteDraftArgumentsSchema.parse(args);

		if (!drafts.has(draftId)) {
			return {
				content: [
					{ type: "text", text: `Draft with ID ${draftId} not found.` },
				],
			};
		}

		drafts.delete(draftId);

		return {
			content: [{ type: "text", text: `Draft ${draftId} deleted.` }],
		};
	} catch (error) {
		return handleError(error);
	}
}

// Helper function to generate a unique draft ID
function generateDraftId(): string {
	const charset =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let id = "";
	for (let i = 0; i < 8; i++) {
		id += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return id;
}

// Helper function to split content into chunks that respect the character limit
// and try to break at natural points like paragraphs or sentences
function splitContentIntoChunks(content: string): string[] {
	const chunks: string[] = [];
	const paragraphs = content.split(/\n\s*\n/); // Split on paragraph breaks

	let currentChunk = "";

	for (const paragraph of paragraphs) {
		// If paragraph itself exceeds limit, we need to split it by sentences
		if (getGraphemeLength(paragraph) > MAX_POST_LENGTH) {
			const sentences = paragraph.split(/(?<=[.!?])\s+/);

			for (const sentence of sentences) {
				// If adding this sentence would exceed the limit, start a new chunk
				if (
					getGraphemeLength(
						currentChunk + (currentChunk ? " " : "") + sentence,
					) > MAX_POST_LENGTH
				) {
					// If the sentence itself is too long, split by words
					if (getGraphemeLength(sentence) > MAX_POST_LENGTH) {
						const words = sentence.split(/\s+/);
						let wordChunk = "";

						for (const word of words) {
							if (
								getGraphemeLength(wordChunk + (wordChunk ? " " : "") + word) >
								MAX_POST_LENGTH
							) {
								// If we already have a current chunk, add the word chunk to it if possible
								if (
									currentChunk &&
									getGraphemeLength(`${currentChunk} ${wordChunk}`) <=
										MAX_POST_LENGTH
								) {
									currentChunk += ` ${wordChunk}`;
									wordChunk = word;
								} else {
									// Otherwise finish the current chunk and start a new one
									if (currentChunk) chunks.push(currentChunk);
									currentChunk = wordChunk;
									wordChunk = word;
								}
							} else {
								wordChunk += (wordChunk ? " " : "") + word;
							}
						}

						// Add any remaining word chunk
						if (wordChunk) {
							if (
								currentChunk &&
								getGraphemeLength(`${currentChunk} ${wordChunk}`) <=
									MAX_POST_LENGTH
							) {
								currentChunk += ` ${wordChunk}`;
							} else {
								if (currentChunk) chunks.push(currentChunk);
								currentChunk = wordChunk;
							}
						}
					} else {
						// Normal case, sentence fits in its own chunk
						if (currentChunk) chunks.push(currentChunk);
						currentChunk = sentence;
					}
				} else {
					// Add sentence to current chunk
					currentChunk += (currentChunk ? " " : "") + sentence;
				}
			}
		} else if (
			getGraphemeLength(
				currentChunk + (currentChunk ? "\n\n" : "") + paragraph,
			) > MAX_POST_LENGTH
		) {
			// This paragraph would exceed the limit, so start a new chunk
			chunks.push(currentChunk);
			currentChunk = paragraph;
		} else {
			// Add paragraph to current chunk
			currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
		}
	}

	// Add the final chunk if it's not empty
	if (currentChunk) {
		chunks.push(currentChunk);
	}

	return chunks;
}

// Helper function to get grapheme length (same as in post.ts)
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
	const emojiPattern = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
	const combiningPattern = /\p{M}/gu;

	// Replace emoji with single characters and remove combining marks
	const normalizedText = text
		.replace(emojiPattern, "*") // Count each emoji as one
		.replace(combiningPattern, ""); // Remove combining marks

	return normalizedText.length;
}

// Helper function to get CID from URI
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
		throw new Error(
			`Failed to get CID for URI ${uri}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

// Common error handler
function handleError(error: unknown) {
	if (error instanceof z.ZodError) {
		const errorMessages = error.errors.map((e) => e.message).join(", ");
		return {
			content: [{ type: "text", text: `Validation error: ${errorMessages}` }],
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
