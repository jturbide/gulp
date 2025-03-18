import {Gulp} from 'jturbide-gulp';
import {task, series, parallel} from 'gulp'

const src = './src/'
const dist = './dist/'
const nodeModules = './node_modules/'

const sassVendors = [
    nodeModules + 'bootstrap/scss/**/*',
    nodeModules + 'slick-carousel/slick/slick.scss',
    nodeModules + 'slick-carousel/slick/slick-theme.scss',
]

const jsVendors = [
    nodeModules + 'jquery/dist/jquery.js',
    nodeModules + 'bootstrap/dist/js/bootstrap.bundle.js',
    nodeModules + 'slick-carousel/slick/slick.js',
]

const gulp = new Gulp({

    env: {
        prod: {
            delete: true,
            debug: false,
            verbose: false,
            minify: true,
            depOrder: true,
            combine: true,
            optimize: true,
            sourceMaps: false
        },
    },

    // Global Configs
    global: {
        delete: true,
        debug: false,
        verbose: true,
        minify: true,
        depOrder: true,
        combine: true,
        watch: true,
        optimize: true,
        sass: {
            sortMediaQueries: false,
            compilerOptions: {
                silenceDeprecations: ['mixed-decls'],
                outputStyle: 'compressed',
            },
            sourceMaps: {
                enable: true,
                initOptions: {
                    loadMaps: true,
                },
                writePath: './maps',
            },
        },
        js: {
            sourceMaps: {
                enable: true,
                initOptions: {
                    loadMaps: true,
                },
                writePath: './maps',
            },
        },
    },

    // Styles
    sass: [

        // Main
        {
            src: src + 'scss/**/*.scss',
            dest: dist + 'css/',
            concat: 'style.css',
        },

        // Vendors
        {
            src: sassVendors,
            dest: dist + 'css/vendors/',
            concat: 'all.css',
        },
    ],

    // JavaScript
    js: [

        // Main (head)
        {
            src: src + 'js/**/*.js',
            dest: dist + 'js/',
            concat: 'main.js',
            depOrder: false,
        },

        // Vendors
        {
            src: jsVendors,
            dest: dist + 'js/vendors/',
            concat: 'all.js',
        },
    ],

    view: [
        // HTML
        {
            delete: [
                dist + 'fr/',
                dist + 'en/'
            ],
            watch: src + 'views/**/*.html',
            src: src + 'views/pages/**/index.html',
            dest: dist + '',
            fileInclude: {
                prefix: '@@',
                basepath: '@file'
            },
            localize: {
                locales: ['fr', 'en'],
                localeDir: src + 'locales/'
            },
        }
    ],

    // Images
    image: [
        {
            src: src + 'images/**/*.{png,jpg,jpeg,gif,svg}',
            dest: dist + 'images/',
        }
    ],

    // Files
    copy: [
        {
            src: src + 'files/**/*',
            dest: dist + 'files/',
        }
    ],

    // Local Server
    serve: {
        browserSync: {
            https: true,
            httpModule: 'http2',
            startPath: '/fr',
            server: {
                baseDir: dist + ''
            },
            files: [
                dist + '**/*',
            ],
            notify: true,
            ghostMode: true,
            ui: {
                port: 3000
            },
        }
    },
})

task('build', gulp.build())
task('watch', gulp.watch.bind(gulp))
task('serve', series('build', gulp.serve(), 'watch'))
task('default', series('build'))
