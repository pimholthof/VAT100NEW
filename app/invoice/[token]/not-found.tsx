export default function InvoiceNotFound() {
  return (
    <div style={wrapper}>
      <div style={card}>
        <h1 style={heading}>Factuur niet gevonden</h1>
        <p style={text}>
          Deze link is ongeldig, verlopen, of de factuur is niet meer beschikbaar.
        </p>
        <p style={{ ...text, marginTop: 24, opacity: 0.55 }}>
          Neem contact op met de afzender als je denkt dat dit een vergissing is.
        </p>
      </div>
    </div>
  );
}

const wrapper: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--background)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const card: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  border: "var(--border-light)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--edge-highlight), var(--shadow-md)",
  padding: "56px",
  maxWidth: "480px",
  textAlign: "center",
};

const heading: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "24px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: "var(--foreground)",
  margin: "0 0 12px",
};

const text: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "14px",
  fontWeight: 400,
  color: "var(--foreground)",
  opacity: 0.7,
  margin: 0,
  lineHeight: 1.5,
};
