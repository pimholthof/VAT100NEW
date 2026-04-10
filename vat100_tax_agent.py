#!/usr/bin/env python3
"""
VAT100 Tax Agent - Complete Integration
Integrateert Anthropic's managed agents met VAT100's autonome fiscale logica
"""

import anthropic
import json
import asyncio
import aiohttp
from datetime import datetime, date
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from decimal import Decimal

@dataclass
class TaxCalculationInput:
    """Input voor VAT100 belastingberekening"""
    jaarOmzetExBtw: float
    jaarKostenExBtw: float
    investeringen: List[Dict[str, Any]]
    maandenVerstreken: int
    kilometerAftrek: float = 0.0

@dataclass
class TaxProjection:
    """Resultaat van VAT100 belastingberekening"""
    brutoOmzet: float
    kosten: float
    afschrijvingen: float
    brutoWinst: float
    zelfstandigenaftrek: float
    mkbVrijstelling: float
    kia: float
    totalInvestments: float
    belastbaarInkomen: float
    inkomstenbelasting: float
    algemeneHeffingskorting: float
    arbeidskorting: float
    nettoIB: float
    effectiefTarief: float
    prognoseJaarOmzet: float
    prognoseJaarKosten: float
    prognoseJaarIB: float
    bespaartips: List[Dict[str, Any]]

