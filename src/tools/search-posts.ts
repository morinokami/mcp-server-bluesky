import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Enhanced search arguments with additional filters
const SearchPostsArgumentsSchema = z.object({
	q: z.string().min(1, "Search query cannot be empty"),
	limit: z.number().min(1).max(100).optional().default(25),
	cursor: z.string().optional(),
	// Add date range filtering
	since: z.string().optional().describe("Filter posts since this date (ISO format, e.g. 2023-01-01)"),
	until: z.string().optional().describe("Filter posts until this date (ISO format, e.g. 2023-01-31)"),
	// Add user filtering
	author: z.string().optional().describe("Filter by specific author (handle or DID)"),
	// Add hashtag filtering
	hashtag: z.string().optional().describe("Filter by hashtag (without the # symbol)"),
	// Add boolean filters
	includeReplies: z.boolean().optional().default(true).describe("Include replies in search results"),
	includeQuotes: z.boolean().optional().default(true).describe("Include quote posts in search results"),
});

export const searchPostsTool: Tool = {
	name: "bluesky_search_posts",
	description: "Search posts with enhanced filtering options",
	inputSchema: {
		type: "object",
		properties: {
			q: {
				type: "string",
				description: "The search query. Use quotes for exact phrases. Can include special filters like from:user, has:media, etc.",
			},
			limit: {
				type: "number",
				description: "The maximum number of posts to fetch (default: 25, max: 100)",
			},
			cursor: {
				type: "string",
				description: "The cursor to use for pagination (get this from previous search results)",
			},
			since: {
				type: "string",
				description: "Filter posts since this date (ISO format, e.g. 2023-01-01)",
			},
			until: {
				type: "string",
				description: "Filter posts until this date (ISO format, e.g. 2023-01-31)",
			},
			author: {
				type: "string",
				description: "Filter by specific author (handle or DID)",
			},
			hashtag: {
				type: "string",
				description: "Filter by hashtag (without the # symbol)",
			},
			includeReplies: {
				type: "boolean",
				description: "Include replies in search results (default: true)",
			},
			includeQuotes: {
				type: "boolean",
				description: "Include quote posts in search results (default: true)",
			},
		},
		required: ["q"],
	},
};

export async function handleSearchPosts(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	try {
		const { 
			q, limit, cursor, since, until, author, hashtag, includeReplies, includeQuotes 
		} = SearchPostsArgumentsSchema.parse(args);

		// Build search query with additional filters
		let searchQuery = q;

		// Add date filters if provided
		if (since) {
			searchQuery += ` since:${since}`;
		}
		if (until) {
			searchQuery += ` until:${until}`;
		}

		// Add author filter if provided
		if (author) {
			searchQuery += ` from:${author}`;
		}

		// Add hashtag filter if provided
		if (hashtag) {
			searchQuery += ` #${hashtag}`;
		}

		// Add reply and quote filters
		if (includeReplies === false) {
			searchQuery += " -is:reply";
		}
		if (includeQuotes === false) {
			searchQuery += " -is:quote";
		}

		// Execute the search
		const response = await agent.app.bsky.feed.searchPosts({ 
			q: searchQuery, 
			limit, 
			cursor 
		});

		// Format results in a more readable way
		const posts = response.data.posts;
		let formattedResults = "";

		if (!posts || posts.length === 0) {
			formattedResults = "No posts found matching your search criteria.";
		} else {
			formattedResults = `Found ${posts.length} posts (${response.data.hitsTotal} total matches):\n\n`;
			
			posts.forEach((post: any, index: number) => {
				const author = post.author?.displayName || post.author?.handle || "Unknown";
				// Safely get text from record
				let text = "No content";
				if (post.record && typeof post.record === 'object' && 'text' in post.record) {
					text = post.record.text;
				}
				
				const timestamp = post.indexedAt ? new Date(post.indexedAt).toLocaleString() : "Unknown time";
				
				formattedResults += `${index + 1}. @${author}: ${text}\n`;
				formattedResults += `   [Posted: ${timestamp}`;
				
				// Add engagement metrics if available
				if (post.likeCount) formattedResults += `, Likes: ${post.likeCount}`;
				if (post.repostCount) formattedResults += `, Reposts: ${post.repostCount}`;
				formattedResults += `]\n`;
				
				// Add URI for reference
				formattedResults += `   URI: ${post.uri}\n\n`;
			});
			
			// Add pagination info
			if (response.data.cursor) {
				formattedResults += `\nFor more results, use cursor: ${response.data.cursor}`;
			}
		}

		return {
			content: [{ type: "text", text: formattedResults }],
		};
	} catch (error) {
		// Improved error handling
		if (error instanceof z.ZodError) {
			const errorMessages = error.errors.map(e => e.message).join(", ");
			return {
				content: [{ 
					type: "text", 
					text: `Search parameter validation failed: ${errorMessages}` 
				}],
			};
		} else if (error instanceof Error) {
			return {
				content: [{ 
					type: "text", 
					text: `Search failed: ${error.message}. This might be due to rate limiting or an invalid search query.` 
				}],
			};
		}
		
		return {
			content: [{ type: "text", text: "Search failed due to an unknown error" }],
		};
	}
}