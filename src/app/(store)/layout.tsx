import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/utils";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();

  return (
    <>
      <Header settings={settings} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <Footer settings={settings} />
      {settings.whatsapp && (
        <a
          href={whatsappLink(settings.whatsapp, `Hola ${settings.storeName}, tengo una consulta`)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
          className="fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-lg transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="size-7" fill="currentColor">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.99 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.23 9.43-9.44 9.43m8.03-17.46A11.3 11.3 0 0 0 12.05.7C5.8.7.7 5.8.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.3 11.3 0 0 0 5.42 1.38h.01c6.25 0 11.34-5.09 11.35-11.35 0-3.03-1.18-5.88-3.33-8.02" />
          </svg>
        </a>
      )}
    </>
  );
}
