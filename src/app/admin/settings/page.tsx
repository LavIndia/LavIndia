import { css } from "styled-system/css";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";

async function getSettings() {
  let settings = await prisma.siteSettings.findFirst();

  if (!settings) {
    // Create default settings if none exist
    settings = await prisma.siteSettings.create({
      data: {
        businessName: "lavindia",
      },
    });
  }

  return settings;
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className={css({ maxWidth: "4xl", display: "flex", flexDirection: "column", gap: "6" })}>
      <div>
        <h1
          className={css({
            fontFamily: "display",
            fontSize: "3xl",
            fontWeight: "bold",
            letterSpacing: "tight",
            color: "fg.default",
          })}
        >
          Settings
        </h1>
        <p className={css({ color: "fg.muted", marginTop: "2", fontSize: "sm" })}>
          Manage your site configuration and business details
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
