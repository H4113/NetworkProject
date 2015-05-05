
var H = {

	//todo : H.user.nananana, H.events.createEvent, etc...

	//   USER RELATED
	user : {
		lastKnownLocation: null,

		updateLocation: function( a, b ) {
			switch( arguments.length ) {
			case 0:
				throw 'H.user.updateLocation : at least one argument is required';
				break;
			case 1:
				if( ! a.lat ) throw 'H.user.updateLocation : lat property is required';
				if( ! a.lng ) throw 'H.user.updateLocation : lng property is required';
				lastKnownLocation.lat = a.lat;
				lastKnownLocation.lng = a.lng;
			case 2:
				lastKnownLocation.lat = a;
				lastKnownLocation.lng = b;
				break;
			default:
				throw 'H.user.updateLocation : invalid number of parameters.';
				break;
			}
		}
	},

	//   JQUERY RELATED

	jQueryMoveTopLeft: function(selector) {
		var offy = $(selector).offset().top +1;
  		var offx = $(selector).offset().left +1;
  		$(selector).transition({y:'-'+offy, x:'-'+offx});
	},

	jQueryResetPos: function( selector ) {
		$(selector).transition({y: 0, x: 0});
	},

	//   EVENTS

	createEvent: function(name, properties) {
		var evt = document.createEvent("Event");
		evt.initEvent(name,true,true);
		if( properties ) {
			for( var p in properties ) {
				evt[p] = properties[p];
			}
		}
		return evt;
	},

	processData: function (obj){
		alert("packet entier, taille: "+obj.buffer.byteLength);
		var data = obj.buffer;
		if(obj.type == 1){ // type == 1 -> PATH sent
			var obj2 = parseData(data);

			drawPathOnMap(Map.map, obj2.path);
			drawTourismOnMap(Map.map, obj2.tourism);
		}
	},

	sendQuery: function (buf, callback, error) {

		//this.sendMessage("Hellooooooo", null, null);

		chrome.socket.create('tcp', {}, function(createInfo) {
			
			var abuffer = [];
			var socketId = createInfo.socketId;
			function readPackets(readInfo) {
				alert("packet partiel, taille:"+readInfo.data.byteLength);
				var prout = readHeader(readInfo.data);
				//alert(prout.size);
				magicTcpReceive(abuffer, readInfo.data, H.processData);
				chrome.socket.read(socketId, null, readPackets);
			}
			chrome.socket.connect(socketId, "151.80.143.42", 6666, function(result) {
			//chrome.socket.connect(socketId, "192.168.1.199", 6666, function(result) {
				//alert(result);
				if(result >= 0) {
					//alert("prout " + result);
					chrome.socket.write(socketId, buf, function(writeInfo) {
						if(writeInfo.bytesWritten > 0) {
							//alert("ouiiiii ");
							chrome.socket.read(socketId, null, readPackets);
							//chrome.socket.disconnect(socketId);
						} else {
							// Cannot send data
							// Do something smart 
						}
					});
				} else {
					alert("pas de serveur");
					// Cannot connect
					// Do something smart
				}

			});
		});

	},

	// --> WebSocket is the new black
	sendMessage: function( message, callback, error ) {
		//ws = new WebSocket('ws://151.80.143.42:4853', 'tcp');
		var ws = new WebSocket('ws://echo.websocket.org');
		ws.onopen = function() {
			ws.send( message );
		};

		ws.onmessage = function(evt) {
			console.log(evt.data);
			alert( "answer : "+evt.data);
		};

		ws.onclose = function() {
			alert('connection closed');
		};
	},

	requestWay: function( params, callback, error ) {

		console.log(params);
		
		if( ! params.fromlat ) throw 'required fromlat param is missing.';
		if( ! params.fromlng ) throw 'required fromlng param is missing.';
		if( ! params.tolat ) throw 'required tolat param is missing.';
		if( ! params.tolng ) throw 'required tolng param is missing.';

		var buf = new ArrayBuffer(8+4*8);
		var type_req = new Int16Array(buf,0,1);
		var type_junk = new Int16Array(buf,2,1);
		var type_junk2 = new Int32Array(buf,4,1);
		var gpscoord = new Float64Array(buf,8,4);
		
		type_req[0] = 0;
		type_junk[0] = 42;
		type_junk2[0] = 42;

		gpscoord[0] = params.fromlat;
		gpscoord[1] = params.fromlng;
		gpscoord[2] = params.tolat;
		gpscoord[3] = params.tolng;

		// Change when buttons available
		type_junk[0] = 1 + (1 << 1) + (1 << 2);

		var geo_sendQuery = function(position) {
			//alert("prout");
			gpscoord[0] = position.coords.latitude;
			gpscoord[1] = position.coords.longitude;
			console.log(buf);
			H.sendQuery(buf);
		};

		navigator.geolocation.getCurrentPosition(geo_sendQuery, function() {});
	},

	objToUrl : function( obj ) {
		var url = null;
		for( var prop in obj ) {
			if(  url ) {
				url += '&';	
			} else {
				url = '?';
			}
			url += prop +'='+obj[prop];
		}
		return url;
	},

	go : function( lat, lng ) {
		//window.location.search = "?lat="+lat+"&lng="+lng+"#go";
		window.location.search = this.objToUrl({'lat':lat,'lng':lng});
	},

	goFromTo : function( itinaryObj ) {
		if( ! itinaryObj.fromlat ) throw 'requested fromlat parameter missing.';
		if( ! itinaryObj.fromlng ) throw 'requested fromlng parameter missing.';
		if( ! itinaryObj.tolat ) throw 'requested tolat parameter missing.';
		if( ! itinaryObj.tolng ) throw 'requested tolng parameter missing.';
		window.location.search = this.objToUrl(itinaryObj);
	},

	makeItinaryObj: function( fromlat, fromlng, tolat, tolng) {
		return {
			fromlat: fromlat,
			fromlng: fromlng,
			tolat: tolat,
			tolng: tolng
		};
	}


};

$("#itinaryForm").submit( function() {
	var from = document.getElementById('from').value;
	var to = document.getElementById('to').value;

	function convertFieldTo(coordsFrom, to) {
		if(to) {
			addressToCoordinates(to, function(coordsTo){
				var buf = new ArrayBuffer(8+4*8);
				var type_req = new Int16Array(buf,0,1);
				var type_junk = new Int16Array(buf,2,1);
				var type_junk2 = new Int32Array(buf,4,1);
				var gpscoord = new Float64Array(buf,8,4);
				
				type_req[0] = 0;
				type_junk[0] = 42;
				type_junk2[0] = 42;

				gpscoord[2] = coordsTo.latitude;
				gpscoord[3] = coordsTo.longitude;

				if(coordsFrom) {
					gpscoord[0] = coordsFrom.latitude;
					gpscoord[1] = coordsFrom.longitude;

					// Change when buttons available
					type_junk[0] = 1 + (1 << 1) + (1 << 2);

					State.launch('home');
					H.sendQuery(buf);
				}
				else {
					//GET GPS coordinates
				}
			});
		}
		else {
			//POUET
		}
	}

	function convertFields(from, to) {
		if(from) {
			addressToCoordinates(from, function(coordsFrom){
				convertFieldTo(coordsFrom, to);
			});
		}
		else {
			convertFieldTo("", to);
		}
	}

	convertFields(from, to);

	return false;
});
