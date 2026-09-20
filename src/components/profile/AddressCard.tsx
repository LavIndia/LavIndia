"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { css } from "styled-system/css";
import type { Address } from "@/components/profile/profile-types";

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
}

export default function AddressCard({
  address,
  onEdit,
  onDelete,
}: AddressCardProps) {
  return (
    <Card className={css({ position: "relative" })}>
      {address.isDefault && (
        <Badge
          className={css({
            position: "absolute",
            top: "4",
            right: "4",
          })}
        >
          Default
        </Badge>
      )}
      <CardContent className={css({ paddingTop: "6" })}>
        <div className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
          <h3
            className={css({
              fontFamily: "display",
              fontSize: "lg",
              fontWeight: "semibold",
              color: "fg.default",
              paddingRight: address.isDefault ? "16" : "0",
            })}
          >
            {address.fullName}
          </h3>
          <p className={css({ fontSize: "sm", color: "fg.muted" })}>{address.mobile}</p>
          <p className={css({ fontSize: "sm", color: "fg.default" })}>
            {address.addressLine1}
            {address.addressLine2 && `, ${address.addressLine2}`}
          </p>
          <p className={css({ fontSize: "sm", color: "fg.default" })}>
            {address.city}, {address.state} - {address.pincode}
          </p>
        </div>
        <div className={css({ display: "flex", gap: "2", marginTop: "4" })}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(address)}
            className={css({ flex: "1" })}
          >
            <Edit className={css({ h: "4", w: "4" })} />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(address.id)}
            className={css({
              color: "danger",
              "&[data-hovered], &:hover": { background: "rgba(138,44,59,0.08)" },
            })}
          >
            <Trash2 className={css({ h: "4", w: "4" })} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
