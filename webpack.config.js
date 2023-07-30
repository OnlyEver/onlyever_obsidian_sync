// import dotenv from 'dotenv';
import path from 'path';
import webpack from "webpack";

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const S3_BUCKET = process.env.S3_BUCKET || "";
const S3_REGION = process.env.S3_REGION || "";

const config = {
  entry: './main.ts',
  output: {
    path: path.resolve(__dirname),
    filename: 'main.js',
    libraryTarget: 'commonjs',
  },
  target: 'node',
  mode: isProduction ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
        },
      },
      {
        test: /\.(svg|njk|html)$/,
        type: 'asset/source',
      },
    ],
  },
  optimization: {
    minimize: isProduction,
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.AWS_ACCESS_KEY_ID": `"${AWS_ACCESS_KEY_ID}"`,
      "process.env.AWS_SECRET_ACCESS_KEY": `"${AWS_SECRET_ACCESS_KEY}"`,
      "process.env.S3_BUCKET": `"${S3_BUCKET}"`,
      "process.env.S3_REGION": `"${S3_REGION}"`,
    }),
  ],
resolve: {
  extensions: ['.ts', '.tsx', '.js'],
    mainFields: ['browser', 'module', 'main'],
  },
externals: {
  electron: 'commonjs2 electron',
    obsidian: 'commonjs2 obsidian'
},
};

export default config;