import type { AtpAgent } from "@atproto/api";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const UpdateProfileArgumentsSchema = z.object({
	displayName: z.string().max(64).optional(),
	description: z.string().max(256).optional(),
	// External link such as website
	externalUrl: z.string().url().max(256).optional(),
});

export const updateProfileTool: Tool = {
	name: "bluesky_update_profile",
	description: "Update your profile information",
	inputSchema: {
		type: "object",
		properties: {
			displayName: {
				type: "string",
				description: "The display name to set (max 64 characters)",
			},
			description: {
				type: "string",
				description: "The bio/description to set (max 256 characters)",
			},
			externalUrl: {
				type: "string",
				description: "The external URL/website to set (must be a valid URL)",
			},
		},
	},
};

export async function handleUpdateProfile(
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	const { displayName, description, externalUrl } = UpdateProfileArgumentsSchema.parse(args);

	// At least one field must be provided
	if (!displayName && !description && !externalUrl) {
		throw new Error("At least one field (displayName, description, or externalUrl) must be provided");
	}

	// Build the profile object with only the fields that are provided
	const profile: Record<string, string> = {};
	if (displayName !== undefined) profile.displayName = displayName;
	if (description !== undefined) profile.description = description;
	if (externalUrl !== undefined) profile.externalUrl = externalUrl;

	const response = await agent.api.com.atproto.repo.putRecord({
		repo: agent.session?.did || "",
		collection: "app.bsky.actor.profile",
		rkey: "self",
		record: profile,
	});

	return {
		content: [{ type: "text", text: JSON.stringify(response) }],
	};
}