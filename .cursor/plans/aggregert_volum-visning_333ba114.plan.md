---
name: Aggregert Volum-visning (Handelsverdi)
overview: Implementer visning av total aggregert handelsverdi (Dollar Volume) for alle valgte sektorer/instrumenter i grafen og tooltip.
todos:
  - id: calc-total-dollar-volume
    content: Beregn dollar_volume og total_dollar_volume i mergeSeriesToChartData (services/dataTransformers.ts)
    status: pending
  - id: update-chart-dollar-volume
    content: Bruk total_dollar_volume i histogrammet og oppdater skalering (components/dashboard/MainLineChart.tsx)
    status: pending
  - id: update-tooltip-dollar-volume
    content: Vis "Total verdi handlet" med $-tegn i tooltip (components/dashboard/ChartTooltip.tsx)
    status: pending
isProject: false
---

1. Oppdater datatransformasjonen i `services/dataTransformers.ts` for å beregne `dollar_volume` (pris * volum) og et summert `total_dollar_volume` felt for hvert datapunkt.
2. Juster `MainLineChart.tsx` til å bruke `total_dollar_volume` for histogrammet i bunnen av grafen.
3. Oppdater `maxVolume` beregningen i `MainLineChart.tsx` slik at den baserer seg på den aggregerte dollarverdien.
4. Endre `ChartTooltip.tsx` til å vise "Total verdi handlet" med riktig valutaformatering ($) og forkortelser (K, M, B).
5. Fargekodingen på søylene vil reflektere om den gjennomsnittlige markedsretningen for de valgte instrumentene er opp eller ned den dagen.