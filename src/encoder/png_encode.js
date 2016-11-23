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
        var PNG = g.PNG || {};
        PNG.encoder = factory();
        PNG.encode = PNG.encoder.encode;
        PNG.encodeCanvas = PNG.encoder.encodeCanvas;
    }
})(function () {
    "use strict";
    var exports = {};
    var undefined = void 0;

    var defaults = {
        platte: false,
        colors: 256,
        alpha: true,
        level: 9
    };

    var crc_table = Array(256);

    for (var i = 0; i < 256; i++) {
        var c = i;
        for (var j = 0; j < 8; j++) {
            var cr = c & 1;
            c = c >> 1 & 0x7FFFFFFF;
            if (cr) {
                c ^= 0xedb88320;
            }
        }
        crc_table[i] = c;
    }

    function crc32(arr, i, end) {
        var crc = -1;
        for (; i < end; i++) {
            crc = crc_table[crc & 0xFF ^ arr[i]] ^ (crc >> 8 & 0xFFFFFF);
        }
        return ~crc;
    }

    function rgbFilter(options, arr, width, height) {
        if (!options.alpha) {
            var L = arr.length, arr2 = new Uint8Array(L - (L >> 2));
            for (var i = 0, p = 0; i < L; i++) {
                arr2[p++] = arr[i++];
                arr2[p++] = arr[i++];
                arr2[p++] = arr[i++];
            }
            arr = arr2;
        }

        return {
            IHDR: IHDR(width, height, 8, options.alpha ? 6 : 2),
            IDAT: filter(arr, options.alpha ? 4 : 3, 8, width, height).buffer,
            IEND: new ArrayBuffer(0)
        };
    }

    function platteFilter(options, arr, width, height) {
        var bitDepth;
        switch (options.colors) {
            case 2:
                bitDepth = 1;
                break;
            case 4:
                bitDepth = 2;
                break;
            case 16:
                bitDepth = 4;
                break;
            case 256:
                bitDepth = 8;
                break;
            default:
                throw new Error("wrong color count: " + options.colors);
        }
        var k = options.colors, alpha = options.alpha, start = +alpha;

        // 使用kmeans方法进行聚类
        var L = arr.length, N = L >> 2; // rgba
        var groups = new Uint8Array(N), averages = new Float64Array(k << 2);

        // 第一步：找出k个不相同的值
        var keys = {}, found = start;
        var colorArr = new Uint32Array(arr.buffer, arr.byteOffset, N);
        for (var i = 0; i < L; i += 4) {
            if (!arr[i + 3]) {
                if (alpha)
                    continue; // 忽略透明像素
                colorArr[i] = 0xFFFFFFFF;// 透明像素设为白色
            }
            var rgb = colorArr[i >> 2] & 0xFFFFFF;
            if (keys[rgb] === undefined) {
                var m = found++ << 2;
                averages[m] = arr[i];
                averages[m + 1] = arr[i + 1];
                averages[m + 2] = arr[i + 2];
                if (found === k)
                    break;
                keys[rgb] = 1;
            }
        }
        if (found < k) {
            if (found <= 2) {
                k = 2;
                bitDepth = 1;
            } else if (found <= 4) {
                k = 4;
                bitDepth = 2;
            } else if (found <= 16) {
                k = 16;
                bitDepth = 4;
            }
            // console.log('colors found: ' + found + ',k=' + k);
        }

        for (var iterated = 0; iterated < 10; iterated++) {
            // 分组
            var changed = 0;
            var sums = new Uint32Array(found << 2);
            for (var i = 0; i < L; i += 4) {
                // 透明像素, 始终使用颜色#0
                if (!arr[i + 3]) {
                    continue;
                }

                var minDistance = 196608, min = -1;
                var r = arr[i], g = arr[i + 1], b = arr[i + 2];
                for (var j = start; j < found; j++) {
                    var m = j << 2;
                    var dr = r - averages[m], dg = g - averages[m + 1], db = b - averages[m + 2], norm = dr * dr + dg * dg + db
                        * db;
                    if (norm === 0) {
                        minDistance = 0;
                        min = j;
                        break;
                    }
                    if (norm < minDistance) {
                        minDistance = norm;
                        min = j;
                    }
                }
                if (groups[i >> 2] !== min) {
                    changed++;
                    groups[i >> 2] = min;
                }

                // 更新平均值
                var j = min << 2, count = ++sums[j + 3], sumr = sums[j] += r, sumg = sums[j + 1] += g, sumb = sums[j + 2] += b;
                if (minDistance) {
                    averages[j] = sumr / count;
                    averages[j + 1] = sumg / count;
                    averages[j + 2] = sumb / count;
                }

            }
            if (!changed)
                break;
            //console.log('iterated:' + iterated + ',changed:' + changed);
        }
        var round = Math.round;
        var platte = new Uint8Array(found * 3);
        for (var i = 0, j = 0; i < found; i++) {
            var m = i << 2;
            platte[j++] = round(averages[m]);
            platte[j++] = round(averages[m + 1]);
            platte[j++] = round(averages[m + 2]);
        }
        var ret = {
            IHDR: IHDR(width, height, bitDepth, 3),
            PLTE: platte.buffer
        };
        if (alpha) {
            ret.tRNS = new ArrayBuffer(1);
        }

        var arr;
        if (bitDepth === 8) {
            arr = groups;
        } else {
            arr = new Uint8Array(Math.ceil(bitDepth / 8 * width) * height);
            var pos = 0;
            for (var i = width; i <= N; i += width) {
                for (var j = i - width; j < i;) {
                    if (bitDepth === 4) {
                        arr[pos++] = groups[j++] << 4 | groups[j++];
                    } else if (bitDepth === 2) {
                        arr[pos++] = groups[j++] << 6 | groups[j++] << 4 | groups[j++] << 2 | groups[j++];
                    } else {
                        arr[pos++] = groups[j++] << 7 | groups[j++] << 6 | groups[j++] << 5 | groups[j++] << 4
                            | groups[j++] << 3 | groups[j++] << 2 | groups[j++] << 1 | groups[j++];
                    }
                }
            }
        }

        ret.IDAT = filter(arr, 1, bitDepth, width, height).buffer;
        ret.IEND = new ArrayBuffer(0);
        return ret;

    }

    function IHDR(width, height, bitDepth, colorMode) {
        var ret = new ArrayBuffer(13), view = new DataView(ret);
        view.setUint32(0, width);
        view.setUint32(4, height);
        view.setUint8(8, bitDepth);
        view.setUint8(9, colorMode);
        return ret;
    }

    function filter(arr, bytesPerPixel, bitDepth, width, height) {
        var scanlineLen = Math.ceil(bytesPerPixel * bitDepth / 8 * width);
        var filtered = new Uint8Array(height + arr.length);
        var filters = {};
        var buf1 = new Uint8Array(scanlineLen), // sub
            buf2 = new Uint8Array(scanlineLen), // up
            buf3 = new Uint8Array(scanlineLen), // average
            buf4 = new Uint8Array(scanlineLen); // Paeth
        // for first line, use only filter 0/none, 1/sub, 3/average
        {
            var buf0 = arr.subarray(0, scanlineLen);
            buf1.set(buf0);
            buf3.set(buf0);
            for (var i = bytesPerPixel, j = 0; i < scanlineLen; i++, j++) {
                buf1[i] -= arr[j];
                buf3[i] -= arr[j] >> 1;
            }
            var filter = filters[[addFilter(0, buf0), addFilter(1, buf1), addFilter(3, buf3)].sort()[0]];

            filtered[0] = filter[0];
            filtered.set(filter[1], 1);
        }

        for (var start = scanlineLen, m = start + 1; start < arr.length;) {
            var end = start + scanlineLen;
            var buf0 = arr.subarray(start, end);
            var i = 0, j = start;
            for (; i < bytesPerPixel; i++, j++) {
                var val = buf0[i];
                buf1[i] = val;
                buf4[i] = buf2[i] = val - arr[j - scanlineLen];
                buf3[i] = val - (arr[j - scanlineLen] >> 1);
            }
            for (; i < scanlineLen; i++, j++) {
                var val = buf0[i];
                var a = arr[j - bytesPerPixel], b = arr[j - scanlineLen], c = arr[j - bytesPerPixel - scanlineLen];
                buf1[i] = val - a;
                buf2[i] = val - b;
                buf3[i] = val - (a + b >> 1);
                var pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - c - c);
                buf4[i] = val - (pa <= pb ? pa <= pc ? a : c : pb <= pc ? b : c);
            }
            var filter = filters[[addFilter(0, buf0), addFilter(1, buf1), addFilter(2, buf2), addFilter(3, buf3),
                addFilter(4, buf4)].sort()[0]];

            filtered[m] = filter[0];
            filtered.set(filter[1], m + 1);

            start = end;
            m += scanlineLen + 1;
        }
        return filtered;

        function addFilter(filter, arr) {
            var vari = variant(arr);
            filters[vari] = [filter, arr];
            // log('filter:', filter, vari);
            return vari;
        }
    }

    function variant(arr) {
        var sum = 0, sum2 = 0;
        for (var i = 0, N = arr.length; i < N; i++) {
            var xi = arr[i];
            sum += xi;
            sum2 += xi * xi;
        }
        return sum2 - sum * sum / N;
    }

    exports.encode = function encode(arr, width, height, options) {
        // read canvas data
        // init worker
        // log('start', message.data.byteLength, message.width, message.height,
        // message.options);
        options.__proto__ = defaults;

        if (options.alpha) {// auto-detect whether we need alpha channel
            var i = arr.length - 1;
            while (i >= 0 && arr[i] === 255) {
                i -= 4;
            }
            if (i < 0) {
                options.alpha = false;
            }
        }

        var filter = options.platte ? platteFilter : rgbFilter;

        var chunks = filter(options, arr, width, height);

        return zlib.deflate(chunks.IDAT, options.level, true).then(function (buffer) {
            chunks.IDAT = buffer;
            var len = 8;
            var names = Object.keys(chunks);
            names.forEach(function (name) {
                len += chunks[name].byteLength + 12;
            });

            buffer = new ArrayBuffer(len);

            var arr = new Uint8Array(buffer), view = new DataView(buffer);
            view.setUint32(0, 0x89504E47);
            view.setUint32(4, 0x0D0A1A0A);
            var i = 8;
            names.forEach(function (name) {
                var chunk = chunks[name], Len = chunk.byteLength, end = i + 8 + Len;
                view.setUint32(i, Len);
                view.setUint8(i + 4, name.charCodeAt(0));
                view.setUint8(i + 5, name.charCodeAt(1));
                view.setUint8(i + 6, name.charCodeAt(2));
                view.setUint8(i + 7, name.charCodeAt(3));
                var arr2 = new Uint8Array(chunk);
                arr.set(arr2, i + 8);
                view.setUint32(end, crc32(arr, i + 4, end));
                i = end + 4;
            });
            return buffer;
        });
    };
    exports.encodeCanvas = function (canvas, options) {
        var ctx = canvas.getContext('2d');
        return PNG.encode(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, options)
    };

    return exports
});