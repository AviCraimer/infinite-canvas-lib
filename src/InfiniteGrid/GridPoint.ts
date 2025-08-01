import { intFracDistance, midpoint1D, SCALE } from "../gridMath/geometry";
import { BlockIndex, indexToAddress, type BlockAddress, addressToIndex } from "./blockAddressIndex";
import { LocalPoint, isLocalPoint, isLocalValue, localPoint, localValue } from "./LocalPoint";
export type AxisCoord<Ax extends "x" | "y" | "z"> = { axis: Ax; block: bigint; local: number };

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

    // Comparse points along each axis.
    static pointLEq(a: GridPoint, b: GridPoint): boolean {
        return a.axisLEq(b.x) && a.axisLEq(b.y) && a.axisLEq(b.z);
    }

    pointLEq(b: GridPoint): boolean {
        return GridPoint.pointLEq(this, b);
    }
    static axisLEq<Ax extends "x" | "y" | "z">(a: AxisCoord<Ax>, b: AxisCoord<Ax>) {
        return a.block < b.block || (a.block === b.block && a.local <= b.local);
    }
    axisLEq<Ax extends "x" | "y" | "z">(b: AxisCoord<Ax>) {
        const a = this[b.axis] as AxisCoord<Ax>;
        return GridPoint.axisLEq(a, b);
    }

    static axisGEq<Ax extends "x" | "y" | "z">(a: AxisCoord<Ax>, b: AxisCoord<Ax>) {
        return a.block > b.block || (a.block === b.block && a.local >= b.local);
    }
    axisGEq<Ax extends "x" | "y" | "z">(b: AxisCoord<Ax>) {
        const a = this[b.axis] as AxisCoord<Ax>;
        return GridPoint.axisGEq(a, b);
    }

    get x(): AxisCoord<"x"> {
        const [xBlock] = indexToAddress(this.blockIndex);
        return { axis: "x", block: xBlock, local: this.localPoint[0] };
    }
    get y(): AxisCoord<"y"> {
        const [, yBlock] = indexToAddress(this.blockIndex);
        return { axis: "y", block: yBlock, local: this.localPoint[1] };
    }
    get z(): AxisCoord<"z"> {
        const [, , zBlock] = indexToAddress(this.blockIndex);
        return { axis: "z", block: zBlock, local: this.localPoint[2] };
    }
}
