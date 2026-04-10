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

const verifiedSounds = new Set<string>();
const missingSounds = new Set<string>();

export const playSound = (soundName: SoundToken = "tink") => {
  if (typeof window === "undefined") return;
  if (missingSounds.has(soundName)) return;

  const src = `/sounds/${soundName}.mp3`;

  if (verifiedSounds.has(soundName)) {
    const audio = new Audio(src);
    audio.volume = 0.25;
    audio.play().catch(() => {});
    return;
  }

  const audio = new Audio(src);
  audio.volume = 0.25;
  audio.addEventListener("canplaythrough", () => {
    verifiedSounds.add(soundName);
    audio.play().catch(() => {});
  }, { once: true });
  audio.addEventListener("error", () => {
    missingSounds.add(soundName);
  }, { once: true });
};
