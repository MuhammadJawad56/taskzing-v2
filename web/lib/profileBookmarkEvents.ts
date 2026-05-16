/** Dispatched on `window` after a profile bookmark is removed from storage. */
export const PROFILE_UNSAVED_EVENT = "taskzing-profile-unsaved";

/** Dispatched after a new profile bookmark is written to storage (show “saved” toast). */
export const PROFILE_SAVED_EVENT = "taskzing-profile-saved";

/**
 * Dispatched after bookmark is removed from the “Profile saved!” toast UNDO.
 * Does not fire PROFILE_UNSAVED (avoids stacking the black snackbar).
 */
export const PROFILE_SAVED_UNDONE_EVENT = "taskzing-profile-saved-undone";

/** Dispatched after UNDO on the “unsaved” snackbar re-bookmarks a profile (same-tab UI sync). */
export const PROFILE_BOOKMARK_RESTORED_EVENT = "taskzing-profile-bookmark-restored";

export type ProfileUnsavedDetail = {
  bookmarkedBy: string;
  profileUserId: string;
};

export type ProfileSavedDetail = ProfileUnsavedDetail;

export type ProfileSavedUndoneDetail = {
  bookmarkedBy: string;
  profileUserId: string;
};

export type ProfileBookmarkRestoredDetail = {
  profileUserId: string;
};
