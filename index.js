const http = require('http');
const express = require('express');
const fs = require('fs');
const socketio = require('socket.io');
const crypto = require('crypto');

const app = express();
const staticDir = express.static;
const server = http.createServer(app);

io = socketio(server);

const opts = {
    host: process.env.HOST || 'http://localhost',
	port: process.env.PORT || 1948,
	baseDir : __dirname
};

io.on( 'connection', function( socket ) {
	console.log("Socket connected from... ",socket.client.request.headers.referer);
	socket.on('multiplex-statechanged', function(data) {
        console.log("Event >> State changed from... ",socket.client.request.headers.referer);
		if (typeof data.secret == 'undefined' || data.secret == null || data.secret === '') return;
		if (createHash(data.secret) === data.socketId) {
			data.secret = null;
			socket.broadcast.emit(data.socketId, data);
		};
	});
});

app.get("/", function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});

    const stream = fs.createReadStream(opts.baseDir + '/index.html');
	stream.on('error', function( error ) {
		res.write('<h2>Presentation Home Page</h2><h4>To use the server in your presentation please generate a token</h4><a href="/token">Generate Token</a>');
		res.end();
	});
	stream.on('readable', function() {
		stream.pipe(res);
	});
});

app.get("/token", function(req,res) {
	const ts = new Date().getTime();
	const rand = Math.floor(Math.random()*9999999);
	const secret = ts.toString() + rand.toString();
	res.send({secret: secret, socketId: createHash(secret)});
});

const createHash = function(secret) {
	const cipher = crypto.createCipher('blowfish', secret);
	return(cipher.final('hex'));
};

// Actually listen
server.listen( opts.port || null );

const brown = '\033[33m',
	green = '\033[32m',
	reset = '\033[0m';

console.log( green + "Presentation Service:" + reset + " Multiplex running on " + green + opts.host + ":" + opts.port + reset );