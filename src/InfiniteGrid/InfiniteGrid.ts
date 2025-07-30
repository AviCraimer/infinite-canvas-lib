import { BlockIndex, BlockAddress, addressToIndex } from "./blockAddressIndex";
import { Block } from "./gridBlock";
import { GridObject } from "./GridObject";
import { GridPoint } from "./GridPoint";

class InfiniteGrid<D extends object> {
    blockLookup: Map<BlockIndex, Block> = new Map();
    objectLookup: Map<string, GridObject<D>> = new Map();
    revMainLookup: Map<string, BlockIndex> = new Map();

    // Goes from object uid to set of blocks the object overlaps (but is not centered in)
    revOverlapLookup: Map<string, Set<BlockIndex>> = new Map();

    constructor(objects: GridObject<D>[]) {
        for (const obj of objects) {
            this.insertObject(obj);
        }
    }

    getBlock(addr: BlockAddress | BlockIndex): Block | undefined {
        return this.blockLookup.get(Array.isArray(addr) ? addressToIndex(addr) : addr);
    }
    // Creates a block at the address index if one does not already exist
    createBlock(blockLocation: BlockAddress | BlockIndex): Block {
        let index: BlockIndex;
        if (Array.isArray(blockLocation)) {
            index = addressToIndex(blockLocation);
        } else {
            index = blockLocation;
        }

        if (!this.blockLookup.get(index)) {
            const block: Block = {
                index, // A unique identifier
                objects: {
                    main: new Set(),
                    overlapping: new Set(),
                },
            };

            this.blockLookup.set(index, block);
        }
        // We are gaurentteed to have the block since either it already existed or we just created it.
        return this.blockLookup.get(index)!;
    }

    insertObject(obj: GridObject<D>) {
        // Find the center point of the object

        if (!this.objectLookup.has(obj.uid)) {
            this.objectLookup.set(obj.uid, obj);

            // Add to main block
            const centerPoint: GridPoint = obj.centerPoint();
            const centerBlockIndex: BlockIndex = centerPoint.blockIndex;
            const centerBlock = this.createBlock(centerBlockIndex);
            centerBlock.objects.main.add(obj.uid);
            this.revMainLookup.set(obj.uid, centerBlock.index);

            // Add overlapping

            const overlapping = obj.overlapping();
            this.revOverlapLookup.set(obj.uid, new Set(overlapping));
            for (const index of overlapping) {
                const block = this.createBlock(index);
                block.objects.overlapping.add(obj.uid);
            }
        }
    }
    removeObject(obj: GridObject<D>) {
        const mainBlockIndex = this.revMainLookup.get(obj.uid);
        const overlappingBlockIndexes = this.revOverlapLookup.get(obj.uid);

        const mainBlock = this.blockLookup.get(mainBlockIndex ?? ("" as BlockIndex));
        if (!mainBlockIndex || !overlappingBlockIndexes || !mainBlock) {
            return;
        }

        mainBlock.objects.main.delete(obj.uid);

        for (const index of overlappingBlockIndexes) {
            const overlappingBlock = this.blockLookup.get(index);

            if (!overlappingBlock) {
                throw Error();
            }

            overlappingBlock.objects.overlapping.delete(obj.uid);
            this.removeBlockIfEmpty(overlappingBlock.index);
        }
        this.revMainLookup.delete(obj.uid);
        this.revOverlapLookup.delete(obj.uid);
        this.removeBlockIfEmpty(mainBlock.index);
    }

    removeBlockIfEmpty(blockLocation: BlockAddress | BlockIndex) {
        const block = this.getBlock(blockLocation);
        if (block && block.objects.main.size === 0 && block.objects.overlapping.size === 0) {
            this.blockLookup.delete(block.index);
        }
    }
}
