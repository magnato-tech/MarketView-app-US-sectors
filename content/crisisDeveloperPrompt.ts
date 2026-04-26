/** Utvikler-dokumentasjon (tidligere innebygd i CrisisMonitorPage). */
export const CRISIS_DEVELOPER_SYSTEM_PROMPT = `Jeg vil bygge en "Crisis Monitor" modul for min investeringsplattform, KInvest.

Programmet skal tracke ledende KPI-er for å forutse et krakk i halvlederindustrien basert på energikrisen i 2026.

1. Datainnhenting:
- Hent JKM LNG Spot Price og Brent Crude (Twelve Data API)
- Hent TWD/USD vekslingskurs
- Scrape Taipower Operating Reserve % fra taipower.com.tw
- Hent Helium Spot Price (placeholder-funksjon via CSV/API)

2. Lagring og tracking:
- Logg alle verdier hver time i lokal SQLite
- Kalkuler Rate of Change (ROC) over siste 24 timer

3. Varslingslogikk (Kill Switch):
- Lag Health Score fra 0-100
- Send CRITICAL_SELL (rød tekst) når:
  - Helium-pris stiger > 10% på 24t
  - Taipower Reserve faller under 6%
  - TWD svekker seg > 2% samtidig som Nasdaq er flat eller opp

4. Visualisering:
- Terminal-dashboard med Rich som viser KPI-tabell og status
- Skriv modulær, robust kode med feilhåndtering

Ekstra:
Health Score = (Grid_weight * Reserve) + (Gas_weight * Price_inv) + (FX_weight * Stability)
Alarm: Delta Helium_24h > 15% => Immediate Liquidation Warning`;
