# Midnight Vault — a heist game

A top-down heist game for make.fun's "Make the best heist game" bounty
(`best-heist-game-20261122-0559`). Rook the thief slips into a museum vault at
night, past patrolling guards and sweeping cameras, grabs the Diamond, and gets
out the door before the alarm fills.

## How to play

- **Move** with WASD or the arrow keys.
- **Tools** (bought with coins from the gold bars): `1` or click for a Smoke Bomb
  (30 coins, blinds every eye near Rook for 5 s); `2` or click for an EMP
  (50 coins, switches every camera off for 8 s).
- **Win**: take the Diamond from the vault, then reach the green EXIT door.
- **Lose**: the alarm hits 100% while a guard or a camera has Rook in sight.
- `P` pauses. `Space` starts and restarts.

## The room

Two routes to the vault: the left corridor, walked by Marlow's patrol, and the
right corridor, watched by a sweeping camera. Display cases, crates and plants
block a guard's and a camera's line of sight — read the cones before you move.

## Play it

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.
