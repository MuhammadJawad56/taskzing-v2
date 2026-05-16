"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { SearchUserRow } from "@/lib/api/usersSearch";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const ROLE_KEYS = ["All", "Provider", "Client"] as const;

export function ReelPeopleDiscoverySheet({
  open,
  onClose,
  searchUsers,
  getFollowStatus,
  followUser,
  unfollowUser,
  onFollowSuccess,
}: {
  open: "search" | "filter" | null;
  onClose: () => void;
  searchUsers: (p: { query?: string; role?: string | null; limit?: number }) => Promise<SearchUserRow[]>;
  getFollowStatus: (userId: string) => Promise<boolean>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  onFollowSuccess?: () => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<(typeof ROLE_KEYS)[number]>("All");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SearchUserRow[]>([]);
  const [followState, setFollowState] = useState<Record<string, boolean>>({});

  const showRoleFilter = open === "filter";
  const title = open === "filter" ? t("reels.filterPeopleTitle") : t("reels.searchPeopleTitle");

  const roleLabel = (role: (typeof ROLE_KEYS)[number]) => {
    if (role === "All") return t("reels.roleAll");
    if (role === "Provider") return t("reels.roleProvider");
    return t("reels.roleClient");
  };

  const runSearch = useCallback(
    async (roleFixed?: (typeof ROLE_KEYS)[number]) => {
      setLoading(true);
      try {
        const sel = roleFixed ?? selectedRole;
        const roleParam = sel === "All" ? null : sel;
        const result = await searchUsers({
          query: query.trim(),
          role: roleParam,
          limit: 30,
        });
        const nextFollow: Record<string, boolean> = {};
        for (const user of result) {
          const id = String(user.id ?? "");
          if (!id) continue;
          try {
            nextFollow[id] = await getFollowStatus(id);
          } catch {
            nextFollow[id] = false;
          }
        }
        setUsers(result);
        setFollowState(nextFollow);
      } finally {
        setLoading(false);
      }
    },
    [query, selectedRole, searchUsers, getFollowStatus],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedRole("All");
    setUsers([]);
    setFollowState({});
    setLoading(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0" aria-label={t("common.cancel")} onClick={onClose} />
      <div
        className="relative z-[1] flex max-h-[72vh] w-full max-w-lg flex-col rounded-t-2xl bg-zinc-900/95 p-3 pb-[env(safe-area-inset-bottom,12px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void runSearch()}
          placeholder={t("reels.searchPlaceholder")}
          className="mt-2.5 w-full rounded-xl border-0 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50 outline-none"
        />
        {showRoleFilter ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ROLE_KEYS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setSelectedRole(role);
                  void runSearch(role);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  selectedRole === role ? "bg-white text-black" : "bg-white/10 text-white"
                }`}
              >
                {roleLabel(role)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={() => void runSearch()} className="text-sm text-white/90 underline">
            {t("reels.searchAction")}
          </button>
        </div>
        <div className="mt-2 min-h-[200px] flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/60">{t("reels.noPeopleFound")}</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {users.map((user) => {
                const id = String(user.id ?? "");
                const username = String(user.username ?? "user");
                const fullName = String(user.fullName ?? user.full_name ?? "");
                const role = String(user.currentRole ?? user.role ?? "");
                const isFollowing = followState[id] ?? false;
                return (
                  <li key={id || username} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white/70">
                      <span className="text-sm">👤</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {fullName.trim() ? fullName : `@${username}`}
                      </p>
                      <p className="truncate text-xs text-white/60">
                        @{username}
                        {role ? ` • ${role}` : ""}
                      </p>
                    </div>
                    {id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const next = !isFollowing;
                          try {
                            if (next) await followUser(id);
                            else await unfollowUser(id);
                            setFollowState((s) => ({ ...s, [id]: next }));
                            if (next) onFollowSuccess?.();
                          } catch {
                            /* ignore */
                          }
                        }}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          isFollowing ? "bg-white/10 text-white/80" : "bg-white text-black"
                        }`}
                      >
                        {isFollowing ? t("reels.followingLabel") : t("reels.follow")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
