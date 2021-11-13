import { DATA_DIR, DOWNLOADS_DIR, HOST, PORT } from '../../config';
import compression from "compression";
import express from "express";
import { dirname } from "path";
import domainMiddleware from "express-domain-middleware";
import yargs from "yargs";
import { createServer } from 'http';
import { createSocket } from './socket';
import { pull } from './repository';
import mkdirp from 'mkdirp';

const argv = yargs(process.argv.slice(2)).options({
    watch: { type: 'boolean' }
}).argv;

const isDevMode = process.env.NODE_ENV === 'development';
const isWatch = !!(argv as any).watch;

const frontendPath = dirname(require.resolve("ror-sheetbook-frontend/package.json")); // Do not resolve main property

const app = express();
app.use(domainMiddleware);
app.use(compression());

const webpackCompiler = isWatch
    ? (() => {
          const webpack = require(require.resolve('webpack', {
              paths: [require.resolve('ror-sheetbook-frontend/package.json')]
          }));
          const webpackConfig = require('ror-sheetbook-frontend/webpack.config')
              .default;
          return webpack(webpackConfig({}, { mode: isDevMode ? 'development' : 'production' }));
      })()
    : undefined;

const frontendMiddleware = isWatch
    ? require('webpack-dev-middleware')(webpackCompiler, {
          publicPath: '/'
      })
    : express.static(frontendPath + '/dist/');

app.use(frontendMiddleware);

app.use('/downloads', express.static(DOWNLOADS_DIR));

if (isWatch) {
    app.use(require("webpack-hot-middleware")(webpackCompiler));
}

const server = createServer(app);

createSocket(server);

(async () => {
    await Promise.all([
        pull(),
        mkdirp(DOWNLOADS_DIR)
    ]);

    server.listen({ port: PORT, host: HOST }, () => {
        console.log(`Listening on http://${HOST}:${PORT}/`);
    });
})();