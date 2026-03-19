export function DashboardFooter() {
  const now = new Date();
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  const year = now.getFullYear();

  return (
    <footer className="page-footer">
      <div className="page-footer-left">
        <span className="footer-logo">VAT100</span>
        <span className="footer-meta">
          {quarter} {year} — Eenmanszaak
        </span>
      </div>
      <span className="footer-shortcut">
        <kbd>⌘</kbd><kbd>K</kbd> commando&apos;s
      </span>
    </footer>
  );
}
