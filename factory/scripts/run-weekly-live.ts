import 'dotenv/config';
import { LocalFileBotRepository } from '../../services/factory/repositories/LocalFileBotRepository';
import { LiveTradingEngine } from '../../lib/factory/LiveTradingEngine';

async function main() {
  console.log('--- Weekly Live Trading Engine ---');
  const repository = new LocalFileBotRepository();
  const engine = new LiveTradingEngine(repository);

  try {
    await engine.processActiveDeployments();
    console.log('Weekly processing completed successfully.');
  } catch (error) {
    console.error('Fatal error in live engine:', error);
    process.exit(1);
  }
}

main();
