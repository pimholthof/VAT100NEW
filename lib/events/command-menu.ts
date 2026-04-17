export const COMMAND_MENU_OPEN_EVENT = "vat100:command-menu:open";

export function openCommandMenu() {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent(COMMAND_MENU_OPEN_EVENT));
}
