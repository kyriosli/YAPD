## Yet Another PNG Encoder

Pure JavaScript implemented png encoder that supports modern browsers as well as Node.JS

View [this demo](http://kyrios.li/YAPD/test/encoder.html)

Supported PNG features:

  - PNG-8 2/4/16/256 colored platte mode with transparency
  - PNG-24 RGBA mode

### Usage

In Browser:

```html
<canvas></canvas>
<script src="src/zlib/zlib.js"></script>
<!-- load inflate.js only if you don't want inflate run in Worker -->
<script src="src/zlib/deflate.js"></script>
<script src="src/encoder/png_encode.js"></script>
<script>
	PNG.encodeCanvas(document.querySelector('canvas'), {
		platte: true,
		colors: 256,
		alpha: true
	}).then(function (buf) {
		// buf instanceof ArrayBuffer
	});
</script>
```

In Node.JS:

```js

require('yapd').encode(data, width, height, options)
```

### API reference

#### PNG.encodeCanvas(canvas, options)

Takes pixel data from a canvas and returns a promise of type `ArrayBuffer`.

options are:

  - platte: boolean, whether or not use PNG8 mode, defaults to `false`. If platte is not set, PNG24 mode is used.
  - alpha: boolean, whether or not use alpha. defaults to `true`. Note that if there is no transparency in any pixels, 
  this is automatically set to false.
  - colors: number, number of colors in platte mode, must be one of `2` `4` `16` `256`, defaults to `256` 

#### PNG.encode(data, width, height, options)

Encodes the pixel data into PNG file content. data is array of integers, containing RGBA data (0~255) of each pixel.

Returns a promise of type `ArrayBuffer`.
