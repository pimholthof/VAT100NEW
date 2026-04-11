"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Send, Bot, User, AlertCircle, CheckCircle } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  taxData?: { nettoIB: number; effectiefTarief: number; [key: string]: unknown };
  compliance?: { score: number; issues: string[]; [key: string]: unknown };
}

interface TaxAgentChatProps {
  userId?: string;
  initialMessage?: string;
}

export default function TaxAgentChat({ userId, initialMessage }: TaxAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [compliance, setCompliance] = useState<{ score: number; issues: string[]; [key: string]: unknown } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load initial compliance status
    loadCompliance();
    
    // Set initial message if provided
    if (initialMessage) {
      setInput(initialMessage);
      setTimeout(() => sendMessage(), 100);
    }
  }, []);

  const loadCompliance = async () => {
    try {
      const response = await fetch("/api/ai/tax-agent/compliance");
      if (response.ok) {
        const data = await response.json();
        setCompliance(data.compliance);
      }
    } catch (error) {
      console.error("Failed to load compliance:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/tax-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          context: {
            userId,
            compliance
          }
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.response,
        timestamp: new Date(),
        taxData: data.taxData,
        compliance: data.compliance,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update compliance if received
      if (data.compliance) {
        setCompliance(data.compliance);
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Er is een fout opgetreden. Probeer het opnieuw.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Convert markdown-like formatting to JSX
    return content
      .split('\n')
      .map((line, index) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Emoji handling
        if (line.startsWith('📊') || line.startsWith('💰') || line.startsWith('🧾') || 
            line.startsWith('💸') || line.startsWith('📈') || line.startsWith('💡') || 
            line.startsWith('🔍') || line.startsWith('🎯') || line.startsWith('📞')) {
          return (
            <div key={index} className="font-semibold text-gray-900 mt-3 first:mt-0">
              <span dangerouslySetInnerHTML={{ __html: line }} />
            </div>
          );
        }
        
        // Bullet points
        if (line.startsWith('-')) {
          return (
            <div key={index} className="ml-4 text-gray-700">
              <span dangerouslySetInnerHTML={{ __html: line }} />
            </div>
          );
        }
        
        // Regular text
        return (
          <div key={index} className="text-gray-700">
            <span dangerouslySetInnerHTML={{ __html: line }} />
          </div>
        );
      });
  };

  const ComplianceScore = ({ score }: { score: number }) => {
    const getColor = () => {
      if (score >= 90) return "text-green-600 bg-green-50";
      if (score >= 70) return "text-yellow-600 bg-yellow-50";
      return "text-red-600 bg-red-50";
    };

    const getIcon = () => {
      if (score >= 90) return <CheckCircle className="w-4 h-4" />;
      if (score >= 70) return <AlertCircle className="w-4 h-4" />;
      return <AlertCircle className="w-4 h-4" />;
    };

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getColor()}`}>
        {getIcon()}
        <span>Compliance: {score}/100</span>
      </div>
    );
  };

  const QuickQuestions = [
    "Hoeveel belasting betaal ik over mijn omzet?",
    "Welke aftrekposten kan ik gebruiken?",
    "Hoe staat het met mijn BTW-aangifte?",
    "Wat is de beste investeringsstrategie?",
    "Moet ik nog uren bijhouden?"
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">VAT100 Tax Agent</h3>
            <p className="text-sm text-gray-500">Jouw fiscale assistent</p>
          </div>
        </div>
        {compliance && <ComplianceScore score={compliance.score} />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Welkom bij de VAT100 Tax Agent
            </h4>
            <p className="text-gray-600 mb-6">
              Stel je vragen over belastingen, BTW, aftrekposten of fiscale strategieën.
            </p>
            
            {/* Quick Questions */}
            <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
              {QuickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  className="text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.type === "assistant" && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.type === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-50 text-gray-900 border border-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.type === "user" ? (
                  message.content
                ) : (
                  formatMessage(message.content)
                )}
              </div>
              
              {/* Tax Data Summary */}
              {message.taxData && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Netto belasting:</span>
                      <div className="font-semibold">
                        €{message.taxData.nettoIB.toLocaleString("nl-NL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Effectief tarief:</span>
                      <div className="font-semibold">{message.taxData.effectiefTarief}%</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-xs mt-2 opacity-70">
                {message.timestamp.toLocaleTimeString("nl-NL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {message.type === "user" && (
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Stel je fiscale vraag..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Compliance Issues */}
        {compliance?.issues && compliance.issues.length > 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4" />
              <span>Actie nodig: {compliance.issues.join(", ")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
