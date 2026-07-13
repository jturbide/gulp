import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { builtinModules } from 'module';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.js',
            format: 'es'
        }
    ],
    plugins: [
        resolve({
            preferBuiltins: true
        }),
        commonjs({
            transformMixedEsModules: true,
        }),
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
        ...builtinModules,
        ...builtinModules.map((moduleName) => `node:${moduleName}`)
    ]
};
