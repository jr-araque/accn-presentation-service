import * as Express from 'express';
import * as Http from 'http';
import * as SocketIO from 'socket.io';
import * as Crypto from 'crypto';
import * as Fs from 'fs';

const app = Express();
const staticDir = Express.static;
const server = Http.createServer(app);

const io = SocketIO(server);

const opts = {
  host: process.env.HOST || 'http://localhost',
  port: process.env.PORT || 1948,
  baseDir: __dirname
};

io.on('connection', function(socket: SocketIO.Socket) {
  console.log('Socket connected from... ', socket.client.request.headers.referer);
  socket.on('multiplex-statechanged', function(data) {
    console.log('Event >> State changed from... ', socket.client.request.headers.referer);
    if (typeof data.secret === 'undefined' || data.secret === null || data.secret === '') {
      return;
    }
    if (createHash(data.secret) === data.socketId) {
      data.secret = null;
      console.log('Emmiting::: ', { data });
      socket.broadcast.emit(data.socketId, data);
    }
  });
});

app.get('/', function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });

  const stream = Fs.createReadStream(opts.baseDir + '/index.html');
  stream.on('error', function(error) {
    res.write(`<h2>Presentation Home Page</h2>
    <h4>To use the server in your presentation please generate a token</h4>
    <a href="/token">Generate Token</a>`);
    res.end();
  });
  stream.on('readable', function() {
    stream.pipe(res);
  });
});

app.get('/token', function(req, res) {
  const ts = new Date().getTime();
  const rand = Math.floor(Math.random() * 9999999);
  const secret = ts.toString() + rand.toString();
  res.send({ secret, socketId: createHash(secret) });
});

const createHash = function(secret: string) {
  const cipher = Crypto.createCipher('blowfish', secret);
  return cipher.final('hex');
};

// Actually listen
server.listen(opts.port || null);

console.log(`Presentation Service: Multiplex running on http://${opts.host}:${opts.port}`);
