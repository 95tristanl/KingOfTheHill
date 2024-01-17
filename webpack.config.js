const path = require('path');
const dotenv = require('dotenv');
const webpack = require('webpack');
require('@babel/polyfill');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const outputDirectory = 'dist';
const version = '_2.0.1'; // for browser cache busting

module.exports = (env) => {
	return	{
		entry: ['@babel/polyfill', './src/client/index.js'],
		output: {
            path: path.resolve(process.cwd(), outputDirectory),
            filename: 'bundle'+version+'.js'
        },
		devtool: 'source-map',
		devServer: {port: 8088, open: "Brave Browser", hot: true, historyApiFallback: true},
		module: {
			rules: [
				{test: /\.js/, exclude: /node_modules/, use: {loader: 'babel-loader'}},
				{test: /\.css/, exclude: /node_modules/, use: ['style-loader', 'css-loader']},
				{test: /\.(png|svg|jpg|otf)$/, exclude: /node_modules/, use: {loader: 'file-loader'}},
			]
		},
		plugins: [
			new CleanWebpackPlugin([outputDirectory]),
			new MiniCssExtractPlugin({filename: '[name]'+version+'.css', chenkFilename: '[id]'+version+'.css'}),
			new HtmlWebpackPlugin({template: './src/client/index.html', favicon: './src/client/favicon.png'}),
			new webpack.DefinePlugin(
				(() => {
					const currentPath = path.join(__dirname);
					const envPath = currentPath + '/.env';
					const fileEnv = dotenv.config({path: envPath}).parsed;
					const envKeys = Object.keys(fileEnv).reduce((prev, next) => {
						prev[`process.env.${next}`] = JSON.stringify(fileEnv[next]);
						return prev;
					}, {});
					return envKeys;
				})()
			),
            new CompressionPlugin()
		],
        optimization: {minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})]},
		resolve: {extensions: ['*', '.js']}
	};
}
