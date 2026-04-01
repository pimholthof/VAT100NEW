import { ChatInterface } from "@/features/ai/ChatInterface";

export default function AssistantPage() {
  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto h-screen flex flex-col">
      {/* Editorial Header */}
      <header className="mb-12 shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">VAT100 AI CFO LIVE</span>
        </div>
        <h1 className="display-hero text-6xl md:text-8xl leading-[0.85] mb-6">ASSISTENT</h1>
        <p className="label-bold opacity-40 max-w-xl">
          Directe toegang tot je financiële data. Stel vragen over je omzet, openstaande facturen of BTW-positie in normale taal.
        </p>
      </header>

      {/* Chat Area */}
      <div className="flex-grow">
        <ChatInterface />
      </div>

      {/* Trust Footer */}
      <footer className="mt-12 text-center pb-12">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-20">
          POWERED BY VAT100 PROACTIVE INTELLIGENCE LAYER // CLAUDE SONNET 3.5
        </p>
      </footer>
    </div>
  );
}