class VAT100TaxAgent:
    """Complete VAT100 Tax Agent met Anthropic integratie"""
    
    def __init__(self, api_key: str, vat100_api_url: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.vat100_api_url = vat100_api_url
        self.session = None
        
    async def initialize_session(self):
        """Initialiseer de Anthropic agent sessie"""
        try:
            self.session = self.client.beta.sessions.create(
                agent={"type": "agent", "id": "agent_011CZvPk3sAVt8QPzg5w85Fz"},
                environment_id="env_01X18Wb6YuVv8zuHgpLnfNJ7",
                betas=["managed-agents-2026-04-01"],
            )
            print(f"✅ Sessie gestart: {self.session.id}")
            return True
        except Exception as e:
            print(f"❌ Fout bij sessie initialisatie: {e}")
            return False
    
    async def get_vat100_tax_calculation(self, input_data: TaxCalculationInput) -> Optional[TaxProjection]:
        """Haal belastingberekening op van VAT100 API"""
        try:
            async with aiohttp.ClientSession() as session:
                # Voorbeeld: roep VAT100 tax calculation endpoint
                payload = {
                    "jaarOmzetExBtw": input_data.jaarOmzetExBtw,
                    "jaarKostenExBtw": input_data.jaarKostenExBtw,
                    "investeringen": input_data.investeringen,
                    "maandenVerstreken": input_data.maandenVerstreken,
                    "kilometerAftrek": input_data.kilometerAftrek
                }
                
                # Simuleer API call (vervang met echte VAT100 endpoint)
                # async with session.post(f"{self.vat100_api_url}/api/tax/calculate", json=payload) as response:
                #     if response.status == 200:
                #         data = await response.json()
                #         return TaxProjection(**data)
                
                # Voor nu: gebruik lokale berekening
                return self._calculate_tax_locally(input_data)
                
        except Exception as e:
            print(f"❌ Fout bij VAT100 API call: {e}")
            return None
    
    def _calculate_tax_locally(self, input_data: TaxCalculationInput) -> TaxProjection:
        """Locale belastingberekening (gebaseerd op VAT100 logic)"""
        
        # Nederlandse belastingtarieven 2026
        BOX1_BRACKETS = [
            {"min": 0, "max": 38883, "rate": 0.3575},
            {"min": 38883, "max": 78426, "rate": 0.3756},
            {"min": 78426, "max": float('inf'), "rate": 0.495}
        ]
        
        ZELFSTANDIGENAFTREK = 1200
        MKB_VRIJSTELLING_RATE = 0.127
        AHK_MAX = 3115
        AHK_AFBOUW_START = 29739
        AHK_AFBOUW_RATE = 0.06398
        
        def calculate_box1_tax(belastbaar_inkomen: float) -> float:
            if belastbaar_inkomen <= 0:
                return 0
            tax = 0
            for bracket in BOX1_BRACKETS:
                if belastbaar_inkomen <= bracket["min"]:
                    break
                taxable_in_bracket = min(belastbaar_inkomen, bracket["max"]) - bracket["min"]
                tax += taxable_in_bracket * bracket["rate"]
            return round(tax, 2)
        
        def calculate_ahk(verzamelinkomen: float) -> float:
            if verzamelinkomen <= AHK_AFBOUW_START:
                return AHK_MAX
            reduction = (verzamelinkomen - AHK_AFBOUW_START) * AHK_AFBOUW_RATE
            return round(max(0, AHK_MAX - reduction), 2)
        
        def calculate_ak(arbeidsinkomen: float) -> float:
            if arbeidsinkomen <= 0:
                return 0
            # Vereenvoudigde arbeidskorting berekening
            return round(min(5712, arbeidsinkomen * 0.1), 2)
        
        def calculate_kia(total_investments: float) -> float:
            if total_investments < 2901 or total_investments > 398236:
                return 0
            if total_investments <= 71683:
                return round(total_investments * 0.28, 2)
            if total_investments <= 132746:
                return 20072
            # Tier 3 afbouw
            reduction = (total_investments - 132746) * 0.0756
            return round(max(0, 20072 - reduction), 2)
        
        # Berekeningen
        total_investments = sum(inv.get("aanschafprijs", 0) for inv in input_data.investeringen)
        kia = calculate_kia(total_investments)
        
        # Afschrijvingen (vereenvoudigd)
        afschrijvingen = sum(
            inv.get("aanschafprijs", 0) / 5 
            for inv in input_data.investeringen 
            if inv.get("aanschafprijs", 0) >= 450
        )
        
        bruto_winst = max(0, input_data.jaarOmzetExBtw - input_data.jaarKostenExBtw - afschrijvingen - input_data.kilometerAftrek)
        zelfstandigenaftrek = min(ZELFSTANDIGENAFTREK, bruto_winst)
        winst_na_aftrek = max(0, bruto_winst - zelfstandigenaftrek)
        mkb_vrijstelling = round(winst_na_aftrek * MKB_VRIJSTELLING_RATE, 2)
        belastbaar_inkomen = max(0, winst_na_aftrek - mkb_vrijstelling - kia)
        
        inkomstenbelasting = calculate_box1_tax(belastbaar_inkomen)
        algemene_heffingskorting = calculate_ahk(belastbaar_inkomen)
        arbeidskorting = calculate_ak(belastbaar_inkomen)
        netto_ib = max(0, inkomstenbelasting - algemene_heffingskorting - arbeidskorting)
        
        effectief_tarief = round((netto_ib / input_data.jaarOmzetExBtw * 100), 2) if input_data.jaarOmzetExBtw > 0 else 0
        
        # Prognose
        factor = 12 / input_data.maandenVerstreken if input_data.maandenVerstreken > 0 else 1
        prognose_jaar_omzet = round(input_data.jaarOmzetExBtw * factor, 2)
        prognose_jaar_kosten = round(input_data.jaarKostenExBtw * factor, 2)
        
        # Bespaartips
        bespaartips = []
        if total_investments > 0 and total_investments < 2901:
            nodig = 2901 - total_investments
            kia_besparing = round(2901 * 0.28 * 0.3756, 2)  # KIA * marginaal tarief
            bespaartips.append({
                "type": "kia",
                "titel": "KIA-drempel bijna bereikt",
                "beschrijving": f"Investeer nog €{nodig:.0f} om €{kia_besparing:.0f} belasting te besparen via de KIA (28% aftrek).",
                "besparing": kia_besparing
            })
        
        if input_data.maandenVerstreken >= 10:  # Einde jaar nadert
            bespaartips.append({
                "type": "timing",
                "titel": "Einde boekjaar nadert",
                "beschrijving": "Investeringen en aftrekbare kosten moeten vóór 31 december gedaan worden om dit jaar mee te tellen.",
                "besparing": 0
            })
        
        return TaxProjection(
            brutoOmzet=input_data.jaarOmzetExBtw,
            kosten=input_data.jaarKostenExBtw,
            afschrijvingen=round(afschrijvingen, 2),
            brutoWinst=round(bruto_winst, 2),
            zelfstandigenaftrek=round(zelfstandigenaftrek, 2),
            mkbVrijstelling=round(mkb_vrijstelling, 2),
            kia=round(kia, 2),
            totalInvestments=round(total_investments, 2),
            belastbaarInkomen=round(belastbaar_inkomen, 2),
            inkomstenbelasting=round(inkomstenbelasting, 2),
            algemeneHeffingskorting=round(algemene_heffingskorting, 2),
            arbeidskorting=round(arbeidskorting, 2),
            nettoIB=round(netto_ib, 2),
            effectiefTarief=effectief_tarief,
            prognoseJaarOmzet=prognose_jaar_omzet,
            prognoseJaarKosten=prognose_jaar_kosten,
            prognoseJaarIB=round(netto_ib * factor, 2),
            bespaartips=bespaartips
        )
    
    async def get_compliance_status(self, user_id: str) -> Dict[str, Any]:
        """Haal compliance status op van VAT100"""
        try:
            async with aiohttp.ClientSession() as session:
                # Simuleer API call
                # async with session.get(f"{self.vat100_api_url}/api/compliance/{user_id}") as response:
                #     if response.status == 200:
                #         return await response.json()
                
                # Voorbeeld data
                return {
                    "score": 85,
                    "issues": ["2 missende bonnetjes", "BTW-aangifte Q1 niet ingediend"],
                    "last_checked": datetime.now().isoformat(),
                    "vat_deadline": "2024-04-30",
                    "hours_progress": {
                        "current": 890,
                        "target": 1225,
                        "percentage": 72.7
                    }
                }
        except Exception as e:
            print(f"❌ Fout bij compliance status: {e}")
            return {"score": 0, "issues": [str(e)]}
    
    async def get_vat_overview(self, user_id: str) -> List[Dict[str, Any]]:
        """Haal BTW overzicht op van VAT100"""
        try:
            # Simuleer API call
            return [
                {
                    "quarter": "Q1 2024",
                    "revenueExVat": 16250.0,
                    "outputVat": 3412.50,
                    "inputVat": 1245.80,
                    "netVat": 2166.70,
                    "invoiceCount": 8,
                    "receiptCount": 15,
                    "status": "submitted"
                },
                {
                    "quarter": "Q4 2023",
                    "revenueExVat": 18750.0,
                    "outputVat": 3937.50,
                    "inputVat": 1567.30,
                    "netVat": 2370.20,
                    "invoiceCount": 10,
                    "receiptCount": 18,
                    "status": "draft"
                }
            ]
        except Exception as e:
            print(f"❌ Fout bij BTW overzicht: {e}")
            return []
    
    def format_tax_advice(self, projection: TaxProjection, compliance: Dict[str, Any]) -> str:
        """Formatteer belastingadvies in begrijpelijke taal"""
        advice = f"""
📊 **Jouw Belastingberekening 2024**

💰 **Omzet & Winst**
- Bruto omzet: €{projection.brutoOmzet:,.2f}
- Kosten: €{projection.kosten:,.2f}
- Afschrijvingen: €{projection.afschrijvingen:,.2f}
- **Bruto winst: €{projection.brutoWinst:,.2f}**

🧾 **Aftrekposten**
- Zelfstandigenaftrek: €{projection.zelfstandigenaftrek:,.2f}
- MKB-vrijstelling: €{projection.mkbVrijstelling:,.2f}
- KIA (investeringen): €{projection.kia:,.2f}
- Totaal geïnvesteerd: €{projection.totalInvestments:,.2f}

💸 **Belastingberekening**
- Belastbaar inkomen: €{projection.belastbaarInkomen:,.2f}
- Inkomstenbelasting: €{projection.inkomstenbelasting:,.2f}
- Algemene heffingskorting: €{projection.algemeneHeffingskorting:,.2f}
- Arbeidskorting: €{projection.arbeidskorting:,.2f}
- **NETTO te betalen: €{projection.nettoIB:,.2f}**
- Effectief tarief: {projection.effectiefTarief:.1f}%

📈 **Prognose volledig jaar**
- Verwachte omzet: €{projection.prognoseJaarOmzet:,.2f}
- Verwachte belasting: €{projection.prognoseJaarIB:,.2f}

"""
        
        # Voeg bespaartips toe
        if projection.bespaartips:
            advice += "💡 **Bespaartips**\n"
            for tip in projection.bespaartips:
                advice += f"- {tip['titel']}: {tip['beschrijving']}\n"
            advice += "\n"
        
        # Voeg compliance info toe
        if compliance:
            advice += f"""
🔍 **Compliance Status**
- Score: {compliance.get('score', 0)}/100
- Actuele issues: {', '.join(compliance.get('issues', []))}
- Urencriterium: {compliance.get('hours_progress', {}).get('current', 0)}/{compliance.get('hours_progress', {}).get('target', 0)} uur ({compliance.get('hours_progress', {}).get('percentage', 0):.1f}%)
"""
        
        return advice
    
    async def chat_with_tax_agent(self, user_message: str, user_context: Dict[str, Any] = None) -> str:
        """Start een chat met de tax agent"""
        if not self.session:
            await self.initialize_session()
        
        try:
            # Bereid context voor
            context = user_context or {}
            
            # Detecteer of dit een belastingvraag is
            if any(keyword in user_message.lower() for keyword in ['belasting', 'btw', 'inkomen', 'aftrek', 'zzp', 'omzet']):
                # Haal relevante data op
                user_id = context.get('user_id', 'demo_user')
                
                # Probeer belastingberekening te extraheren uit message
                tax_input = self._extract_tax_input_from_message(user_message, context)
                if tax_input:
                    projection = await self.get_vat100_tax_calculation(tax_input)
                    compliance = await self.get_compliance_status(user_id)
                    
                    if projection:
                        # Geef formatteerd advies terug
                        formatted_advice = self.format_tax_advice(projection, compliance)
                        
                        # Stuur advies naar Anthropic agent voor verdere verrijking
                        enriched_message = f"{user_message}\n\n{formatted_advice}\n\nGeef op basis van deze gegevens persoonlijk en praktisch advies."
                        
                        return await self._stream_agent_response(enriched_message)
            
            # Standaard conversation zonder tax data
            return await self._stream_agent_response(user_message)
            
        except Exception as e:
            print(f"❌ Fout bij chat: {e}")
            return f"Er is een fout opgetreden: {e}"
    
    def _extract_tax_input_from_message(self, message: str, context: Dict[str, Any]) -> Optional[TaxCalculationInput]:
        """Extraheer belastinginput uit user message"""
        import re
        
        # Probeer bedragen te extraheren
        omzet_match = re.search(r'€?[\s]*(\d+(?:\.\d+)?)\s*(?:euro|omzet)', message.lower())
        kosten_match = re.search(r'€?[\s]*(\d+(?:\.\d+)?)\s*(?:euro|kosten)', message.lower())
        
        if omzet_match:
            omzet = float(omzet_match.group(1).replace(',', '.'))
            kosten = float(kosten_match.group(1)) if kosten_match else omzet * 0.3  # Standaard 30% kosten
            
            return TaxCalculationInput(
                jaarOmzetExBtw=omzet,
                jaarKostenExBtw=kosten,
                investeringen=context.get('investeringen', []),
                maandenVerstreken=context.get('maandenVerstreken', 12),
                kilometerAftrek=context.get('kilometerAftrek', 0)
            )
        
        return None
    
    async def _stream_agent_response(self, message: str) -> str:
        """Stream response van Anthropic agent"""
        response_parts = []
        
        try:
            with self.client.beta.sessions.events.stream(
                session_id=self.session.id,
                betas=["managed-agents-2026-04-01"],
            ) as stream:
                # Stuur message
                self.client.beta.sessions.events.send(
                    session_id=self.session.id,
                    events=[{
                        "type": "user.message",
                        "content": [{"type": "text", "text": message}],
                    }],
                    betas=["managed-agents-2026-04-01"],
                )
                
                # Stream response
                for event in stream:
                    if event.type == "agent.message":
                        for block in event.content:
                            if hasattr(block, 'text'):
                                response_parts.append(block.text)
                                print(block.text, end="", flush=True)
                    elif event.type == "agent.tool_use":
                        tool_info = f"\n[🔧 Using tool: {event.name}]"
                        response_parts.append(tool_info)
                        print(tool_info)
                    elif event.type == "session.status_idle":
                        print("\n\n✅ Agent finished.")
                        break
                        
        except Exception as e:
            print(f"❌ Stream error: {e}")
            response_parts.append(f"Fout bij stream: {e}")
        
        return "".join(response_parts)

async def main():
    """Hoofdfunctie voor demonstratie"""
    # Configuratie
    ANTHROPIC_API_KEY = "jouw-api-key-hier"
    VAT100_API_URL = "https://jouw-vat100-app.vercel.app"
    
    # Initialiseer agent
    agent = VAT100TaxAgent(ANTHROPIC_API_KEY, VAT100_API_URL)
    
    # Voorbeeld ZZP'er context
    user_context = {
        "user_id": "demo_user",
        "maandenVerstreken": 12,
        "investeringen": [
            {"id": "1", "omschrijving": "Laptop", "aanschafprijs": 1200, "aanschafDatum": "2024-01-15"},
            {"id": "2", "omschrijving": "Software licentie", "aanschafprijs": 800, "aanschafDatum": "2024-03-01"}
        ]
    }
    
    # Test vragen
    questions = [
        "Ik ben ZZP'er en heb in 2024 €65.000 omzet gedraaid. Hoeveel belasting betaal ik en welke aftrekposten kan ik toepassen?",
        "Wat is de beste strategie voor mijn investeringen dit jaar?",
        "Hoe staat het met mijn compliance en welke deadlines moet ik nog halen?"
    ]
    
    for question in questions:
        print(f"\n{'='*60}")
        print(f"🤔 Vraag: {question}")
        print(f"{'='*60}")
        
        response = await agent.chat_with_tax_agent(question, user_context)
        print(f"\n📝 Volledige response:\n{response}")

if __name__ == "__main__":
    asyncio.run(main())
