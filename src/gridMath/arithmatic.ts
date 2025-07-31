/**
 * Takes the integer square root of a bigint.
 *
 */
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

/**
 * Big Integer divisoin that takes the true floor in the case of negative numbers.
 *
 * e.g., JS built in bigint division gives  -7n / 2n = -3n
 * It simply chops off the fractional part but this is not the floor since -3n is higher than the fractional answer -3.5.
 * This function returns -4n for this example.
 *
 */
export function divFloor(n: bigint, d: bigint): bigint {
    if (d === 0n) throw new RangeError("division by zero");

    const q = n / d; // truncate-toward-0
    const r = n % d; // remainder (same sign as n)

    const nNeg = n < 0n;
    const dNeg = d < 0n;
    const condition = r !== 0n && nNeg !== dNeg; // there is a remainder and n and d have different signs.

    return condition ? q - 1n : q;
}
