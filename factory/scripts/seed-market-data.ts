import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const roundPrice = (value: number): number => Number(value.toFixed(2));

const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const applyDailyReturn = (price: number, dailyReturn: number): number =>
  roundPrice(price * (1 + dailyReturn));

const buildBullMarketSegment = (startPrice: number, days: number): number[] => {
  const closes: number[] = [];
  let price = startPrice;

  for (let i = 0; i < days; i++) {
    // Ro-opptrend med støy: ca 0.08% til 0.35% per dag.
    const dailyReturn = randomBetween(0.0008, 0.0035);
    // Legg på liten negativ støy enkelte dager for "hakkete" trend.
    const noisyReturn = Math.random() < 0.25 ? dailyReturn - randomBetween(0.001, 0.0025) : dailyReturn;
    price = applyDailyReturn(price, noisyReturn);
    closes.push(price);
  }

  return closes;
};

const buildCrashSegment = (startPrice: number, days: number, totalDropPct: number): number[] => {
  const closes: number[] = [];
  let price = startPrice;

  // Vi fordeler 18% fall over 5 dager med tilfeldig vekting (ca 3-4% per dag).
  // Daglig nivåer trekkes i området -2.8% til -4.8% og skaleres til eksakt totalfall.
  const rawMoves = Array.from({ length: days }, () => randomBetween(-0.048, -0.028));
  const targetMultiplier = 1 - totalDropPct; // 0.82 ved 18% fall
  const currentMultiplier = rawMoves.reduce((acc, move) => acc * (1 + move), 1);
  const scale = Math.log(targetMultiplier) / Math.log(currentMultiplier);
  const scaledMoves = rawMoves.map((move) => Math.pow(1 + move, scale) - 1);

  for (const move of scaledMoves) {
    price = applyDailyReturn(price, move);
    closes.push(price);
  }

  return closes;
};

const buildRecoverySegment = (startPrice: number, days: number): number[] => {
  const closes: number[] = [];
  let price = startPrice;

  for (let i = 0; i < days; i++) {
    // Sakte, volatil recovery: gjennomsnitt svakt opp, men med tydelig daglig støy.
    const baseReturn = randomBetween(0.0003, 0.0022);
    const shock = randomBetween(-0.015, 0.015);
    const dailyReturn = baseReturn + shock;
    price = applyDailyReturn(price, dailyReturn);
    closes.push(price);
  }

  return closes;
};

const buildMatureBullSegment = (startPrice: number, days: number): number[] => {
  const closes: number[] = [];
  let price = startPrice;

  for (let i = 0; i < days; i++) {
    const baseReturn = randomBetween(0.0004, 0.0018);
    const shock = randomBetween(-0.008, 0.008);
    const dailyReturn = baseReturn + shock;
    price = applyDailyReturn(price, dailyReturn);
    closes.push(price);
  }

  return closes;
};

const main = async (): Promise<void> => {
  const marketDataDir = path.join(process.cwd(), 'data', 'factory', 'market-data');
  await mkdir(marketDataDir, { recursive: true });

  const initialPrice = 100;
  const bull = buildBullMarketSegment(initialPrice, 120);
  const crash = buildCrashSegment(bull[bull.length - 1], 5, 0.18);
  const recovery = buildRecoverySegment(crash[crash.length - 1], 70);
  const matureBull = buildMatureBullSegment(recovery[recovery.length - 1], 65);

  const closes = [...bull, ...crash, ...recovery, ...matureBull];
  const payload = { closes };

  const outputPath = path.join(marketDataDir, 'SPY_1y.json');
  await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf-8');

  const preCrash = bull[bull.length - 1];
  const postCrash = crash[crash.length - 1];
  const actualDropPct = ((postCrash - preCrash) / preCrash) * 100;

  console.log(`Suksess: genererte syntetisk krise-data i ${outputPath}`);
  console.log(
    `Scenario: Bull(120d) -> Crash(5d, ${actualDropPct.toFixed(2)}%) -> Recovery(70d) -> MatureBull(65d). Totalt ${closes.length} datapunkter.`
  );
  console.log('\nNeste steg:');
  console.log('1) Start Ollama (og modellen din, f.eks. deepseek-r1).');
  console.log('2) Kjør utfordringen: npm run factory:challenge');
  console.log('3) Se Baseline vs Challenger i terminalen (Sharpe, Drawdown, WinRate).');
};

void main().catch((error) => {
  console.error('Kunne ikke generere syntetiske markedsdata:', error);
  process.exit(1);
});
