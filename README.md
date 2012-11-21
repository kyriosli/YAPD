YAPD
====

Yet Another PNG Decoder

Supported PNG features:

1. PNG-8 1~256 colored platte mode with transparency
2. PNG-24 RGBA mode

		<script src="zlib.js"></script>
		<script src="png.js"></script>
		<script>
			~function(PNG) {
				PNG.load('rgba.png', function(err, png) {
					if (err) {
						console.error(err.stack);
					} else {
						document.body.appendChild(png.toCanvas());
					}
				});
			}(this.PNG);
		</script>
