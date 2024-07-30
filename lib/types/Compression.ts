
import zlib from "zlib";
import { Stream } from "stream";
import { KyofuucObject } from "../helper";
import { UnregisteredCompressionTypeError } from "../exception/UnregisteredCompressionTypeError";


export const CompressionType = {

    GZIP: "gzip",
    UNZIP: "unzip",
    BROTLI: "brotli",
    GUNZIP: "gunzip",
    INFLATE: "inflate",
    DEFLATE: "deflate",
    COMPRESS: "compress",

}

export type Flow = "compress" | "decompress";
export type CompressionTransformer = () => Stream;

export function gzipCompressionTransformer() {
    return zlib.createGzip();
}

export function inflateCompressionTransformer() {
    return zlib.createInflate();
}

export function deflateCompressionTransformer() {
    return zlib.createUnzip();
}

export function gunzipCompressionTransformer() {
    return zlib.createGunzip();
}

export function brotliCompressionTransformer() {
    return zlib.createBrotliCompress();
}

export function brotliDecompressionTransformer() {
    return zlib.createBrotliDecompress();
}

export const CompressionProcessor = {

    _RegisteredCompressTransformers: {} as KyofuucObject<CompressionTransformer>,
    _RegisteredDecompressTransformers: {} as KyofuucObject<CompressionTransformer>,

    register(type: string, flow: Flow, transformer: CompressionTransformer) {
        type = type.toUpperCase();
        if (flow === "compress") {
            CompressionProcessor._RegisteredCompressTransformers[type] = transformer;
            return;
        }
        CompressionProcessor._RegisteredDecompressTransformers[type.toUpperCase()] = transformer;
    },

    unregister(type: string, flow: Flow) {
        type = type.toUpperCase();
        if (flow === "compress") {
            if (!(type in CompressionProcessor._RegisteredCompressTransformers)) return;
            delete CompressionProcessor._RegisteredCompressTransformers[type];
            return;
        }
        if (!(type in CompressionProcessor._RegisteredDecompressTransformers)) return;
        delete CompressionProcessor._RegisteredDecompressTransformers[type];
    },

    transform(type: string, flow: Flow) {
        type = type.toUpperCase();
        if (flow === "compress") {
            if (!(type in CompressionProcessor._RegisteredCompressTransformers)) {
                throw new UnregisteredCompressionTypeError(type, flow);
            }
            return CompressionProcessor._RegisteredCompressTransformers[type]();
        }
        if (!(type in CompressionProcessor._RegisteredDecompressTransformers)) {
            throw new UnregisteredCompressionTypeError(type, flow);
        }
        return CompressionProcessor._RegisteredDecompressTransformers[type]();
    },

}

let _defaultCompressionTransformerRegistered = false;
if (!_defaultCompressionTransformerRegistered) {
    _defaultCompressionTransformerRegistered = true;
    CompressionProcessor.register(CompressionType.GZIP, "compress", gzipCompressionTransformer);
    CompressionProcessor.register(CompressionType.GUNZIP, "compress", gunzipCompressionTransformer);
    CompressionProcessor.register(CompressionType.BROTLI, "compress", brotliCompressionTransformer);
    CompressionProcessor.register(CompressionType.INFLATE, "compress", inflateCompressionTransformer);
    CompressionProcessor.register(CompressionType.COMPRESS, "compress", inflateCompressionTransformer);

    CompressionProcessor.register(CompressionType.UNZIP, "decompress", deflateCompressionTransformer);
    CompressionProcessor.register(CompressionType.DEFLATE, "decompress", deflateCompressionTransformer);
    CompressionProcessor.register(CompressionType.BROTLI, "decompress", brotliDecompressionTransformer);
}
