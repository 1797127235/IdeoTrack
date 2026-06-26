/**
 * yauzl-promise 的本地类型声明。
 * 该库（4.0.0）为 CommonJS 模块，未自带 .d.ts，也无 @types 包，故在此补一份最小可用声明。
 * 仅声明本项目用到的 API：fromBuffer、异步迭代 entry、entry 的异步读取。
 */

declare module 'yauzl-promise' {
  export interface ZipEntry {
    fileName: string;
    uncompressedSize: number;
    /** 异步迭代读取条目内容（Buffer chunk） */
    [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>;
  }

  export interface ZipFile {
    /** 异步迭代 zip 内的每个条目 */
    [Symbol.asyncIterator](): AsyncIterableIterator<ZipEntry>;
    close(): Promise<void>;
  }

  export interface Options {
    lazyEntries?: boolean;
    decodeStrings?: boolean;
    validateEntrySizes?: boolean;
  }

  export function fromBuffer(buffer: Buffer, options?: Options): Promise<ZipFile>;
  export function open(path: string, options?: Options): Promise<ZipFile>;
}
