import { intFracDistance, SCALE } from "../gridMath/geometry";
import { BlockIndex, indexToAddress, type BlockAddress, addressToIndex } from "./blockAddressIndex";
import { LocalPoint, isLocalValue, localPoint, localValue } from "./LocalPoint";

export class GridPoint {
    blockIndex: BlockIndex;
    localPoint: LocalPoint;

    constructor(blockIndex: BlockIndex, localPoint: LocalPoint) {
        if (!GridPoint.isLocalPoint(localPoint)) {
            throw new Error("Not a valid local point");
        }

        this.blockIndex = blockIndex;
        this.localPoint = localPoint;
    }

    static isLocalPoint(value: unknown): value is LocalPoint {
        if (Array.isArray(value) && value.length === 3 && value.every(isLocalValue)) {
            return true;
        } else {
            return false;
        }
    }

    distance(point2: GridPoint): [bigint, number] {
        /* ── 1.  Block‑level part (huge) ──────────────────────────────── */
        const addr1 = indexToAddress(this.blockIndex);
        const addr2 = indexToAddress(point2.blockIndex);

        const [ax, ay, az] = addr1;
        const [bx, by, bz] = addr2;

        // Integers only — may be astronomically large.
        const dxBig = bx - ax;
        const dyBig = by - ay;
        const dzBig = bz - az;

        // |baseInt| is floor √(dx²+dy²+dz²);  baseFrac ∈ [0,1)
        const [baseInt, baseFrac] = intFracDistance(addr1, addr2);

        /* ── 2.  Local offsets (tiny, |value| < 1) ────────────────────── */
        const [l1x, l1y, l1z] = this.localPoint;
        const [l2x, l2y, l2z] = point2.localPoint;

        const δx = l2x - l1x; // each ∈ (‑2,2)
        const δy = l2y - l1y;
        const δz = l2z - l1z;

        /* Special case: both points are in the same block */
        if (baseInt === 0n && baseFrac === 0) {
            const d = Math.hypot(δx, δy, δz); // ≤ √12 ≈ 3.46
            const i = Math.floor(d);
            return [BigInt(i), d - i];
        }

        /* ── 3.  Direction cosines (ratio_i = dx_i / |Δblock|) ────────── */
        const toUnit = (comp: bigint, denom: bigint): number => {
            if (comp > denom || comp < -denom) throw new Error("internal: |comp| > denom");
            // ratio = comp / denom  in  (-1,1);   scale by 2^53 so it fits exactly
            const scaled = (comp * SCALE) / denom; // |scaled| < 2^53

            return Number(scaled) / Number(SCALE); // exact double
        };

        const dirX = toUnit(dxBig, baseInt); // safe: result is small
        const dirY = toUnit(dyBig, baseInt);
        const dirZ = toUnit(dzBig, baseInt);

        /* ── 4.  First‑order correction  Δ ≈ (dir · δ) ────────────────── */
        const delta = dirX * δx + dirY * δy + dirZ * δz; // |delta| ≤ 6

        /* ── 5.  Assemble final int + frac, keeping frac ∈ (-1,1) ─────── */
        let frac = baseFrac + delta;
        let intAdjust = 0;

        if (frac >= 1) {
            intAdjust = Math.floor(frac); // 1 … 6
            frac -= intAdjust;
        } else if (frac < 0) {
            intAdjust = Math.floor(frac); // negative
            frac -= intAdjust; // bring back to [0,1)
        }

        return [baseInt + BigInt(intAdjust), frac];
    }

    static midpoint(p1: GridPoint, p2: GridPoint): GridPoint {
        const addr1 = indexToAddress(p1.blockIndex);
        const addr2 = indexToAddress(p2.blockIndex);

        const midAddr: BlockAddress = [0n, 0n, 0n];
        const midLocal: LocalPoint = localPoint([0, 0, 0]);

        for (let k = 0; k < 3; k++) {
            const A = addr1[k]; // bigint (possibly huge)
            const B = addr2[k];
            const L1 = p1.localPoint[k]; // each |L| < 1
            const L2 = p2.localPoint[k];

            /* 1. integer part -------------------------------------------------- */
            const sum = A + B; // bigint
            let base = sum >> 1n; // floor((A+B)/2)   – still bigint
            let local = (L1 + L2) / 2; // in (‑1,1)

            /*  odd numerator ⇒ add 0.5 to the local offset  ------------------- */
            if (sum & 1n) local += 0.5; // 0.5 is exactly representable

            /* 2. normalise so that local ∈ (‑1,1) ------------------------------ */
            if (local >= 1) {
                base += 1n;
                local -= 1;
            } else if (local <= -1) {
                base -= 1n;
                local += 1;
            }

            midAddr[k] = base;
            midLocal[k] = localValue(local);
        }

        return new GridPoint(addressToIndex(midAddr), midLocal);
    }

    /** Instance convenience wrapper */
    midpoint(point2: GridPoint): GridPoint {
        return GridPoint.midpoint(this, point2);
    }
}
