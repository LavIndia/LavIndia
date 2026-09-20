"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddressForm from "@/components/profile/AddressForm";
import AddressCard from "@/components/profile/AddressCard";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import type { Address } from "@/components/profile/profile-types";
import { sectionHeadingStyle } from "@/components/profile/profile.styles";
import { css } from "styled-system/css";

const headerStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: { base: "flex-start", sm: "center" },
  justifyContent: "space-between",
  gap: "3",
});

const gridStyle = css({
  display: "grid",
  gap: "4",
  gridTemplateColumns: "1fr",
  md: { gridTemplateColumns: "1fr 1fr" },
});

export interface AddressesTabProps {
  addresses: Address[];
  onDelete: (id: string) => void;
  /** Reloads the list after the form saves. */
  onSaved: () => void;
}

export function AddressesTab({ addresses, onDelete, onSaved }: AddressesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  const close = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <>
      <div className={headerStyle}>
        <h2 className={sectionHeadingStyle}>Saved Addresses</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className={css({ h: "4", w: "4" })} />
          Add Address
        </Button>
      </div>

      {showForm && (
        <AddressForm
          address={editing}
          onSave={() => {
            close();
            onSaved();
          }}
          onCancel={close}
        />
      )}

      {addresses.length === 0 ? (
        <ProfileEmptyState
          icon={MapPin}
          title="No addresses saved"
          description="Add a shipping address to get started"
        />
      ) : (
        <div className={gridStyle}>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={(next) => {
                setEditing(next);
                setShowForm(true);
              }}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}
