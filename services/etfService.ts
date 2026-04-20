import { Language } from '../i18n/types';

export interface ETFHolding {
  symbol: string;
  name: string;
  weight: number; // Prosentandel (f.eks. 22.5)
}

export interface ETFDetails {
  symbol: string;
  name: string;
  description: string;
  expenseRatio: number;
  dividendYield: number;
  beta: number;
  peRatio: number;
  aum?: number; // Assets Under Management i millioner dollar
  holdingsCount?: number;
  holdings: ETFHolding[];
  sectorExposure: Record<string, number>;
}

interface ETFRecord {
  name: string;
  descriptionNo: string;
  descriptionEn: string;
  expenseRatio: number;
  dividendYield: number;
  beta: number;
  peRatio: number;
  aum?: number;
  holdingsCount?: number;
  holdings?: ETFHolding[];
  sectorExposure?: Record<string, number>;
}

// Statisk referansedatabase. Tall er omtrentlige snitt fra offentlig tilgjengelig
// informasjon (~2024) og er ment som pedagogisk bakgrunnsinfo, ikke handelssignal.
// Priser hentes fortsatt live fra Yahoo v8 (chart-endepunktet virker uten auth).
const ETF_DATABASE: Record<string, ETFRecord> = {
  // --- Hovedsektorer (Sector SPDR / brede sektor-ETFer) ---
  XLK: {
    name: 'Technology Select Sector SPDR Fund',
    descriptionNo: 'Følger teknologiselskaper i S&P 500. Tungt vektet i halvledere, programvare og IT-tjenester. Svært konsentrert i Apple, Microsoft og Nvidia.',
    descriptionEn: 'Tracks technology companies in the S&P 500. Heavy tilt toward semiconductors, software and IT services. Highly concentrated in Apple, Microsoft and Nvidia.',
    expenseRatio: 0.09,
    dividendYield: 0.64,
    beta: 1.17,
    peRatio: 34.8,
    aum: 67500,
    holdingsCount: 65,
    holdings: [
      { symbol: 'AAPL', name: 'Apple Inc.', weight: 14.5 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 13.8 },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 12.2 },
      { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 4.8 },
      { symbol: 'CSCO', name: 'Cisco Systems', weight: 2.3 },
      { symbol: 'ADBE', name: 'Adobe Inc.', weight: 2.1 },
      { symbol: 'CRM', name: 'Salesforce', weight: 2.0 },
      { symbol: 'AMD', name: 'Advanced Micro Devices', weight: 1.9 },
      { symbol: 'ORCL', name: 'Oracle Corp.', weight: 1.8 },
      { symbol: 'ACN', name: 'Accenture plc', weight: 1.6 },
    ],
    sectorExposure: { 'Software': 35.2, 'Semiconductors': 31.8, 'Hardware': 22.4, 'IT Services': 10.6 },
  },
  XLV: {
    name: 'Health Care Select Sector SPDR Fund',
    descriptionNo: 'Eksponering mot helsesektoren i S&P 500 – legemidler, bioteknologi, medisinsk utstyr og helseforsikring. Defensiv karakter med lavere beta enn markedet.',
    descriptionEn: 'Exposure to the S&P 500 health-care sector – pharma, biotech, medical devices and managed care. Defensive profile with below-market beta.',
    expenseRatio: 0.09,
    dividendYield: 1.55,
    beta: 0.72,
    peRatio: 22.1,
    aum: 42300,
    holdingsCount: 64,
    holdings: [
      { symbol: 'LLY', name: 'Eli Lilly & Co.', weight: 11.5 },
      { symbol: 'UNH', name: 'UnitedHealth Group', weight: 8.7 },
      { symbol: 'JNJ', name: 'Johnson & Johnson', weight: 7.1 },
      { symbol: 'ABBV', name: 'AbbVie Inc.', weight: 5.4 },
      { symbol: 'MRK', name: 'Merck & Co.', weight: 5.0 },
      { symbol: 'TMO', name: 'Thermo Fisher Scientific', weight: 4.1 },
      { symbol: 'ABT', name: 'Abbott Laboratories', weight: 3.8 },
      { symbol: 'DHR', name: 'Danaher Corp.', weight: 3.0 },
      { symbol: 'PFE', name: 'Pfizer Inc.', weight: 2.8 },
      { symbol: 'AMGN', name: 'Amgen Inc.', weight: 2.7 },
    ],
    sectorExposure: { 'Pharmaceuticals': 32.0, 'Biotechnology': 16.5, 'Managed Care': 18.2, 'Medical Devices': 19.4, 'Life Sciences': 13.9 },
  },
  XLF: {
    name: 'Financial Select Sector SPDR Fund',
    descriptionNo: 'S&P 500 finansselskaper – storbanker, kortselskaper, forsikring og kapitalforvaltning. Syklisk og rentesensitiv.',
    descriptionEn: 'S&P 500 financials – money-center banks, payments, insurance and asset managers. Cyclical and interest-rate sensitive.',
    expenseRatio: 0.09,
    dividendYield: 1.58,
    beta: 1.05,
    peRatio: 16.2,
    holdings: [
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', weight: 12.9 },
      { symbol: 'JPM', name: 'JPMorgan Chase', weight: 9.8 },
      { symbol: 'V', name: 'Visa Inc.', weight: 6.7 },
      { symbol: 'MA', name: 'Mastercard Inc.', weight: 5.5 },
      { symbol: 'BAC', name: 'Bank of America', weight: 4.2 },
      { symbol: 'WFC', name: 'Wells Fargo', weight: 3.1 },
      { symbol: 'GS', name: 'Goldman Sachs', weight: 2.5 },
      { symbol: 'AXP', name: 'American Express', weight: 2.3 },
      { symbol: 'SPGI', name: 'S&P Global', weight: 2.2 },
      { symbol: 'MS', name: 'Morgan Stanley', weight: 2.1 },
    ],
    sectorExposure: { 'Banks': 28.3, 'Insurance': 17.4, 'Financial Services': 35.2, 'Capital Markets': 19.1 },
  },
  XLE: {
    name: 'Energy Select Sector SPDR Fund',
    descriptionNo: 'S&P 500 energiselskaper – olje- og gassprodusenter, raffinerier og oljeservice. Sterkt korrelert med oljeprisen.',
    descriptionEn: 'S&P 500 energy companies – oil & gas producers, refiners and services. Highly correlated with crude prices.',
    expenseRatio: 0.09,
    dividendYield: 3.25,
    beta: 0.98,
    peRatio: 12.5,
    holdings: [
      { symbol: 'XOM', name: 'Exxon Mobil', weight: 22.5 },
      { symbol: 'CVX', name: 'Chevron Corp.', weight: 15.3 },
      { symbol: 'COP', name: 'ConocoPhillips', weight: 7.8 },
      { symbol: 'EOG', name: 'EOG Resources', weight: 4.1 },
      { symbol: 'SLB', name: 'Schlumberger', weight: 3.8 },
      { symbol: 'MPC', name: 'Marathon Petroleum', weight: 3.6 },
      { symbol: 'PSX', name: 'Phillips 66', weight: 3.4 },
      { symbol: 'VLO', name: 'Valero Energy', weight: 3.0 },
      { symbol: 'OXY', name: 'Occidental Petroleum', weight: 2.9 },
      { symbol: 'WMB', name: 'Williams Companies', weight: 2.7 },
    ],
    sectorExposure: { 'Integrated Oil & Gas': 42.1, 'E&P': 28.6, 'Refining & Marketing': 15.4, 'Oil Services': 9.8, 'Midstream': 4.1 },
  },
  XLRE: {
    name: 'Real Estate Select Sector SPDR Fund',
    descriptionNo: 'S&P 500 eiendomsselskaper (REITs) – kontor, industri, logistikk, data- og celletårn. Utdelingsorientert og rentesensitiv.',
    descriptionEn: 'S&P 500 real-estate investment trusts (REITs) – office, industrial, logistics, data and cell-tower. Income-oriented and rate-sensitive.',
    expenseRatio: 0.09,
    dividendYield: 3.12,
    beta: 0.88,
    peRatio: 30.4,
    holdings: [
      { symbol: 'PLD', name: 'Prologis', weight: 9.8 },
      { symbol: 'AMT', name: 'American Tower', weight: 8.5 },
      { symbol: 'EQIX', name: 'Equinix', weight: 7.3 },
      { symbol: 'WELL', name: 'Welltower', weight: 5.8 },
      { symbol: 'SPG', name: 'Simon Property', weight: 4.6 },
      { symbol: 'PSA', name: 'Public Storage', weight: 4.2 },
      { symbol: 'O', name: 'Realty Income', weight: 4.0 },
      { symbol: 'CCI', name: 'Crown Castle', weight: 3.7 },
      { symbol: 'DLR', name: 'Digital Realty', weight: 3.5 },
      { symbol: 'EXR', name: 'Extra Space Storage', weight: 2.9 },
    ],
  },
  XLY: {
    name: 'Consumer Discretionary Select Sector SPDR Fund',
    descriptionNo: 'S&P 500 forbruksvarer som kunden kjøper når økonomien går bra – bil, detaljhandel, restaurant og underholdning.',
    descriptionEn: 'S&P 500 consumer discretionary – autos, retail, restaurants and leisure. Cyclical exposure tied to household spending.',
    expenseRatio: 0.09,
    dividendYield: 0.71,
    beta: 1.24,
    peRatio: 27.3,
    holdings: [
      { symbol: 'AMZN', name: 'Amazon.com', weight: 23.4 },
      { symbol: 'TSLA', name: 'Tesla Inc.', weight: 15.2 },
      { symbol: 'HD', name: 'Home Depot', weight: 8.6 },
      { symbol: 'MCD', name: "McDonald's Corp.", weight: 4.7 },
      { symbol: 'LOW', name: "Lowe's Companies", weight: 3.2 },
      { symbol: 'NKE', name: 'Nike Inc.', weight: 2.9 },
      { symbol: 'SBUX', name: 'Starbucks Corp.', weight: 2.6 },
      { symbol: 'BKNG', name: 'Booking Holdings', weight: 2.3 },
      { symbol: 'TJX', name: 'TJX Companies', weight: 2.2 },
      { symbol: 'CMG', name: 'Chipotle Mexican Grill', weight: 1.7 },
    ],
  },
  XLC: {
    name: 'Communication Services Select Sector SPDR Fund',
    descriptionNo: 'S&P 500 kommunikasjon – medie- og internettgiganter (Meta, Alphabet, Netflix) samt telekom (Verizon, AT&T). Ny sektor siden 2018.',
    descriptionEn: 'S&P 500 communication services – media/internet giants (Meta, Alphabet, Netflix) and telecom (Verizon, AT&T). New GICS sector since 2018.',
    expenseRatio: 0.09,
    dividendYield: 0.83,
    beta: 1.05,
    peRatio: 22.8,
    holdings: [
      { symbol: 'META', name: 'Meta Platforms', weight: 22.8 },
      { symbol: 'GOOGL', name: 'Alphabet Class A', weight: 12.5 },
      { symbol: 'GOOG', name: 'Alphabet Class C', weight: 10.6 },
      { symbol: 'NFLX', name: 'Netflix Inc.', weight: 5.4 },
      { symbol: 'TMUS', name: 'T-Mobile US', weight: 4.7 },
      { symbol: 'VZ', name: 'Verizon Communications', weight: 4.1 },
      { symbol: 'T', name: 'AT&T Inc.', weight: 4.0 },
      { symbol: 'DIS', name: 'Walt Disney Co.', weight: 3.4 },
      { symbol: 'CMCSA', name: 'Comcast Corp.', weight: 3.2 },
      { symbol: 'EA', name: 'Electronic Arts', weight: 1.3 },
    ],
  },
  XLI: {
    name: 'Industrial Select Sector SPDR Fund',
    descriptionNo: 'S&P 500 industri – luftfart/forsvar, bygg, frakt, maskiner og bemanning. Syklisk, ofte sett på som PMI-proxy.',
    descriptionEn: 'S&P 500 industrials – aerospace & defense, construction, transport, machinery and staffing. Cyclical, often treated as a PMI proxy.',
    expenseRatio: 0.09,
    dividendYield: 1.42,
    beta: 1.02,
    peRatio: 23.4,
    holdings: [
      { symbol: 'GE', name: 'GE Aerospace', weight: 5.2 },
      { symbol: 'CAT', name: 'Caterpillar Inc.', weight: 4.6 },
      { symbol: 'RTX', name: 'RTX Corp.', weight: 4.5 },
      { symbol: 'HON', name: 'Honeywell International', weight: 3.9 },
      { symbol: 'UBER', name: 'Uber Technologies', weight: 3.8 },
      { symbol: 'UNP', name: 'Union Pacific', weight: 3.7 },
      { symbol: 'LMT', name: 'Lockheed Martin', weight: 3.2 },
      { symbol: 'BA', name: 'Boeing Co.', weight: 3.0 },
      { symbol: 'DE', name: 'Deere & Co.', weight: 2.9 },
      { symbol: 'ADP', name: 'Automatic Data Processing', weight: 2.7 },
    ],
  },
  XLU: {
    name: 'Utilities Select Sector SPDR Fund',
    descriptionNo: 'S&P 500 forsyning (kraft, gass, vann). Klassisk defensiv med høy utbytteandel. Fordeler ved fallende renter.',
    descriptionEn: 'S&P 500 utilities (electric, gas, water). Classic defensive with high dividend payouts. Benefits from falling rates.',
    expenseRatio: 0.09,
    dividendYield: 2.88,
    beta: 0.55,
    peRatio: 19.5,
    holdings: [
      { symbol: 'NEE', name: 'NextEra Energy', weight: 13.2 },
      { symbol: 'SO', name: 'Southern Co.', weight: 8.1 },
      { symbol: 'DUK', name: 'Duke Energy', weight: 7.4 },
      { symbol: 'CEG', name: 'Constellation Energy', weight: 6.9 },
      { symbol: 'AEP', name: 'American Electric Power', weight: 4.5 },
      { symbol: 'SRE', name: 'Sempra', weight: 4.4 },
      { symbol: 'D', name: 'Dominion Energy', weight: 4.0 },
      { symbol: 'PCG', name: 'PG&E Corp.', weight: 3.7 },
      { symbol: 'EXC', name: 'Exelon Corp.', weight: 3.5 },
      { symbol: 'XEL', name: 'Xcel Energy', weight: 3.2 },
    ],
  },
  XLB: {
    name: 'Materials Select Sector SPDR Fund',
    descriptionNo: 'S&P 500 materialer – kjemi, metaller, gruver, bygg- og pakkematerialer. Syklisk og råvareeksponert.',
    descriptionEn: 'S&P 500 materials – chemicals, metals, mining, construction and packaging. Cyclical and commodity-exposed.',
    expenseRatio: 0.09,
    dividendYield: 1.88,
    beta: 1.11,
    peRatio: 22.0,
    holdings: [
      { symbol: 'LIN', name: 'Linde plc', weight: 20.4 },
      { symbol: 'SHW', name: 'Sherwin-Williams', weight: 7.2 },
      { symbol: 'ECL', name: 'Ecolab Inc.', weight: 5.5 },
      { symbol: 'APD', name: 'Air Products and Chemicals', weight: 4.8 },
      { symbol: 'FCX', name: 'Freeport-McMoRan', weight: 4.4 },
      { symbol: 'NEM', name: 'Newmont Corp.', weight: 3.9 },
      { symbol: 'DOW', name: 'Dow Inc.', weight: 3.2 },
      { symbol: 'DD', name: 'DuPont de Nemours', weight: 2.9 },
      { symbol: 'CTVA', name: 'Corteva Inc.', weight: 2.8 },
      { symbol: 'NUE', name: 'Nucor Corp.', weight: 2.6 },
    ],
  },
  IGF: {
    name: 'iShares Global Infrastructure ETF',
    descriptionNo: 'Global eksponering mot infrastruktur – kraftnett, rørledninger, flyplasser, veier og havner. Stabile kontantstrømmer og inflasjonsbeskyttelse.',
    descriptionEn: 'Global infrastructure exposure – power grids, pipelines, airports, toll roads and ports. Stable cash flows and inflation-linked revenue.',
    expenseRatio: 0.41,
    dividendYield: 2.64,
    beta: 0.78,
    peRatio: 21.9,
    holdings: [
      { symbol: 'AENA.MC', name: 'Aena SME S.A.', weight: 5.1 },
      { symbol: 'TRP', name: 'TC Energy', weight: 4.8 },
      { symbol: 'ENB', name: 'Enbridge Inc.', weight: 4.5 },
      { symbol: 'NGG', name: 'National Grid plc', weight: 4.2 },
      { symbol: 'AMT', name: 'American Tower', weight: 4.1 },
      { symbol: 'TRGP', name: 'Targa Resources', weight: 3.6 },
      { symbol: 'WMB', name: 'Williams Companies', weight: 3.5 },
      { symbol: 'SRE', name: 'Sempra', weight: 3.2 },
    ],
  },
  DBC: {
    name: 'Invesco DB Commodity Index Tracking Fund',
    descriptionNo: 'Bred råvarekurv via futures: energi (størst vekt), landbruk, industrimetaller og edelmetaller. Brukes ofte som inflasjonshedge.',
    descriptionEn: 'Broad commodity basket via futures: energy (largest weight), agriculture, industrial metals and precious metals. Commonly used as inflation hedge.',
    expenseRatio: 0.85,
    dividendYield: 0.0,
    beta: 0.58,
    peRatio: 0.0,
    sectorExposure: { 'Energy': 55.0, 'Agriculture': 22.5, 'Industrial Metals': 12.5, 'Precious Metals': 10.0 },
  },
  GLD: {
    name: 'SPDR Gold Shares',
    descriptionNo: 'Fysisk gull lagret i London-hvelv. Referanse-ETFen for gulleksponering – ingen utbytte, men klassisk "safe haven"-aktivum.',
    descriptionEn: 'Physically backed gold stored in London vaults. The benchmark gold ETF – no yield, but a classic safe-haven asset.',
    expenseRatio: 0.40,
    dividendYield: 0.0,
    beta: 0.12,
    peRatio: 0.0,
    sectorExposure: { 'Physical Gold': 100.0 },
  },
  SHY: {
    name: 'iShares 1-3 Year Treasury Bond ETF',
    descriptionNo: 'Korte amerikanske statsobligasjoner (1–3 år). Lav durasjon, svært begrenset renterisiko. Brukes som "cash-proxy".',
    descriptionEn: 'Short-dated U.S. Treasuries (1–3Y). Very low duration and minimal rate risk. Frequently used as a cash proxy.',
    expenseRatio: 0.15,
    dividendYield: 4.35,
    beta: 0.05,
    peRatio: 0.0,
  },
  TLT: {
    name: 'iShares 20+ Year Treasury Bond ETF',
    descriptionNo: 'Lange amerikanske statsobligasjoner (20+ år). Høy durasjon – meget rentesensitiv. Motsyklisk mot aksjemarkedet ved fallende renter.',
    descriptionEn: 'Long-dated U.S. Treasuries (20+Y). High duration – very rate-sensitive. Counter-cyclical to equities when yields fall.',
    expenseRatio: 0.15,
    dividendYield: 4.12,
    beta: 0.35,
    peRatio: 0.0,
  },

  // --- Teknologi-undersektorer (parent: XLK) ---
  SOXX: {
    name: 'iShares Semiconductor ETF',
    descriptionNo: 'Amerikanske halvlederselskaper. Svært syklisk med høy beta – dreiv AI-bølgen 2023–2024.',
    descriptionEn: 'U.S. semiconductor companies. Highly cyclical with elevated beta – led the 2023–2024 AI rally.',
    expenseRatio: 0.35,
    dividendYield: 0.73,
    beta: 1.45,
    peRatio: 32.1,
    holdings: [
      { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 9.2 },
      { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 8.5 },
      { symbol: 'AMD', name: 'Advanced Micro Devices', weight: 7.9 },
      { symbol: 'QCOM', name: 'Qualcomm Inc.', weight: 6.8 },
      { symbol: 'TXN', name: 'Texas Instruments', weight: 6.5 },
      { symbol: 'INTC', name: 'Intel Corp.', weight: 5.3 },
      { symbol: 'AMAT', name: 'Applied Materials', weight: 5.1 },
      { symbol: 'MU', name: 'Micron Technology', weight: 4.4 },
    ],
  },
  SKYY: {
    name: 'First Trust Cloud Computing ETF',
    descriptionNo: 'Selskaper eksponert mot sky-infrastruktur, SaaS og sky-relaterte tjenester.',
    descriptionEn: 'Companies exposed to cloud infrastructure, SaaS and cloud-adjacent services.',
    expenseRatio: 0.60,
    dividendYield: 0.20,
    beta: 1.22,
    peRatio: 38.5,
    holdings: [
      { symbol: 'ORCL', name: 'Oracle Corp.', weight: 4.8 },
      { symbol: 'AMZN', name: 'Amazon.com', weight: 4.5 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 4.3 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', weight: 4.1 },
      { symbol: 'IBM', name: 'IBM Corp.', weight: 3.9 },
      { symbol: 'CRM', name: 'Salesforce', weight: 3.6 },
      { symbol: 'SNOW', name: 'Snowflake Inc.', weight: 3.2 },
    ],
  },
  CIBR: {
    name: 'First Trust NASDAQ Cybersecurity ETF',
    descriptionNo: 'Cybersikkerhet – nettverksvern, endpoint, identitet og skybeskyttelse. Strukturell vekst drevet av trusselbilde og compliance.',
    descriptionEn: 'Cybersecurity – network, endpoint, identity and cloud protection. Secular growth driven by threat landscape and compliance.',
    expenseRatio: 0.60,
    dividendYield: 0.20,
    beta: 1.05,
    peRatio: 40.2,
    holdings: [
      { symbol: 'CRWD', name: 'CrowdStrike Holdings', weight: 6.8 },
      { symbol: 'PANW', name: 'Palo Alto Networks', weight: 6.5 },
      { symbol: 'FTNT', name: 'Fortinet Inc.', weight: 6.2 },
      { symbol: 'CSCO', name: 'Cisco Systems', weight: 5.9 },
      { symbol: 'ZS', name: 'Zscaler Inc.', weight: 4.8 },
      { symbol: 'BRO', name: 'Broadcom Inc.', weight: 4.5 },
    ],
  },
  IGV: {
    name: 'iShares Expanded Tech-Software Sector ETF',
    descriptionNo: 'Programvareselskaper – applikasjon, systemprogramvare og hjemmeunderholdningsprogramvare. Overvekt av store amerikanske SaaS-navn.',
    descriptionEn: 'Software companies – application, systems and home-entertainment software. Concentrated in large U.S. SaaS leaders.',
    expenseRatio: 0.41,
    dividendYield: 0.22,
    beta: 1.12,
    peRatio: 38.8,
    holdings: [
      { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 8.5 },
      { symbol: 'ORCL', name: 'Oracle Corp.', weight: 8.3 },
      { symbol: 'CRM', name: 'Salesforce', weight: 7.9 },
      { symbol: 'ADBE', name: 'Adobe Inc.', weight: 7.2 },
      { symbol: 'PANW', name: 'Palo Alto Networks', weight: 4.9 },
      { symbol: 'NOW', name: 'ServiceNow', weight: 4.6 },
    ],
  },

  // --- Helse-undersektorer (parent: XLV) ---
  IBB: {
    name: 'iShares Biotechnology ETF',
    descriptionNo: 'Amerikanske bioteknologi-selskaper (NASDAQ). Binære utfall på kliniske studier – høy volatilitet.',
    descriptionEn: 'U.S. biotechnology companies (NASDAQ). Binary clinical-trial outcomes – elevated volatility.',
    expenseRatio: 0.45,
    dividendYield: 0.30,
    beta: 0.85,
    peRatio: 28.4,
    holdings: [
      { symbol: 'GILD', name: 'Gilead Sciences', weight: 8.1 },
      { symbol: 'AMGN', name: 'Amgen Inc.', weight: 7.8 },
      { symbol: 'VRTX', name: 'Vertex Pharmaceuticals', weight: 7.5 },
      { symbol: 'REGN', name: 'Regeneron Pharmaceuticals', weight: 6.2 },
      { symbol: 'ALNY', name: 'Alnylam Pharmaceuticals', weight: 3.4 },
    ],
  },
  XBI: {
    name: 'SPDR S&P Biotech ETF',
    descriptionNo: 'Bred, lik-vektet biotech – gir større eksponering mot små/mellomstore selskaper enn IBB.',
    descriptionEn: 'Broad, equal-weighted biotech – larger small/mid-cap tilt than IBB.',
    expenseRatio: 0.35,
    dividendYield: 0.0,
    beta: 1.35,
    peRatio: 27.9,
    holdings: [
      { symbol: 'REGN', name: 'Regeneron Pharmaceuticals', weight: 1.4 },
      { symbol: 'GILD', name: 'Gilead Sciences', weight: 1.3 },
      { symbol: 'VRTX', name: 'Vertex Pharmaceuticals', weight: 1.3 },
      { symbol: 'AMGN', name: 'Amgen Inc.', weight: 1.2 },
    ],
  },
  IHI: {
    name: 'iShares U.S. Medical Devices ETF',
    descriptionNo: 'Medisinsk utstyr – kirurgirobot, diagnostikk, ortopedi og kardiologi. Stabil vekst knyttet til aldring og innovasjon.',
    descriptionEn: 'Medical devices – surgical robotics, diagnostics, orthopedics and cardiology. Steady growth tied to aging and innovation.',
    expenseRatio: 0.39,
    dividendYield: 0.74,
    beta: 0.90,
    peRatio: 30.2,
    holdings: [
      { symbol: 'ABT', name: 'Abbott Laboratories', weight: 16.5 },
      { symbol: 'TMO', name: 'Thermo Fisher Scientific', weight: 14.8 },
      { symbol: 'ISRG', name: 'Intuitive Surgical', weight: 8.3 },
      { symbol: 'MDT', name: 'Medtronic plc', weight: 7.1 },
      { symbol: 'BSX', name: 'Boston Scientific', weight: 6.5 },
    ],
  },

  // --- Finans-undersektorer (parent: XLF) ---
  KBE: {
    name: 'SPDR S&P Bank ETF',
    descriptionNo: 'Likevektet bred bank-ETF med eksponering mot både storbanker og regionalbanker.',
    descriptionEn: 'Equal-weighted broad bank ETF covering money-center and regional banks.',
    expenseRatio: 0.35,
    dividendYield: 2.70,
    beta: 1.28,
    peRatio: 12.4,
    holdings: [
      { symbol: 'BK', name: 'BNY Mellon', weight: 2.6 },
      { symbol: 'JPM', name: 'JPMorgan Chase', weight: 2.5 },
      { symbol: 'C', name: 'Citigroup', weight: 2.4 },
      { symbol: 'WFC', name: 'Wells Fargo', weight: 2.4 },
    ],
  },
  KRE: {
    name: 'SPDR S&P Regional Banking ETF',
    descriptionNo: 'Amerikanske regionalbanker – svært likevektet. Sterk sammenheng med bankkrise i 2023.',
    descriptionEn: 'U.S. regional banks – highly equal-weighted. Strongly affected by the 2023 banking stress.',
    expenseRatio: 0.35,
    dividendYield: 3.10,
    beta: 1.42,
    peRatio: 11.2,
    holdings: [
      { symbol: 'EWBC', name: 'East West Bancorp', weight: 2.5 },
      { symbol: 'FITB', name: 'Fifth Third Bancorp', weight: 2.4 },
      { symbol: 'HBAN', name: 'Huntington Bancshares', weight: 2.3 },
      { symbol: 'RF', name: 'Regions Financial', weight: 2.3 },
    ],
  },
  IAI: {
    name: 'iShares U.S. Broker-Dealers & Securities Exchanges ETF',
    descriptionNo: 'Meglerhus, børser og kapitalmarkedsaktører – Goldman, MS, CME, ICE, Nasdaq.',
    descriptionEn: 'Broker-dealers, exchanges and capital-markets infrastructure – GS, MS, CME, ICE, Nasdaq.',
    expenseRatio: 0.39,
    dividendYield: 1.45,
    beta: 1.10,
    peRatio: 18.6,
    holdings: [
      { symbol: 'GS', name: 'Goldman Sachs', weight: 16.5 },
      { symbol: 'SPGI', name: 'S&P Global', weight: 13.2 },
      { symbol: 'MS', name: 'Morgan Stanley', weight: 11.8 },
      { symbol: 'CME', name: 'CME Group', weight: 8.4 },
      { symbol: 'ICE', name: 'Intercontinental Exchange', weight: 7.6 },
    ],
  },

  // --- Eiendom-undersektorer (parent: XLRE) ---
  VNQ: {
    name: 'Vanguard Real Estate ETF',
    descriptionNo: 'Bredeste amerikanske REIT-ETF – inkluderer spesialiserte REITs som storesegmentet i XLRE ikke dekker.',
    descriptionEn: 'Broadest U.S. REIT ETF – includes specialty REITs beyond XLRE coverage.',
    expenseRatio: 0.13,
    dividendYield: 3.85,
    beta: 0.90,
    peRatio: 34.2,
    holdings: [
      { symbol: 'VNQI', name: 'Vanguard Real Estate II Index', weight: 12.8 },
      { symbol: 'PLD', name: 'Prologis', weight: 6.7 },
      { symbol: 'AMT', name: 'American Tower', weight: 5.9 },
      { symbol: 'EQIX', name: 'Equinix', weight: 5.1 },
    ],
  },
  REM: {
    name: 'iShares Mortgage Real Estate ETF',
    descriptionNo: 'Mortgage REITs – låner kort og kjøper boliglånsobligasjoner. Ekstremt rentesensitiv og høy-yield.',
    descriptionEn: 'Mortgage REITs – borrow short, own MBS. Extremely rate-sensitive and high-yield.',
    expenseRatio: 0.48,
    dividendYield: 11.5,
    beta: 1.25,
    peRatio: 10.4,
    holdings: [
      { symbol: 'AGNC', name: 'AGNC Investment', weight: 12.4 },
      { symbol: 'NLY', name: 'Annaly Capital Management', weight: 11.8 },
      { symbol: 'STWD', name: 'Starwood Property Trust', weight: 7.2 },
    ],
  },
  SRRE: {
    name: 'Data Center & Digital Infrastructure REITs',
    descriptionNo: 'Datatårn, datasentre og digital infrastruktur. Strukturell vekst drevet av sky og AI.',
    descriptionEn: 'Cell towers, data centers and digital infrastructure. Secular growth tied to cloud and AI.',
    expenseRatio: 0.50,
    dividendYield: 2.60,
    beta: 0.95,
    peRatio: 42.1,
    holdings: [
      { symbol: 'AMT', name: 'American Tower', weight: 18.5 },
      { symbol: 'EQIX', name: 'Equinix', weight: 16.2 },
      { symbol: 'CCI', name: 'Crown Castle', weight: 12.8 },
      { symbol: 'DLR', name: 'Digital Realty', weight: 11.4 },
    ],
  },

  // --- Infrastruktur-undersektorer (parent: IGF) ---
  PAVE: {
    name: 'Global X U.S. Infrastructure Development ETF',
    descriptionNo: 'Amerikanske selskaper som bygger infrastruktur – bygg, materialer, tungmaskiner og elektriske nett. Nøt godt av Infrastructure Bill.',
    descriptionEn: 'U.S. infrastructure builders – construction, materials, heavy machinery and electrical grid. Beneficiary of the Infrastructure Bill.',
    expenseRatio: 0.47,
    dividendYield: 0.56,
    beta: 1.15,
    peRatio: 21.2,
    holdings: [
      { symbol: 'HWM', name: 'Howmet Aerospace', weight: 3.2 },
      { symbol: 'PWR', name: 'Quanta Services', weight: 3.1 },
      { symbol: 'URI', name: 'United Rentals', weight: 3.0 },
      { symbol: 'ETN', name: 'Eaton Corp.', weight: 2.9 },
    ],
  },
  GRID: {
    name: 'First Trust Nasdaq Clean Edge Smart Grid Infrastructure ETF',
    descriptionNo: 'Smart-nett og strømnett-modernisering. Eksponering mot elektrifisering og fornybar integrasjon.',
    descriptionEn: 'Smart-grid and power-network modernization. Exposure to electrification and renewable integration.',
    expenseRatio: 0.56,
    dividendYield: 1.38,
    beta: 1.10,
    peRatio: 23.5,
    holdings: [
      { symbol: 'ABB', name: 'ABB Ltd.', weight: 8.5 },
      { symbol: 'ETN', name: 'Eaton Corp.', weight: 8.2 },
      { symbol: 'SU.PA', name: 'Schneider Electric', weight: 8.0 },
    ],
  },
  IFRA: {
    name: 'iShares U.S. Infrastructure ETF',
    descriptionNo: 'Bred amerikansk infrastruktur – både eiere (forsyning/transport) og byggere (materialer/industri). Omtrent 50/50 splitt.',
    descriptionEn: 'Broad U.S. infrastructure – owners (utilities/transport) and enablers (materials/industrials). Roughly 50/50 split.',
    expenseRatio: 0.30,
    dividendYield: 1.95,
    beta: 0.95,
    peRatio: 19.8,
  },

  // --- Konsum-undersektorer (parent: XLY) ---
  XRT: {
    name: 'SPDR S&P Retail ETF',
    descriptionNo: 'Likevektet amerikansk detaljhandel – spesialbutikker, varehus og netthandel. Sterk puls på forbrukerøkonomien.',
    descriptionEn: 'Equal-weighted U.S. retail – specialty, department stores and e-commerce. Strong pulse on consumer health.',
    expenseRatio: 0.35,
    dividendYield: 1.20,
    beta: 1.20,
    peRatio: 18.3,
    holdings: [
      { symbol: 'AAP', name: 'Advance Auto Parts', weight: 1.6 },
      { symbol: 'AMZN', name: 'Amazon.com', weight: 1.4 },
      { symbol: 'TGT', name: 'Target Corp.', weight: 1.4 },
    ],
  },
  PEJ: {
    name: 'Invesco Dynamic Leisure and Entertainment ETF',
    descriptionNo: 'Fritid, restaurant, hotell, cruise og underholdning. Sensitiv til forbrukertillit og reiseaktivitet.',
    descriptionEn: 'Leisure, restaurants, hotels, cruise and entertainment. Sensitive to consumer confidence and travel demand.',
    expenseRatio: 0.57,
    dividendYield: 0.80,
    beta: 1.30,
    peRatio: 22.8,
    holdings: [
      { symbol: 'BKNG', name: 'Booking Holdings', weight: 5.5 },
      { symbol: 'MCD', name: "McDonald's Corp.", weight: 5.3 },
      { symbol: 'SBUX', name: 'Starbucks Corp.', weight: 5.0 },
      { symbol: 'MAR', name: 'Marriott International', weight: 4.6 },
    ],
  },
  AWAY: {
    name: 'ETFMG Travel Tech ETF',
    descriptionNo: 'Reisetjenester og reiseteknologi – bookingmotorer, delingsøkonomi, flyselskaper og hotellplattformer.',
    descriptionEn: 'Travel services and travel-tech – booking engines, sharing economy, airlines and hotel platforms.',
    expenseRatio: 0.75,
    dividendYield: 0.50,
    beta: 1.40,
    peRatio: 21.1,
    holdings: [
      { symbol: 'TRIP', name: 'TripAdvisor Inc.', weight: 4.8 },
      { symbol: 'ABNB', name: 'Airbnb Inc.', weight: 4.5 },
      { symbol: 'BKNG', name: 'Booking Holdings', weight: 4.3 },
      { symbol: 'EXPE', name: 'Expedia Group', weight: 4.0 },
    ],
  },

  // --- Telekom-undersektorer (parent: XLC) ---
  VOX: {
    name: 'Vanguard Communication Services ETF',
    descriptionNo: 'Bredere enn XLC – alle amerikanske kommunikasjonsselskaper (ikke bare S&P 500). Samme dominerende vekt i Meta og Alphabet.',
    descriptionEn: 'Broader than XLC – all U.S. communication services (not only S&P 500). Same dominant weight in Meta and Alphabet.',
    expenseRatio: 0.10,
    dividendYield: 1.05,
    beta: 1.05,
    peRatio: 22.4,
    holdings: [
      { symbol: 'META', name: 'Meta Platforms', weight: 20.4 },
      { symbol: 'GOOGL', name: 'Alphabet Class A', weight: 11.2 },
      { symbol: 'GOOG', name: 'Alphabet Class C', weight: 9.8 },
      { symbol: 'NFLX', name: 'Netflix Inc.', weight: 4.9 },
    ],
  },
  FCOM: {
    name: 'Fidelity MSCI Communication Services Index ETF',
    descriptionNo: 'MSCI-basert kommunikasjonssektor. Svært lik eksponering som XLC men med litt lavere utgiftsforhold.',
    descriptionEn: 'MSCI-based communication services. Very similar exposure to XLC but slightly lower expense ratio.',
    expenseRatio: 0.08,
    dividendYield: 0.92,
    beta: 1.04,
    peRatio: 22.2,
    holdings: [
      { symbol: 'META', name: 'Meta Platforms', weight: 21.5 },
      { symbol: 'GOOGL', name: 'Alphabet Class A', weight: 11.5 },
      { symbol: 'GOOG', name: 'Alphabet Class C', weight: 10.0 },
    ],
  },

  // --- Industri-undersektorer (parent: XLI) ---
  ITA: {
    name: 'iShares U.S. Aerospace & Defense ETF',
    descriptionNo: 'Amerikansk luftfart og forsvar – kommersielle flyprodusenter og forsvarsleverandører.',
    descriptionEn: 'U.S. aerospace and defense – commercial aircraft and defense contractors.',
    expenseRatio: 0.40,
    dividendYield: 0.78,
    beta: 0.95,
    peRatio: 28.4,
    holdings: [
      { symbol: 'GE', name: 'GE Aerospace', weight: 18.5 },
      { symbol: 'RTX', name: 'RTX Corp.', weight: 17.2 },
      { symbol: 'BA', name: 'Boeing Co.', weight: 9.3 },
      { symbol: 'LMT', name: 'Lockheed Martin', weight: 7.6 },
      { symbol: 'NOC', name: 'Northrop Grumman', weight: 4.8 },
    ],
  },
  JETS: {
    name: 'U.S. Global Jets ETF',
    descriptionNo: 'Flyselskaper globalt, tung vekt på amerikanske. Ekstremt sensitiv til drivstoffpriser og reisebehov.',
    descriptionEn: 'Global airlines with heavy U.S. weighting. Extremely sensitive to fuel costs and travel demand.',
    expenseRatio: 0.60,
    dividendYield: 0.42,
    beta: 1.35,
    peRatio: 14.8,
    holdings: [
      { symbol: 'UAL', name: 'United Airlines', weight: 10.5 },
      { symbol: 'DAL', name: 'Delta Air Lines', weight: 10.2 },
      { symbol: 'AAL', name: 'American Airlines', weight: 9.8 },
      { symbol: 'LUV', name: 'Southwest Airlines', weight: 9.5 },
    ],
  },
  XTN: {
    name: 'SPDR S&P Transportation ETF',
    descriptionNo: 'Likevektet transport – lastebil, jernbane, luftfrakt og skipsfart. Klassisk Dow Theory-konfirmasjons-ETF.',
    descriptionEn: 'Equal-weighted transportation – trucking, rail, air freight and shipping. Classic Dow Theory confirmation ETF.',
    expenseRatio: 0.35,
    dividendYield: 0.95,
    beta: 1.10,
    peRatio: 19.7,
    holdings: [
      { symbol: 'UBER', name: 'Uber Technologies', weight: 4.2 },
      { symbol: 'LYFT', name: 'Lyft Inc.', weight: 3.8 },
      { symbol: 'UNP', name: 'Union Pacific', weight: 3.7 },
    ],
  },

  // --- Forsyning-undersektorer (parent: XLU) ---
  VPU: {
    name: 'Vanguard Utilities ETF',
    descriptionNo: 'Bred amerikansk forsyning, bredere enn XLU. Defensiv profil og lav utgiftsandel.',
    descriptionEn: 'Broad U.S. utilities, wider coverage than XLU. Defensive profile and very low expense ratio.',
    expenseRatio: 0.10,
    dividendYield: 2.95,
    beta: 0.55,
    peRatio: 19.2,
    holdings: [
      { symbol: 'NEE', name: 'NextEra Energy', weight: 12.0 },
      { symbol: 'SO', name: 'Southern Co.', weight: 7.3 },
      { symbol: 'DUK', name: 'Duke Energy', weight: 6.7 },
    ],
  },
  IDU: {
    name: 'iShares U.S. Utilities ETF',
    descriptionNo: 'Amerikansk forsyningssektor fra Russell 1000. Sammenlignbar med XLU men med litt bredere sammensetning.',
    descriptionEn: 'U.S. utilities from Russell 1000. Comparable to XLU with slightly wider coverage.',
    expenseRatio: 0.39,
    dividendYield: 2.80,
    beta: 0.58,
    peRatio: 19.4,
    holdings: [
      { symbol: 'NEE', name: 'NextEra Energy', weight: 11.8 },
      { symbol: 'SO', name: 'Southern Co.', weight: 7.2 },
      { symbol: 'DUK', name: 'Duke Energy', weight: 6.6 },
    ],
  },

  // --- Korte obligasjoner (parent: SHY) ---
  BIL: {
    name: 'SPDR Bloomberg 1-3 Month T-Bill ETF',
    descriptionNo: 'Helt korte amerikanske statskasseveksler (1–3 mnd). Nær null durasjon, bokstavelig talt kontant-proxy.',
    descriptionEn: 'Ultra-short U.S. Treasury bills (1–3M). Near-zero duration, essentially a cash proxy.',
    expenseRatio: 0.1354,
    dividendYield: 4.80,
    beta: 0.01,
    peRatio: 0.0,
  },
  VGSH: {
    name: 'Vanguard Short-Term Treasury ETF',
    descriptionNo: 'Amerikanske statsobligasjoner 1–3 år, svært lav utgift. Direkte konkurrent til SHY.',
    descriptionEn: 'U.S. Treasuries 1–3Y with a very low expense ratio. Direct competitor to SHY.',
    expenseRatio: 0.04,
    dividendYield: 4.25,
    beta: 0.05,
    peRatio: 0.0,
  },

  // --- Lange obligasjoner (parent: TLT) ---
  IEF: {
    name: 'iShares 7-10 Year Treasury Bond ETF',
    descriptionNo: 'Amerikanske statsobligasjoner 7–10 år. Middels durasjon – balansert rentesensitivitet.',
    descriptionEn: 'U.S. Treasuries 7–10Y. Intermediate duration – balanced rate sensitivity.',
    expenseRatio: 0.15,
    dividendYield: 3.95,
    beta: 0.18,
    peRatio: 0.0,
  },
  VGLT: {
    name: 'Vanguard Long-Term Treasury ETF',
    descriptionNo: 'Lange amerikanske statsobligasjoner (10+ år), lavere utgift enn TLT.',
    descriptionEn: 'Long-dated U.S. Treasuries (10+Y), lower expense than TLT.',
    expenseRatio: 0.04,
    dividendYield: 4.10,
    beta: 0.30,
    peRatio: 0.0,
  },

  // --- Energi-undersektorer (parent: XLE) ---
  XOP: {
    name: 'SPDR S&P Oil & Gas Exploration & Production ETF',
    descriptionNo: 'Likevektet amerikanske olje- og gassprodusenter. Direkte oljeprisspill med høy beta.',
    descriptionEn: 'Equal-weighted U.S. oil & gas producers. Pure-play crude-price bet with high beta.',
    expenseRatio: 0.35,
    dividendYield: 2.70,
    beta: 1.55,
    peRatio: 10.8,
    holdings: [
      { symbol: 'COP', name: 'ConocoPhillips', weight: 2.8 },
      { symbol: 'MRO', name: 'Marathon Oil', weight: 2.5 },
      { symbol: 'DVN', name: 'Devon Energy', weight: 2.5 },
    ],
  },
  TAN: {
    name: 'Invesco Solar ETF',
    descriptionNo: 'Global solenergi – modulprodusenter, inverter, installasjon og nettintegrasjon. Volatil og policy-sensitiv.',
    descriptionEn: 'Global solar – module makers, inverters, installers and grid integration. Volatile and policy-sensitive.',
    expenseRatio: 0.67,
    dividendYield: 0.40,
    beta: 1.60,
    peRatio: 28.5,
    holdings: [
      { symbol: 'FSLR', name: 'First Solar', weight: 11.8 },
      { symbol: 'ENPH', name: 'Enphase Energy', weight: 10.4 },
      { symbol: 'NXT', name: 'Nextracker Inc.', weight: 7.2 },
    ],
  },
  ICLN: {
    name: 'iShares Global Clean Energy ETF',
    descriptionNo: 'Global fornybar energi – sol, vind, hydrogen og elektrifisering. Ofte sett på som energiomstillings-proxy.',
    descriptionEn: 'Global clean energy – solar, wind, hydrogen and electrification. Often treated as an energy-transition proxy.',
    expenseRatio: 0.41,
    dividendYield: 1.22,
    beta: 1.35,
    peRatio: 24.2,
    holdings: [
      { symbol: 'FSLR', name: 'First Solar', weight: 9.5 },
      { symbol: 'ENPH', name: 'Enphase Energy', weight: 7.8 },
      { symbol: 'IBDRY', name: 'Iberdrola S.A.', weight: 7.4 },
    ],
  },

  // --- Materialer-undersektorer (parent: XLB) ---
  XME: {
    name: 'SPDR S&P Metals & Mining ETF',
    descriptionNo: 'Likevektet metall- og gruveselskaper – stål, aluminium, kobber, gull og kull. Sterkt syklisk.',
    descriptionEn: 'Equal-weighted metals & mining – steel, aluminum, copper, gold and coal. Strongly cyclical.',
    expenseRatio: 0.35,
    dividendYield: 1.45,
    beta: 1.35,
    peRatio: 12.2,
    holdings: [
      { symbol: 'CLF', name: 'Cleveland-Cliffs', weight: 5.6 },
      { symbol: 'NUE', name: 'Nucor Corp.', weight: 5.4 },
      { symbol: 'STLD', name: 'Steel Dynamics', weight: 5.1 },
      { symbol: 'FCX', name: 'Freeport-McMoRan', weight: 4.8 },
    ],
  },
  LIT: {
    name: 'Global X Lithium & Battery Tech ETF',
    descriptionNo: 'Litium-utvinning, batteriprodusenter og batteri-relatert teknologi. Global eksponering med tung kinesisk vekt.',
    descriptionEn: 'Lithium miners, battery makers and battery-tech. Global exposure with heavy Chinese weighting.',
    expenseRatio: 0.75,
    dividendYield: 2.10,
    beta: 1.35,
    peRatio: 18.9,
    holdings: [
      { symbol: 'ALB', name: 'Albemarle Corp.', weight: 5.8 },
      { symbol: 'TSLA', name: 'Tesla Inc.', weight: 4.5 },
      { symbol: '300750.SZ', name: 'Contemporary Amperex (CATL)', weight: 8.7 },
    ],
  },
  WOOD: {
    name: 'iShares Global Timber & Forestry ETF',
    descriptionNo: 'Global skog, trelast og papp/papirproduksjon. Korrelert med byggeaktivitet og emballasjeetterspørsel.',
    descriptionEn: 'Global timber, lumber and paper/packaging. Correlated with building activity and packaging demand.',
    expenseRatio: 0.46,
    dividendYield: 2.60,
    beta: 1.05,
    peRatio: 21.5,
    holdings: [
      { symbol: 'IP', name: 'International Paper', weight: 9.2 },
      { symbol: 'WY', name: 'Weyerhaeuser Co.', weight: 8.5 },
      { symbol: 'PKG', name: 'Packaging Corp.', weight: 6.4 },
    ],
  },

  // --- Råvarer-undersektorer (parent: DBC) ---
  USO: {
    name: 'United States Oil Fund, LP',
    descriptionNo: 'WTI-olje via futures. OBS: "contango drag" gjør langsiktig eie lite egnet. Bedre som taktisk eksponering.',
    descriptionEn: 'WTI crude via futures. Warning: "contango drag" makes this poorly suited for long-term holding. Best used tactically.',
    expenseRatio: 0.60,
    dividendYield: 0.0,
    beta: 1.30,
    peRatio: 0.0,
  },
  UNG: {
    name: 'United States Natural Gas Fund, LP',
    descriptionNo: 'Henry Hub naturgass via futures. Ekstremt volatil, sterk contango-effekt.',
    descriptionEn: 'Henry Hub natural gas via futures. Extremely volatile with strong contango drag.',
    expenseRatio: 0.83,
    dividendYield: 0.0,
    beta: 1.85,
    peRatio: 0.0,
  },
  DBA: {
    name: 'Invesco DB Agriculture Fund',
    descriptionNo: 'Landbruksråvarer – mais, soya, sukker, kaffe, hvete, kveg. Diversifisert via futures.',
    descriptionEn: 'Agricultural commodities – corn, soybeans, sugar, coffee, wheat, cattle. Diversified futures exposure.',
    expenseRatio: 0.85,
    dividendYield: 0.0,
    beta: 0.40,
    peRatio: 0.0,
  },

  // --- Edelmetaller-undersektorer (parent: GLD) ---
  SLV: {
    name: 'iShares Silver Trust',
    descriptionNo: 'Fysisk sølv. Mer volatil enn gull – fungerer både som edelmetall og industrimetall.',
    descriptionEn: 'Physically backed silver. More volatile than gold – acts as both precious and industrial metal.',
    expenseRatio: 0.50,
    dividendYield: 0.0,
    beta: 0.85,
    peRatio: 0.0,
  },
  SIL: {
    name: 'Global X Silver Miners ETF',
    descriptionNo: 'Globale sølvgruver. Kjent for å gi forsterket eksponering mot sølvprisen ("operativ giring").',
    descriptionEn: 'Global silver miners. Known for leveraged exposure to the silver price ("operating leverage").',
    expenseRatio: 0.65,
    dividendYield: 1.70,
    beta: 1.20,
    peRatio: 22.4,
    holdings: [
      { symbol: 'WPM', name: 'Wheaton Precious Metals', weight: 22.5 },
      { symbol: 'PAAS', name: 'Pan American Silver', weight: 11.2 },
    ],
  },
  GDX: {
    name: 'VanEck Gold Miners ETF',
    descriptionNo: 'Globale gullgruver. Gir ofte 2–3x bevegelse av gullprisen, både oppover og nedover.',
    descriptionEn: 'Global gold miners. Typically delivers 2–3x leverage to the gold price, in both directions.',
    expenseRatio: 0.51,
    dividendYield: 1.55,
    beta: 0.90,
    peRatio: 24.8,
    holdings: [
      { symbol: 'NEM', name: 'Newmont Corp.', weight: 14.2 },
      { symbol: 'AEM', name: 'Agnico Eagle Mines', weight: 10.6 },
      { symbol: 'GOLD', name: 'Barrick Gold', weight: 9.8 },
    ],
  },
  PPLT: {
    name: 'abrdn Physical Platinum Shares ETF',
    descriptionNo: 'Fysisk platina i forvaring. Industriell etterspørsel fra bilkatalysatorer og hydrogenteknologi.',
    descriptionEn: 'Physically backed platinum. Industrial demand from auto catalysts and hydrogen tech.',
    expenseRatio: 0.60,
    dividendYield: 0.0,
    beta: 0.55,
    peRatio: 0.0,
  },
};

