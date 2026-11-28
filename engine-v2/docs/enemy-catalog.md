# Enemy catalog migration

Migration 024 copies 10 story enemies from data/gm-world-published.json at fa289e495f8cd711683ff40ac182698f089508b4. IDs use quest ID and zero-based step index. Original names, stats, race, art and map references are retained. This is only the published editor quest subset: hardcoded story encounters, world mobs, bosses and dungeon enemies still need separate migration. No encounter endpoint is exposed. World mobs use different real-time mechanics and must not be silently routed through the story duel engine.
