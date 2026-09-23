# Alien Ecosystem — game design

## Purpose

Create an immersive first-person browser survival mystery in which the player escapes a designed alien planet by learning how its creatures behave. The desired moment is a player changing their own theory after observation: a giant purple creature seems hostile, then repeated encounters reveal that carrying its eggs provokes it. Discovery should change what the player does, not merely fill a collection screen.

The full game aims for hundreds of creatures making ongoing decisions through TypeSafe's Jev model. The first playable version proves the experience in one habitat before expanding the planet.

## Player experience

The player lands with a damaged ship that serves as shelter and a repair hub. Each expedition has limited suit air and power. Air limits how long the player can stay out; power runs the visor's light and scanner. The player chooses when to observe, test a theory, collect something valuable, and return. Supplies can be restored at the ship, so a failed experiment can cause a costly retreat without necessarily ending the run.

The 3D view is first-person and aims for realistic materials, lighting, sound, and creature movement rather than a stylized look. The player wears a helmet with an in-world visor display. Creature posture, calls, tracks, disturbed foliage, and interactions provide evidence. The visor shows suit status and observations without naming a creature's hidden rule. A field journal lets the player review sightings, record a hypothesis, and compare later evidence. Ship repairs happen at physical consoles.

The tone balances fear and wonder. Initially unfamiliar behavior makes travel dangerous. Understanding a pattern creates a new safe route or useful relationship, while individual creatures can still surprise the player.

## Core loop and escape arc

1. Plan a trip from the ship around air, suit power, and a repair need.
2. Observe creatures and environmental traces in a habitat.
3. Record a hypothesis in the journal and test it through player action.
4. Use the resulting knowledge to reach a resource or ship component.
5. Return, repair the ship, and prepare for the next habitat.

The complete game places required repairs in distinct habitats. Repairing the ship is necessary but insufficient: the player must also learn a planetary migration or weather pattern to choose a safe launch window. This makes the final escape depend on ecological understanding.

## First playable scope

Build one contiguous habitat around the damaged ship, with three interacting species and roughly 20–40 active creatures. Include first-person traversal, hiding, item pickup and drop, suit air and power, a readable visor, a journal, one recoverable ship component, a repair interaction, and one clear ecological mystery. The slice ends when the player installs the component. A playtest succeeds when the player can explain the hidden rule they used to reach it. This slice proves the core loop before the planet expands.

The first mystery uses eggs as a meaningful risk. Food supports recovery between trips, and eggs are an emergency source. Carrying them through a guardian's territory provokes a defensive response. The player can discover the relationship through observation and testing, then choose another food source or change their route. The other two species provide independent behavior to watch: a grazer seeks food and reacts to threats, and a stalker hunts the grazer while avoiding the guardian. Species names and final visual designs can be established during art direction without changing these roles.

The first playable version focuses on observation, evasion, and experimentation. It has no weapon combat, procedural planet generation, multiplayer, or inter-creature teaching.

## Creature behavior and memory

Every creature's **new high-level action** is selected by Jev from the applicable set of HUNT, FLEE, HIDE, EAT, FOLLOW, DEFEND, MATE, and EXPLORE. Jev receives the creature's species traits, nearby world state, current needs, and individual memory. A decision starts an action that unfolds over time through ordinary movement and animation code. A new decision happens when that action completes or a meaningful event interrupts it. This keeps the world continuous without calling the model every render frame.

Species have stable, discoverable rules. The game constrains which actions are valid under physical conditions and species traits, then Jev chooses among valid actions. For example, a guardian does not attack an unfamiliar player who is not carrying its eggs; carrying eggs within its territory makes DEFEND available and produces an observable response. The same guardian can later remember the player as a thief and behave warily even when the eggs are gone. That remembered reaction must have a distinct observable cue so the underlying species rule remains fair to deduce.

Individual memory records salient events such as being fed, threatened, injured, or robbed, along with recency and a bounded disposition toward the player. The memory belongs to that creature alone. Creatures do not share information about the player across their species in this design. Jev uses memory to choose a response; code stores and updates the memory from events that actually occurred.

## Journal and fair discovery

The journal stores observable facts, including where and when an event happened, the player's carried items, the visible creatures, and what those creatures did. It separates species observations from encounters with recognizable individuals. The player can create a structured hypothesis of the form **condition → expected behavior**, then mark later sightings as supporting or conflicting evidence. The journal does not confirm a hidden rule automatically.

Important rules must be repeatable under comparable conditions. When a learned individual response appears to contradict a species hypothesis, the journal identifies the individual and shows the earlier encounter that may explain it. This lets players distinguish ecology from memory without disclosing the full decision logic.

## Browser and Jev system

The browser runs the 3D presentation, movement, action execution, and immediate interaction feedback. A small service holds the TypeSafe API credential, schedules creature decisions, and returns typed Jev choices. Decisions are asynchronous and staggered; while a request is pending, a creature continues its current action. The first playable version will measure decision latency, request volume, cost, and the clarity of resulting behavior before scaling to hundreds of creatures. TypeSafe documents typed Choice results and multiple questions per request; grouping decisions into a shared request is an optimization to evaluate rather than an assumption the game depends on. See [TypeSafe's introduction](https://docs.typesafe.ai/introduction) and [Jev announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev).

Because every new creature action must come from Jev, active play requires a connection to the decision service. A transient delay lets creatures finish their current actions. If decisions remain unavailable, the simulation pauses and presents a reconnect state; it does not invent local substitute choices. The game saves the last stable world, journal, and individual memories so a reconnect can resume the same expedition.

## What the first playable version must prove

- A player can infer the guardian's egg rule from cues and repeatable encounters without an explicit answer from the interface.
- The player can record and test a hypothesis, then use it to retrieve and install the ship component.
- A specific creature's memory changes a later encounter in a way the player can recognize.
- Every creature action transition in the slice comes from a valid Jev Choice result.
- The 3D habitat remains responsive while decisions are pending, and a service interruption has a clear recovery path.
- Measured latency and cost support a concrete scaling plan before increasing the population toward hundreds.
