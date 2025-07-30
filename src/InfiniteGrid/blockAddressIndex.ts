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
