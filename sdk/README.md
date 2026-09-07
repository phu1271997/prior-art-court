# @prior-art-court/sdk

TypeScript SDK for embedding the [Prior Art Court](https://prior-art-court.vercel.app) doctrine layer into your own site.

Read the docket, file complaints, drive adjudications, listen for verdicts — from any React, Vue, Svelte or vanilla-JS app.

## Install

```bash
npm install @prior-art-court/sdk genlayer-js
```

`genlayer-js` is a peer dependency; the SDK does not bundle a wallet or a signer.

## Usage

```ts
import { PriorArtCourt } from '@prior-art-court/sdk';
import { studionet } from 'genlayer-js/chains';

const court = new PriorArtCourt({
  chain: studionet,
  addresses: {
    // From contracts/deployments.json in the Prior Art Court repo.
    court:           '0x082FcFeFEE1B7642C42bd5E1eBaa6C029fe19869',
    policyRegistry:  '0xFC3A3422c64c3B84eDb8B31a333C8531B8Ba1755',
    reputation:      '0xF950283384B69900a4B13aCDEc99A7adB137CA7e',
    achievements:    '0x0000000000000000000000000000000000000000',  // optional
  },
});

// Reads run against an anonymous client — no wallet needed.
const cases = await court.listCases(10);
const standing = await court.getStanding('0xabc…');
const policies = await court.listPolicies();

// Writes take a genlayer-js `account`, which your host code owns.
await court.fileCase({
  account,
  category: 'sla-clause',
  originUrl:  'https://vendor.example/sla',
  accusedUrl: 'https://status.vendor.example/incident/2026-09-01',
  claim:      'SLA target was 99.9%; the incident dropped uptime below.',
  bond:       10n ** 18n,   // 1 GEN in wei
});
```

## What you get

| Method                     | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `listCases(limit?)`        | Newest N cases, or the entire docket.                |
| `getCase(id)`              | One case by id.                                      |
| `getHistory(id)`           | Provenance log for one case (filed, contested, verdict…). |
| `listPolicies()`           | Every category and its doctrine.                     |
| `getStanding(addr)`        | Reputation record for one account.                   |
| `getLeaderboard(limit?)`   | Top-N by descending standing.                        |
| `getBadges(addr)`          | Soulbound achievement badges an account has earned.  |
| `getWithdrawable(addr)`    | How much GEN the court owes this account.            |
| `fileCase(input)`          | Stake a bond and file a new complaint.               |
| `contestCase({...})`       | Match the bond and contest a filed case.             |
| `adjudicate({...})`        | Trigger the intelligent first-instance hearing.      |
| `appeal({...})`            | Escalate to the final instance with a corroborating URL and fee. |
| `withdraw(account)`        | Pull whatever the court owes.                        |

## Why this is a doctrine layer, not "an AI"

The court's verdicts come from GenLayer's Optimistic Democracy: a leader
validator reasons and proposes, every other validator independently fetches
the exhibits and re-reasons from scratch, and a custom validator function
only accepts consensus when they reach the same VERDICT. The doctrine — a
paragraph of English registered on-chain in `PolicyRegistry` — is what they
apply. No single AI service decides anything.

## Rules the SDK follows

1. **No secret in the bundle.** Reads run through an anonymous client;
   writes take a caller-supplied `account` and delegate signing to the host.
2. **No default addresses.** The SDK cannot silently point at the wrong
   network — you construct it with contract addresses or it does nothing.
3. **Domain surface, not contract surface.** Method names read like the
   verbs on the paper docket — file, contest, adjudicate, appeal — not like
   the on-chain method signatures they call underneath.

## Version

`0.10.0` — shipped with Phase 8 of the Prior Art Court builder milestones.

## License

MIT.
