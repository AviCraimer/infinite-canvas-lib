import { expect, test } from "vitest";
import { intSquareRoot } from "./squareRoot";

const testBigInts = [870623605196225262597430287283126n, 620485341601676418996569938854045n];

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
