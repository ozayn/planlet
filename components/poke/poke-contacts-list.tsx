"use client";

import { useState } from "react";

import { UserAvatar } from "@/components/user-avatar";
import { formatPokeUserLabel } from "@/lib/poke-labels";
import type { PokeContact } from "@/lib/poke";

import { SendPokeSheet } from "./send-poke-sheet";

type PokeContactsListProps = {
  contacts: PokeContact[];
};

export function PokeContactsList({ contacts }: PokeContactsListProps) {
  const [selectedContact, setSelectedContact] = useState<PokeContact | null>(
    null,
  );

  if (contacts.length === 0) {
    return (
      <p className="text-sm text-muted">
        Share a plan with someone first, then you can send them a poke here.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {contacts.map((contact) => {
          const label = formatPokeUserLabel(contact);

          return (
            <li
              key={contact.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-soft/80 bg-surface/60 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  name={contact.name}
                  email={contact.email}
                  image={contact.image}
                  size="sm"
                />
                <p className="truncate text-sm font-medium text-foreground" dir="auto">
                  {label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContact(contact)}
                className="ui-btn-secondary ui-btn-compact min-h-9 shrink-0 px-3 text-xs"
              >
                Poke
              </button>
            </li>
          );
        })}
      </ul>

      <SendPokeSheet
        contact={selectedContact}
        open={selectedContact !== null}
        onClose={() => setSelectedContact(null)}
      />
    </>
  );
}
