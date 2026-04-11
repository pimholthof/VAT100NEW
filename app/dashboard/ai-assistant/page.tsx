import TaxAgentChat from "@/components/ai/TaxAgentChat";

export default function AIAssistantPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Fiscale Assistent
        </h1>
        <p className="text-gray-600">
          Jouw persoonlijke belastingadviseur powered by VAT100&apos;s autonome fiscale logica
        </p>
      </div>
      
      <div className="h-[calc(100vh-200px)]">
        <TaxAgentChat />
      </div>
    </div>
  );
}
