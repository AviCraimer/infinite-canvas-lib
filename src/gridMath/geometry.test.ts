import { describe, expect, test } from "vitest";
import { intFracDistance, midpoint1D } from "./geometry";

import { blockAddress, BlockAddress } from "../InfiniteGrid/blockAddressIndex";
import { intSquareRoot } from "./arithmatic";
// -----------------------------------------------------------------------------
// High‑precision cross‑checks using bigdecimal.js  (tests‑only dependency)
// -----------------------------------------------------------------------------
import { Big, MC, RoundingMode } from "bigdecimal.js"; // dev‑only import

// HELPERS FOR BIG DECIMAL
/* Helper: (tile, frac) → BigDecimal world-coordinate */
const bigCoord = (t: bigint, f: number) => Big(t.toString()).add(Big(f.toString()));

/* Decompose BigDecimal → (tile, frac)  with 0 ≤ frac < 1 */
function bigDecompose(x: any): [bigint, number] {
    // ⌊x⌋ = divide by 1 with scale 0 & RoundingMode.FLOOR
    const intBD = x.divide(Big("1"), 0, RoundingMode.FLOOR); // BigDecimal
    const intBig = intBD.toBigInt();
    const fracPart = parseFloat(x.subtract(intBD).toString());
    return [intBig, fracPart];
}

const testBigInts = [
    4403220889148891479753926782866979753926782866926782866405683540112224222444403220889147975392678286692678286640568354011222422244440322026782866405683540112224222444403220889147975392678286692678286640568354011222422244n,
    873926782866400889147560373646400889147560373647606926703215291873926782866400889147560373647606926703215291873926782866400889147567606926703215291873926782860373647606926703215291n,
];

describe("intFracDistance", () => {
    test("should calculate correct integer distances for rectilinear paths", () => {
        let length = testBigInts[0];
        const address1 = blockAddress(0, 0, 0);
        const address2x = blockAddress(length, 0, 0);
        const address2y = blockAddress(0, length, 0);
        const address2z = blockAddress(0, 0, length);

        expect(intFracDistance(address1, address2x)).toEqual([length, 0]);
        expect(intFracDistance(address1, address2y)).toEqual([length, 0]);
        expect(intFracDistance(address1, address2z)).toEqual([length, 0]);
    });

    test("should calculate correct integer distances for perfect Pythagorean triples", () => {
        // 3-4-5 Triangle
        const address3y = blockAddress(0, 3n * testBigInts[1], 0);
        const address4x = blockAddress(4n * testBigInts[1], 0, 0);
        const address4z = blockAddress(0, 0, 4n * testBigInts[1]);
        expect(intFracDistance(address3y, address4x)).toEqual([5n * testBigInts[1], 0]);
        expect(intFracDistance(address4z, address3y)).toEqual([5n * testBigInts[1], 0]);
    });

    describe("for non-integer distances", () => {
        const p1 = blockAddress(1n, 2n, 3n);
        const p2 = blockAddress(8n, 6n, 10n); // dx=7, dy=4, dz=7

        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dz = p2[2] - p1[2];
        const s_squared = dx ** 2n + dy ** 2n + dz ** 2n; // 49 + 16 + 49 = 114

        test("should return a valid integer part and fractional part", () => {
            // Strategy 1: Test the properties of the components
            const [integerPart, fractionalPart] = intFracDistance(p1, p2);

            // The integer part should be the integer square root of the squared distance
            expect(integerPart).toBe(intSquareRoot(s_squared)); // intSquareRoot(114) = 10
            expect(integerPart).toBe(10n); // 10*10 = 100 is the closest perfect square to 114

            // The fractional part should always be between 0 and 1
            expect(fractionalPart).toBeGreaterThanOrEqual(0);
            expect(fractionalPart).toBeLessThan(1);
            expect(fractionalPart).toBeCloseTo(Math.sqrt(114) - 10); // Should be close to the fractional part of the standard square root.
        });
    });
});

// BIG DECIMAL JS Cross-Checks
const mc60 = MC(500); // 1000‑digit √‑precision

