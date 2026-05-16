export const DRAFT_SAVED_EVENT = "taskzing:draft-saved";

export type DraftSavedDetail = {
  message: string;
};

export function showDraftSavedSnackbar(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DraftSavedDetail>(DRAFT_SAVED_EVENT, {
      detail: { message },
    }),
  );
}
