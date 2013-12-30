~function(PNG) {
	'use strict';

	PNG.ColorMode = {
		RGB : 'rgb',
		GRAYSCALE : 'grayscale',
		PLATTE : 'platte'
	};

	PNG.encode = function() {
		var jsPath = (jsPath = (jsPath = document.getElementsByTagName('script'))[jsPath.length - 1].src).substr(0, jsPath
			.lastIndexOf('/') + 1);
		var jobs = {};
		var getWorker = function() {
			var worker = new Worker(jsPath + 'pngEncoder.js');
			worker.addEventListener('message', function(e) {
				if (e.data.type === 'log') {
					return console.log.apply(console, e.data.args);
				}
				var ret = e.data, id = ret.id, cb = jobs[id];
				delete jobs[id];
				cb(ret.buffer);
			});
			getWorker = function() {
				return worker;
			};
			return worker;
		};
		return function(canvas, options, cb) {
			var ctx = canvas.getContext('2d');
			// read canvas data
			var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer;
			// init worker
			var worker = getWorker();
			var id = (Date.now() + Math.random()).toString(36);
			jobs[id] = cb;
			getWorker().postMessage({
				id : id,
				data : data,
				width : canvas.width,
				height : canvas.height,
				options : options
			}, [ data ]);
		};
	}();

}(typeof PNG === 'undefined' ? (this.PNG = {}) : PNG);