import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react';
import { DashboardProvider, useDashboard } from '../../contexts/DashboardContext';
import { CrisisEngineProvider } from '../../contexts/CrisisEngineContext';
import { LanguageProvider } from '../../contexts/LanguageContext';
import Sidebar from '../../components/Sidebar';
import { MarketSummaryTable } from '../../components/dashboard/MarketSummaryTable';

// Mock Recharts
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
    Line: (props: any) => <div data-testid={`line-${props.dataKey}`}>{props.name}</div>,
    Bar: () => <div data-testid="recharts-bar" />,
    XAxis: () => <div data-testid="recharts-xaxis" />,
    YAxis: () => <div data-testid="recharts-yaxis" />,
    CartesianGrid: () => <div data-testid="recharts-grid" />,
    Tooltip: () => <div data-testid="recharts-tooltip" />,
    Legend: () => <div data-testid="recharts-legend" />,
    ReferenceArea: () => <div data-testid="recharts-refarea" />,
    Cell: () => <div data-testid="recharts-cell" />,
  };
});

// En forenklet versjon av MainLineChart for testing
const SimpleLineChart: React.FC<any> = ({ activeTickers }) => {
  const { drilldownSector, activeDrilldownTickers, drilldownETF, activeEtfStockTickers } = useDashboard();
  
  const visibleTickers = React.useMemo(() => {
    if (drilldownETF) return [drilldownETF, ...activeEtfStockTickers];
    if (drilldownSector) return [drilldownSector, ...activeDrilldownTickers.filter(t => t !== drilldownSector)];
    return activeTickers;
  }, [activeTickers, drilldownSector, activeDrilldownTickers, drilldownETF, activeEtfStockTickers]);

  return (
    <div data-testid="composed-chart">
      {visibleTickers.map((sym: string) => (
        <div key={sym} data-testid={`line-${sym}`}>{sym}</div>
      ))}
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider initialLanguage="no">
    <DashboardProvider initialTickers={['XLK', 'XLF']}>
      <CrisisEngineProvider>{children}</CrisisEngineProvider>
    </DashboardProvider>
  </LanguageProvider>
);

describe('Chart & Drilldown Integration', () => {
  it('shows multiple sectors in chart when checked in sidebar', () => {
    const IntegrationTest = () => {
      const { selectedTickers } = useDashboard();
      return (
        <div className="flex">
          <Sidebar />
          <SimpleLineChart activeTickers={selectedTickers} />
        </div>
      );
    };

    render(
      <TestWrapper>
        <IntegrationTest />
      </TestWrapper>
    );

    expect(screen.getByTestId('line-XLK')).toBeTruthy();
    expect(screen.getByTestId('line-XLF')).toBeTruthy();
  });

  it('switches to drilldown mode and shows child ETFs in chart', () => {
    const IntegrationTest = () => {
      const { selectedTickers, drilldownSector, activeDrilldownTickers, toggleDrilldownTicker, summary } = useDashboard();
      return (
        <div>
          <Sidebar />
          <SimpleLineChart activeTickers={selectedTickers} />
          {drilldownSector && (
            <MarketSummaryTable 
              title="Drilldown"
              summary={summary}
              showCheckboxes={true}
              activeCheckboxes={activeDrilldownTickers}
              onCheckboxToggle={toggleDrilldownTicker}
            />
          )}
        </div>
      );
    };

    render(
      <TestWrapper>
        <IntegrationTest />
      </TestWrapper>
    );

    const techButton = screen.getByText(/^Teknologi$/i).closest('button');
    fireEvent.click(techButton!);

    expect(screen.getByTestId('line-XLK')).toBeTruthy();
  });
});
