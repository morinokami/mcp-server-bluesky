import type { AtpAgent } from "@atproto/api";
import { deleteFollowTool, handleDeleteFollow } from "./delete-follow.js";
import { deleteLikeTool, handleDeleteLike } from "./delete-like.js";
import { deletePostTool, handleDeletePost } from "./delete-post.js";
import { deleteRepostTool, handleDeleteRepost } from "./delete-repost.js";
import { 
	createDraftTool, 
	deleteDraftTool, 
	getDraftTool, 
	handleCreateDraft, 
	handleDeleteDraft, 
	handleGetDraft, 
	handleListDrafts, 
	handlePublishDraft, 
	listDraftsTool, 
	publishDraftTool 
} from "./draft-post.js";
import { followTool, handleFollow } from "./follow.js";
import { getFollowersTool, handleGetFollowers } from "./get-followers.js";
import { getFollowsTool, handleGetFollows } from "./get-follows.js";
import { getLikesTool, handleGetLikes } from "./get-likes.js";
import { getPostThreadTool, handleGetPostThread } from "./get-post-thread.js";
import { getProfileTool, handleGetProfile } from "./get-profile.js";
import { getTimelineTool, handleGetTimeline } from "./get-timeline.js";
import { handleLike, likeTool } from "./like.js";
import { handlePost, postTool } from "./post.js";
import { handleQuotePost, quotePostTool } from "./quote-post.js";
import { handleRepost, repostTool } from "./repost.js";
import { handleSearchPosts, searchPostsTool } from "./search-posts.js";
import { handleUpdateBio, updateBioTool } from "./update-bio.js";
import { handleUpdateDisplayName, updateDisplayNameTool } from "./update-display-name.js";
import { handleUpdateExternalUrl, updateExternalUrlTool } from "./update-external-url.js";

export const tools = [
	createDraftTool,
	deleteDraftTool,
	deleteFollowTool,
	deleteLikeTool,
	deletePostTool,
	deleteRepostTool,
	followTool,
	getDraftTool,
	getFollowersTool,
	getFollowsTool,
	getLikesTool,
	getPostThreadTool,
	getProfileTool,
	getTimelineTool,
	likeTool,
	listDraftsTool,
	postTool,
	publishDraftTool,
	quotePostTool,
	repostTool,
	searchPostsTool,
	updateBioTool,
	updateDisplayNameTool,
	updateExternalUrlTool,
];

export function handleToolCall(
	name: string,
	agent: AtpAgent,
	args?: Record<string, unknown>,
) {
	if (name === deleteFollowTool.name) {
		return handleDeleteFollow(agent, args);
	}
	if (name === deleteLikeTool.name) {
		return handleDeleteLike(agent, args);
	}
	if (name === deletePostTool.name) {
		return handleDeletePost(agent, args);
	}
	if (name === deleteRepostTool.name) {
		return handleDeleteRepost(agent, args);
	}
	if (name === followTool.name) {
		return handleFollow(agent, args);
	}
	if (name === getFollowersTool.name) {
		return handleGetFollowers(agent, args);
	}
	if (name === getFollowsTool.name) {
		return handleGetFollows(agent, args);
	}
	if (name === getLikesTool.name) {
		return handleGetLikes(agent, args);
	}
	if (name === getPostThreadTool.name) {
		return handleGetPostThread(agent, args);
	}
	if (name === getProfileTool.name) {
		return handleGetProfile(agent, args);
	}
	if (name === getTimelineTool.name) {
		return handleGetTimeline(agent, args);
	}
	if (name === likeTool.name) {
		return handleLike(agent, args);
	}
	if (name === postTool.name) {
		return handlePost(agent, args);
	}
	if (name === repostTool.name) {
		return handleRepost(agent, args);
	}
	if (name === searchPostsTool.name) {
		return handleSearchPosts(agent, args);
	}
	if (name === updateDisplayNameTool.name) {
		return handleUpdateDisplayName(agent, args);
	}
	if (name === updateBioTool.name) {
		return handleUpdateBio(agent, args);
	}
	if (name === updateExternalUrlTool.name) {
		return handleUpdateExternalUrl(agent, args);
	}
	if (name === quotePostTool.name) {
		return handleQuotePost(agent, args);
	}
	if (name === createDraftTool.name) {
		return handleCreateDraft(agent, args);
	}
	if (name === listDraftsTool.name) {
		return handleListDrafts(agent, args);
	}
	if (name === getDraftTool.name) {
		return handleGetDraft(agent, args);
	}
	if (name === publishDraftTool.name) {
		return handlePublishDraft(agent, args);
	}
	if (name === deleteDraftTool.name) {
		return handleDeleteDraft(agent, args);
	}

	throw new Error(`Unknown tool: ${name}`);
}
