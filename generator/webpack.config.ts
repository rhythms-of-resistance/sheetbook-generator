import webpack, { Configuration } from 'webpack';
import nodeExternals from 'webpack-node-externals';
import { promises as fs } from 'fs';

export default (env: any, argv: any): Configuration => {
    const isDev = argv.mode == 'development';

    return {
        mode: isDev ? 'development' : 'production',
        context: __dirname,
        entry: './src/cli',
        output: {
            filename: 'cli.js'
        },
        resolve: {
            modules: ['node_modules'],
            extensions: ['.tsx', '.jsx', '.ts', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader'
                }
            ]
        },
        plugins: [
            new webpack.ProgressPlugin({}),
            new webpack.BannerPlugin({
                banner: '#!/usr/bin/env node',
                raw: true,
                entryOnly: true
            }),
            function() {
                this.hooks.done.tapPromise('Make executable', async () => {
                    await fs.chmod(`${__dirname}/dist/cli.js`, '755');
                });
            }
        ],
        devtool: false,
        cache: true,
        stats: {
            errorDetails: true
        },
        optimization: {
            minimize: false
        },
        externalsType: "commonjs2",
        externalsPresets: { node: true },
        externals: nodeExternals({
            additionalModuleDirs: [
                `${__dirname}/../node_modules`
            ],
            allowlist: ['ror-sheetbook-common']
        }),
        node: {
            __dirname: false
        }
    };
};
