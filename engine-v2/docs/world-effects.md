# World combat effects

Pure domain functions preserve legacy five-second regeneration, ten one-second bleed ticks at one percent of target HP when applied, and green/red/blue auto-bean order. Consumption is injected by the caller; the future server processor must debit inventory and persist battle state atomically. Green activation lasts ten minutes; configurable retry interval is retained. No HTTP endpoint or gameplay change. These effects are not yet wired into the world clock.
