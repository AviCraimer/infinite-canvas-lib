export function intSquareRoot(n: bigint): bigint {
    if (n < 0n) throw new Error("negative");
    if (n < 2n) return n;
    let x = 1n << (BigInt(n.toString(2).length + 1) >> 1n); // initial power of two
    while (true) {
        const y = (x + n / x) >> 1n;
        if (y >= x) return x;
        x = y;
    }
}