// Kunstig forsinkelse for å simulere nettverksrespons (kan fjernes).
const SIMULATED_DELAY_MS = 180;

/**
 * Synkron oppslag av ETF-detaljer fra databasen.
 */
export function fetchETFDetailsSync(symbol: string): ETFDetails | null {
  const record = ETF_DATABASE[symbol];
  if (!record) return null;

  return {
    symbol,
    name: record.name,
    description: '', // Ikke nødvendig for synkron bruk i tabell
    expenseRatio: record.expenseRatio,
    dividendYield: record.dividendYield,
    beta: record.beta,
    peRatio: record.peRatio,
    aum: record.aum,
    holdingsCount: record.holdingsCount,
    holdings: record.holdings ?? [],
    sectorExposure: record.sectorExposure ?? {},
  };
}

export async function fetchETFDetails(symbol: string, language: Language = 'no'): Promise<ETFDetails> {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY_MS));

  const record = ETF_DATABASE[symbol];
  if (!record) {
    throw new Error(`No ETF data available for symbol: ${symbol}`);
  }

  return {
    symbol,
    name: record.name,
    description: language === 'no' ? record.descriptionNo : record.descriptionEn,
    expenseRatio: record.expenseRatio,
    dividendYield: record.dividendYield,
    beta: record.beta,
    peRatio: record.peRatio,
    aum: record.aum,
    holdingsCount: record.holdingsCount,
    holdings: record.holdings ?? [],
    sectorExposure: record.sectorExposure ?? {},
  };
}

