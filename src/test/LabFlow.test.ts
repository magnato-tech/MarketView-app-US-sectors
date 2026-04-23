import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { LocalFileBotRepository } from '../../services/factory/repositories/LocalFileBotRepository';
import { BotDNA } from '../../types/bot-dna';

describe('Lab Draft Flow (A-Å)', () => {
  const testRoot = path.join(process.cwd(), 'data', 'factory-test-lab');
  let repository: LocalFileBotRepository;

  beforeEach(() => {
    mkdirSync(testRoot, { recursive: true });
    repository = new LocalFileBotRepository(testRoot);
  });

  afterEach(() => {
    rmSync(testRoot, { recursive: true, force: true });
  });

  it('creates an empty draft shell, saves it, and promotes to candidate', async () => {
    // 1. Create shell (Draft)
    const draftId = 'test-lab-bot';
    const draftBot: BotDNA = {
      id: draftId,
      version: '1.0.0',
      generation: 0,
      status: 'Draft',
      components: [
        {
          type: 'signal',
          id: 'TREND_SMA',
          weight: 0.5,
          params: { fastPeriod: 20, slowPeriod: 60 }
        }
      ]
    };

    await repository.saveBot(draftBot);
    
    const savedDrafts = await repository.listBots();
    const savedDraft = savedDrafts.find(b => b.id === draftId);
    expect(savedDraft).toBeDefined();
    expect(savedDraft?.status).toBe('Draft');

    // 2. Promote to Candidate
    // In our implementation, send-to-factory API calls repository.saveBot with status Candidate
    const candidateBot: BotDNA = { ...draftBot, status: 'Candidate' };
    await repository.saveBot(candidateBot);

    const savedCandidates = await repository.listBots();
    const savedCandidate = savedCandidates.find(b => b.id === draftId);
    expect(savedCandidate?.status).toBe('Candidate');

    // 3. Publish (Candidate -> Published)
    await repository.publishBot(draftId);
    const publishedBots = await repository.listPublishedBots();
    const publishedBot = publishedBots.find(b => b.id === draftId);
    expect(publishedBot?.status).toBe('Published');

    // 4. Verify Immutability
    const modifiedPublished: BotDNA = { ...publishedBot!, generation: 1 };
    await expect(repository.saveBot(modifiedPublished)).rejects.toThrow(/immutable/);
  });
});
