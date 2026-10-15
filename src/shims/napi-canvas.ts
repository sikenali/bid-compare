function unavailable(): never {
  throw new Error('@napi-rs/canvas is not available in the browser');
}

export const createCanvas = unavailable as unknown as (w: number, h: number) => never;
export const loadImage = unavailable as unknown as (...args: unknown[]) => never;
export default { createCanvas, loadImage };