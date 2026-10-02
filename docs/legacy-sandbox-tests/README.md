# Historical sandbox tests

These six suites targeted the retired sandbox rather than the current game.
The conversation sandbox entry point was removed in commit b2056a7e
("Update scenes and remove deprecated components"); none of the imported
sandbox/components, sandbox/entities, sandbox/services, or sandbox/scenes
modules exists in the current checkout. The old AI suite assumes an OpenAI
compatible endpoint while the current service uses Ollama's native API.
The architecture suite also used unawaited imports, producing unhandled rejections.

Original tests are preserved here as .txt reference files, outside test discovery.
They have not been repaired or counted as passing. Current runtime coverage lives
in tests/unit: AI delivery and offline dialogue, logger recovery, movement,
level boundaries, inventory transfers, and indicator rendering. These are not
one-for-one replacements for deleted sandbox features. No test exclusion or
skip was added to Vitest. Rendering, NPC action integration, scene transitions,
and a complete gameplay session still need validation before launch.
