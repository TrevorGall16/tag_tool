declare module "piexifjs" {
  interface ExifDict {
    "0th": Record<number, unknown>;
    Exif: Record<number, unknown>;
    GPS: Record<number, unknown>;
    Interop: Record<number, unknown>;
    "1st": Record<number, unknown>;
    thumbnail: null | string;
  }

  /**
   * Load EXIF data from a base64-encoded JPEG data URL
   */
  function load(dataUrl: string): ExifDict;

  /**
   * Dump EXIF data to binary string
   */
  function dump(exifDict: ExifDict): string;

  /**
   * Insert EXIF data into a base64-encoded JPEG data URL
   */
  function insert(exifBytes: string, dataUrl: string): string;

  /**
   * Remove EXIF data from a base64-encoded JPEG data URL
   */
  function remove(dataUrl: string): string;

  export { load, dump, insert, remove, ExifDict };
  export default { load, dump, insert, remove };
}
