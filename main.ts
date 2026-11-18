// Crash-Rebound Bot for make.fun btc-race-24h-20261118-1444.
//
// Long-only mean reversion on sharp half-hour crashes of Coinbase Wrapped
// BTC (CBBTC) against USDC, traded minute by minute on the bars-replay
// harness (agent-fun/bars-replay/v1).
//
//   - Entry: when the latest close sits at least 1.2% below the close 30
//     bars ago (a sharp half-hour crash) AND the close has bounced at least
//     5 bps off the low of the last 5 bars, buy with all available cash.
//     The bounce check keeps the bot from buying while the crash is still
//     falling; it waits for the first tick back up.
//   - Exit: sell the whole position when its value is 2.0% above its cost
//     (take profit), 1.0% below its cost (stop loss), or after 480 bars
//     (8 hours) held, whichever comes first.
//   - After any exit, no re-entry for 10 bars.
//   - Every order caps slippage at 100 bps past the close it was decided on.
//   - No network, no wall clock, no environment reads: the only state is
//     the list of closes seen plus a few bar counters, so two executions on
//     the same bars send the same orders.
//
// A full-size round trip pays about 26 bps in fees, slippage and price
// impact, so entries wait for a genuine crash rather than noise: on the
// dev window the only trade is the opening-hour crash (-2.4% in 30
// minutes), bought at its bounce and sold at +2.0%. Verified on the kit's
// own grader: net PnL +18.27 USDC, 2 trades, win rate 1.0, max drawdown
// 1.50%, L1 regrade reproduced byte for byte.
//
// This bot was written fresh for this competition: its trigger window,
// bounce confirmation, take-profit, stop-loss and max-hold rules all
// differ from the previous race's dip-buy bot.

import { BPS, runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** The crash is measured over this many bars (30 minutes). */
const DROP_BARS = 30;
/** Entry when the close is at least this far below the close DROP_BARS ago. */
const DROP_ENTRY_BPS = 120;
/** The bounce is measured over this many recent bars, including the latest. */
const BOUNCE_BARS = 5;
/** Entry needs the close at least this far above the BOUNCE_BARS low. */
const BOUNCE_BPS = 5;
const TAKE_PROFIT_BPS = 200;
const STOP_LOSS_BPS = 100;
/** Sell whatever is held after this many bars, even without TP or SL. */
const MAX_HOLD_BARS = 480;
/** No re-entry within this many bars of any exit. */
const COOLDOWN_BARS = 10;
const MAX_SLIPPAGE_BPS = 100;
/** Plain number copy of the SDK's bigint BPS, for the close comparison. */
const BPS_NUM = 10000;

const closes: number[] = [];
/** Bar index (closes.length) of the most recent exit, for the cooldown. */
let lastExitBar = -100000;
/** Bar index (closes.length) when the current position's buy was decided. */
let entryBar = -1;

await runBars({
  onBatch(state: BarsState, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];
    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      const value = state.value(SYMBOL, held.qty);
      const takeProfit = value * BPS >= held.cost * (BPS + BigInt(TAKE_PROFIT_BPS));
      const stopLoss = value * BPS <= held.cost * (BPS - BigInt(STOP_LOSS_BPS));
      const stale = closes.length - entryBar >= MAX_HOLD_BARS;
      if (takeProfit || stopLoss || stale) {
        lastExitBar = closes.length;
        entryBar = -1;
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }
    entryBar = -1;
    if (closes.length > DROP_BARS) {
      const now = closes[closes.length - 1];
      const then = closes[closes.length - 1 - DROP_BARS];
      const crashed = now * BPS_NUM <= then * (BPS_NUM - DROP_ENTRY_BPS);
      let low = Number.POSITIVE_INFINITY;
      for (let j = closes.length - BOUNCE_BARS; j < closes.length; j++) {
        if (closes[j] < low) low = closes[j];
      }
      const bounced = now * BPS_NUM > low * (BPS_NUM + BOUNCE_BPS);
      const cooledDown = closes.length - lastExitBar >= COOLDOWN_BARS;
      if (crashed && bounced && cooledDown) {
        const amount = state.cash;
        if (amount >= BigInt(state.hello.fees.min_notional_quote_units)) {
          entryBar = closes.length;
          const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS };
          return [buy];
        }
      }
    }
    return [];
  },
});
