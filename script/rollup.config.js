import url from '@rollup/plugin-url';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import styles from 'rollup-plugin-styles';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';
import replace from '@rollup/plugin-replace';
import analyzer from 'rollup-plugin-analyzer';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import { DEFAULT_EXTENSIONS } from '@babel/core';
import multiInput from 'rollup-plugin-multi-input';
import nodeResolve from '@rollup/plugin-node-resolve';
import staticImport from 'rollup-plugin-static-import';
import ignoreImport from 'rollup-plugin-ignore-import';
import { resolve } from 'path';

import pkg from '../package.json';

const name = 'tdesign';
const externalDeps = Object.keys(pkg.dependencies || {});
const externalPeerDeps = Object.keys(pkg.peerDependencies || {});
const banner = `/**
 * ${name} v${pkg.version}
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * @license ${pkg.license}
 */
`;
const input = 'src/index-lib.ts';
const inputList = [
  'src/**/*.ts',
  'src/**/*.jsx',
  'src/**/*.tsx',
  '!src/**/_example',
  '!src/**/*.d.ts',
  '!src/**/_usage',
];

const getPlugins = ({
  env,
  isProd = false,
  ignoreLess = true,
  extractOneCss = false,
  extractMultiCss = false,
} = {}) => {
  const plugins = [
    nodeResolve(),
    commonjs(),
    esbuild({
      include: /\.[jt]sx?$/,
      target: 'esnext',
      minify: false,
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      tsconfig: resolve(__dirname, '../tsconfig.build.json'),
    }),
    babel({
      babelHelpers: 'runtime',
      extensions: [...DEFAULT_EXTENSIONS, '.ts', '.tsx'],
    }),
    json(),
    url(),
    replace({
      preventAssignment: true,
      values: {
        __VERSION__: JSON.stringify(pkg.version),
      },
    }),
  ];

  // css
  if (extractOneCss) {
    plugins.push(
      postcss({
        extract: `${isProd ? `${name}.min` : name}.css`,
        minimize: isProd,
        sourceMap: true,
        extensions: ['.sass', '.scss', '.css', '.less'],
      }),
    );
  } else if (extractMultiCss) {
    plugins.push(
      staticImport({
        include: ['src/**/style/css.js'],
      }),
      ignoreImport({
        include: ['src/*/style/*', 'src/*/*/style/*'],
        body: 'import "./css.js";',
      }),
    );
  } else if (ignoreLess) {
    plugins.push(ignoreImport({ extensions: ['*.less'] }));
  } else {
    plugins.push(
      staticImport({
        include: ['src/**/style/index.js', 'src/_common/style/web/**/*.less'],
      }),
      ignoreImport({
        include: ['src/*/style/*'],
        body: 'import "./index.js";',
      }),
    );
  }

  if (env) {
    plugins.push(
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(env),
        },
      }),
    );
  }

  if (isProd) {
    plugins.push(
      terser({
        output: {
          /* eslint-disable */
          ascii_only: true,
          /* eslint-enable */
        },
      }),
    );
  }

  return plugins;
};

const cssConfig = {
  input: ['src/**/style/index.js'],
  plugins: [multiInput(), styles({ mode: 'extract' })],
  output: {
    banner,
    dir: 'es/',
    sourcemap: true,
    assetFileNames: '[name].css',
  },
};

// ?????????????????? ?????? css ??????
const libConfig = {
  input: inputList.concat('!src/index-lib.ts'),
  external: externalDeps.concat(externalPeerDeps),
  plugins: [multiInput()].concat(getPlugins({ extractMultiCss: true })),
  output: {
    banner,
    dir: 'lib/',
    format: 'esm',
    sourcemap: true,
    chunkFileNames: '_chunks/dep-[hash].js',
  },
};

// ?????????????????? ??? css ??????
const esConfig = {
  input: inputList.concat('!src/index-lib.ts'),
  // ???????????? style/css.js
  treeshake: false,
  external: externalDeps.concat(externalPeerDeps),
  plugins: [multiInput()].concat(getPlugins({ extractMultiCss: true })),
  output: {
    banner,
    dir: 'es/',
    format: 'esm',
    sourcemap: true,
    chunkFileNames: '_chunks/dep-[hash].js',
  },
};

// ?????????????????? ????????? less ????????????????????????
const esmConfig = {
  input: inputList.concat('!src/index-lib.ts'),
  // ???????????? style/index.js
  treeshake: false,
  external: externalDeps.concat(externalPeerDeps),
  plugins: [multiInput()].concat(getPlugins({ ignoreLess: false })),
  output: {
    banner,
    dir: 'esm/',
    format: 'esm',
    sourcemap: true,
    chunkFileNames: '_chunks/dep-[hash].js',
  },
};

// commonjs ????????????????????? css ??????
const cjsConfig = {
  input: inputList,
  external: externalDeps.concat(externalPeerDeps),
  plugins: [multiInput()].concat(getPlugins()),
  output: {
    banner,
    dir: 'cjs/',
    format: 'cjs',
    sourcemap: true,
    exports: 'named',
    chunkFileNames: '_chunks/dep-[hash].js',
  },
};

const umdConfig = {
  input,
  external: externalPeerDeps,
  plugins: getPlugins({
    env: 'development',
    extractOneCss: true,
  }).concat(analyzer({ limit: 5, summaryOnly: true })),
  output: {
    name: 'TDesign',
    banner,
    format: 'umd',
    exports: 'named',
    globals: { react: 'React', lodash: '_' },
    sourcemap: true,
    file: `dist/${name}.js`,
  },
};

const umdMinConfig = {
  input,
  external: externalPeerDeps,
  plugins: getPlugins({
    isProd: true,
    extractOneCss: true,
    env: 'production',
  }),
  output: {
    name: 'TDesign',
    banner,
    format: 'umd',
    exports: 'named',
    globals: { react: 'React', lodash: '_' },
    sourcemap: true,
    file: `dist/${name}.min.js`,
  },
};

// ???????????? reset.css ??? dist ??????????????????????????????
const resetCss = {
  input: 'src/_common/style/web/_reset.less',
  output: {
    file: 'dist/reset.css',
  },
  plugins: [postcss({ extract: true })],
};

export default [cssConfig, libConfig, cjsConfig, esConfig, esmConfig, umdConfig, umdMinConfig, resetCss];
