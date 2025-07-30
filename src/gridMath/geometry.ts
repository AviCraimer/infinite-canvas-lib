import type { BlockAddress } from "../InfiniteGrid/blockAddressIndex";
import { intSquareRoot } from "./squareRoot";

export const MANTISSA_BITS = 53n;
export const SCALE = 1n << MANTISSA_BITS; // 2^53 → fits in JS bigint

/**
 * Returns [integerPart, fractionalPart] where
 *   integerPart : bigint
 *   fractionalPart : number in (-1,1)  (actually [0,1) here)
 */
export function intFracDistance(a: BlockAddress, b: BlockAddress): [bigint, number] {
    const [ax, ay, az] = a;
    const [bx, by, bz] = b;

    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;

    const S: bigint = dx ** 2n + dy ** 2n + dz ** 2n;
    const s: bigint = intSquareRoot(S);
    const r: bigint = S - s * s;

    if (r === 0n) return [s, 0.0];

    // q < 2^53, fits exactly in double
    const q: bigint = (r << MANTISSA_BITS) / (2n * s);
    const frac = Number(q) / Number(SCALE); // guaranteed |frac| < 1

    return [s, frac];
}
