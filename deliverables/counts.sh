#!/usr/bin/env bash
# Re-verify the three capped Explorer form fields before pasting them into
# the Portal. Uses wc -m (character count, Unicode-safe), not wc -c (byte
# count). Passes when each is under its cap.
set -euo pipefail
cd "$(dirname "$0")"

one_liner="An intelligent court for copying disputes: two URLs, a bond, one accusation. Validators fetch both works on-chain, apply published doctrine, and settle under AI consensus."

description="Prior Art Court settles copying disputes on-chain, without a moderator, an oracle, or a single AI service. A complainant stakes a bond and posts two URLs. The respondent may match to contest. The court then fetches both pages from the live web inside the Intelligent Contract, applies a plain-English doctrine registered on-chain for that kind of work (news articles, source code, academic papers, documentation, marketing copy; new categories take a paragraph, not code), and decides under Optimistic Democracy. Every validator fetches and reasons independently; the leader's verdict is accepted only when the rest reach the same finding, not the same wording. Close calls, self-contradictions, and unreadable evidence escalate automatically to a three-source appeal instead of settling on a coin flip. Consensus decides the verdict. Arithmetic decides the money: the pot is fixed before the hearing, so a compromised validator set can hand one party's stake to the other but never mint value."

expected="Reviewer sees six settled cases on the docket. Two INFRINGING (100% and 95% overlap, complainant paid the pot in GEN). One INDEPENDENT contested (95% confidence, respondent paid). One INDEPENDENT uncontested (bond forfeited). Two EVIDENCE_UNAVAILABLE that escalated to appeal and refunded every stake. Each verdict card links to its transaction on the Studio explorer where the leader reasoning and the validator agreement are recorded."

count()  { printf '%s' "$1" | wc -m | tr -d ' '; }
report() { local n=$(count "$2"); printf '%-12s : %3s / %s\n' "$1" "$n" "$3"; }

report "one-liner"   "$one_liner"    180
report "description" "$description" 1000
report "expected"    "$expected"     500
