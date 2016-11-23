(function (factory) {
    var g;
    if (typeof window !== "undefined") {
        g = window
    } else if (typeof global !== "undefined") {
        g = global
    } else if (typeof self !== "undefined") {
        g = self
    } else {
        g = this
    }
    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = factory()
    } else if (typeof define === "function" && define.amd) {
        define([], factory)
    } else {
        g.PNG = factory()
    }
})(function () {
    var exports = {};
    exports.decode = decode;
    /**
     * @param {ArrayBuffer|Uint8Array} arr
     * @returns {Promise.<PNG>}
     */
    function decode(arr) {
        try {
            var png = new PNGImage(new Uint8Array(arr));
            return png._deferred;
        } catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     *
     * @param {ArrayBuffer|Uint8Array} arr
     * @constructor
     */
    function PNGImage(arr) {
        var data = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
        if (data.getUint32(0) != 0x89504E47 || data.getUint32(4) != 0x0D0A1A0A)
            throw new Error("wrong PNG magic");
        this.datas = [];
        this.datas.bytes = 0;
        // parse chunks
        for (var i = 8, L = data.byteLength; i < L;) {
            var length = data.getUint32(i), name = String.fromCharCode.apply(null, arr.subarray(i + 4, i + 8)).toLowerCase();
            name in chunks && chunks[name](this, data, i + 8, length);
            // TODO: CRC validation
            i += length + 12;
            // 12 = 4(chunk length) + 4(chunk name) + 4(CRC checksum)
        }
    }

    PNGImage.prototype.renderTo = function (canvas) {
        var ctx = canvas.getContext('2d');
        var w = canvas.width = this.width, h = canvas.height = this.height;
        var imgData = ctx.createImageData ? ctx.createImageData(w, h) : ctx.getImageData(0, 0, w, h), data = imgData.data;
        if (data.set) {// Uint8ClampedArray
            data.set(this.data);
        } else {// CanvasPixelArray
            var src = this.data, L = src.length;
            while (L--) {
                data[L] = src[L];
            }
        }
        ctx.putImageData(imgData, 0, 0);
    };

    var getBuffer = typeof fetch === 'function' ? function (url) {
        return fetch(url, {credentials: 'include'}).then(function (resp) {
            if (!resp.ok) throw new Error('E' + resp.status);
            return resp.arrayBuffer()
        })
    } : typeof Buffer === 'function' ? function (pathname) {
        return new Promise(function (resolve, reject) {
            require('fs').readFile(pathname, function (err, buf) {
                err ? reject(err) : resolve(buf)
            })
        })
    } : function (url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    resolve(xhr.response)
                }
            };
            xhr.send();
            xhr.onerror = reject;
        });
    };


    exports.load = function (url) {
        return getBuffer(url).then(decode);
    };


    var colorModes = {
        grayscale: function (png, pixels) {// grayscale
            // TODO
        },
        rgb: function (png, pixels) {// RGB
            var L, decoded = png.data = new Uint8Array(L = png.width * png.height << 2);
            for (var i = 0, p = 0; i < L;) {
                decoded[i++] = pixels[p++];
                decoded[i++] = pixels[p++];
                decoded[i++] = pixels[p++];
                decoded[i++] = 255;
            }
        },
        platte: function (png, pixels, scanlineLen) {// platte
            var colors = png.colors, bitDepth;
            var decoded = new Uint32Array((png.data = new Uint8Array(png.width * png.height << 2)).buffer);
            if ((bitDepth = png.bitDepth) == 8) {
                for (var i = 0, L = pixels.length; i < L; i++) {
                    decoded[i] = colors[pixels[i]];
                }
            } else {
                var color0 = colors[0], color1 = colors[1], width = png.width, height = png.height, p = 0;
                for (var j = 0, d = 0; j < height; j++, d = j * width) {
                    for (var i = 0; i < scanlineLen; i++) {
                        var pixel = pixels[p++];
                        switch (bitDepth) {
                            case 1:
                                decoded[d++] = pixel & 128 ? color1 : color0;
                                decoded[d++] = pixel & 64 ? color1 : color0;
                                decoded[d++] = pixel & 32 ? color1 : color0;
                                decoded[d++] = pixel & 16 ? color1 : color0;
                                decoded[d++] = pixel & 8 ? color1 : color0;
                                decoded[d++] = pixel & 4 ? color1 : color0;
                                decoded[d++] = pixel & 2 ? color1 : color0;
                                decoded[d++] = pixel & 1 ? color1 : color0;
                                break;
                            case 2:
                                decoded[d++] = colors[pixel >> 6 & 3];
                                decoded[d++] = colors[pixel >> 4 & 3];
                                decoded[d++] = colors[pixel >> 2 & 3];
                                decoded[d++] = colors[pixel & 3];
                                break;
                            case 4:
                                decoded[d++] = colors[pixel >> 4 & 15];
                                decoded[d++] = colors[pixel & 15];
                                break;
                        }
                    }
                }

            }
        },
        grayscale_alpha: function (png, pixels) {// grayscale + alpha
            // TODO
        },
        rgba: function (png, pixels, scanlineLen) {// RGB + alpha
            if (png.bitDepth == 16) {
                // TODO: 16 bit colors
            } else {
                png.data = pixels;
            }
        }
    };
    var colorChannels = {
        grayscale: 1,
        rgb: 3,
        platte: 1,
        grayscale_alpha: 2,
        rgba: 4
    };
    var chunks = {
        ihdr: function (png, data, i, length) { // image header
            png.width = data.getUint32(i);
            png.height = data.getUint32(i + 4);
            png.bitDepth = data.getUint8(i + 8);
            png.colorMode = ['grayscale', , 'rgb', 'platte', 'grayscale_alpha', , 'rgba'][data.getUint8(i + 9)];
        },
        text: function (png, data, length) {
            data = new Uint8Array(data.buffer, data.byteOffset, length);
            var idx = Array.prototype.indexOf.call(data, 0);
            (png.text || (png.text = {}))[String.fromCharCode.apply(null, data.subarray(0, idx))] = String.fromCharCode.apply(
                null, data.subarray(idx + 1));
        },
        plte: function (png, data, i, length) { // platte
            var colors = png.colors = new Uint32Array(length /= 3);
            for (var j = 0; j < length; i += 3, j++) {
                colors[j] = data.getUint32(i, true) | 0xFF000000; // 0xAABBGGRR
            }
        },
        trns: function (png, data, i, length) { // transparence information
            var colors = png.colors;
            for (var j = 0; j < length; i++, j++) {
                colors[j] ^= ~data.getUint8(i) << 24;
            }
        },
        idat: function (png, data, i, length) {
            png.datas.push(new Uint8Array(data.buffer, i, length));
            png.datas.bytes += length;
        },
        iend: function (png) { // end
            // Step.1 Join all data chunks together
            var arr = png.datas, buffer, offset;
            if (arr.length === 1) {
                buffer = arr[0].buffer;
                offset = arr[0].byteOffset;
            } else {
                var data = new Uint8Array(arr.bytes);
                for (var i = 0, z = 0, L = arr.length; i < L; i++) {
                    data.set(arr[i], z);
                    z += arr[i].byteLength;
                }
                buffer = data.buffer;
                offset = 0;
            }
            png.datas = null;
            // Step.2 Decode data
            png._deferred = zlib.inflate(buffer, false, offset).then(function (buffer) {
                var data = new Uint8Array(buffer);

                // Step.3 Unfilter data
                var bytesPerPixel, scanlineLen = Math.ceil((bytesPerPixel = png.bitDepth / 8 * colorChannels[png.colorMode])
                    * png.width);
                bytesPerPixel = Math.ceil(bytesPerPixel);
                var pixels = new Uint8Array(scanlineLen * png.height);
                for (var i = 0, p = 0, L = pixels.length; p < L;) {
                    // console.log(i / (scanlineLen + 1), data[i]);
                    var start = i + bytesPerPixel + 1, end = i + scanlineLen + 1;
                    switch (data[i++]) {
                        case 2: // Up
                            if (p) {
                                for (; i < end; i++, p++) {
                                    pixels[p] = data[i] + (pixels[p - scanlineLen] | 0);
                                }
                                break;
                            }
                        // console.log('found up at first line');
                        case 0: // None
                            pixels.set(new Uint8Array(buffer, i, scanlineLen), p);
                            p += scanlineLen;
                            i = end;
                            break;
                        case 3:// Average
                            if (p) {
                                for (; i < start; i++, p++) {
                                    pixels[p] = data[i] + (pixels[p - scanlineLen] >> 1);
                                }
                                for (; i < end; i++, p++) {
                                    pixels[p] = data[i] + (pixels[p - bytesPerPixel] + pixels[p - scanlineLen] >> 1);
                                }
                            } else {
                                while (i < start)
                                    pixels[p++] = data[i++];
                                for (; i < end; i++, p++) {
                                    pixels[p] = data[i] + (pixels[p - bytesPerPixel] >> 1);
                                }
                            }
                            break;
                        case 4: // Paeth
                            if (p) {
                                for (; i < start; i++, p++) {
                                    pixels[p] = data[i] + pixels[p - scanlineLen];
                                }
                                for (; i < end; i++, p++) {
                                    var a = pixels[p - bytesPerPixel], b = pixels[p - scanlineLen], c = pixels[p - bytesPerPixel
                                    - scanlineLen], pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - c - c);

                                    pixels[p] = data[i] + (pa <= pb ? pa <= pc ? a : c : pb <= pc ? b : c);
                                }
                                break;
                            }
                        // console.log('found paeth at first line');
                        case 1: // Sub
                            while (i < start)
                                pixels[p++] = data[i++];
                            for (; i < end; i++, p++) {
                                pixels[p] = data[i] + pixels[p - bytesPerPixel];
                            }
                            break;
                        default:
                            throw new Error('bad filter type: ' + i);
                    }
                }
                colorModes[png.colorMode](png, pixels, scanlineLen);
                return png
            });
        }
    };
    return exports;
});