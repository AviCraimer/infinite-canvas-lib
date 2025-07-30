// src/gridMath/geometry.ts
import type { BlockAddress } from "../InfiniteGrid/blockAddressIndex";
import { intSquareRoot } from "./squareRoot";

export const MANTISSA_BITS = 53n; // size of IEEE-754 mantissa
export const SCALE = 1n << MANTISSA_BITS; // 2^53 → exact in double

/**
 * Split Euclidean distance into ⌊distance⌋ (bigint) and fractional remainder.
 *
 * @param a             first  BlockAddress [ax, ay, az]
 * @param b             second BlockAddress [bx, by, bz]
 * @param maxIterations safety cap (default 10).  The loop usually exits after
 *                      4–6 steps even for 1000-bit inputs; 10 is plenty.
 */
export function intFracDistance(a: BlockAddress, b: BlockAddress, maxIterations: number = 10): [bigint, number] {
    /* ---------- 1. integer part ------------------------------------------- */
    const [ax, ay, az] = a;
    const [bx, by, bz] = b;

    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;

    const S: bigint = dx ** 2n + dy ** 2n + dz ** 2n; // |Δ|²  (≥ 0)
    const s: bigint = intSquareRoot(S); // ⌊√S⌋
    const r: bigint = S - s * s; // remainder (0 ≤ r < 2s)

    if (r === 0n) return [s, 0.0]; // perfect square → done

    /* ---------- 2. first-order estimate in Q53 fixed-point ----------------- */
    const q = (r << MANTISSA_BITS) / (2n * s); // f₀ = r / (2s)
    let xFixed = (s << MANTISSA_BITS) + q; // x₀ = s + f₀  (Q53)

    /* ---------- 3. Newton / Babylonian loop ------------------------------- */
    const SHIFTED_S = S << (MANTISSA_BITS * 2n); // S · 2^(2·53)
    for (let i = 0; i < maxIterations; ++i) {
        const yFixed = SHIFTED_S / xFixed; // S / xᵢ   (Q53)
        const next = (xFixed + yFixed) >> 1n; // xᵢ₊₁     (Q53)

        // Converged when the 53-bit value no longer changes (≤ 1 ULP)
        if (next === xFixed) break;
        xFixed = next;
    }

    /* ---------- 4. extract fractional part as double ---------------------- */
    const fracFixed = xFixed - (s << MANTISSA_BITS); // still a bigint < 2^53
    const frac = Number(fracFixed) / Number(SCALE);

    return [s, frac];
}
