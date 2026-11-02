import Link from "next/link";
import { Suspense } from "react";

import { getLifeLabSectionData } from "@/lib/life-lab";
import { sortLifeLabNotes } from "@/lib/life-lab/browse";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import { excludeArchivedByKey, getArchivedLifeLabItemKeySet } from "@/lib/life-lab/item-state";
import { isPlaylistIndexNote, isYoutubeVideoNote } from "@/lib/life-lab/playlist-index";
import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { PageHeader } from "@/components/page-header";
import { LifeLabRefreshButton } from "./life-lab-refresh-button";
import { LifeLabSectionBrowser } from "./life-lab-section-browser";
import { LifeLabStatusPanel } from "./life-lab-status-panel";
import { LifeLabVideoRow } from "./life-lab-video-row";

function visibleNotes(notes: LifeLabNoteSummary[], archivedKeys: Set<string>) {
  return excludeArchivedByKey(notes, archivedKeys, (note) => buildNoteItemKey({
    sectionId: "youtube-learning", relativePath: note.relativePath,
    slug: note.slug, metadata: note.metadata,
  }));
}

function YoutubeIndexPreview({ notes, pending = true }: { notes: LifeLabNoteSummary[]; pending?: boolean }) {
  const videos = sortLifeLabNotes(notes.filter((note) => isYoutubeVideoNote(note)), "newest");
  const playlists = notes.filter((note) => isPlaylistIndexNote({ ...note, sectionId: "youtube-learning" }));
  return (
    <div className="space-y-6" aria-busy={pending}>
      {pending ? <p className="text-sm text-muted" role="status">Updating library details…</p> : null}
      {videos.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Videos</h2>
          <ul>{videos.slice(0, 8).map((note) => <LifeLabVideoRow key={note.slug} sectionId="youtube-learning" note={note} />)}</ul>
          {videos.length > 8 ? (
            <details><summary className="cursor-pointer text-sm text-muted">View all videos</summary>
              <ul>{videos.slice(8).map((note) => <LifeLabVideoRow key={note.slug} sectionId="youtube-learning" note={note} />)}</ul>
            </details>
          ) : null}
        </section>
      ) : null}
      {playlists.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Playlists</h2>
          <ul className="space-y-2">{playlists.map((note) => (
            <li key={note.slug}><Link prefetch={false} href={`/life-lab/youtube-learning/${note.slug}`} className="text-sm font-medium hover:underline">{note.title}</Link></li>
          ))}</ul>
        </section>
      ) : null}
    </div>
  );
}

async function YoutubeBrowseContent({ archivedKeys, isAdmin, showDiagnostics, initialNotes }: {
  archivedKeys: Set<string>; isAdmin: boolean; showDiagnostics: boolean; initialNotes: LifeLabNoteSummary[];
}) {
  const data = await getLifeLabSectionData("youtube-learning", { includeListingDiagnostic: showDiagnostics });
  if (data.availability.status !== "ready") {
    return <><LifeLabStatusPanel availability={data.availability} isAdmin={isAdmin} /><YoutubeIndexPreview notes={initialNotes} pending={false} /></>;
  }
  return <LifeLabSectionBrowser sectionId="youtube-learning" notes={data.notes}
    filterOptions={data.filterOptions} listingDiagnostic={data.listingDiagnostic}
    showDiagnostics={showDiagnostics} archivedItemKeys={[...archivedKeys]} />;
}

export async function LifeLabYoutubePage({ userId, isAdmin, showDiagnostics, refresh }: {
  userId: string; isAdmin: boolean; showDiagnostics: boolean; refresh: boolean;
}) {
  // Titles and links require only folder listings; do not wait for every body.
  const [index, archivedKeys] = await Promise.all([
    getLifeLabSectionData("youtube-learning", { indexOnly: true, refresh }),
    getArchivedLifeLabItemKeySet(userId),
  ]);
  const notes = visibleNotes(index.notes, archivedKeys);
  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-6">
      <PageHeader title="YouTube learning" subtitle="Videos and playlists."
        action={<div className="flex items-center gap-3">
          <Link href="/life-lab" className="text-sm font-medium text-muted hover:text-foreground">Back to Life Lab</Link>
          <LifeLabRefreshButton scope="section" sectionId="youtube-learning" compact />
        </div>} />
      {index.availability.status !== "ready" ? <LifeLabStatusPanel availability={index.availability} isAdmin={isAdmin} /> : (
        <Suspense fallback={<YoutubeIndexPreview notes={notes} />}>
          <YoutubeBrowseContent archivedKeys={archivedKeys} isAdmin={isAdmin} showDiagnostics={showDiagnostics} initialNotes={notes} />
        </Suspense>
      )}
    </section>
  );
}
