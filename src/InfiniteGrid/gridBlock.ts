import { BlockIndex } from "./blockAddressIndex";

export type Block = {
    index: BlockIndex; // A unique identifier
    objects: {
        main: Set<string>; // A set of object ids with center points in the block
        overlapping: Set<string>; // a set of object ids with centerpoints in another block.
    };
};
