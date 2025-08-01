import { indexToAddress, BlockIndex, addressToIndex, forEachBlock, BlockAddress } from "./blockAddressIndex";
import { GridPoint } from "./GridPoint";

export type iGridObject<D extends object> = {
    uid: string;
    start: GridPoint;
    end: GridPoint;
    data: D;
};

export class GridObject<D extends object> implements iGridObject<D> {
    uid: string;
    start: GridPoint;
    end: GridPoint;
    data: D;

    constructor(obj: Omit<iGridObject<D>, "uid"> & { uid?: string }, dataValidator?: (data: D) => boolean) {
        const { uid, start, end, data } = obj;

        this.uid = uid ?? crypto.randomUUID();

        if (!this.validateEndPoints(start, end)) {
            throw Error("invalid grid object boundary points.");
        }

        if (dataValidator && !dataValidator(data)) {
            throw Error("invalid grid object data.");
        }
        this.start = start;
        this.end = end;
        this.data = data;
    }

    // Private method used in the constructor to validate the endpoints. For now it is just calling pointLEq, but I'm leaving in case additional validation is needed in the future.
    // Note that the GridPoint constructor is responsible for validating that the local values.
    private validateEndPoints(start: GridPoint, end: GridPoint): boolean {
        return start.pointLEq(end);
    }

    centerPoint(): GridPoint {
        return this.start.midpoint(this.end);
    }

    // Gets the set of block indexes that the object overlaps.
    // includeCenterPoint is set to false by default since this is the common use case to avoid double referencing the main block.
    overlapping(includeCenterPoint: boolean = false): Set<BlockIndex> {
        const overlapped = new Set<BlockIndex>();

        forEachBlock(this.start.blockIndex, this.end.blockIndex, (blockAddress: BlockAddress) => {
            const idx = addressToIndex(blockAddress);
            overlapped.add(idx);
        });

        if (!includeCenterPoint) {
            /* Identify the main block (centre‑point block) */
            const mainBlock = this.centerPoint().blockIndex;
            overlapped.delete(mainBlock);
        }
        return overlapped;
    }

    /**
     * Axis-aligned intersection test that works at full (block,local) precision.
     * Assumes `start` is the min corner and `end` the max corner
     * (already guaranteed by the constructor’s `validateEndPoints`).
     */
    // TODO Avi: I need to understand how this works and write unit tests.
    intersects(other: GridObject<any>): boolean {
        return GridPoint.axisLEq(this.start.x, other.end.x) && GridPoint.axisGEq(this.end.x, other.start.x) && GridPoint.axisLEq(this.start.y, other.end.y) && GridPoint.axisGEq(this.end.y, other.start.y) && GridPoint.axisLEq(this.start.z, other.end.z) && GridPoint.axisGEq(this.end.z, other.start.z);
    }
}
