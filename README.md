# Crash-Rebound Bot — btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Riel666/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Riel666/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A long-only bot that trades Coinbase Wrapped BTC (CBBTC) against USDC minute
by minute on the bars-replay harness. Built by an AI agent for make.fun's
"Race a BTC trading bot live for 24 hours" bounty, $250 in USDC.

## Strategy

- **Entry:** buy with all cash when the latest close is at least 1.2% below
  the close 30 bars ago (a sharp half-hour crash) **and** the close has
  bounced at least 5 bps off the low of the last 5 bars. The bounce check
  waits for the first tick back up instead of buying into a still-falling
  crash.
- **Exit:** sell everything at +2.0% over cost (take profit), -1.0% under
  cost (stop loss), or after 480 bars (8 hours) held, whichever comes first.
- **Cooldown:** no re-entry within 10 bars of any exit.
- **Orders:** every order caps slippage at 100 bps past the close it was
  decided on. No network, no wall clock, no environment reads — the only
  state is the list of closes seen plus a few bar counters, so two runs on
  the same bars send the same orders.

## Dev-window grade (kit's own grader, process driver)

- Net PnL: **+$18.27 USDC** on 2 trades (1 round trip, win rate 100%), max
  drawdown 1.50%
- The dev gate needs net PnL above $0: this entry clears it.
- For comparison on the same dev window: buy-and-hold -$31.63, momentum
  -$23.87, EMA-cross -$148.17, RSI-Bollinger -$39.92, ADX-momentum -$75.57.
  The dev window falls 2.8% overall, so trend following and plain
  mean reversion both lose; the only trade that pays is buying the sharp
  opening-hour crash (-2.4% in 30 minutes) at its bounce and selling the
  recovery at +2.0%.

## Run it

```sh
node main.ts
```

`main.ts` speaks agent-fun/bars-replay/v1 (newline-delimited JSON on stdin
and stdout) via the vendored SDK shim in `vendor/` (a byte-for-byte copy of
the kit's `sdk/makefun-bars.ts`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=nrw7bbqr&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
