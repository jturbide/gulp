import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import nodeGlobals from 'rollup-plugin-node-globals';
import { builtinModules } from 'module';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/jturbide-gulp.cjs.js',
            format: 'cjs',
            exports: 'auto'
        },
        {
            file: 'dist/jturbide-gulp.esm.js',
            format: 'es'
        },
        {
            file: 'dist/jturbide-gulp.umd.js',
            format: 'umd',
            name: 'jTurbideGulp',
            globals: {
                // Leave empty for now, handled by nodeGlobals() plugin
            }
        }
    ],
    plugins: [
        nodePolyfills(),
        nodeGlobals(),
        resolve({
            preferBuiltins: true,
            browser: true,
        }),
        commonjs(),
        json(),
        typescript({
            tsconfig: './tsconfig.json',
            declaration: true,
            declarationDir: './dist/types',
        }),
        terser()
    ],
    external: [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.peerDependencies || {}),
        ...builtinModules
    ]
};
