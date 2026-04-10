# VAT100 Tax Agent - Complete Integration

Deze integratie combineert Anthropic's managed agents met VAT100's autonome fiscale logica voor een complete belastingadvies ervaring.

## 🚀 Features

### ✅ Autonome Fiscale Logica
- **BTW-tarief Detector Agent** - Automatische detectie van onjuiste BTW-tarieven
- **Bookkeeping Agent** - Automatische koppeling van transacties aan facturen/bonnen
- **Deadline Monitor Agent** - Proactieve monitoring van fiscale deadlines
- **Tax Auditor Agent** - Compliance checking en audit trails

### ✅ AI-Gestuurd Advies
- **Conversatiele Interface** - Natuurlijke interactie via Anthropic agent
- **Persoonlijke Berekeningen** - Real-time belastingberekeningen op basis van jouw data
- **Intelligente Tips** - AI-gegenereerde bespaartips en strategieën
- **Compliance Monitoring** - Continue controle op fiscale verplichtingen

## 📋 Vereisten

```bash
pip install anthropic aiohttp
```

## ⚙️ Configuratie

1. **Anthropic API Key**
   ```python
   ANTHROPIC_API_KEY = "jouw-api-key-hier"
   ```

2. **VAT100 Integration**
   - Zorg dat je VAT100 app draait met de nieuwe agents
   - API endpoints beschikbaar voor tax calculations
   - Database toegang voor compliance data

## 🎯 Gebruik

### Basis Setup
```python
from vat100_tax_agent import VAT100TaxAgent

# Initialiseer
agent = VAT100TaxAgent(
    api_key="jouw-anthropic-key",
    vat100_api_url="https://jouw-vat100-app.vercel.app"
)

# Start chat
response = await agent.chat_with_tax_agent(
    "Ik ben ZZP'er en heb €65.000 omzet gedraaid. Hoeveel belasting betaal ik?",
    user_context={
        "maandenVerstreken": 12,
        "investeringen": [
            {"omschrijving": "Laptop", "aanschafprijs": 1200}
        ]
    }
)
```

### Voorbeeld Vragen
- "Ik ben ZZP'er en heb in 2024 €65.000 omzet gedraaid. Hoeveel belasting betaal ik en welke aftrekposten kan ik toepassen?"
- "Wat is de beste strategie voor mijn investeringen dit jaar?"
- "Hoe staat het met mijn compliance en welke deadlines moet ik nog halen?"
- "Ik overweeg een investering van €5.000. Welk belastingvoordeel levert dat op?"

## 📊 Output Voorbeeld

```
📊 Jouw Belastingberekening 2024

💰 Omzet & Winst
- Bruto omzet: €65,000.00
- Kosten: €19,500.00
- Afschrijvingen: €400.00
- Bruto winst: €45,100.00

🧾 Aftrekposten
- Zelfstandigenaftrek: €1,200.00
- MKB-vrijstelling: €5,617.00
- KIA (investeringen): €336.00
- Totaal geïnvesteerd: €1,200.00

💸 Belastingberekening
- Belastbaar inkomen: €37,947.00
- Inkomstenbelasting: €8,847.00
- Algemene heffingskorting: €1,115.00
- Arbeidskorting: €2,847.00
- NETTO te betalen: €4,885.00
- Effectief tarief: 7.5%

💡 Bespaartips
- KIA-drempel bijna bereikt: Investeer nog €1,701 om €1,428 belasting te besparen via de KIA (28% aftrek).

🔍 Compliance Status
- Score: 85/100
- Actuele issues: 2 missende bonnetjes, BTW-aangifte Q1 niet ingediend
- Urencriterium: 890/1225 uur (72.7%)
```

## 🔧 VAT100 API Integration

De agent communiceert met VAT100 via deze endpoints:

### Tax Calculation
```
POST /api/tax/calculate
{
  "jaarOmzetExBtw": 65000,
  "jaarKostenExBtw": 19500,
  "investeringen": [...],
  "maandenVerstreken": 12
}
```

### Compliance Status
```
GET /api/compliance/{user_id}
```

### BTW Overzicht
```
GET /api/vat/overview/{user_id}
```

## 🛠️ Development

### Lokale Test
```python
# Test zonder echte API
agent = VAT100TaxAgent("dummy-key", "dummy-url")
response = await agent.chat_with_tax_agent("Test vraag")
```

### Database Integratie
De agent gebruikt VAT100's database voor:
- Gebruikersprofielen
- Facturen en bonnen
- BTW aangiftes
- Compliance status

## 📈 Monitoring

### Performance Metrics
- Response time van tax calculations
- Accuracy van AI advies
- User satisfaction scores
- Compliance improvement rates

### Logging
Alle interacties worden gelogd voor:
- Audit trails
- Quality assurance
- Model improvement
- Compliance reporting

## 🔒 Security

- **API Authentication** - Secure API key management
- **Data Privacy** - GDPR-compliant data handling
- **Rate Limiting** - Prevent abuse
- **Audit Logging** - Complete interaction history

## 🚀 Deployment

### Productie Setup
1. Deploy VAT100 met nieuwe agents
2. Configureer Anthropic environment
3. Setup monitoring en logging
4. Test met real user data

### Scaling
- Horizontal scaling van API endpoints
- Load balancing voor agent sessions
- Caching voor tax calculations
- CDN voor static resources

## 📞 Support

Voor vragen of issues:
- VAT100 documentation
- Anthropic API docs
- Community support
- Direct contact development team

---

**Resultaat**: Een complete, AI-gestuurde belastingadvies tool die de kracht van VAT100's autonome fiscale logica combineert met Anthropic's conversational AI.
