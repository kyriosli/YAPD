var zlib = require('zlib');

global.zlib = {
    inflate: function (buf, headless, pos) {
        buf = toBuffer(buf, (pos | 0) + (headless ? 0 : 2));
        return new Promise(function (resolve, reject) {
            zlib.inflateRaw(buf, function (err, ret) {
                err ? reject(err) : resolve(Buffer.from ? ret.buffer : new Uint8Array(ret).buffer)
            })
        })
    }, deflate: function (buf, level, header, pos) {
        buf = toBuffer(buf, pos | 0);
        return new Promise(function (resolve, reject) {
            zlib.deflateRaw(buf, function (err, ret) {
                if (err) return reject(err);
                if (header) {
                    ret = Buffer.concat([new Buffer([0x78, 0x01]), ret], ret.length + 2)
                }
                resolve(Buffer.from ? ret.buffer : new Uint8Array(ret).buffer);
            })
        });

    }
};

function toBuffer(buf, offset) {
    // buf is ArrayBuffer
    var arr = new Uint8Array(buf, offset);
    return Buffer.from ? Buffer.from(arr) : new Buffer(arr);
}


exports = module.exports = require('./png.js');
exports.encoder = require('./encoder/png_encode.js');
exports.encode = exports.encoder.encode;