/** Helper: Euclidean distance between two BlockAddresses as BigDecimal */
function bigDistance(a: BlockAddress, b: BlockAddress) {
    const dx = Big((b[0] - a[0]).toString());
    const dy = Big((b[1] - a[1]).toString());
    const dz = Big((b[2] - a[2]).toString());
    const sumSquares = dx.pow(2).add(dy.pow(2)).add(dz.pow(2));
    return sumSquares.sqrt(mc60); // high‑precision √  :contentReference[oaicite:0]{index=0}
}
describe("intFracDistance – high‑precision comparisons (bigdecimal.js)", () => {
    const cases = [
        {
            name: "moderate coords (√114 ≈ 10.677…)",
            p1: blockAddress(1n, 2n, 3n),
            p2: blockAddress(8n, 6n, 10n),
        },
        {
            name: "negative ↔ positive coords",
            p1: blockAddress(-5n, -4n, -3n),
            p2: blockAddress(2n, 2n, 4n),
        },
        {
            name: "very large 128‑bit‑ish coords",
            p1: blockAddress(0n, testBigInts[0], -2n * testBigInts[1]),
            p2: blockAddress(3n * testBigInts[1], -testBigInts[0] / 3n, 5n * testBigInts[0]),
        },
    ];

    cases.forEach(({ name, p1, p2 }) => {
        test(`matches BigDecimal for ${name}`, () => {
            // Library under test
            const [intPart, fracPart] = intFracDistance(p1, p2);

            // Reference value (60‑digit BigDecimal)
            const bigDist = bigDistance(p1, p2);
            const bigIntPart = bigDist.toBigInt(); // floor(√)
            const bigFrac = parseFloat(
                bigDist.subtract(Big(bigIntPart)).toString() // remainder in (0,1)
            );

            // 1) Integer part must match exactly
            expect(intPart).toEqual(bigIntPart);

            // 2) Fractional part must be very close (≤ 1 × 10⁻¹²)
            const diff = Math.abs(fracPart - bigFrac);
            expect(diff).toBeLessThan(1e-12);
        });
    });
});

/* Test cases chosen to hit all thorny branches */
const midpointCases = [
    // same tile, no carry
    { t1: 0n, f1: 0.2, t2: 0n, f2: 0.6 },

    // carry across tile boundary (sumOff ≥ 1)
    { t1: 0n, f1: 0.9, t2: 1n, f2: 0.9 },

    // odd-sum tile so +0.5 correction, plus carry
    { t1: 3n, f1: 0.75, t2: 4n, f2: 0.75 },

    // mixed-sign tiles (-3 + 0.1,  2 + 0.2) → world coords −2.9 and 2.2
    { t1: -3n, f1: 0.1, t2: 2n, f2: 0.2 },

    // huge values (forces bigint branch, still within double frac range)
    { t1: 1234567837457967896789678990123456789n, f1: 0.1234567890123, t2: -98766789678967896789654321098765432n, f2: 0.9876543210987 },
];

const mcPrecision = 120;

describe("midpoint1D – cross-checked with BigDecimal oracle", () => {
    midpointCases.forEach(({ t1, f1, t2, f2 }) => {
        const name = `(${t1}+${f1}) ↔ (${t2}+${f2})`;
        test(name, () => {
            /* ---------- library under test ---------- */
            const [mt, mf] = midpoint1D(t1, f1, t2, f2);

            /* ---------- high-precision oracle ---------- */
            const bigMid = bigCoord(t1, f1).add(bigCoord(t2, f2)).divide(Big("2"), mcPrecision, RoundingMode.DOWN); // (w1 + w2)/2
            const [et, ef] = bigDecompose(bigMid);

            /* ---------- assertions ---------- */

            // 0 ≤ frac < 1  invariant
            expect(mf).toBeGreaterThanOrEqual(0);
            expect(mf).toBeLessThan(1);

            // tile part exact
            expect(mt).toBe(et);

            // fractional part within 1 × 10⁻¹²
            expect(Math.abs(mf - ef)).toBeLessThan(1e-12);

            // round-trip: rebuild world coord and compare to oracle
            const rebuilt = bigCoord(mt, mf);
            const ulp = Big("1e-12");
            expect(rebuilt.subtract(bigMid).abs().compareTo(ulp)).toBeLessThan(0);
        });
    });
});
