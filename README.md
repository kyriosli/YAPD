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
require('yapd').load('rgba.png')
```

### Encoder support

PNG encoder is added. See [encoder](src/encoder/)

### API reference

#### PNG.load(image_path)

Returns a promise of type `PNGImage`.

In web browsers, a `fetch` or `XHR` request is sent to get the content. In Node.JS, a local file is read.   

```js
PNG.load('rgba.png').then(function (png) {
    // png instanceof PNGImage
})
```

#### PNG.decode(buf: Buffer|ArrayBuffer|Uint8Array)

Decodes the png image file content.

```js
var buf = ...
png.decode(buf).then(function (png) {
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