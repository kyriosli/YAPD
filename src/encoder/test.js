//listener for the converted data
var listener = {
	onDataAvailable : function(request, context, inputStream, offset, count) {
		// write the data
		var output = Components.classes["@mozilla.org/network/file-output-stream;1"]
			.createInstance(Components.interfaces.nsIFileOutputStream);

		// outputFile is a file which will contain the gunzipped data
		if (!outputFile.exists())
			output.init(outputFile, 0x02 | 0x08, 0644, 0);

		else
			output.init(outputFile, 0x02 | 0x10, 0644, 0);

		var scriptable = Components.classes["@mozilla.org/scriptableinputstream;1"]
			.createInstance(Components.interfaces.nsIScriptableInputStream);
		scriptable.init(inputStream);

		var data = scriptable.read(inputStream.available());
		output.write(data, data.length);

		output.close();
	},

	onStartRequest : function(request, context) {
	},

	onStopRequest : function(request, context) {
	}
};

// fake uri needed to create a channel
var uri = Components.classes["@mozilla.org/network/simple-uri;1"].createInstance(Components.interfaces.nsIURI);
uri.scheme = "http://gunzip";

// fake channel needed to create a request
var chan = Components.classes["@mozilla.org/network/input-stream-channel;1"]
	.createInstance(Components.interfaces.nsIInputStreamChannel);
chan.setURI(uri);
chan.contentLength = decrypted.length;
chan.contentType = "gzip";
chan.contentStream = null;

var request = chan.QueryInterface(Components.interfaces.nsIRequest);

// Attempt to gunzip
var conv = Components.classes["@mozilla.org/streamconv;1?from=gzip&to=uncompressed"]
	.createInstance(Components.interfaces.nsIStreamConverter);

conv.asyncConvertData("gzip", "uncompressed", listener, null);

conv.onStartRequest(request, null);

// input is an inputstream which contains the gzipped data
var avail = input.available();

// really do the conversion
conv.onDataAvailable(request, null, input, 0, avail);

var status = {};
conv.onStopRequest(request, null, status);

input.close();