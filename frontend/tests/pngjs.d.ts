/**
 * Just enough of `pngjs` to decode a screenshot in a test.
 *
 * WRITTEN HERE RATHER THAN INSTALLED. `@types/pngjs` would be a third package
 * added to describe two methods used in one spec file, and the house rule is
 * not to add a package for something this small. `pngjs` itself is already
 * present -- it comes in with the toolchain -- so this only supplies the shape
 * TypeScript is missing.
 *
 * Deliberately narrow: `sync.read` is what the QR spec uses, and anything
 * broader would be a guess at an API nothing here calls.
 */
declare module "pngjs" {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    static sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG): Buffer;
    };
  }
}
