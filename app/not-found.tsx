import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen grid items-center justify-items-center p-6">
      <div className="text-center">
        <h1 className="display-hero mb-4">404</h1>
        <p className="label mb-8 opacity-40">Pagina niet gevonden</p>
        <Link href="/dashboard" className="action-button">
          Terug naar dashboard
        </Link>
      </div>
    </div>
  );
}
