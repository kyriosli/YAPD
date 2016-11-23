var PNG = require('..');

PNG.load(__dirname + '/rgba.png').then(function (png) {
    console.log('done', png.width, png.height);

    return PNG.encode(png.data, png.width, png.height, {
        platte: true,
        colors: 256,
        alpha: true
    })
}).then(function (buf) {
    console.log(buf);
    require('fs').writeFileSync('out.png', new Buffer(new Uint8Array(buf)))
}, function (err) {
    console.error(err);
});