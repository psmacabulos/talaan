# Step 57.1 (optional): A found card back in use

> **Written before the code, on 2026-10-23, and parked.** The owner decided the same day that, for now, a lost card stays lost and can't be turned back on (`docs/GATE.md`, "Lost cards stay lost"). This recipe waits in `docs/PLAN.md`'s "When needed" list, to be picked up when there's time. **It hasn't had its architect review or the owner's approval yet:** when it's picked up, it gets a step number in the plan, a review, any changes, and then approval before any code. If the code has changed by then, check the line references below first.

## Why

A student loses their ID. The office marks it lost (Students → the student → **Card lost? Replace it** → **Yes, replace card** → Save) without linking a new card yet. From that moment, the card stops working at every gate, and any tap of it raises "Needs attention" (Step 57).

Then the card turns up: the student finds it, or someone tries it at the gate, the office takes it, and it goes back to its owner. Today the office can't turn it back on. Scanning it in the drawer is refused with "This card was reported lost or retired, so it can't be linked again", so the student needs a new card for no reason.

This step adds **Card found: use it again**, only for that window: the card is lost, and **no new card has been issued yet**. Once the student has a new card, the old one stays lost for good, since turning it on would mean switching off the card they already carry.

## What it costs

Nothing. No new table, column, package or service. One `UPDATE` of one card row when the office uses it.

## Decisions (proposed)

1. **Only when the student has no active card.** The database already allows one active card per student (`Card_one_active_per_student`), so the update can't break that rule even when two people click at once: the second gets the unique-index error and a plain message.
2. **Only the same student.** The card goes back to the owner it was registered to (`Card.studentId` doesn't change). Giving a found card to someone else stays refused, as today.
3. **Only a principal or a super admin**, the people who manage cards today. Teachers can't (`checkCardSerial` already refuses them).
4. **Not when another active card shares its first 4 bytes.** While this card was lost, another student may have been given a card starting with the same 4 bytes: linking only checks against *active* cards (`findSerialConflict` in `src/features/students/card-serial.ts`). Turning this one back on would make the USB reader unable to tell them apart (`matchCard` then answers "unknown card"). So it's refused with the same message linking uses.
5. **Same pattern as the rest of the card box: nothing is saved until Save.** The button adds a pending change, "this card will be used again", shown with Undo; the student form's Save applies it, after every check runs again on the server (`prepareCardChange`).
6. **Past taps stay as they were.** The taps made while the card was lost have alerts, and Step 57 reads the alert, not the card's status, to know a tap was a lost card's. So they still don't count after the card is back in use. Open alerts for the card stay open until someone marks them handled.
7. **A confirm step, with the one real risk said plainly.** The card holds nothing but its serial, so whoever had it could have copied that serial onto a blank card. The copy would work again too. The dialog says: "Use this card again only if you have it in your hand and it's the student's. If you're not sure where it's been, link a new card instead."

## Steps

### 1. The card repository (`card-repository.ts`, `prisma-card-repository.ts`)

```ts
/**
 * Turns a lost card back on for its own student (Step 57.1), only within
 * `schoolId`. Null if there's no such lost card there. Throws the database's
 * unique-index error if the student already has an active card.
 */
reactivate(schoolId: string, cardId: string): Promise<Card | null>;
```

Prisma: `updateMany({ where: { id: cardId, schoolId, status: "lost" }, data: { status: "active" } })`, then read the row back. `count === 0` → null. The `P2002` from `Card_one_active_per_student` is caught in `prepareCardChange`'s caller and becomes "This student already has a linked card." The mock does the same checks in memory.

### 2. The pending change (`student-changes.ts`)

`PendingCard` gains `reuseLost: string | null`, the id of the lost card to turn back on. `studentChangesSchema` accepts it (`z.string().min(1).max(64).nullable()`). It can't be combined with `replaceLost` or `link` (the schema refuses the mix).

### 3. The rules (`card-changes.ts`, `prepareCardChange`)

When `reuseLost` is set:

1. the student has no active card (`getActiveForStudent`), else "This student already has a linked card.";
2. the card is this student's, at this school, and `lost` (`listByStudent`), else "That card can't be used again.";
3. no **other** active card at the school shares its first 4 bytes (`listBySerialPrefix`), else the `same_first_bytes` message;
4. `apply` calls `cards.reactivate(schoolId, cardId)`.

### 4. The card box (`card-box.tsx`)

When the student has **no active card** and their most recent card is **lost**, the box shows the lost card's serial and a **Card found: use it again** button next to **Link a new card**. It opens the confirm dialog (decision 7). Confirming sets `reuseLost`, and the box shows "This card will be used again: 53:2E:98:0C:14:00:01. Not saved yet." with Undo. A teacher sees neither button, as today.

### 5. Tests

- `card-changes.test.ts`:
  - turning a lost card back on works for its student with no active card;
  - it's refused with an active card, for another student's card, for a retired card, another school's card, and an active twin sharing the first 4 bytes;
  - it can't be mixed with `replaceLost` or `link`.
- `card-repository.test.ts` (mock) and a Postgres test: `reactivate` only turns a lost card at this school back on; two calls for two of one student's lost cards at once leave exactly one active.
- `record-tap.test.ts`: after a card is turned back on, its tap is a normal time in; a resend of a tap made while it was lost still answers `lost_card` (its alert).
- `e2e/students.spec.ts`: mark a card lost without a new card, save, then **Card found: use it again** → confirm → save → the student shows an active card with the same serial.

## Verify it worked

1. The routine in `docs/LEARNING-LOG.md`.
2. Students → a student with a card → **Card lost? Replace it** → **Yes, replace card** → Save without a new card. The list shows the card as lost.
3. Tap that card at `/gate`: "Card reported lost", and an alert on the dashboard.
4. Open the student → **Card found: use it again** → confirm → Save. The card shows as active again.
5. Tap it at `/gate`: a normal time in (or "Already tapped" within 2 minutes of the lost tap; wait).
6. Give another student a new card, then try step 4 on a student whose new card is already linked: the button isn't there.

## What you'll learn

- Letting the database's own rule (one active card per student) settle a race, instead of checking first and hoping nobody changes things in between.
- Why the 4-byte reader makes "twin" cards a thing to check whenever a card becomes active, not only when it's first linked.

## Before you commit

The full routine in `docs/LEARNING-LOG.md`, then "Verify it worked".

Suggested commit: `feat(cards): let the office put a found card back in use before a new one is issued`

## Known limits

- **A copied card works again too** (decision 7). The only defence is the office's judgement, and linking a new card when unsure.
- **No record of when a card was lost or found.** The card's status is all that's kept. The alerts show when it was tapped while lost.
- **Not for a student who already has a new card**, by design.

## Changed while building
