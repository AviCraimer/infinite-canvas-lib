import { indexToAddress, BlockIndex, addressToIndex } from "./blockAddressIndex";
import { GridPoint } from "./GridPoint";
import { isLocalPoint } from "./LocalPoint";

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

        if (!this.validatePoints(start, end)) {
            throw Error("invalid grid object boundary points.");
        }

        if (dataValidator && !dataValidator(data)) {
            throw Error("invalid grid object data.");
        }
        this.start = start;
        this.end = end;
        this.data = data;
    }

    validatePoints(start: GridPoint, end: GridPoint): boolean {
        return isLocalPoint(start) && isLocalPoint(end) && this.pointLEq(start, end);
    }

    pointLEq(a: GridPoint, b: GridPoint): boolean {
        const [ax, ay, az] = indexToAddress(a.blockIndex);
        const [bx, by, bz] = indexToAddress(b.blockIndex);

        const xLEq = ax <= bx;
        const yLEq = ay <= by;
        const zLEq = az <= bz;

        const blockLEq = xLEq && yLEq && zLEq;

        if (!blockLEq) {
            return false;
        } else {
            const [ax, ay, az] = a.localPoint;
            const [bx, by, bz] = b.localPoint;

            const xLEq = ax <= bx;
            const yLEq = ay <= by;
            const zLEq = az <= bz;

            const localLEq = xLEq && yLEq && zLEq;

            if (!localLEq) {
                return false;
            }
        }
        return true;
    }
    centerPoint(): GridPoint {
        return this.start.midpoint(this.end);
    }

    overlapping(): Set<BlockIndex> {
        const overlapped = new Set<BlockIndex>();

        /* 1 . Unpack the block addresses for the bounding AABB */
        const [sx, sy, sz] = indexToAddress(this.start.blockIndex);
        const [ex, ey, ez] = indexToAddress(this.end.blockIndex);

        /* 2 . Identify the home block (centre‑point block) */
        const homeBlock = this.centerPoint().blockIndex;

        /* 3 . Iterate the closed block cube [sx … ex] × [sy … ey] × [sz … ez]   */
        for (let x = sx; x <= ex; x += 1n) {
            for (let y = sy; y <= ey; y += 1n) {
                for (let z = sz; z <= ez; z += 1n) {
                    const idx = addressToIndex([x, y, z]);
                    if (idx !== homeBlock) overlapped.add(idx);
                }
            }
        }
        return overlapped;
    }
}
