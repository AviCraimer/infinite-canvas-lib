import { describe, expect, test } from "vitest";
import { intFracDistance } from "./geometry";

import { blockAddress } from "../InfiniteGrid/blockAddressIndex";
import { intSquareRoot } from "./squareRoot";

const testBigInts = [440322088914797568354011222422244n, 873926782866405603736476003215291n];

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
            // ERROR: The expect statement above does not pass:
            // Fractianal part calculated by intSquareRoot = 0.8366600265340756;
            // Value of standard calculation is  Math.sqrt(114) - 10 = 0.6770782520313112
            // These are too far apart.
        });
    });
});
