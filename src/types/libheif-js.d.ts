declare module 'libheif-js' {
  interface HeifDisplayImage {
    data: Uint8Array;
    width: number;
    height: number;
  }
  interface HeifImage {
    display(callback: (image: HeifDisplayImage) => void): void;
    get_width(): number;
    get_height(): number;
    is_primary(): boolean;
    free(): void;
  }
  export class HeifDecoder {
    decode(data: Uint8Array): HeifImage[];
  }
  const _default: { HeifDecoder: typeof HeifDecoder };
  export default _default;
}