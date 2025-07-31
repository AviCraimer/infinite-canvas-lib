import { indexToAddress, BlockIndex, addressToIndex } from "./blockAddressIndex";
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

        /* 1 . Unpack the block addresses for the bounding AABB */
        const [sx, sy, sz] = indexToAddress(this.start.blockIndex);
        const [ex, ey, ez] = indexToAddress(this.end.blockIndex);

        /*  Iterate the closed block cube [sx … ex] × [sy … ey] × [sz … ez]   */
        // Note that objects should not span a large number of blocks so althrough we have a triple loop, the span traversed in each loop should be very small.
        // TODO: Add sanity check here to ensure very large spanning objects throw an error, will require some benchmarking to determine how large to avoid.
        for (let x = sx; x <= ex; x += 1n) {
            for (let y = sy; y <= ey; y += 1n) {
                for (let z = sz; z <= ez; z += 1n) {
                    const idx = addressToIndex([x, y, z]);
                    overlapped.add(idx);
                }
            }
        }

        if (!includeCenterPoint) {
            /* Identify the main block (centre‑point block) */
            const mainBlock = this.centerPoint().blockIndex;
            overlapped.delete(mainBlock);
        }
        return overlapped;
    }
}
