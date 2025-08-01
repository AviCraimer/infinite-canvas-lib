import { Block } from "./../blocks";
import { InfiniteGrid } from "./../InfiniteGrid/InfiniteGrid";
import { linearInterpolation } from "../gridMath/geometry";
import { BlockAddress } from "../InfiniteGrid/blockAddressIndex";
import { GridObject } from "../InfiniteGrid/GridObject";
import { blockObjects } from "../InfiniteGrid/gridBlock";

type ViewRect = { start: BlockAddress; end: BlockAddress };
/* ------------------------------------------------------------------ */
/*  ScreenView                                 */
/* ------------------------------------------------------------------ */
export class ScreenView {
  private nearRect: ViewRect;
  private farRect: ViewRect;

  constructor(
    nearRectStart: BlockAddress,
    nearRectEnd: BlockAddress,
    farRectStart: BlockAddress,
    farRectEnd: BlockAddress,
  ) {
    if (
      !this.validateView(nearRectStart, nearRectEnd, farRectStart, farRectEnd)
    ) {
      throw Error("Invalid coodinates for view");
    }

    this.nearRect = { start: nearRectStart, end: nearRectEnd };
    this.farRect = { start: farRectStart, end: farRectEnd };
  }

  private validateView(
    nearRectStart: BlockAddress,
    nearRectEnd: BlockAddress,
    farRectStart: BlockAddress,
    farRectEnd: BlockAddress,
  ) {
    const tests = [
      // Both rectangles are 2D rectangles, so their z-indexs match
      nearRectStart[2] === nearRectEnd[2],
      farRectStart[2] === farRectEnd[2],
      farRectStart[2] > nearRectStart[2], // Far z-index is greater (farther away), note this covers the ends also since they have the same z-index

      // X and Y of start are less than X and Y of end. Note that this condition transfers to the far rectangle in the tests below.
      nearRectStart[0] < nearRectEnd[0],
      nearRectStart[1] < nearRectEnd[1],

      // The far rectangle contains the near in the X/Y dimensions.
      farRectStart[0] <= nearRectStart[0], // starting x-index of far rect is less or equal (to the left of) near rect.
      farRectEnd[0] >= nearRectEnd[0], // ending x-index of far rect is greater or equal (to the right of) near rect.
      farRectStart[1] <= nearRectStart[1], // starting y-index of far rect is less or equal (higher than) near rect.
      farRectEnd[1] >= nearRectEnd[1], // ending y-index of far rect is greater or equal (lower than) near rect.
    ];

    return tests.every((b) => b);
  }

  // Get top-left block
  TL(nearFar: "near" | "far"): BlockAddress {
    const start = nearFar === "near" ? this.nearRect.start : this.farRect.start;
    return [
      ...start,
    ];
  }

  // Get bottom-right block
  BR(nearFar: "near" | "far"): BlockAddress {
    const end = nearFar === "near" ? this.nearRect.end : this.farRect.end;
    return [
      ...end,
    ];
  }

  // Get bottom-left block
  BL(nearFar: "near" | "far"): BlockAddress {
    const start = nearFar === "near" ? this.nearRect.start : this.farRect.start;
    const end = nearFar === "near" ? this.nearRect.end : this.farRect.end;
    return [
      start[0],
      end[1],
      start[2],
    ];
  }

  // Get top-right block
  TR(nearFar: "near" | "far"): BlockAddress {
    const start = nearFar === "near" ? this.nearRect.start : this.farRect.start;
    const end = nearFar === "near" ? this.nearRect.end : this.farRect.end;
    return [
      end[0],
      start[1],
      start[2],
    ];
  }

  corners(
    nearFar: "near" | "far",
  ): [TL: BlockAddress, TR: BlockAddress, BR: BlockAddress, BL: BlockAddress] {
    return [
      this.TL(nearFar),
      this.TR(nearFar),
      this.BR(nearFar),
      this.BL(nearFar),
    ];
  }

  getBlocksInView(): BlockAddress[] {
    const blocks: BlockAddress[] = [];

    const [
      nearTL,
      nearTR,
      ,
      nearBL,
    ] = this.corners("near");
    const [
      farTL,
      farTR,
      ,
      farBL,
    ] = this.corners("far");

    const zNear = nearTL[2];
    const zFar = farTL[2];
    const dzTot = zFar - zNear; // > 0n  (validated in ctor)

    for (let z = zNear; z <= zFar; z += 1n) {
      const dz = z - zNear; // slice offset (0 … dzTot)

      /* interpolate X/Y bounds for this z-slice */
      const xMin = linearInterpolation(nearTL[0], farTL[0], dz, dzTot, "floor");
      const xMax = linearInterpolation(nearTR[0], farTR[0], dz, dzTot, "ceil");
      const yMin = linearInterpolation(nearTL[1], farTL[1], dz, dzTot, "floor");
      const yMax = linearInterpolation(nearBL[1], farBL[1], dz, dzTot, "ceil");

      for (let x = xMin; x <= xMax; x += 1n) {
        for (let y = yMin; y <= yMax; y += 1n) {
          blocks.push([
            x,
            y,
            z,
          ]);
        }
      }
    }
    return blocks;
  }

  getObjectsInView<D extends object>(grid: InfiniteGrid<D>): Set<string> {
    const blockAddresses = this.getBlocksInView();
    let allIDs: Set<string> = new Set();
    for (const bk of blockAddresses) {
      const block = grid.getBlock(bk);
      const blockIDs = blockObjects(block);
      allIDs = new Set(...allIDs, ...blockIDs);
    }
    return allIDs;
  }
}
