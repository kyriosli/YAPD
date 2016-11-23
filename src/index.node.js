global.zlib = {
    inflate: function (buf, headless, pos) {
        // buf is ArrayBuffer
        var arr = new Uint8Array(buf, (pos | 0) + (headless ? 0 : 2));
        buf = Buffer.from ? Buffer.from(arr) : new Buffer(arr);
        return new Promise(function (resolve, reject) {
            require('zlib').inflateRaw(buf, function (err, ret) {
                err ? reject(err) : resolve(Buffer.from ? ret.buffer : new Uint8Array(ret).buffer)
            })
        })
    }
};


var png = require('./png.js');

exports.decode = png.decode;