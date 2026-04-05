export type SoundToken = 
  | "tink"        
  | "success"     
  | "reconcile"   
  | "alert"       
  | "navigation"  
  | "glass-ping"  
  | "bass-thump"  
  | "paper-shimmer"
  | "ambient-hum";

export const playSound = (soundName: SoundToken = "tink") => {
  if (typeof window === "undefined") return;

  const audio = new Audio(`/sounds/${soundName}.mp3`);
  audio.volume = 0.25;
  audio.play().catch(() => {});
};
