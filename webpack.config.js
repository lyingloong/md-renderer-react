// const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: new URL('./dist', import.meta.url).pathname,
    filename: 'bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html',
      title: 'Markdown 渲染Demo',
    }),
  ],
  module: {
    rules: [
      // 规则1：处理 .md 文件 → 自定义 Loader + babel-loader
      {
        test: /\.md$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-react'],
              babelrc: false,
              configFile: false,
            },
          },
          {
            loader: new URL('./local-md-loader.js', import.meta.url).pathname,
            options: {
              cssPath: '../styles/ContentPageLayout.module.scss'
            }
          },
        ],
      },
      // 规则2：处理图片资源
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash:6][ext]',
        },
      },
      // 规则3：处理主项目 JS/JSX
      {
        test: /\.(js|jsx)$/,
        include: new URL("./src", import.meta.url).pathname,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-env'],
          },
        },
      },
      // 规则4：处理 CSS 文件（包括 KaTeX CSS）
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      // 规则5：处理 SCSS 文件
      {
        test: /\.scss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      // 规则6：处理 KaTeX 字体文件
      {
        test: /\.(woff2?|ttf|eot|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:6][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.md'],
    alias: {
      react: new URL("./node_modules/react", import.meta.url).pathname,
      "react-dom": new URL("./node_modules/react-dom", import.meta.url).pathname,
    },
  },
  devServer: {
    static: new URL('./dist', import.meta.url).pathname,
    port: 3230,
    hot: true,
    open: false,
    client: {
      webSocketURL: 'ws://localhost:8888/ws',
    },
    webSocketServer: 'ws',
  },
};
