# World attacks

Pure attack functions reuse the existing hit and technique rules. Wave costs 100 KI, hits living targets, and has a 20-second cooldown. Stun and bleed preserve legacy durations. Incoming boss damage reduction has a 50% floor, and the special attack multiplier is three. The guardian half-health flag is provisional until the complete event processor is integrated, including bleed-triggered threshold checks. The caller must supply trusted hit inputs, adjusted intelligence and speed, and handle reward, stun scheduling, respawn, and persistence. No gameplay endpoint is exposed.
