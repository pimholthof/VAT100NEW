export type SoundToken = 
  | "tink"        // Default UI click
  | "success"     // Success/Resolve
  | "reconcile"   // Reconciled successfully
  | "alert"       // Action needed
  | "navigation"  // Tab change
  | "glass-ping"  // Subtle alert
  | "bass-thump"  // Depth feedback
  | "paper-shimmer"; // Refresh/Slide

export const playSound = (soundName: SoundToken = "tink") => {
  if (typeof window === "undefined") return;
  
  const audio = new Audio(`/sounds/${soundName}.mp3`);
  audio.volume = 0.25; // Even subtler default
  audio.play().catch(() => {});
};
