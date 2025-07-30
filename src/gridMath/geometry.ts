import type { BlockAddress } from "../InfiniteGrid/blockAddressIndex";
import { intSquareRoot } from "./squareRoot";

export const MANTISSA_BITS = 53n; // size of the double mantissa
export const SCALE = 1n << MANTISSA_BITS; // 2^53  → exact in JS double

/**
 * Returns [integerPart, fractionalPart] where
 *   integerPart    : bigint              (⌊‖Δ⃗‖⌋)
 *   fractionalPart : number in [0, 1)    (high‑precision remainder)
 *
 * All intermediate calculations stay in bigint space, so the routine
 * works for arbitrarily large coordinates without hitting 1 e308 limits.
 */
export function intFracDistance(a: BlockAddress, b: BlockAddress): [bigint, number] {
    const [ax, ay, az] = a;
    const [bx, by, bz] = b;

    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;

    /* ------------------------------------------------------------- *
     * 1) basic integer‑math part                                    *
     * ------------------------------------------------------------- */
    const S: bigint = dx ** 2n + dy ** 2n + dz ** 2n; // ‖Δ⃗‖²  (always ≥ 0)
    const s: bigint = intSquareRoot(S); // ⌊√S⌋
    const r: bigint = S - s * s; // remainder (0 ≤ r < 2s)

    if (r === 0n) return [s, 0.0]; // perfect square

    /* ------------------------------------------------------------- *
     * 2) first‑order fractional term   f₀ = r / (2s)                *
     *    kept in Q53 fixed‑point:  q := f₀ · 2^53  (< 2^53)         *
     * ------------------------------------------------------------- */
    const q: bigint = (r << MANTISSA_BITS) / (2n * s);
    let xFixed = (s << MANTISSA_BITS) + q; // x₀ = s + f₀   (Q53)

    /* ------------------------------------------------------------- *
     * 3) one Newton / Babylonian refinement, still in Q53           *
     *    x₁ = ½ (x₀ + S/x₀)                                         *
     *    To keep the scale, multiply S by 2^(2·53) before dividing   *
     * ------------------------------------------------------------- */
    const yFixed = (S << (MANTISSA_BITS * 2n)) / xFixed; // S/x₀ in Q53
    xFixed = (xFixed + yFixed) >> 1n; // average → x₁

    /* ------------------------------------------------------------- *
     * 4) extract fractional part, convert to JS double              *
     * ------------------------------------------------------------- */
    const fracFixed = xFixed - (s << MANTISSA_BITS); // 0 ≤ f < 2^53
    const frac = Number(fracFixed) / Number(SCALE); // safe: |frac| < 1

    return [s, frac];
}
