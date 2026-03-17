"use client";

/**
 * Signature Sound utility for premium feedback.
 */
export const playSound = (soundName: "tink" | "success" = "tink") => {
  if (typeof window === "undefined") return;
  
  const audio = new Audio(`/sounds/${soundName}.mp3`);
  audio.volume = 0.4;
  audio.play().catch(() => {
    // Browser may block auto-play if no user interaction yet, silently fail
  });
};
