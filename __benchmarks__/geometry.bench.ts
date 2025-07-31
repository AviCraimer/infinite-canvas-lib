// __benchmarks__/midpoint1D.bench.ts
import { bench } from "vitest";
import { midpoint1D } from "../src/gridMath/geometry";
import { Big, RoundingMode } from "bigdecimal.js";

const t1 = 1234567890124234523452345234526453613452345234523423423423423425643452345523345234523453452323456789n;
const t2 = -9876543210982345234522345234523452345234523452345352242342342342343465234523452345234523345234765432n;
const f1 = 0.1234567890123;
const f2 = 0.9876543210987;

/* our implementation */
bench("midpoint1D (ours)", () => {
    midpoint1D(t1, f1, t2, f2);
});

bench("midpoint1D -- reference using BigDecimal.js", () => {
    Big(t1)
        .add(Big(f1))
        .add(Big(t2).add(Big(f2)))
        .divide(Big(2), 200, RoundingMode.DOWN);
});
