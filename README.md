## Yet Another PNG Decoder

Pure JavaScript implemented png decoder (as well as encoder) that supports modern browsers as well as Node.JS

Supported PNG features:

  - PNG-8 1~256 colored platte mode with transparency
  - PNG-24 RGBA mode

### Usage

In Browser:

```html
<canvas></canvas>
<script src="src/zlib/zlib.js"></script>
<!-- load inflate.js only if you don't want inflate run in Worker -->
<script src="src/zlib/inflate.js"></script>
<script src="src/png.js"></script>
<script>
    PNG.load(image_url).then(function (png) {
        png.renderTo(document.querySelector('canvas'))
    })
</script>
```

In Node.JS:

```js
var fs = require('fs')
require('yapd').decode(fs.readFileSync('rgba.png'))
```

### Encoder support

PNG encoder is added. See [encoder](src/encoder/)

### API reference

#### PNG.load(image_url)

browser API that returns a promise of type `PNGImage`

```js
PNG.load('rgba.png').then(function (png) {
    // png instanceof PNGImage
})
```

#### PNG.decode(arrayBuffer|uint8Array)

both browser and Node.JS API that returns a promise of type `PNGImage`

```js
png.decode(buffer).then(function (png) {
    // png instanceof PNGImage
})
```

#### class PNGImage

A png image decoded from buffer, contains several properties and methods:

  - width: image width, in pixel
  - height: image height, in pixel
  - bitDepth: bits of each channel at one pixel
  - colorMode: color mode indicator, one of `grayscale` `rgb` `rgba` `platte` and `grayscale_alpha`
  - data: array of channels in R,G,B,A.
  - renderTo(canvas): browser API, resizes the canvas to the size of the image and renders the image into an canvas 