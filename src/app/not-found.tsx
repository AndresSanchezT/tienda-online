import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center p-10 text-center">
      <div>
        <p className="text-6xl font-bold text-brand">404</p>
        <h1 className="mt-2 text-xl font-semibold">No encontramos esta página</h1>
        <Link href="/" className="btn-primary mt-6">Volver a la tienda</Link>
      </div>
    </main>
  );
}
