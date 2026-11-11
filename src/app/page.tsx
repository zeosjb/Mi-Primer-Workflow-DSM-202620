import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
        Descubre el mundo de las rocas
      </h1>
      <p className="max-w-md text-lg text-zinc-600">
        Rockdex es tu catálogo para explorar, identificar y registrar rocas.
      </p>
      <Link href="/privacidad" className="font-medium underline">
        Política de privacidad
      </Link>
    </main>
  );
}
