import { intFracDistance, midpoint1D, SCALE } from "../gridMath/geometry";
import { BlockIndex, indexToAddress, type BlockAddress, addressToIndex } from "./blockAddressIndex";
import { LocalPoint, isLocalPoint, isLocalValue, localPoint, localValue } from "./LocalPoint";

export class GridPoint {
    blockIndex: BlockIndex;
    localPoint: LocalPoint;

    constructor(blockIndex: BlockIndex, localPoint: LocalPoint) {
        if (!isLocalPoint(localPoint)) {
            throw new Error("Not a valid local point");
        }

        this.blockIndex = blockIndex;
        this.localPoint = localPoint;
    }

    // pointLEq (compare axis-wise, blocks first, locals only when blocks equal)
    static pointLEq(a: GridPoint, b: GridPoint): boolean {
        const [aBx, aBy, aBz] = indexToAddress(a.blockIndex);
        const [bBx, bBy, bBz] = indexToAddress(b.blockIndex);
        const [aLx, aLy, aLz] = a.localPoint;
        const [bLx, bLy, bLz] = b.localPoint;

        const compareAxis = (aB: bigint, aL: number, bB: bigint, bL: number) => aB < bB || (aB === bB && aL <= bL);

        return compareAxis(aBx, aLx, bBx, bLx) && compareAxis(aBy, aLy, bBy, bLy) && compareAxis(aBz, aLz, bBz, bLz);
    }

    pointLEq(b: GridPoint): boolean {
        return GridPoint.pointLEq(this, b);
    }
    static midpoint(p1: GridPoint, p2: GridPoint): GridPoint {
        // unpack
        const [t1x, t1y, t1z] = indexToAddress(p1.blockIndex);
        const [t2x, t2y, t2z] = indexToAddress(p2.blockIndex);

        const [f1x, f1y, f1z] = p1.localPoint;
        const [f2x, f2y, f2z] = p2.localPoint;

        // axis-wise midpoints
        const [mxTile, mxOff] = midpoint1D(t1x, f1x, t2x, f2x);
        const [myTile, myOff] = midpoint1D(t1y, f1y, t2y, f2y);
        const [mzTile, mzOff] = midpoint1D(t1z, f1z, t2z, f2z);

        // rebuild objects that respect the type guards
        const midAddress: BlockAddress = [mxTile, myTile, mzTile];
        const midLocal: LocalPoint = [localValue(mxOff), localValue(myOff), localValue(mzOff)];

        return new GridPoint(addressToIndex(midAddress), midLocal);
    }

    /** Instance convenience wrapper */
    midpoint(point2: GridPoint): GridPoint {
        return GridPoint.midpoint(this, point2);
    }
}
