# Market Data Files for CLI Challenge Runner

`factory/scripts/run-challenge.ts` expects local market data files to exist before it starts.

Expected path pattern:

- `data/factory/market-data/SPY_1y.json`
- `data/factory/market-data/SPY_2y.json`
- `data/factory/market-data/SPY_5y.json`

Set `FACTORY_SYMBOL` and `FACTORY_PERIOD` to use another file.

Example file content:

```json
{
  "closes": [100, 101.2, 99.8, 102.5, 103.1]
}
```

The file is used as a preflight requirement so the runner fails early with a helpful message if local market data setup is missing.
