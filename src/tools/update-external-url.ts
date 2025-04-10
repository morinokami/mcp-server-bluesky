import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Define a proper type for the profile object
interface BlueskyProfile {
	displayName?: string;
	description?: string;
	avatar?: string;
	banner?: string;
	externalUrl?: string;
	labels?: string[];
	[key: string]: unknown;
}

const UpdateExternalUrlArgumentsSchema = z.object({
	url: z.string().url().max(256),
});

export const updateExternalUrlTool: Tool = {
	name: "bluesky_update_external_url",
	description:
		"Update your profile's external URL while preserving other profile fields",
	inputSchema: {
		type: "object",
		properties: {
			url: {
				type: "string",
				description:
					"The external URL to set (max 256 characters, must be a valid URL)",
			},
		},
		required: ["url"],
	},
};

export async function handleUpdateExternalUrl(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { url } = UpdateExternalUrlArgumentsSchema.parse(args);
	const did = agent.session?.did;

	if (!did) {
		throw new Error("Not logged in or session missing DID");
	}

	// Try to get the existing profile
	let existingProfile: BlueskyProfile = {};

	try {
		const profileRecord = await agent.api.com.atproto.repo.getRecord({
			repo: did,
			collection: "app.bsky.actor.profile",
			rkey: "self",
		});

		if (profileRecord?.data?.value) {
			existingProfile = profileRecord.data.value as BlueskyProfile;
		}
	} catch (error) {
		// If profile doesn't exist yet, we'll start with an empty one
		console.error("Could not retrieve existing profile:", error);
	}

	// Update just the external URL while preserving all other fields
	const updatedProfile = {
		...existingProfile,
		externalUrl: url,
	};

	const response = await agent.api.com.atproto.repo.putRecord({
		repo: did,
		collection: "app.bsky.actor.profile",
		rkey: "self",
		record: updatedProfile,
	});

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}
