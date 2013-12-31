YAPD
====

Yet Another PNG Decoder

Supported PNG features:

1. PNG-8 1~256 colored platte mode with transparency
2. PNG-24 RGBA mode

		<canvas></canvas>
		<script src="zlib.js"></script>
		<script src="png.js"></script>
		<script>
			PNG.load(url, function(err, png) {
				if (err)
					console.error(err);
				else
					png.renderTo(document.querySelector('canvas'));
			});
		</script>

PNG Encoder
-----------

Added png encoder, checkout /encoder/

Supported formats:

1. PNG-8 2/4/16/256 colored platte mode with transparency
2. PNG-24 RGB(A) mode

		<canvas></canvas>
		<script src="../zlib.js"></script>
		<script src="png_encode.js"></script>
		<script>
			var canvas = document.querySelector('canvas');
			// draw something in canvas
			PNG.encode(canvas, {
				platte: true,
				alpha: true,
				colors: 256
			}, function(buffer) {
				// output is an arraybuffer
			});
		</script>
