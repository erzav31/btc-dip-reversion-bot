/**
 * Dip-Reversion BTC bot for make.fun btc-race-24h-20261117-0603.
 *
 * Strategy (original, written for this competition):
 *   Long-only mean reversion on 1-minute cbBTC/USDC closes.
 *   - Keep a 120-bar exponential moving average of the close.
 *   - BUY (all cash) when the close sits at least 60 bps BELOW the EMA:
 *     the market has dipped hard against its 2-hour trend and tends to
 *     snap back. One position at a time, never more.
 *   - SELL (whole position) when the close recovers to at least 50 bps
 *     ABOVE the EMA, or the position falls 150 bps below its peak since
 *     entry (trailing stop), or it has been held 480 bars (8h) without
 *     reverting.
 *   - No trade until 120 closes have been seen, so the EMA is real.
 *   - Nothing is read except the bars the harness sends: no clock, no
 *     network, no files, no randomness. All arithmetic is bigint, so
 *     two runs on the same data produce identical orders.
 *
 * Why these numbers: on the published 24h dev window a full-size round
 * trip costs ~26-34 bps (4 bps fee + 2 bps slippage + ~11 bps impact
 * per leg at $1,000 against ~$880k pool depth), so a trade must catch a
 * move well above that. Buying a 60 bps dip and selling a 50 bps premium
 * clears the round-trip cost with margin; the neighbourhood
 * (buy 50-70 bps, sell 20-60 bps) is positive across the whole grid on
 * the dev window, and both 12h halves of it are positive too.
 *
 * Costs on the dev window (official kit grade-local, process driver):
 *   net PnL +14.434945 USDC, 6 trades, win rate 1.0, max drawdown 1.32%,
 *   fees 2.423319 USDC; still +12.01 USDC at 2x fees.
 */

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch, OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

const EMA_BARS = 120; // 2-hour EMA of the close
const BUY_BPS = 60n; // buy when close is >= 60 bps below the EMA
const SELL_BPS = 50n; // sell when close is >= 50 bps above the EMA
const STOP_BPS = 150n; // trailing stop: 150 bps below the peak since entry
const MAX_HOLD_BARS = 480; // give up on a position after 8 hours
const MAX_SLIPPAGE_BPS = 150; // reject fills that moved > 1.5% from the last close

// EMA smoothing: ema <- (2*close + (EMA_BARS-1)*ema) / (EMA_BARS+1), bigint math.
const EMA_K_NUM = 2n;
const EMA_K_DEN = BigInt(EMA_BARS + 1);

let closesSeen = 0;
let ema: bigint | null = null; // EMA of closes, same units as the bar close
let entryPeak: bigint | null = null; // highest close since the position opened
let heldBars = 0;

/** True when (a - b) / b >= bps / 10000, exact, no division. */
function atLeastBpsAbove(a: bigint, b: bigint, bps: bigint): boolean {
  return (a - b) * 10000n >= bps * b;
}

/** True when (b - a) / b >= bps / 10000, exact, no division. */
function atLeastBpsBelow(a: bigint, b: bigint, bps: bigint): boolean {
  return (b - a) * 10000n >= bps * b;
}

await runBars({
  onBatch(state: BarsState, _batch: Batch): OrderInput[] {
    const bar = state.latest.get(SYMBOL);
    if (bar === undefined) return [];
    const close = BigInt(bar.c);

    // Keep the EMA warm on every bar, including warm-up bars.
    closesSeen += 1;
    ema = ema === null
      ? close
      : (EMA_K_NUM * close + (EMA_K_DEN - EMA_K_NUM) * ema) / EMA_K_DEN;

    if (state.warmingUp) return [];
    if (closesSeen < EMA_BARS) return [];

    const holding = state.positions.get(SYMBOL);

    if (holding === undefined) {
      entryPeak = null;
      heldBars = 0;
      if (atLeastBpsBelow(close, ema, BUY_BPS) && state.cash > 0n) {
        return [{
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: state.cash,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        }];
      }
      return [];
    }

    // We hold a position: track peak and age, then check the exits.
    entryPeak = entryPeak === null ? close : (close > entryPeak ? close : entryPeak);
    heldBars += 1;

    const stopHit = atLeastBpsBelow(close, entryPeak, STOP_BPS);
    if (atLeastBpsAbove(close, ema, SELL_BPS) || stopHit || heldBars >= MAX_HOLD_BARS) {
      return [{
        side: 'sell',
        symbol: SYMBOL,
        qty: holding.qty,
        max_slippage_bps: MAX_SLIPPAGE_BPS,
      }];
    }
    return [];
  },
});
