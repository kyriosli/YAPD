var PNG = require('..');

var buf = require('fs').readFileSync(require('path').join(__dirname, 'rgba.png'));

PNG.decode(buf).then(function (png) {
    console.log('done')
}, function (err) {
    console.error(err);
});