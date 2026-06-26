import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { NudgesPanel } from "@/components/poke/nudges-panel";
import { getPokeEligibleContacts, getPokeHistory } from "@/lib/poke";

export default async function NudgesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [history, contacts] = await Promise.all([
    getPokeHistory(userId),
    getPokeEligibleContacts(userId),
  ]);

  return (
    <section className="ui-page-stack mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Nudges"
        subtitle="Small check-ins, encouragements, and moments of connection."
      />

      <article className="ui-card-padded border border-border-soft">
        <NudgesPanel
          received={history.received}
          sent={history.sent}
          contacts={contacts}
        />
      </article>
    </section>
  );
}
