declare module 'libheif-js' {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(data: ImageData, callback: (result: ImageData | null) => void): void;
  }
  class HeifDecoder {
    decode(data: Uint8Array): HeifImage[];
  }
  const libheif: {
    HeifDecoder: typeof HeifDecoder;
  };
  export default libheif;
  export { HeifDecoder };
}
