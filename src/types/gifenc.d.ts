declare module 'gifenc' {
  interface GIFEncoderInstance {
    writeFrame(
      indices: number[],
      width: number,
      height: number,
      opts?: {
        palette?: number[][];
        delay?: number;
        repeat?: number;
        transparent?: boolean;
        transparentIndex?: number;
        dispose?: number;
        first?: boolean;
      },
    ): void;
    bytes(): Uint8Array;
    finish(): void;
    reset(): void;
  }
  export function GIFEncoder(): GIFEncoderInstance;
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, opts?: Record<string, unknown>): number[][];
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string): number[];
  export function prequantize(rgba: Uint8Array | Uint8ClampedArray, opts?: Record<string, unknown>): void;
  const _default: { GIFEncoder: typeof GIFEncoder; quantize: typeof quantize; applyPalette: typeof applyPalette };
  export default _default;
}