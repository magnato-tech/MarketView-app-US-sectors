import 'dotenv/config';
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { runFactoryEvolutionCycle } from '../../lib/factory/EvolutionCycle';

const DEFAULT_SYMBOL = 'SPY';
const DEFAULT_PERIOD: '1y' = '1y';

type MarketDataFileShape = { closes: number[] };

const ensureMarketDataFileExists = async (symbol: string, period: string): Promise<string> => {
  const dataDir = path.join(process.cwd(), 'data', 'factory', 'market-data');
  const expectedFile = path.join(dataDir, `${symbol}_${period}.json`);

  try {
    await access(expectedFile);
  } catch {
    throw new Error(
      [
        `Fant ikke markedsdatafil: ${expectedFile}`,
        'Opprett filen før du kjører challenge-runneren.',
        `Forventet format: {"closes":[100,101,102,...]} i ${path.join('data', 'factory', 'market-data')}.`,
      ].join('\n')
    );
  }

  const raw = await readFile(expectedFile, 'utf-8');
  const parsed = JSON.parse(raw) as MarketDataFileShape;
  if (!Array.isArray(parsed.closes) || parsed.closes.length < 3) {
    throw new Error(
      [
        `Ugyldig markedsdatafil: ${expectedFile}`,
        'Filen må inneholde minst 3 close-verdier, eksempel:',
        '{"closes":[100,101,98,99]}',
      ].join('\n')
    );
  }

  return expectedFile;
};

const main = async (): Promise<void> => {
  const symbol = (process.env.FACTORY_SYMBOL ?? DEFAULT_SYMBOL).toUpperCase();
  const period = (process.env.FACTORY_PERIOD as '1y' | '2y' | '5y' | undefined) ?? DEFAULT_PERIOD;
  const dataMode =
    (process.env.FACTORY_DATA_MODE || 'historical').toLowerCase() === 'simulator'
      ? 'simulator'
      : 'historical';

  if (dataMode === 'simulator') {
    const filePath = await ensureMarketDataFileExists(symbol, period);
    console.log(`Forhåndssjekk OK: fant markedsdatafil ${filePath}`);
  } else {
    console.log('Forhåndssjekk OK: historical mode bruker Yahoo-data med daglig file-cache.');
  }

  await mkdir(path.join(process.cwd(), 'data', 'factory'), { recursive: true });
  const result = await runFactoryEvolutionCycle({ symbol, period, dataMode });

  console.log('\nFactory statuses:');
  result.statuses.forEach((status, index) => {
    console.log(`${index + 1}. ${status}`);
  });

  console.table([
    {
      Bot: 'Baseline',
      Sharpe: result.baseline.metrics.sharpeRatio.toFixed(3),
      DrawdownPct: result.baseline.metrics.maxDrawdown.toFixed(2),
      WinRatePct: result.baseline.metrics.winRate.toFixed(2),
      ReturnPct: result.baseline.metrics.totalReturn.toFixed(2),
    },
    {
      Bot: 'Challenger',
      Sharpe: result.challenger.metrics.sharpeRatio.toFixed(3),
      DrawdownPct: result.challenger.metrics.maxDrawdown.toFixed(2),
      WinRatePct: result.challenger.metrics.winRate.toFixed(2),
      ReturnPct: result.challenger.metrics.totalReturn.toFixed(2),
    },
  ]);

  if (result.appliedChanges.length > 0) {
    console.log('Applied changes:', result.appliedChanges);
  }
  if (result.rejectedChanges.length > 0) {
    console.log('Rejected changes:', result.rejectedChanges);
  }
  console.log(`Used fallback: ${result.usedFallback ? 'Yes' : 'No'}`);

  console.log('\nOllama prompt preview:\n');
  console.log(result.reasoning);
};

void main().catch((error) => {
  console.error('Challenge run feilet:\n', error instanceof Error ? error.message : error);
  process.exit(1);
});
