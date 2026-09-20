"use client";

import { Monitor, ShieldCheck, Smartphone, Tablet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import type { LoginEvent } from "@/components/profile/profile-types";
import {
  sectionHeadingStyle,
  statusToneStyle,
} from "@/components/profile/profile.styles";
import { css } from "styled-system/css";

const rowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  paddingBlock: "4",
});

const deviceStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const metaStyle = css({ fontSize: "xs", color: "fg.muted", marginTop: "0.5" });
const whenStyle = css({ fontSize: "xs", color: "fg.muted", whiteSpace: "nowrap" });

function deviceIcon(deviceType: string | null) {
  if (deviceType === "Mobile") return Smartphone;
  if (deviceType === "Tablet") return Tablet;
  return Monitor;
}

export function SecurityTab({ loginEvents }: { loginEvents: LoginEvent[] }) {
  return (
    <>
      <div>
        <h2 className={sectionHeadingStyle}>Recent Sign-ins</h2>
        <p className={css({ fontSize: "sm", color: "fg.muted", marginTop: "1" })}>
          For your security, we keep a record of recent sign-ins to your
          account, including approximate location and device — never precise
          GPS location.
        </p>
      </div>

      {loginEvents.length === 0 ? (
        <ProfileEmptyState icon={ShieldCheck} title="No sign-in history yet" />
      ) : (
        <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
          {loginEvents.map((event, index) => {
            const DeviceIcon = deviceIcon(event.deviceType);
            const location = [event.city, event.region, event.country]
              .filter(Boolean)
              .join(", ");

            return (
              <Card key={event.id}>
                <CardContent className={rowStyle}>
                  <DeviceIcon
                    className={css({ h: "6", w: "6", color: "accent.default", flexShrink: "0" })}
                  />
                  <div className={css({ flex: "1", minWidth: "0" })}>
                    <p className={deviceStyle}>
                      {[event.browser, event.os].filter(Boolean).join(" on ") ||
                        "Unknown device"}
                      {index === 0 && (
                        <span
                          className={statusToneStyle({ tone: "success" })}
                          style={{ marginLeft: "8px" }}
                        >
                          Current
                        </span>
                      )}
                    </p>
                    <p className={metaStyle}>
                      {location || "Location unavailable"}
                      {event.ipAddress ? ` · ${event.ipAddress}` : ""}
                    </p>
                  </div>
                  <p className={whenStyle}>
                    {new Date(event.createdAt).toLocaleString("en-IN")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
