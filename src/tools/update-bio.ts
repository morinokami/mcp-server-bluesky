import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const UpdateBioArgumentsSchema = z.object({
	bio: z.string().max(256),
});

export const updateBioTool: Tool = {
	name: "bluesky_update_bio",
	description: "Update your profile bio/description while preserving other profile fields",
	inputSchema: {
		type: "object",
		properties: {
			bio: {
				type: "string",
				description: "The bio/description to set (max 256 characters)",
			},
		},
		required: ["bio"],
	},
};

export async function handleUpdateBio(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { bio } = UpdateBioArgumentsSchema.parse(args);
	const did = agent.session?.did;
	
	if (!did) {
		throw new Error("Not logged in or session missing DID");
	}

	// Try to get the existing profile
	let existingProfile: Record<string, any> = {};
	
	try {
		const profileRecord = await agent.api.com.atproto.repo.getRecord({
			repo: did,
			collection: "app.bsky.actor.profile",
			rkey: "self",
		});
		
		if (profileRecord?.data?.value) {
			existingProfile = profileRecord.data.value as Record<string, any>;
		}
	} catch (error) {
		// If profile doesn't exist yet, we'll start with an empty one
		console.error("Could not retrieve existing profile:", error);
	}
	
	// Update just the bio/description while preserving all other fields
	const updatedProfile = {
		...existingProfile,
		description: bio, // The API uses "description" for the bio field
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