import type { AtpAgent } from "@atproto/api";
import { deleteFollowTool, handleDeleteFollow } from "./delete-follow.js";
import { deleteLikeTool, handleDeleteLike } from "./delete-like.js";
import { deletePostTool, handleDeletePost } from "./delete-post.js";
import { deleteRepostTool, handleDeleteRepost } from "./delete-repost.js";
import { followTool, handleFollow } from "./follow.js";
import { getFollowersTool, handleGetFollowers } from "./get-followers.js";
import { getFollowsTool, handleGetFollows } from "./get-follows.js";
import { getLikesTool, handleGetLikes } from "./get-likes.js";
import { getPostThreadTool, handleGetPostThread } from "./get-post-thread.js";
import { getProfileTool, handleGetProfile } from "./get-profile.js";
import { getTimelineTool, handleGetTimeline } from "./get-timeline.js";
import { handleLike, likeTool } from "./like.js";
import { handlePost, postTool } from "./post.js";
import { handleRepost, repostTool } from "./repost.js";
import { handleSearchPosts, searchPostsTool } from "./search-posts.js";
import { handleUpdateProfile, updateProfileTool } from "./update-profile.js";

export const tools = [
	deleteFollowTool,
	deleteLikeTool,
	deletePostTool,
	deleteRepostTool,
	followTool,
	getFollowersTool,
	getFollowsTool,
	getLikesTool,
	getPostThreadTool,
	getProfileTool,
	getTimelineTool,
	likeTool,
	postTool,
	repostTool,
	searchPostsTool,
	updateProfileTool,
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
	if (name === updateProfileTool.name) {
		return handleUpdateProfile(agent, args);
	}

	throw new Error(`Unknown tool: ${name}`);
}
