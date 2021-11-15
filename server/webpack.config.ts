import webpack, { Configuration } from 'webpack';
import nodeExternals from 'webpack-node-externals';
import { promises as fs } from 'fs';

export default (env: any, argv: any): Configuration[] => {
    const isDev = argv.mode == 'development';

    const base: Configuration = {
        mode: isDev ? 'development' : 'production',
        context: __dirname,
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
            })
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
            allowlist: ['ror-sheetbook-common', 'ror-sheetbook-generator/src']
        }),
        node: {
            __dirname: false
        }
    };

    return [
        {
            ...base,
            name: 'server',
            entry: './src/server/server',
            output: {
                filename: 'server/server.js'
            },
            plugins: [
                ...base.plugins as any,
                function() {
                    this.hooks.done.tapPromise('Make executable', async () => {
                        await fs.chmod(`${__dirname}/dist/server/server.js`, '755');
                    });
                }
            ]
        },
        {
            ...base,
            name: 'generator',
            entry: './src/generator/generator',
            output: {
                filename: 'generator/generator.js'
            },
            plugins: [
                ...base.plugins as any,
                function() {
                    this.hooks.done.tapPromise('Make executable', async () => {
                        await fs.chmod(`${__dirname}/dist/generator/generator.js`, '755');
                    });
                }
            ]
        }
    ]
};
