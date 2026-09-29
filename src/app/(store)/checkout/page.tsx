import type { Metadata } from "next";
import { enabledPaymentMethods, getSettings } from "@/lib/settings";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getSettings();
  const methods = enabledPaymentMethods(settings);

  return (
    <>
      <h1 className="mb-5 text-2xl font-bold">Finalizar compra</h1>
      {methods.length === 0 ? (
        <p className="card p-6 text-amber-700">
          La tienda aún no tiene medios de pago configurados. Configúralos en el panel de administración.
        </p>
      ) : (
        <CheckoutForm
          methods={methods}
          pickupEnabled={settings.pickupEnabled}
          pickupAddress={settings.pickupAddress}
        />
      )}
    </>
  );
}