export function hasETFDetails(symbol: string): boolean {
  return Object.prototype.hasOwnProperty.call(ETF_DATABASE, symbol);
}

/**
 * Synkron oppslag av alle holdings-symboler for en ETF. Brukes av drilldown
 * for å pre-laste prisdata for aksjene før brukeren krysser dem av.
 */
export function getEtfHoldings(symbol: string): string[] {
  const record = ETF_DATABASE[symbol];
  if (!record || !record.holdings) return [];
  return record.holdings.map(h => h.symbol);
}

/**
 * Synkron oppslag av ETF-navn (brukes i drilldown-banner uten å vente på
 * fetchETFDetails).
 */
export function getEtfName(symbol: string): string | null {
  const record = ETF_DATABASE[symbol];
  return record?.name ?? null;
}

/**
 * Bygger en global lookup-tabell aksjesymbol -> selskapsnavn på tvers av alle
 * ETFer i databasen. Brukes av chart-komponenter for å vise "NVIDIA Corp."
 * i stedet for bare "NVDA" i legende/tooltip under ETF-drilldown.
 * Hvis samme aksje forekommer i flere ETFer, vinner første observerte navn.
 */
let holdingNameCache: Record<string, string> | null = null;
export function getHoldingName(symbol: string): string | null {
  if (!holdingNameCache) {
    holdingNameCache = {};
    for (const record of Object.values(ETF_DATABASE)) {
      if (!record.holdings) continue;
      for (const h of record.holdings) {
        if (!(h.symbol in holdingNameCache)) {
          holdingNameCache[h.symbol] = h.name;
        }
      }
    }
  }
  return holdingNameCache[symbol] ?? null;
}
