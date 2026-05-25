const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack");

module.exports = defineConfig({
  transpileDependencies: true,
  // TODO: Change publicPath to process.env.NODE_ENV === 'production' ? '/elliotforwater-admin/' : '/' once ready for deploy
  publicPath: "/",
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
      }),
    ],
  },
});
