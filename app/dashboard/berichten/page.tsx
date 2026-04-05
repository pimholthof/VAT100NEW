import { BerichtenPage } from "@/features/chat/BerichtenPage";

export default function BerichtenRoute() {
  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto">
      <header className="mb-12">
        <h1 className="display-hero text-6xl md:text-8xl leading-[0.85] mb-6">
          BERICHTEN
        </h1>
        <p className="label-bold opacity-40 max-w-xl">
          Direct contact met het VAT100 team. We reageren zo snel mogelijk.
        </p>
      </header>
      <BerichtenPage />
    </div>
  );
}
