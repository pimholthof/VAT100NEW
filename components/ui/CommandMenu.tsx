"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  
  // AI Chat State
  const [chatMode, setChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        if (chatMode) {
          setChatMode(false);
          setQuery("");
        } else {
          setOpen(false);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  const askAI = async (userQuery: string) => {
    if (!userQuery.trim()) return;
    setChatMode(true);
    setChatMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setQuery("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'ai', content: data.text || data.error }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ai', content: "Systeem onderbroken. We herstellen de verbinding." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 640,
          background: "rgba(255, 255, 255, 0.95)",
          border: "var(--border)",
          borderRadius: 0,
          overflow: "hidden",
          boxShadow: "0 32px 64px -12px rgba(0,0,0,0.1)",
        }}
      >
        <Command
          style={{ width: "100%" }}
          label="Globale commando's"
          shouldFilter={!chatMode} 
        >
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: "var(--border-rule)" }}>
            {chatMode && (
              <button 
                onClick={() => setChatMode(false)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '20px 0 20px 24px', color: 'rgba(13,13,11,0.5)'
                }}
              >
                ←
              </button>
            )}
            <Command.Input
              placeholder={chatMode ? "Vraag de VAT100 CFO..." : "Wat wil je doen? (bijv. 'nieuwe factuur')"}
              autoFocus
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter" && chatMode && query) {
                  askAI(query);
                }
              }}
              style={{
                width: "100%",
                padding: "20px 24px",
                border: "none",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "var(--text-mono-md)",
                outline: "none",
                background: "transparent",
                color: "var(--foreground)",
              }}
            />
          </div>

          {!chatMode ? (
          <Command.List
            style={{
              maxHeight: 320,
              overflowY: "auto",
              padding: "12px 0",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            <Command.Empty
              style={{ padding: "24px", textAlign: "center", opacity: 0.5 }}
            >
              Geen resultaten voor &quot;{query}&quot;.
              {query && (
                <div 
                  onClick={() => askAI(query)}
                  style={{ marginTop: 12, padding: "8px 16px", background: "var(--foreground)", color: "var(--background)", borderRadius: 0, cursor: "pointer", display: "inline-block" }}
                >
                  Vraag dit aan de AI CFO
                </div>
              )}
            </Command.Empty>

            <Command.Group heading="AI Assistent" className="cmdk-group">
              <Command.Item
                onSelect={() => {
                  if (query) { askAI(query); } else { setChatMode(true); }
                }}
                className="cmdk-item"
              >
                <span style={{color: 'var(--color-accent)'}}>Vraag AI CFO</span> {query ? `"${query}"` : "..."}
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Acties" className="cmdk-group">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/invoices/new"))}
                className="cmdk-item"
              >
                Nieuwe factuur maken
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/clients/new"))}
                className="cmdk-item"
              >
                Nieuwe klant toevoegen
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Navigatie" className="cmdk-group">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="cmdk-item"
              >
                Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/invoices"))}
                className="cmdk-item"
              >
                Facturen overzicht
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/receipts"))}
                className="cmdk-item"
              >
                Bonnen & Uitgaven
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/clients"))}
                className="cmdk-item"
              >
                Klanten overzicht
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
                className="cmdk-item"
              >
                Instellingen
              </Command.Item>
            </Command.Group>

          </Command.List>
          ) : (
            <div style={{ maxHeight: 400, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: "center", opacity: 0.5, padding: "24px 0" }}>
                  Hoe kan ik je vandaag helpen met je administratie?
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'rgba(13,13,11,0.06)' : 'transparent',
                  padding: '12px 16px',
                   borderRadius: 0,
                  maxWidth: '85%',
                  whiteSpace: 'pre-wrap',
                  fontFamily: "var(--font-geist), sans-serif",
                  fontSize: "var(--text-body-md)"
                }}>
                  {msg.role === 'ai' && <strong style={{color: 'var(--color-accent)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px'}}>VAT100 AI</strong>}
                  {msg.content}
                </div>
              ))}
              {isChatLoading && (
                <div style={{ alignSelf: 'flex-start', opacity: 0.5, fontFamily: "var(--font-mono)", fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="spinner"></span> AI is aan het nadenken...
                </div>
              )}
            </div>
          )}
        </Command>
      </div>
    </div>
  );
}
