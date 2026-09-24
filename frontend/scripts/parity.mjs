/* Frontend parity: hydrate the store from the live API and check that the
   portfolio the UI will render equals the static board's, value for value.

   node scripts/parity.mjs [api-origin]      (default http://localhost:8000) */
import { readFileSync } from 'node:fs'
import { hydrate, PORTFOLIO, PORTFOLIO_STATS } from '../src/store.js'

const origin = process.argv[2] || 'http://localhost:8000'
const golden = JSON.parse(readFileSync(new URL('../../backend/seed/golden.json', import.meta.url)))
hydrate(await (await fetch(`${origin}/api/board`)).json())

const strip = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === 'band' ? (v ? v.v : null) : v]))
let bad = 0
for (const [id, g] of Object.entries(golden.portfolio)) {
  const got = JSON.stringify(strip(PORTFOLIO[id])), want = JSON.stringify(g)
  if (got !== want) { bad++; console.log(`MISMATCH ${id}\n  got  ${got}\n  want ${want}`) }
}
for (const [k, g] of Object.entries(golden.stats)) {
  const s = PORTFOLIO_STATS[k]
  const got = JSON.stringify({ min: s.min, max: s.max, mean: s.mean, sd: s.sd, spread: s.spread, n: s.n, power: s.power, rankOf: s.rankOf })
  if (got !== JSON.stringify(g)) { bad++; console.log(`STATS MISMATCH ${k}`) }
}
console.log(bad ? `FAIL: ${bad} mismatches` : `PASS: ${Object.keys(golden.portfolio).length} fields and ${Object.keys(golden.stats).length} index stats identical to the static board`)
process.exit(bad ? 1 : 0)
