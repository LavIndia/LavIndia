"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FormError } from "@/components/admin/products/product-form-types";
import { css } from "styled-system/css";

/**
 * Shows an error the admin has to act on.
 *
 * A toast is right for "saved" and wrong for "not saved": it slides away in
 * seconds, so a failure in a long form is easy to miss and impossible to
 * re-read. This stays until dismissed and lists what has to change.
 */

const titleRowStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const iconStyle = css({ height: "5", width: "5", color: "danger", flexShrink: 0 });
const issuesStyle = css({
  marginTop: "3",
  display: "flex",
  flexDirection: "column",
  gap: "1.5",
  paddingLeft: "5",
  listStyleType: "disc",
  fontSize: "sm",
  color: "fg.default",
});

export function FormErrorDialog({
  error,
  onClose,
}: {
  error: FormError | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={error !== null} onOpenChange={(open) => !open && onClose()}>
      {error ? (
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>
              <span className={titleRowStyle}>
                <AlertTriangle className={iconStyle} />
                {error.title}
              </span>
            </DialogTitle>
            <DialogDescription>{error.message}</DialogDescription>
          </DialogHeader>
          {error.issues?.length ? (
            <ul className={issuesStyle}>
              {error.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button type="button" onPress={onClose} autoFocus>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
