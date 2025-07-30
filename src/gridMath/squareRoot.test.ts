import { expect, test, describe } from "vitest";
import { intSquareRoot } from "./squareRoot";
import { Big, MC } from "bigdecimal.js";

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
