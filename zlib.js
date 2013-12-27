var zlib = function(Worker, fromCharCode) {
	"use strict";
	var osList = [ "FAT", "Amiga", "VMS", "Unix", "VM/CMS", "Atari TOS", "HPFS", "Macintosh", "Z-System", "CP/M", "TOPS-20",
		"NTFS", "QDOS", "Acorn RISCOS" ];

	var jsPath = (jsPath = (jsPath = document.getElementsByTagName('script'))[jsPath.length - 1].src).substr(0, jsPath
		.lastIndexOf('/') + 1);

	var crc_table = Array(256);

	for ( var i = 0; i < 256; i++) {
		var c = i;
		for ( var j = 0; j < 8; j++) {
			var cr = c & 1;
			c = c >> 1 & 0x7FFFFFFF;
			if (cr) {
				c ^= 0xedb88320;
			}
		}
		crc_table[i] = c;
	}

	var zlib = {
		crc32 : function crc32(buffer, i, end, crc) {
			for (; i < end; i++) {
				crc = crc_table[crc & 0xFF ^ buffer[i]] ^ (crc >> 8 & 0xFFFFFF);
			}
			return crc;
		},
		utf8_encode : function(str) {
			var buffer = new DataView(new ArrayBuffer(str.length * 3 + 1)), length = 0;
			for ( var i = 0; i < str.length; i++) {
				var char = str.charCodeAt(i);
				if (char < 0x80) {
					buffer.setUint8(length++, char);
				} else if (char < 0x800) {
					buffer.setUint16(length, 0xC080 | (char & 0x7C0) << 2 | char & 0x3F);
					length += 2;
				} else {
					buffer.setUint32(length, (0xE08080 | (char & 0xF000) << 4 | (char & 0xFC0) << 2 | char & 0x3F) << 8);
					length += 3;
				}
			}
			return buffer.buffer.slice(0, length);
		},
		utf8_decode : function utf8_decode(buffer) {
			var str = '', array = new Uint8Array(buffer);
			for ( var idx = 0, len = array.length; idx < len;) {
				var ch = array[idx++];
				if (ch > 0x7F) {
					if (ch > 0xDF) {// 1110 xxxx; 10xx xxxx; 10xx xxxx
						ch = (ch & 0xF) << 12 | (array[idx++] & 0x3F) << 6 | array[idx++] & 0x3F;
					} else { // 110x xxxx; 10xx xxxx
						ch = (ch & 0x1F) << 6 | array[idx++] & 0x3F;
					}
				}// 0xxx xxxx
				str += fromCharCode(ch);
			}
			return str;
		},
		deflate : function() {
			var jobs = {}, getWorker = function() {
				var worker = new Worker(jsPath + 'deflate.js');
				worker.addEventListener('message', function(e) {
					var ret = e.data, id = ret.id, cb = jobs[id];
					delete jobs[id];
					cb(ret.buffer);
				});
				getWorker = function() {
					return worker;
				};
				return worker;
			};
			return function(buffer, level, cb) {
				var id = uuid();
				jobs[id] = cb;
				getWorker().postMessage({
					id : id,
					buffer : buffer,
					level : level
				}, [ buffer ]);
			};
		}(),
		inflate : function() {
			var jobs = {}, getWorker = function() {
				var worker = new Worker(jsPath + 'inflate.js');
				worker.addEventListener('message', function(e) {
					var ret = e.data, id = ret.id, cb = jobs[id];
					delete jobs[id];
					cb(ret.buffer);
				});
				getWorker = function() {
					return worker;
				};
				return worker;
			};
			return function(buffer, headless, cb, currPos) {
				var id = uuid();
				jobs[id] = cb;
				getWorker().postMessage({
					id : id,
					buffer : buffer,
					headless : headless,
					offset : currPos || 0
				}, [ buffer ]);
			};
		}(),
		gzip : function(buffer, level, cb) {
			var originLen = buffer.byteLength, crc = zlib.crc32(buffer);
			zlib.deflate(buffer, level, function(buffer) {
				var byteLength = buffer.byteLength;
				var ret = new ArrayBuffer(byteLength + 18);// TODO
				var view = new DataView(ret);
				view.setUint32(0, 0x1F8B0800);
				view.setUint32(4, Date.now() / 1000, true);
				view.setUint16(8, 0x00FF);
				new Uint8Array(ret).set(new Uint8Array(buffer), 10);
				view.setUint32(byteLength + 10, crc);// TODO: crc32
				view.setUint32(byteLength + 14, originLen, true);
				cb(ret);
			});
		},
		gunzip : function(buffer, cb) {
			var data = new DataView(buffer);
			if ((data.getUint32(0) | 31) != 0x1F8B081F)
				throw "wrong gzip magic";
			var flags = data.getUint8(3);
			var ret = {
				mtime : new Date(data.getUint32(4, true) * 1000),
				os : osList[data.getUint8(9)]
			};
			var currPos = 10;
			if (flags & 4) {// extra
				var extraLen = data.getUint16(10);
				// TODO: read extra info
				currPos += extraLen + 2;
			}
			if (flags & 8) {// fileName
				var idx = Array.prototype.indexOf.call(new Uint8Array(buffer, currPos), 0);
				ret.fileName = fromCharCode.apply(null, new Uint8Array(buffer, currPos, idx));
				currPos += idx + 1;
			}
			if (flags & 16) { // comment
				var idx = Array.prototype.indexOf.call(new Uint8Array(buffer, currPos), 0);
				ret.comment = fromCharCode.apply(null, new Uint8Array(buffer, currPos, idx));
				currPos += idx + 1;
			}
			if (flags & 2) {
				// TODO: header CRC16
				currPos += 2;
			}
			zlib.inflate(buffer, true, function(buffer) {
				ret.buffer = buffer;
				cb(ret);
			}, currPos);
			// TODO: CRC32
		}
	};
	return zlib;
	function uuid() {
		return Date.now() * (Math.random() + 0.5);
	}
}(Worker, String.fromCharCode);