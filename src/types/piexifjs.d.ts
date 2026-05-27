declare module 'piexifjs' {
  interface IExif {
    '0th'?: Record<number, unknown>
    Exif?: Record<number, unknown>
    GPS?: Record<number, unknown>
    Interop?: Record<number, unknown>
    '1st'?: Record<number, unknown>
    thumbnail?: string
  }

  const piexif: {
    load(data: string): IExif
    dump(exif: IExif): string
    insert(exifStr: string, jpegData: string): string
    remove(jpegData: string): string
    TAGS: Record<string, unknown>
    ImageIFD: Record<string, number>
    ExifIFD: Record<string, number>
    GPSIFD: Record<string, number>
    InteropIFD: Record<string, number>
    GPSHelper: {
      degToDmsRational(degFloat: number): [[number, number], [number, number], [number, number]]
      dmsRationalToDeg(dmsArray: unknown, ref: string): number
    }
  }

  export = piexif
}
