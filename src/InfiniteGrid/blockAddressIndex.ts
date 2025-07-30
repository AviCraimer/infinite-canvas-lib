export type BlockAddress = [x: bigint, y: bigint, z: bigint];

const SEPARATOR = ",";

export type BlockIndex = string & { __blockIndex__: true };

export function addressToIndex(address: BlockAddress) {
    return address.join(SEPARATOR) as BlockIndex;
}

export function indexToAddress(index: string): BlockAddress {
    const parts = index.split(SEPARATOR);
    if (parts.length === 3) {
        return [BigInt(parts[0]), BigInt(parts[1]), BigInt(parts[2])];
    } else {
        throw new Error(`index "${index}" does not split into three parts.`);
    }
}
