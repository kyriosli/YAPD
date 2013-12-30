YAPE
====

Yet Another PNG Encoder

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
					png.renderTo(document.querySelector('canvas');
			});
		</script>
