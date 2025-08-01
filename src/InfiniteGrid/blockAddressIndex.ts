export type BlockAddress = [x: bigint, y: bigint, z: bigint];

export const blockAddress = (x: number | string | bigint, y: number | string | bigint, z: number | string | bigint): BlockAddress => {
    return [BigInt(x), BigInt(y), BigInt(z)];
};

const SEPARATOR = ",";

export type BlockIndex = string & { __blockIndex__: true };

export function addressToIndex(address: BlockAddress) {
    return address.join(SEPARATOR) as BlockIndex;
}

export function indexToAddress(index: string): BlockAddress {
    const parts = index.split(SEPARATOR);
    if (parts.length === 3) {
        // Note, the BigInt constructor will throw an error if the string does not parse to a bigint value
        return blockAddress(...(parts as [string, string, string]));
    } else {
        throw new Error(`index "${index}" does not split into three parts.`);
    }
}

export function forEachBlock(min_: BlockAddress | BlockIndex, max_: BlockAddress | BlockIndex, fn: (addr: BlockAddress) => void) {
    const min = Array.isArray(min_) ? min_ : indexToAddress(min_);
    const max = Array.isArray(max_) ? max_ : indexToAddress(max_);

    for (let x = min[0]; x <= max[0]; x++) {
        for (let y = min[1]; y <= max[1]; y++) {
            for (let z = min[2]; z <= max[2]; z++) fn([x, y, z]);
        }
    }
}
