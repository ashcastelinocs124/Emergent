# Alien Ecosystem — Earth-like city repair chapter

## Purpose

Replace the wilderness-first playable with an immersive first-person city mystery. The explorer crash-lands near an inhabited, Earth-like city. To escape, the player must talk with residents, compare incomplete or conflicting accounts, form assumptions about which ship parts are needed and where to obtain them, physically gather those parts, and repair the ship. The city should feel inhabited through streets, shops, lighting, traffic, ambient sound, and people with places to be. The player makes the final choices; Jev uses the accumulated city state to choose residents' behavior and to suggest an evidence-backed next lead.

## Scope of the first city slice

Build one contiguous district rather than a whole metropolis: a crash lot, market street, transit stop, repair workshop, salvage yard, residential frontage, and municipal access gate. Longer streets and a skyline make the surrounding city visible without making every block traversable. Four named residents have distinct jobs, schedules, knowledge, and memories; background pedestrians and traffic provide atmosphere. The four named residents' new high-level actions are chosen by Jev. Background movement is visual ambience and never supplies clues or blocks progress.

The old alien habitat is replaced as the entry experience. Existing creature and wilderness code may remain unused during migration, but the launched game shows the city. The visor, first-person movement, journal, save/reconnect foundation, and server-held TypeSafe key are reused where appropriate. Existing saves use the previous storage key and are not silently reinterpreted as city saves.

## Player loop and repair mystery

The ship diagnostics initially identify three failing systems without handing the player a shopping list: power, thermal protection, and navigation. The corresponding physical parts are a stabilized power cell, ceramic thermal shield, and navigation relay. The mechanic can identify one failure precisely, a courier can trace a delivery, a recycler knows what was salvaged, and a municipal worker knows access rules. At least one plausible claim is outdated, so the player must compare sources. Each part has a city location and an understandable access route; talking and observation reveal those routes before pickup.

The player approaches a person, types a short question, hears or reads a voiced/subtitled reply, and can ask again. A small list of suggested topics remains available for discoverability and accessibility. Conversations use authored facts and response lines so residents cannot invent parts, locations, or rules. A named resident can disclose, hint, redirect, or withhold based on knowledge, current activity, trust, and prior interactions. A resident's answer can change after the player presents a contradictory clue or completes a favor. The player can still explore and find a part without completing every conversation.

The journal separates **heard claims**, **observed facts**, and **my assumptions**. Each claim records its speaker, time, place, and whether another source supports or conflicts with it. The player can propose a part-location assumption and attach evidence. No UI labels a theory objectively true before the player tests it. A ship-computer "Analyze leads" action sends the current evidence, assumptions, inventory, and unresolved systems to Jev. Jev chooses one of the currently available leads or "seek more evidence" and returns a typed choice; the UI cites the supporting entries and gives a rough district, while the player chooses the route. Code, not Jev, enforces inventory, access, installation, and the ending.

The first slice succeeds when a new player can gather at least two clues per part, notice or resolve the outdated claim, obtain all three parts, install them at the ship, and launch. A second path to at least one part should remain possible if the player mistrusts one resident.

## Jev boundaries and conversation state

TypeSafe Jev produces typed decisions rather than generated prose. The service receives the typed player utterance plus a compact state snapshot and chooses among allowed dialogue response IDs for that resident. The browser displays the associated authored line and updates evidence only for that selected response. If no offered topic fits, a safe "ask me another way" response is available. A separate choice request selects each named resident's next high-level activity from actions valid at their current location and schedule. A third choice request powers the optional ship-computer lead analysis.

State distinguishes objective world facts from player knowledge and assumptions. Objective facts include actual part locations, access conditions, citizen schedules, and inventory. Player-facing state includes conversations, observed clues, source reliability evidence, manually entered hypotheses, and chosen leads. Jev receives only the slice needed for its decision; a resident does not see another person's private knowledge. Conversation choices are validated against offered IDs on both server and browser. A stale reply cannot overwrite a newer conversation or action.

The TypeSafe key remains on the server in ignored `.env`. If the decision service stalls, named residents finish their current activity and the conversation panel explains that replies are unavailable; the player can continue walking and inspecting the city. No local code silently substitutes a Jev choice. Save data includes citizen memory, dialogue history, journal evidence, parts, and repair progress.

## Presentation and interaction

Keep first-person movement and the helmet visor, but shift its visual language toward a believable urban environment: a narrower transparent HUD, subtle reticle, street-level signs, diegetic shop labels, local audio, and a handheld journal/ship diagnostic panel. The city should have readable intersections and landmarks, varied building heights and facades, lit windows, sidewalks, crosswalks, parked vehicles, moving traffic, and pedestrians. Named residents must be visually distinguishable and have idle, walk, work, and conversation poses. The player sees an interaction prompt only when close and looking at a person or object; entering dialogue releases pointer lock and returning restores the view cleanly.

The first slice prioritizes coherent layout, human scale, and convincing motion over a large map. Any procedural geometry or placeholder character art must be identified in playtest notes; visual QA screenshots should include street arrival, a conversation, the journal, a material site, and ship repair.

## Validation and limits

Unit tests cover evidence provenance, contradictory claims, hypothesis state, valid lead choices, part access, installation, save migration, and stale dialogue replies. Browser tests cover approach and conversation, journal evidence, Jev lead analysis, material collection, repair, and escape with a labelled fake decision service. A live Jev smoke test checks a typed conversation choice and a lead choice without exposing the key. A blind player test checks whether the city feels navigable and the repair inference is understandable without a quest marker.

This first city slice does not include a fully simulated metropolis, unrestricted generated dialogue, combat, multiplayer, or dozens of autonomous residents. Expansion can follow after the district, conversation clarity, and Jev decision cost are measured.
