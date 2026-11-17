# btc-dip-reversion-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/erzav31/btc-dip-reversion-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/erzav31/btc-dip-reversion-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A long-only mean-reversion bot that trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute on-chain prices. It keeps a 120-bar EMA of the close, buys with all cash when the close dips at least 60 bps below the EMA, and sells the whole position when the close recovers to 50 bps above the EMA, on a 150 bps trailing stop from the peak since entry, or after 480 bars without reverting. Standard library only (plus the kit's vendored protocol shim); no network, no clock, no randomness — every run on the same bars produces identical orders.

Dev-window result (official kit grade-local, process driver): net PnL **+14.434945 USDC** on $1,000 start, 6 trades, win rate 1.0, max drawdown 1.32%, fees 2.423319 USDC; still +12.01 USDC at 2x fees. Guardrails met; L1 regrade reproduced byte for byte.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
