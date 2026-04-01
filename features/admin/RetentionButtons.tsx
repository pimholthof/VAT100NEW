import { useTransition, useState } from "react";
import { manualNudgeLead, manualBillingAlert } from "./retention-actions";

export function NudgeLeadButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleNudge = () => {
    setStatus("idle");
    startTransition(async () => {
      const result = await manualNudgeLead(leadId);
      if (result.error) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    });
  };

  return (
    <button
      onClick={handleNudge}
      disabled={isPending || status === "success"}
      className={`w-full mt-2 text-[10px] font-black uppercase tracking-widest py-2 border-2 border-black hover:bg-black hover:text-white transition-all 
        ${isPending ? 'opacity-50 cursor-wait' : ''} 
        ${status === "success" ? 'bg-green-100 border-green-600 text-green-600' : ''}
        ${status === "error" ? 'bg-red-100 border-red-600 text-red-600' : ''}`}
    >
      {isPending ? "Sending Nudge..." : status === "success" ? "Sent" : "Nudge Now"}
    </button>
  );
}

export function BillingAlertButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleAlert = () => {
    setStatus("idle");
    startTransition(async () => {
      const result = await manualBillingAlert(userId);
      if (result.error) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    });
  };

  return (
    <button
      onClick={handleAlert}
      disabled={isPending || status === "success"}
      className={`w-full mt-2 text-[10px] font-black uppercase tracking-widest py-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all 
        ${isPending ? 'opacity-50 cursor-wait' : ''}
        ${status === "success" ? 'bg-green-100 border-green-600 text-green-600' : ''}
        ${status === "error" ? 'bg-red-100 border-red-600 text-red-600' : ''}`}
    >
      {isPending ? "Sending Alert..." : status === "success" ? "Alert Sent" : "Alert Now"}
    </button>
  );
}
