declare module "compressjs" {
  const compressjs: {
    Bzip2: {
      compressFile(data: Uint8Array | Buffer): Uint8Array;
      decompressFile(data: Uint8Array | Buffer): Uint8Array;
    };
  };
  export default compressjs;
}

declare module "lzma" {
  class LZMA {
    compress(
      data: string | Buffer | Uint8Array,
      mode: number,
      callback: (result: number[] | undefined, error?: Error) => void,
    ): void;
    decompress(
      byteArray: number[],
      callback: (result: string | number[] | undefined, error?: Error) => void,
    ): void;
  }
  const _default: { LZMA: typeof LZMA };
  export default _default;
}

declare module "zstd-codec" {
  export interface ZstdSimple {
    compress(data: Uint8Array): Uint8Array;
    decompress(data: Uint8Array): Uint8Array;
  }
  export interface ZstdInstance {
    Simple: new () => ZstdSimple;
  }
  export const ZstdCodec: {
    run(callback: (zstd: ZstdInstance) => void): void;
  };
}

declare module "lz4js" {
  export function compress(data: Uint8Array): Uint8Array;
  export function decompress(data: Uint8Array): Uint8Array;
}

declare module "snappyjs" {
  export function compress(data: Uint8Array | Buffer): Uint8Array;
  export function uncompress(data: Uint8Array | Buffer): Uint8Array;
}
