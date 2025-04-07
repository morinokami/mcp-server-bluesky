import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const UpdateDisplayNameArgumentsSchema = z.object({
	displayName: z.string().max(64),
});

export const updateDisplayNameTool: Tool = {
	name: "bluesky_update_display_name",
	description: "Update your display name while preserving other profile fields",
	inputSchema: {
		type: "object",
		properties: {
			displayName: {
				type: "string",
				description: "The display name to set (max 64 characters)",
			},
		},
		required: ["displayName"],
	},
};

export async function handleUpdateDisplayName(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { displayName } = UpdateDisplayNameArgumentsSchema.parse(args);
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
	
	// Update just the display name while preserving all other fields
	const updatedProfile = {
		...existingProfile,
		displayName,
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