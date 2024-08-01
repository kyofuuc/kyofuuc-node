
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
        zlib: false,
        http: false,
        https: false,
      },
    },
    output: {
      library: 'ffs',
      globalObject: 'this',
      libraryTarget: 'umd',
      filename: name + '.js',
      sourceMapFilename: name + '.map',
      path: __dirname + '/browser_dist/',
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
