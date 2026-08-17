# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
PolicyRegistry — the doctrine layer of Prior Art Court.

A prior-art dispute is never decided in the abstract. "Did B copy A?" has a
different answer depending on what kind of work A is: a news article, a source
file, an academic paper and a marketing landing page are governed by genuinely
different norms about quotation, attribution, and how much reuse is legitimate.

So the court does not hardcode a similarity threshold. It looks up a *doctrine*
— a plain-English statement of the standard that governs this category of work —
and hands that doctrine to the adjudicating LLM as the law it must apply.

That string is the entire integration surface for a new category of dispute.
Adding "photography" or "recipe" or "API documentation" to the court's
jurisdiction is a governance act, not a code change.

The court reads this contract cross-contract, read-only, at adjudication time.
Reads are synchronous and land in the same transaction, which is why the doctrine
lives in its own contract while the money does not.
"""

from genlayer import *

import json


# A doctrine shorter than this cannot express a standard — it can only express a
# slogan, and an LLM handed a slogan will invent the rest of the law itself.
MIN_DOCTRINE_CHARS = 120


class Contract(gl.Contract):
    admin: Address

    # category slug -> plain-English doctrine the court must apply
    doctrines: TreeMap[str, str]

    # how many times each doctrine has been amended (provenance for governance)
    revisions: TreeMap[str, u256]

    categories: DynArray[str]

    def __init__(self) -> None:
        self.admin = gl.message.sender_address

    # ---------------------------------------------------------------- internal

    def _require_admin(self) -> None:
        assert gl.message.sender_address == self.admin, "policy: admin only"

    # ------------------------------------------------------------------ writes

    @gl.public.write
    def register_policy(self, category: str, doctrine: str) -> None:
        """
        Publish (or amend) the doctrine governing a category of work.

        Amending a doctrine does not reopen decided cases: a case stores the
        verdict it was given, and the revision number it was decided under is
        written into its provenance.
        """
        self._require_admin()

        slug = category.strip().lower()
        assert len(slug) > 0, "policy: empty category"
        assert len(doctrine.strip()) >= MIN_DOCTRINE_CHARS, (
            "policy: doctrine too thin to adjudicate against"
        )

        if slug not in self.doctrines:
            self.categories.append(slug)
            self.revisions[slug] = u256(1)
        else:
            self.revisions[slug] = u256(int(self.revisions[slug]) + 1)

        self.doctrines[slug] = doctrine.strip()

    @gl.public.write
    def transfer_admin(self, new_admin: Address) -> None:
        """Hand the doctrine layer to a DAO once one exists."""
        self._require_admin()
        self.admin = new_admin

    # ------------------------------------------------------------------- views

    @gl.public.view
    def get_policy(self, category: str) -> str:
        slug = category.strip().lower()
        assert slug in self.doctrines, "policy: unknown category"
        return self.doctrines[slug]

    @gl.public.view
    def has_policy(self, category: str) -> bool:
        return category.strip().lower() in self.doctrines

    @gl.public.view
    def get_revision(self, category: str) -> int:
        slug = category.strip().lower()
        if slug not in self.revisions:
            return 0
        return int(self.revisions[slug])

    @gl.public.view
    def get_categories(self) -> str:
        return json.dumps(
            [
                {
                    "category": slug,
                    "revision": int(self.revisions.get(slug, u256(0))),
                    "doctrine": self.doctrines[slug],
                }
                for slug in self.categories
            ]
        )

    @gl.public.view
    def get_admin(self) -> str:
        return self.admin.as_hex
