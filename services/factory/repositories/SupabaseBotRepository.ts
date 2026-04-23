import { IBotRepository } from './IBotRepository';
import { BotDNA } from '../../../types/bot-dna';
import { Deployment, EvaluationSnapshot, EvolutionEvent, FactoryState } from '../../../types/simulation';
import { getSupabaseClient } from '../../supabaseClient';

export class SupabaseBotRepository implements IBotRepository {
  async listBots(): Promise<BotDNA[]> {
    const { data, error } = await getSupabaseClient()
      .from('bots')
      .select('dna')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => row.dna as BotDNA);
  }

  async listPublishedBots(): Promise<BotDNA[]> {
    const { data, error } = await getSupabaseClient()
      .from('bots')
      .select('dna')
      .eq('status', 'Published')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => row.dna as BotDNA);
  }

  async getBot(id: string): Promise<BotDNA | null> {
    const { data, error } = await getSupabaseClient()
      .from('bots')
      .select('dna')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? (data.dna as BotDNA) : null;
  }

  async saveBot(bot: BotDNA): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('bots')
      .upsert({
        id: bot.id,
        version: bot.version,
        generation: bot.generation,
        status: bot.status,
        dna: bot,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  async publishBot(id: string): Promise<BotDNA> {
    const bot = await this.getBot(id);
    if (!bot) throw new Error(`Bot ${id} not found.`);

    const updatedBot: BotDNA = { ...bot, status: 'Published' };
    await this.saveBot(updatedBot);
    return updatedBot;
  }

  async deleteBot(id: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('bots')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async listEvaluations(botId?: string): Promise<EvaluationSnapshot[]> {
    let query = getSupabaseClient()
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: false });
    if (botId) {
      query = query.eq('bot_id', botId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      botId: row.bot_id,
      createdAt: row.created_at,
      period: row.period as '1y' | '2y' | '5y',
      metrics: row.metrics,
    }));
  }

  async saveEvaluation(evaluation: EvaluationSnapshot): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('evaluations')
      .upsert({
        id: evaluation.id,
        bot_id: evaluation.botId,
        period: evaluation.period,
        metrics: evaluation.metrics,
        created_at: evaluation.createdAt,
      });

    if (error) throw error;
  }

  async listDeployments(): Promise<Deployment[]> {
    const { data, error } = await getSupabaseClient()
      .from('deployments')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      botId: row.bot_id,
      botVersion: row.bot_version,
      status: row.status as any,
      allocatedCapitalNok: Number(row.allocated_capital_nok),
      allocatedPct: row.allocated_pct ? Number(row.allocated_pct) : undefined,
      symbol: row.symbol,
      benchmarkSymbol: row.benchmark_symbol,
      interval: row.interval as any,
      liveBalanceNok: row.live_balance_nok ? Number(row.live_balance_nok) : undefined,
      lastProcessedAt: row.last_processed_at,
      performance: row.performance,
      equityCurve: row.equity_curve,
      liveEquityCurve: row.live_equity_curve,
      transactions: row.transactions,
      backtestPerformance: row.backtest_performance,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async saveDeployment(deployment: Deployment): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('deployments')
      .upsert({
        id: deployment.id,
        bot_id: deployment.botId,
        bot_version: deployment.botVersion,
        status: deployment.status,
        allocated_capital_nok: deployment.allocatedCapitalNok,
        allocated_pct: deployment.allocatedPct,
        symbol: deployment.symbol,
        benchmark_symbol: deployment.benchmarkSymbol,
        interval: deployment.interval,
        live_balance_nok: deployment.liveBalanceNok,
        last_processed_at: deployment.lastProcessedAt,
        performance: deployment.performance,
        equity_curve: deployment.equityCurve,
        live_equity_curve: deployment.liveEquityCurve,
        transactions: deployment.transactions,
        backtest_performance: deployment.backtestPerformance,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  async listEvolutionEvents(): Promise<EvolutionEvent[]> {
    const { data, error } = await getSupabaseClient()
      .from('evolution_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      cycleNumber: row.cycle_number,
      type: row.type as any,
      botId: row.bot_id,
      sourceBotIds: row.source_bot_ids,
      notes: row.notes,
    }));
  }

  async appendEvolutionEvent(event: EvolutionEvent): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('evolution_events')
      .insert({
        id: event.id,
        cycle_number: event.cycleNumber,
        type: event.type,
        bot_id: event.botId,
        source_bot_ids: event.sourceBotIds,
        notes: event.notes,
        created_at: event.createdAt,
      });

    if (error) throw error;
  }

  async loadFactoryState(): Promise<FactoryState> {
    const { data, error } = await getSupabaseClient()
      .from('factory_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        cycleNumber: 0,
        activeBotIds: [],
        settings: {
          maxPopulation: 10,
          cycleIntervalHours: 24,
          ollamaEnabled: true,
        },
      };
    }

    return {
      cycleNumber: data.cycle_number,
      activeBotIds: data.active_bot_ids,
      lastRunAt: data.last_run_at,
      settings: data.settings,
    };
  }

  async saveFactoryState(state: FactoryState): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('factory_state')
      .upsert({
        id: 1,
        cycle_number: state.cycleNumber,
        active_bot_ids: state.activeBotIds,
        last_run_at: state.lastRunAt,
        settings: state.settings,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }
}
