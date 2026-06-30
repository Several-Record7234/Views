export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "feat" | "fix" | "change";
    text: string;
  }[];
}

/**
 * Changelog entries, newest first.
 * Only versions listed here trigger the "What's New" modal.
 * Patch bumps without entries are silently skipped.
 */
export const changelog: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2026-06-30",
    changes: [
      {
        type: "feat",
        text: "**Named viewport presets:** save the current view as a named location and jump back to it instantly from the preset list.",
      },
      {
        type: "feat",
        text: "**Player Images:** the *Player Images* button flies the viewport to frame all non-GM player tokens in one click.",
      },
      {
        type: "feat",
        text: "**Reset View:** the *Reset View* button returns the viewport to the Scene Default.",
      },
      {
        type: "feat",
        text: "**Automatic import:** presets saved with the original Viewport Presets extension carry over the first time you open a Scene in Views.",
      },
    ],
  },
];

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function getUnseenEntries(
  log: ChangelogEntry[],
  lastSeen: string | null,
): ChangelogEntry[] {
  if (!lastSeen) return [];
  return log.filter((e) => compareVersions(e.version, lastSeen) > 0);
}
