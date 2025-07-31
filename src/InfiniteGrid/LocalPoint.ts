// IGridPoint.ts

export type LocalValue = number & { __GridLocalValue__: true };
// A local value is a floating point number in the interval [0,1), not including the value 1.0.
export const isLocalValue = (val: unknown): val is LocalValue => {
    return typeof val === "number" && val >= 0 && val < 1;
};

export const localValue = (num: number): LocalValue => {
    if (isLocalValue(num)) {
        return num;
    } else {
        throw Error(`The value ${num} is not a valid local value.`);
    }
};

export type LocalPoint = [x: LocalValue, y: LocalValue, z: LocalValue];

export const isLocalPoint = (value: number[]): value is LocalPoint => {
    if (Array.isArray(value) && value.length === 3 && value.every(isLocalValue)) {
        return true;
    } else {
        return false;
    }
};

export const localPoint = (point: [number, number, number]): LocalPoint => {
    if (isLocalPoint(point)) {
        return point;
    } else {
        throw Error(`The array: ${point} is not a valid local point.`);
    }
};
