"use client";

import { useState } from "react";

import type { PokeContact, SerializedPoke } from "@/lib/poke";

import { NudgeCard } from "@/components/poke/nudge-card";
import { PokeContactsList } from "@/components/poke/poke-contacts-list";
import { SendPokeSheet } from "@/components/poke/send-poke-sheet";

type NudgesPanelProps = {
  received: SerializedPoke[];
  sent: SerializedPoke[];
  contacts: PokeContact[];
};

function sectionHeading(label: string) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-muted-light">
      {label}
    </h2>
  );
}

export function NudgesPanel({ received, sent, contacts }: NudgesPanelProps) {
  const [pokeBackContact, setPokeBackContact] = useState<PokeContact | null>(
    null,
  );
  const isEmpty = received.length === 0 && sent.length === 0;

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <p className="py-6 text-center text-sm text-muted">No nudges yet.</p>
      ) : (
        <>
          {received.length > 0 ? (
            <section className="space-y-2">
              {sectionHeading("Received")}
              <ul className="space-y-2">
                {received.map((poke) => (
                  <NudgeCard
                    key={`received-${poke.id}`}
                    poke={poke}
                    direction="received"
                    onPokeBack={setPokeBackContact}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {sent.length > 0 ? (
            <section className="space-y-2">
              {sectionHeading("Sent")}
              <ul className="space-y-2">
                {sent.map((poke) => (
                  <NudgeCard
                    key={`sent-${poke.id}`}
                    poke={poke}
                    direction="sent"
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {contacts.length > 0 ? (
        <section className="space-y-3 border-t border-border-soft pt-6">
          {sectionHeading("Send a nudge")}
          <p className="text-xs text-muted-light">
            People you share plans with. No feed, no replies — just a gentle check-in.
          </p>
          <PokeContactsList contacts={contacts} />
        </section>
      ) : null}

      <SendPokeSheet
        contact={pokeBackContact}
        open={pokeBackContact !== null}
        onClose={() => setPokeBackContact(null)}
      />
    </div>
  );
}
