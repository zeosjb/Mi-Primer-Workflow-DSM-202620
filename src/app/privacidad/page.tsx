import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        Política de privacidad
      </h1>
      <p className="leading-7 text-zinc-600">
        Rockdex es un proyecto educativo. No recopilamos ni almacenamos datos
        personales de las personas que visitan este sitio.
      </p>
      <Link href="/" className="font-medium underline">
        Volver al inicio
      </Link>
    </main>
  );
}
