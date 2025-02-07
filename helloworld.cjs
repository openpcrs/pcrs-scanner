const { createServer } = require('node:http');
const gdal = require('gdal-async')

const hostname = '0.0.0.0';
const port = process.env.PORT;

console.log(process.env.LD_LIBRARY_PATH);
const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(`${gdal.bundled}`);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
