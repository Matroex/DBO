# World loot claim

The internal claim operation locks character then battle, requires a finished battle, grants pinned-revision items, and clears pending loot in the same transaction. A repeat returns the original receipt without duplicating items. Full inventory rolls back the entire claim and retains pending loot for retry; this is a provisional all-or-nothing policy pending legacy UI parity. Selling selected loot, partial claims, integration tests, ownership authorization and HTTP wiring are not implemented. No public gameplay change.
