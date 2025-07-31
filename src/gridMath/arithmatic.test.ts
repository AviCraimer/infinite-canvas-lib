import { expect, test, describe } from "vitest";
import { divFloor, intSquareRoot } from "./arithmatic";
import { Big, MathContext, MC, RoundingMode } from "bigdecimal.js";

const testBigInts = [870623605196226241899656993885624189965699325262597430287283126n, 620485341601676360519622526241899656993885622418996569938854045n];

// -----------------------------------------------------------------------------
// Property‑style checks using bigdecimal.js as high‑precision oracle
// -----------------------------------------------------------------------------

const mc60 = MC(100); // 60‑digit √‑precision

/** High‑precision sqrt as BigDecimal, then floor → bigint */
/** floor(√n) via BigDecimal with plenty of head‑room, then sanity‑adjust */
function bigFloorSqrt(n: bigint): bigint {
    // digits(n) ≈ log10(n) + 1, so √n has about half that many
    const digits = n.toString().length;
    const prec = Math.ceil(digits / 2) + 10; // 10 extra guard digits
    // MC(precision, roundingMode=Big.ROUND_DOWN) → always rounds toward 0
    // Rounding‑mode codes replicate Java BigDecimal (2 = DOWN, 3 = FLOOR)
    const mc = MC(prec, 2 as unknown as number);

    let r = Big(n.toString()).sqrt(mc).toBigInt(); // tentative floor

    // One‑step correction in case of residual rounding error (±1 at most)
    while ((r + 1n) ** 2n <= n) r += 1n;
    while (r ** 2n > n) r -= 1n;

    return r;
}

test("Integer Square Root on Perfect squares", () => {
    expect(intSquareRoot(4n)).toBe(2n);

    const testSquare1 = testBigInts[0] ** 2n;
    expect(intSquareRoot(testSquare1)).toBe(testBigInts[0]);
});

test("Integer Square Root on non-perfect squares", () => {
    expect(intSquareRoot(6n)).toBe(2n);

    const testSquare1 = testBigInts[1] ** 2n;
    const remainder = 20n;

    // It returns the closest perfect square ignoreing any remainder.
    expect(intSquareRoot(testSquare1 + remainder)).toBe(testBigInts[1]);
});

describe("intSquareRoot – high‑precision comparisons (bigdecimal.js)", () => {
    const largeA = 2n ** 256n - 12345n; // ~256‑bit arbitrary n
    const largeB = testBigInts[1] ** 2n + 987654321n; // huge non‑perfect square

    const cases: bigint[] = [
        0n,
        1n,
        2n,
        3n,
        4n,
        5n,
        10n,
        15n,
        99n,
        100n,
        101n,
        testBigInts[0] ** 2n, // perfect square
        testBigInts[0] ** 2n + 123456789n, // nearby non‑square
        testBigInts[1] ** 2n - 1n, // just below perfect square
        largeA,
        largeB,
    ];

    cases.forEach((n) => {
        test(`matches BigDecimal floor(sqrt) for n = ${n.toString().slice(0, 40)}...`, () => {
            const r = intSquareRoot(n);
            const expected = bigFloorSqrt(n);

            // 1) Equality with high‑precision oracle
            expect(r).toBe(expected);

            // 2) Property: r^2 ≤ n < (r+1)^2
            expect(r ** 2n).toBeLessThanOrEqual(n);
            expect((r + 1n) ** 2n).toBeGreaterThan(n);
        });
    });

    test("throws on negative input", () => {
        expect(() => intSquareRoot(-1n as unknown as bigint)).toThrow();
    });
});

// divFloor Tests

const explicit = [
    { n: 7n, d: 2n, expected: 3n },
    { n: 5n, d: 2n, expected: 2n },
    { n: -1n, d: 2n, expected: -1n },
    { n: -3n, d: 2n, expected: -2n },
    { n: -7n, d: 2n, expected: -4n },
    { n: 7n, d: -2n, expected: -4n },
    { n: -7n, d: -2n, expected: 3n },
    { n: 0n, d: 5n, expected: 0n },
];

describe("divFloor – explicit examples", () => {
    explicit.forEach(({ n, d, expected }) =>
        test(`${n} // ${d} → ${expected}`, () => {
            expect(divFloor(n, d)).toBe(expected);
        })
    );
});

/* ------------------------------------------------------------------ *
 *  PROPERTY TEST (matches BigDecimal floor(n/d))                     *
 * ------------------------------------------------------------------ */
const bigCases = [
    { n: 2n ** 128n + 987654321n, d: 3n },
    { n: -(2n ** 200n) + 12345n, d: 17n },
    { n: 1234567890123456789012345n, d: -13n },
    { n: -(2n ** 511n) + 1n, d: -(2n ** 127n) + 3n },
];

describe("divFloor – high-precision property check", () => {
    bigCases.forEach(({ n, d }) =>
        test(`floor(${n} / ${d})`, () => {
            const q = divFloor(n, d);

            // Reference with bigdecimal.js
            const bigQ = Big(n.toString()).divide(Big(d.toString()), 0, RoundingMode.FLOOR).toBigInt();

            expect(q).toBe(bigQ);

            // Additional invariant:  q ≤ n/d < q+1
            const lhs = Big(n.toString());
            const rhs = Big(d.toString()).multiply(Big(q.toString()));
            const rhsNext = Big(d.toString()).multiply(Big((q + 1n).toString()));

            // When the divisor d is negative, it flips the inequality direction
            if (d > 0n) {
                // qd ≤ n < (q+1)d
                expect(lhs.compareTo(rhs)).toBeGreaterThanOrEqual(0);
                expect(lhs.compareTo(rhsNext)).toBeLessThan(0);
            } else {
                // qd ≥ n > (q+1)d   (sign-reversed)
                expect(lhs.compareTo(rhs)).toBeLessThanOrEqual(0);
                expect(lhs.compareTo(rhsNext)).toBeGreaterThan(0);
            }
        })
    );
});
