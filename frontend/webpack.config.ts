import webpack, { Configuration } from "webpack";
import copyPlugin from "copy-webpack-plugin";
import htmlPlugin from "html-webpack-plugin";
import { compile, CompilerOptions } from "vue-template-compiler";
import svgToMiniDataURI from "mini-svg-data-uri";
// import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

function includeHotMiddleware(entry: string | string[], isDev: boolean): string | string[] {
	if(!isDev)
		return entry;

	if(!Array.isArray(entry))
		entry = [ entry ];

	return [ "webpack-hot-middleware/client" ].concat(entry);
}

export default (env: any, argv: any): Configuration => {
	const isDev = argv.mode == "development";

	return {
		entry: includeHotMiddleware(__dirname + "/src/app.ts", isDev),
		output: {
			filename: "frontend-[name]-[chunkhash].js",
			path: __dirname + "/dist/"
		},
		resolve: {
			alias: {
				vue: "vue/dist/vue.runtime.esm.js"
			},
			extensions: ['.ts', '.wasm', '.mjs', '.js', '.json']
		},
		mode: isDev ? "development" : "production",
		devtool: isDev ? "eval-source-map" : "source-map", // Change to inline-cheap-source-map to work with dependency source maps
		module: {
			rules: [
				{ test: /\.js$/, enforce: "pre", use: ["source-map-loader"], exclude: /\/node_modules\// },
				{
					resource: /\.ts$/,
					use: {
						loader: "ts-loader",
						options: { onlyCompileBundledFiles: true }
					}
				},
				{ test: /\.css$/, use: [ "style-loader", "css-loader" ] },
				{ test: /\.scss$/, use: [
					"style-loader",
					{
						loader: "css-loader",
						options: {
							modules: "global"
						}
					},
					"sass-loader"
				]},
				{
					test: /\.(png|jpe?g|gif|ttf)$/,
					type: 'asset/inline'
				},
				{
					test: /\.(svg)$/,
					type: 'asset/inline',
					generator: {
						dataUrl: (content: any) => {
							content = content.toString();
							return svgToMiniDataURI(content);
						}
					}
				},
				{
					test: /\.(html|ejs)$/,
					loader: "html-loader",
					options: {
						sources: {
							list: [
								{ tag: "img", attribute: "src", type: "src" },
								{ tag: "link", attribute: "href", type: "src", filter: (tag: any, attr: any, attrs: any) => attrs.some((a: any) => a.name == "rel" && ["icon"].includes(a.value)) },
							]
						}
					}
				},
				{
					test: /\.vue$/,
					loader: "vue-template-loader",
					options: {
						transformAssetUrls: {
							img: 'src'
						},
						compiler: {
							compile: (template: string, options: CompilerOptions) => compile(template, { ...options, whitespace: "condense" })
						}
					}
				}
			],
		},
		plugins: [
			new htmlPlugin({
				template: `${__dirname}/src/index.html`,
				filename: "index.html"
			}),
			new copyPlugin({
				patterns: [
					"favicon.ico",
					"favicon.svg"
				].map((file) => ({ from: `${__dirname}/assets/${file}` }))
			}),
			new webpack.DefinePlugin({
				'process.env': {}
			}),
			...(isDev ? [
				new webpack.HotModuleReplacementPlugin()
			] : [
				// new BundleAnalyzerPlugin(),
			])
		]
	};
};