const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'rei-web-dist'),
      filename: 'reitools-ui.js',
      library: 'ReiToolsUI',
      libraryTarget: 'umd',
      globalObject: 'this',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/components': path.resolve(__dirname, 'src/components'),
        '@/types': path.resolve(__dirname, 'src/types'),
        '@/utils': path.resolve(__dirname, 'src/utils'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    externals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'static'),
            to: path.resolve(__dirname, 'rei-web-dist'),
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
    devtool: isProduction ? false : 'source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'rei-web-dist'),
      },
      compress: true,
      port: 9000,
      hot: true,
    },
  };
};
