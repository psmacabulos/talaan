# The parent app's brief (moved)

On 2026-10-19 this brief became a starter kit in [`mobile/`](../mobile/README.md): files copied as they are into the parent app's own repository, so its Claude reads them and starts, with nothing to splice by hand. `mobile/README.md` says whether the API is ready, what's in the kit, and the commands to copy it.

Older docs and code comments still point here by section. This is where each one went (all under `mobile/starter/`):

| Section of the old brief | Now |
|---|---|
| For the owner: how to use this file | `mobile/README.md` (not copied) |
| Scope and identity, the stack, privacy and security, the working rules | `CLAUDE.md` |
| The parent API: addresses, shapes, errors, photos | `docs/PARENT-API.md` here, copied into the app as `docs/TALAAN-API.md` |
| Times and dates, the words to use, what the server decides, field rules | `docs/PRODUCT-RULES.md` |
| Push notifications | `docs/PRODUCT-RULES.md` ("Notifications and push") and `docs/PLAN.md` (M7) |
| Design system: tokens in hex, brand and status colours, type, the logo | `docs/DESIGN.md`, `reference/mark-shapes.ts` |
| The plan, M1 to M8, and the demo script | `docs/PLAN.md` |
| (new) Which server to use (Heroku, or the Mac as a fallback), the demo data, testing a real push | `docs/SERVER.md` |

**When Talaan changes** something the app depends on (the API, a rule, the design tokens, the logo), update the matching file in `mobile/starter/` in the same change, and tell the owner which file to copy again.
