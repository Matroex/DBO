# Real-time world combat clock

The clock foundation preserves the legacy attack intervals, five-second regeneration, one-second bean checks and twelve-hour maximum. The event processor is not yet implemented: it must process boss healing, hero regeneration, bleed, hero attack, independent enemy attacks and beans in that order. The bounded catch-up deliberately retains unprocessed backlog rather than expiring a fight with pending events. No client endpoint or gameplay change yet.
