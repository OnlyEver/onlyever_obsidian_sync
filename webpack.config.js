const path = require('path');
require("dotenv").config();
require('path').config();
const webpack = require('webpack');

module.exports = {
    entry: './main.ts',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        
        new webpack.DefinePlugin({
            "process.env.AWS_ACCESS_KEY": `"${{ secrets.AWS_ACCESS_KEY_ID }}"`,
            "process.env.AWS_SECRET_ACCESS_KEY": `"${{ secrets.AWS_SECRET_ACCESS_KEY }}"`,
            "process.env.S3_BUCKET": `"${{ secrets.S3_BUCKET }}"`,
            "process.env.S3_REGION": `"${{ secrets.S3_REGION }}"`
        })
    ],
    devServer: {
        static: path.join(__dirname, "dist"),
        compress: true,
        port: 4000,
    },
};