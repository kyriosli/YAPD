/*
 * Yet Another PNG Decoder.
 * 
 * This program reads a PNG file from an ArrayBuffer and converts it into Uint8Array data.
 * 
 * Supperted features:
 * <ul>
 * <li>1 - 256 colors PNG-8(platte mode)</li>
 * <li>8-bit 4-channels PNG-24(RGBA)</li>
 * <li>PNG-8 with transparency</li>
 * </ul>
 */

~function(exports, DataView, Uint8Array) {
	var PNG = exports.PNG = function PNG(buffer) {
		var data = new DataView(buffer);
		if (data.getUint32(0) != 0x89504E47 || data.getUint32(4) != 0x0D0A1A0A)
			throw "wrong PNG magic";
		for ( var i = 8, L = buffer.byteLength; i < L;) {
			var length = data.getUint32(i), name = String.fromCharCode.apply(null, new Uint8Array(buffer, i + 4, 4)).toLowerCase();
			// console.log(name, length);
			name in chunks && chunks[name](this, data, i + 8, length);
			// TODO: CRC validation
			i += length + 12;
			// 12 = 4(chunk length) + 4(chunk name) + 4(CRC checksum)
		}
	};
	PNG.prototype = {
		constructor : PNG,
		renderTo : function(canvas) {
			var ctx = canvas.getContext('2d');
			var w = canvas.width = this.width, h = canvas.height = this.height;
			var imgData = ctx.createImageData ? ctx.createImageData(w, h) : ctx.getImageData(0, 0, w, h), data = imgData.data;
			if (data.set) {// Uint8ClampedArray
				data.set(this.data);
			} else {// CanvasPixelArray
				for ( var src = this.data, i = 0, L = src.length; i < L; i++) {
					data[i] = src[i];
				}
			}
			ctx.putImageData(imgData, 0, 0);
		},
		toCanvas : function() {
			var ret;
			this.renderTo(ret = document.createElement('canvas'));
			return ret;
		}
	};
	PNG.load = function(url, callback) {
		var xhr = new XMLHttpRequest();
		xhr.responseType = "arraybuffer";
		xhr.open("GET", url, true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				var err, png;
				try {
					png = new PNG(xhr.response);
				} catch (e) {
					err = e;
				}
				callback(err, png);
			}
		};
		xhr.send();
	};

	var colorModes = [ function(png, pixels) {// grayscale
		// TODO
	}, , function(png, pixels) {// RGB
		// TODO
	}, function(png, pixels, scanlineLen) {// platte
		var colors = png.colors, bitDepth;
		var decoded = new Uint32Array((png.data = new Uint8Array(png.width * png.height * 4)).buffer);
		if ((bitDepth = png.bitDepth) == 8) {
			for ( var i = 0, L = pixels.length; i < L; i++) {
				decoded[i] = colors[pixels[i]];
			}
		} else {
			var color0 = colors[0], color1 = colors[1], width = png.width, height = png.height, p = 0;
			for ( var j = 0, d = 0; j < height; j++, d = j * width) {
				for ( var i = 0; i < scanlineLen; i++) {
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
	}, function(png, pixels) {// grayscale + alpha
		// TODO
	}, , function(png, pixels, scanlineLen) {// RGB + alpha
		if (png.bitDepth == 16) {
			// TODO: 16 bit colors
		} else {
			png.data = pixels;
		}
	} ];
	var colorChannels = [ 1, , 3, 1, 2, , 4 ];
	var chunks = {
		ihdr : function(png, data, i, length) { // image header
			png.width = data.getUint32(i);
			png.height = data.getUint32(i + 4);
			png.bitDepth = data.getUint8(i + 8);
			png.colorMode = data.getUint8(i + 9);
			// 0: grayscale
			// 2: RGB
			// 3: platte
			// 4: grayscale + alpha
			// 6: RGB + alpha
		},
		/*
		 * text : function(png, data, length) { data = new
		 * Uint8Array(data.buffer, data.byteOffset, length); var idx =
		 * Array.prototype.indexOf.call(data, 0); (png.text || (png.text =
		 * {}))[String.fromCharCode.apply(null, data.subarray(0, idx))] =
		 * String.fromCharCode.apply(null, data.subarray(idx + 1)); },
		 */
		plte : function(png, data, i, length) { // platte
			var colors = png.colors = new Uint32Array(length /= 3);
			for ( var j = 0; j < length; i += 3, j++) {
				colors[j] = data.getUint32(i, true) | 0xFF000000; // 0xAABBGGRR
			}
		},
		trns : function(png, data, i, length) { // transparence information
			var colors = png.colors;
			for ( var j = 0; j < length; i++, j++) {
				colors[j] ^= ~data.getUint8(i) << 24;
			}
		},
		idat : function(png, data, i, length) {
			(png.datas || (png.datas = [])).push(new Uint8Array(data.buffer, i, length));
			png.dataLen = (png.dataLen || 0) + length;
		},
		iend : function(png) { // end
			var data, L;
			// Step.1 Join all data chunks together
			if ((L = png.datas.length) === 1)
				data = png.datas[0];
			else {
				data = new Uint8Array(png.dataLen);
				for ( var i = 0, z = 0; i < L; i++) {
					var datai;
					data.set(datai = png.datas[i], z);
					z += datai.byteLength;
				}
			}

			// Step.2 Decode data
			data = new FlateStream(data).getBytes();

			// Step.3 Unfilter data
			var buffer = data.buffer;
			var bytesPerPixel, scanlineLen = Math.ceil((bytesPerPixel = png.bitDepth / 8 * colorChannels[png.colorMode]) * png.width);
			bytesPerPixel = Math.ceil(bytesPerPixel);
			var pixels = new Uint8Array(scanlineLen * png.height), p = 0;
			for ( var i = 0, L = data.length; i < L;) {
				var start = i + bytesPerPixel + 1, end = i + scanlineLen + 1;
				switch (data[i++]) {
				case 0: // None
					pixels.set(new Uint8Array(buffer, i, scanlineLen), p);
					p += scanlineLen;
					i = end;
					break;
				case 1: // Sub
					while (i < start)
						pixels[p++] = data[i++];
					for (; i < end; i++, p++) {
						pixels[p] = data[i] + pixels[p - bytesPerPixel];
					}
					break;
				case 2: // Up
					for (; i < end; i++, p++) {
						pixels[p] = data[i] + pixels[p - scanlineLen];
					}
					break;
				case 3:// Average
					for (; i < start; i++, p++) {
						pixels[p] = data[i] + (pixels[p - scanlineLen] >> 1);
					}
					for (; i < end; i++, p++) {
						pixels[p] = data[i] + (pixels[p - bytesPerPixel] + pixels[p - scanlineLen] >> 1);
					}
					break;
				case 4: // Paeth
					for (; i < start; i++, p++) {
						pixels[p] = data[i] + pixels[p - scanlineLen];
					}
					for (; i < end; i++, p++) {
						var a = pixels[p - bytesPerPixel], b = pixels[p - scanlineLen], c = pixels[p - bytesPerPixel - scanlineLen], pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math
							.abs(a + b - c - c);

						pixels[p] = data[i] + (pa <= pb ? pa <= pc ? a : c : pb <= pc ? b : c);
					}
					break;
				}
			}
			colorModes[png.colorMode](png, pixels, scanlineLen);
		}
	};

}(this, DataView, Uint8Array);