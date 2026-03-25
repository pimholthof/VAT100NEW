export default function InvoiceNotFound() {
  return (
    <div style={wrapper}>
      <div style={card}>
        <h1 style={heading}>Factuur niet gevonden</h1>
        <p style={text}>
          Deze link is ongeldig, verlopen, of de factuur is niet meer beschikbaar.
        </p>
        <p style={{ ...text, marginTop: 24, opacity: 0.4 }}>
          Neem contact op met de afzender als je denkt dat dit een vergissing is.
        </p>
      </div>
    </div>
  );
}

const wrapper: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#F5F5F5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const card: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  padding: "56px",
  maxWidth: "480px",
  textAlign: "center",
};

const heading: React.CSSProperties = {
  fontFamily: "'Geist', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontSize: "24px",
  fontWeight: 700,
  color: "#0D0D0B",
  margin: "0 0 12px",
};

const text: React.CSSProperties = {
  fontFamily: "'Geist', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontSize: "14px",
  fontWeight: 300,
  color: "rgba(13,13,11,0.6)",
  margin: 0,
};
