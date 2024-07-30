
let configs = [];

function generateHttpConfig(name) {
  let compress = name.indexOf('min') > -1;
  let config = {
    entry: './index',
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
      extensions: ['.ts', '.js'],
      fallback: {
        zlib: false
      },
    },
    output: {
      library: 'ffs',
      globalObject: 'this',
      libraryTarget: 'umd',
      filename: name + '.js',
      path: __dirname + '/dist/',
      sourceMapFilename: name + '.map',
    },
    node: false,
    devtool: 'source-map',
    mode: compress ? 'production' : 'development'
  };
  return config;
}

["kyofuuc", "kyofuuc.min"].forEach(function (key) {
  configs.push(generateHttpConfig(key));
});

module.exports = configs;
