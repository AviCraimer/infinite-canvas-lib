// src/gridMath/geometry.ts
import type { BlockAddress } from "../InfiniteGrid/blockAddressIndex";
import { intSquareRoot } from "./squareRoot";

export const MANTISSA_BITS = 53n; // size of IEEE‑754 double mantissa
export const SCALE = 1n << MANTISSA_BITS; // 2^53  → exact in JS double

/**
 * Euclidean distance between two block addresses, split into an integer part
 * and a high‑precision fractional remainder.
 *
 * @param a          first  BlockAddress  [ax, ay, az]
 * @param b          second BlockAddress [bx, by, bz]
 * @param iterations how many Newton / Babylonian refinement steps to run
 *                   (≥ 1). 3 iterations give full‑double accuracy; the
 *                   default (3) costs very little next to the bigint divides.
 * @returns          [integer distance as bigint, fractional remainder ∈ [0,1) as number]
 */
export function intFracDistance(a: BlockAddress, b: BlockAddress, iterations: number = 3): [bigint, number] {
    if (iterations < 1) iterations = 1;

    const [ax, ay, az] = a;
    const [bx, by, bz] = b;

    /* 1) integer‑math setup --------------------------------------------------- */
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;

    const S: bigint = dx ** 2n + dy ** 2n + dz ** 2n;
    const s: bigint = intSquareRoot(S); // ⌊√S⌋
    const r: bigint = S - s * s; // remainder  (0 ≤ r < 2s)

    if (r === 0n) return [s, 0.0]; // perfect square

    /* 2) first‑order fractional approximation  f₀ = r / (2s)  ----------------- */
    const q = (r << MANTISSA_BITS) / (2n * s); // Q53 fixed‑point
    let xFixed = (s << MANTISSA_BITS) + q; // x₀ = s + f₀  (Q53)

    /* 3) Newton / Babylonian refinements in a single loop --------------------- */
    const SHIFTED_S = S << (MANTISSA_BITS * 2n); // S · 2^(2·53)
    for (let i = 0; i < iterations; ++i) {
        const yFixed = SHIFTED_S / xFixed; // S / xᵢ  (still Q53)
        const next = (xFixed + yFixed) >> 1n; // xᵢ₊₁ = ½(xᵢ + S/xᵢ)
        if (next === xFixed) break; // converged exactly
        xFixed = next;
    }

    /* 4) extract fractional part and convert to JS double --------------------- */
    const fracFixed = xFixed - (s << MANTISSA_BITS); // 0 ≤ f < 2^53
    const frac = Number(fracFixed) / Number(SCALE); // safe: |frac| < 1

    return [s, frac];
}
