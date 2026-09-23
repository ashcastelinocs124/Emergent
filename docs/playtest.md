# First playable playtest

The seeded browser test completes the functional path: enter the habitat, take an egg, observe a guardian DEFEND response, drop the egg, observe remembered FOLLOW behavior, write a journal hypothesis, collect the drive regulator, install it at the ship, and board to see the ending. The test uses debug teleportation between locations because headless Chromium declines pointer lock; the pickup, drop, Jev decision, journal, repair, and boarding inputs are the same player controls.

Visual inspection of the ship, nest, repair site, and dusk nest found two problems. A large guardian could overlap the first-person camera, so player movement now keeps a physical distance from creatures. The regulator sat too low behind wreckage, so it has been raised and lit. The visor now shows a bearing and range to the regulator or ship without exposing the egg rule.

A blind human discovery test has **not** occurred. Give a new player only the start screen and in-game controls, then observe whether they can (1) infer the carried-egg condition from contrasting sightings, (2) recognize that a particular guardian remembers them after the egg is dropped, and (3) find the regulator and complete the repair. Record where they misunderstand calls, posture, journal entries, or the bearing. Do not tell them the rule before asking what they think it is.

The habitat uses locally generated geometry, textures, and audio. It is a complete playable slice but its creature meshes are still prototype art. The browser's software-rendered frame rate is below the target; hardware performance is unverified.
