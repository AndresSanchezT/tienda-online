import { PageHeader } from "@/components/admin/ui";
import { getSettings, mercadoPagoConfigured } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Configuración" />
      <SettingsForm
        settings={settings}
        mp={{
          accessToken: mercadoPagoConfigured("REDIRECT"),
          publicKey: mercadoPagoConfigured("EMBEDDED"),
          testMode: (process.env.MP_ACCESS_TOKEN ?? "").startsWith("TEST-"),
        }}
      />
    </>
  );
}
