export default function InvoiceNotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="bg-white p-14 max-w-[480px] text-center">
        <h1 className="font-sans text-2xl font-bold text-[#0D0D0B] mb-3">
          Factuur niet gevonden
        </h1>
        <p className="font-sans text-sm font-light text-[#0D0D0B]/60 m-0">
          Deze link is ongeldig of de factuur is niet meer beschikbaar.
        </p>
      </div>
    </div>
  );
}
