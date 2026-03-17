export type SoundToken = 
  | "tink"        
  | "success"     
  | "reconcile"   
  | "alert"       
  | "navigation"  
  | "glass-ping"  
  | "bass-thump"  
  | "paper-shimmer"
  | "ambient-hum"; // The Unconscious Protocol standby presence

export const playSound = (soundName: SoundToken = "tink") => {
  if (typeof window === "undefined") return;
  
  const audio = new Audio(`/sounds/${soundName}.mp3`);
  audio.volume = 0.25; 
  audio.play().catch(() => {});
};

let ambientAudio: HTMLAudioElement | null = null;

export const playAmbient = () => {
  if (typeof window === "undefined") return;
  if (ambientAudio) return; // Already playing

  ambientAudio = new Audio(`/sounds/ambient-hum.mp3`);
  ambientAudio.volume = 0; // Start silent to fade in
  ambientAudio.loop = true;
  ambientAudio.play().then(() => {
    // Fade in gracefully
    let vol = 0;
    const fadeInterval = setInterval(() => {
      if (vol < 0.05) {
        vol += 0.005;
        if (ambientAudio) ambientAudio.volume = vol;
      } else {
        clearInterval(fadeInterval);
      }
    }, 200);
  }).catch(() => {
    ambientAudio = null; // Autoplay blocked, wait for interaction
  });
};
