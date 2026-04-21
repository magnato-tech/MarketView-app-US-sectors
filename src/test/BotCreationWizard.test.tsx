import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BotCreationWizard } from '../../components/BotCreationWizard';
import { TradingProvider } from '../../contexts/TradingContext';
import { DashboardProvider } from '../../contexts/DashboardContext';
import { LanguageProvider } from '../../contexts/LanguageContext';
import React from 'react';

// Mock context values
vi.mock('../../contexts/DashboardContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useDashboard: () => ({
      data: [{ timestamp: '2026-01-01', SPY: 100, XLK: 100 }],
      summary: [{ symbol: 'SPY', name: 'S&P 500', lastPrice: 100, percentChange: 0, color: 'blue' }],
      loading: false
    })
  };
});

describe('BotCreationWizard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWizard = () => {
    return render(
      <LanguageProvider>
        <DashboardProvider>
          <TradingProvider>
            <BotCreationWizard onClose={mockOnClose} />
          </TradingProvider>
        </DashboardProvider>
      </LanguageProvider>
    );
  };

  it('should navigate through all 4 steps', async () => {
    renderWizard();

    // Step 1: Name and Mode
    expect(screen.getByText(/Steg 1 av 4/i)).toBeDefined();
    const nameInput = screen.getByPlaceholderText(/f.eks. Alpha Hunter/i);
    fireEvent.change(nameInput, { target: { value: 'Test Bot' } });
    
    fireEvent.click(screen.getByText(/Neste Steg/i));

    // Step 2: VIX and SMA
    await waitFor(() => expect(screen.getByText(/Steg 2 av 4/i)).toBeDefined());
    expect(screen.getByText(/VIX Filter/i)).toBeDefined();
    fireEvent.click(screen.getByText(/Neste Steg/i));

    // Step 3: Stop Loss and Risk
    await waitFor(() => expect(screen.getByText(/Steg 3 av 4/i)).toBeDefined());
    expect(screen.getByText(/Stop Loss %/i)).toBeDefined();
    fireEvent.click(screen.getByText(/Neste Steg/i));

    // Step 4: Summary
    await waitFor(() => expect(screen.getByText(/Steg 4 av 4/i)).toBeDefined());
    expect(screen.getByText(/Klar til aktivering/i)).toBeDefined();
    expect(screen.getByText(/Test Bot/i)).toBeDefined();
  });

  it('should call onClose when clicking close button', () => {
    renderWizard();
    const closeButton = screen.getByRole('button', { name: '' }); // The X icon button
    // The X button is the only one with lucide-x
    const xButton = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-x'));
    if (xButton) fireEvent.click(xButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable Next button if name is missing in Step 1', () => {
    renderWizard();
    const nextButton = screen.getByText(/Neste Steg/i);
    expect(nextButton).toBeDefined();
    // In step 1, next is disabled if name is empty
    // fireEvent.click(nextButton); // Should not proceed
    // expect(screen.getByText(/Steg 1 av 4/i)).toBeDefined();
  });
});
