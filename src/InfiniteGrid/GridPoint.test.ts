import { describe, expect, test } from "vitest";

import { GridPoint } from "./GridPoint";
import { blockAddress, addressToIndex } from "./blockAddressIndex";
import { localValue, LocalPoint } from "./LocalPoint";

import { Big, MC, RoundingMode } from "bigdecimal.js";

/* ------------------------------------------------------------------ */
/*  helpers                                                           */
/* ------------------------------------------------------------------ */
// quick builder: (tile coords, frac coords) → GridPoint
function gp(tx: bigint, ty: bigint, tz: bigint, fx: number, fy: number, fz: number): GridPoint {
    const idx = addressToIndex(blockAddress(tx, ty, tz));
    const lp: LocalPoint = [localValue(fx), localValue(fy), localValue(fz)];
    return new GridPoint(idx, lp);
}

/* BigDecimal “world coordinate” for one axis */
const bigAxis = (t: bigint, f: number) => Big(t.toString()).add(Big(f.toString()));

/* decompose BigDecimal ⇒ (tile, frac)   (just for optional sanity logs) */
function decompose(bd: any): [bigint, number] {
    const intPart = bd.divide(Big("1"), 0, RoundingMode.FLOOR).toBigInt();
    const fracPart = parseFloat(bd.subtract(Big(intPart)).toString());
    return [intPart, fracPart];
}

/* enough precision for every test we run */
const mc120 = MC(120, RoundingMode.DOWN);

/* ------------------------------------------------------------------ */
/*  test cases                                                        */
/* ------------------------------------------------------------------ */
const cases = [
    {
        // same block, simple average
        p1: gp(0n, 0n, 0n, 0.2, 0.4, 0.6),
        p2: gp(0n, 0n, 0n, 0.8, 0.6, 0.4),
    },
    {
        // carry across tile boundary
        p1: gp(0n, 0n, 0n, 0.9, 0.9, 0.9),
        p2: gp(1n, 1n, 1n, 0.9, 0.1, 0.05),
    },
    {
        // odd-tile sum requires +0.5 correction internally
        p1: gp(3n, 3n, 3n, 0.75, 0.1, 0.25),
        p2: gp(4n, 4n, 4n, 0.75, 0.9, 0.75),
    },
    {
        // mixed-sign blocks
        p1: gp(-3n, -4n, 2n, 0.1, 0.2, 0.3),
        p2: gp(2n, 5n, -1n, 0.2, 0.95, 0.7),
    },
    {
        // huge coordinates to stress bigint path
        p1: gp(12345678901234564293842983749827398472983479237890123n, 9872389472983749827398472398479236543210123456789n, -2n, 0.1234567890123, 0.3333333333333, 0.9),
        p2: gp(-987654321009876543212384729374892374982379487293098n, -22222223423423894789589237948729348728934792222222222222n, 5n, 0.9876543210987, 0.6666666666666, 0.1),
    },
];

/* ------------------------------------------------------------------ */
/*  tests                                                             */
/* ------------------------------------------------------------------ */
describe("GridPoint.midpoint", () => {
    cases.forEach(({ p1, p2 }, idx) => {
        test(`case #${idx + 1}`, () => {
            const mid = GridPoint.midpoint(p1, p2);

            /* ---------------- oracle ---------------- */
            const [t1, t2] = [p1, p2].map((p) => {
                const [tx, ty, tz] = p.blockIndex.split(",").map(BigInt);
                const [fx, fy, fz] = p.localPoint;
                return [bigAxis(tx, fx), bigAxis(ty, fy), bigAxis(tz, fz)];
            });

            // true midpoint in 3-space (BigDecimal)
            const midTrue = t1.map((a, i) => a.add(t2[i]).divide(Big("2"), mc120.precision, mc120.roundingMode));

            /* ---------------- assertions ---------------- */
            // (1) each local coordinate in [0,1)
            mid.localPoint.forEach((f) => {
                expect(f).toBeGreaterThanOrEqual(0);
                expect(f).toBeLessThan(1);
            });

            // (2) tile + frac reconstructs the oracle to ≤1e-12
            mid.blockIndex
                .split(",")
                .map(BigInt)
                .forEach((tile, axis) => {
                    const rebuilt = bigAxis(tile, mid.localPoint[axis]);
                    const diff = rebuilt.subtract(midTrue[axis]).abs();
                    expect(parseFloat(diff.toString())).toBeLessThan(1e-12);
                });

            // (3) symmetry  p1.midpoint(p2) === p2.midpoint(p1)
            const midSym = GridPoint.midpoint(p2, p1);
            expect(midSym.blockIndex).toBe(mid.blockIndex);
            expect(midSym.localPoint).toEqual(mid.localPoint);
        });
    });
});
