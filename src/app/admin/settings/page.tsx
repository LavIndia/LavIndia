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
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your site configuration and business details
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
