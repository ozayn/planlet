import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { PokeContactsList } from "@/components/poke/poke-contacts-list";
import { ReceivedPokesList } from "@/components/poke/received-pokes-list";
import { getPokeEligibleContacts, getRecentReceivedPokes } from "@/lib/poke";

export default async function PokePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [contacts, receivedPokes] = await Promise.all([
    getPokeEligibleContacts(userId),
    getRecentReceivedPokes(userId),
  ]);

  return (
    <section className="ui-page-stack mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Poke"
        subtitle="Send a quick, playful nudge to someone you've shared plans with."
      />

      {receivedPokes.length > 0 ? (
        <article className="ui-card-padded space-y-3 border border-border-soft">
          <h2 className="text-sm font-medium text-foreground">Recent nudges</h2>
          <ReceivedPokesList pokes={receivedPokes} />
        </article>
      ) : null}

      <article className="ui-card-padded space-y-3 border border-border-soft">
        <h2 className="text-sm font-medium text-foreground">Friends</h2>
        <p className="text-xs text-muted-light">
          People you share plans with. No feed, no replies — just a gentle nudge.
        </p>
        <PokeContactsList contacts={contacts} />
      </article>
    </section>
  );
}
