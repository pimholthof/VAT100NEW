import Link from "next/link";

export default function NotFound() {
  return (
    <div style={wrapper}>
      <div style={card}>
        <h1 style={heading}>Pagina niet gevonden</h1>
        <p style={text}>
          De pagina die je zoekt bestaat niet of is verplaatst.
        </p>
        <Link href="/" style={link}>
          Ga naar de homepage
        </Link>
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
  margin: "0 0 24px",
};

const link: React.CSSProperties = {
  fontFamily: "'Geist', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontSize: "14px",
  fontWeight: 500,
  color: "#0D0D0B",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};
