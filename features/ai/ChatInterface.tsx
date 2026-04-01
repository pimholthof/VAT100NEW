"use client";

import { useState, useRef, useEffect } from "react";
import { m as motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "ai";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hallo! Ik ben je VAT100 AI CFO. Hoe kan ik je vandaag helpen met je cijfers?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMsg,
          history: messages.slice(-6).map(m => ({
             role: m.role,
             content: m.content
          }))
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: "ai", content: `Excuus, er ging iets mis: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", content: data.text }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", content: "Er lijkt een verbindingsfout te zijn. Probeer het later opnieuw." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Wat is mijn omzet dit kwartaal?",
    "Wie moet mij nog betalen?",
    "Hoeveel BTW moet ik reserveren?",
    "Geen financieel overzicht van 2026."
  ];

  return (
    <div className="flex flex-col h-[70vh] border-4 border-black bg-white overflow-hidden shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-8 bg-black/5"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[80%] p-6 border-2 border-black ${
                  msg.role === "user" 
                    ? "bg-black text-white rounded-tl-3xl rounded-bl-3xl rounded-br-3xl" 
                    : "bg-white text-black rounded-tr-3xl rounded-bl-3xl rounded-br-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white border-2 border-black p-4 rounded-tr-xl italic text-xs animate-pulse">
              De AI CFO duikt in je boeken...
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t-4 border-black p-6 bg-white space-y-4">
        {/* Quick Suggestions */}
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-[10px] font-black uppercase tracking-widest border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Stel een vraag over je business..."
            className="flex-grow p-4 border-2 border-black focus:ring-0 focus:border-black outline-none text-sm font-bold placeholder:opacity-30"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-black text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-white hover:text-black border-4 border-black transition-all disabled:opacity-50"
          >
            VRAAG
          </button>
        </div>
      </div>
    </div>
  );
}
