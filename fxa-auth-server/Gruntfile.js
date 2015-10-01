#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path = require('path')
const extract = require('jsxgettext-recursive')

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'
module.exports = function (grunt) {
  'use strict'

  require('load-grunt-tasks')(grunt)

  grunt.initConfig({
    copy: {
      strings: {
        files: [{
          expand: true,
          flatten: true,
          cwd: path.join(__dirname, 'node_modules', 'fxa-content-server-l10n', 'locale', 'templates', 'LC_MESSAGES'),
          dest: __dirname,
          src: [
            'server.pot'
          ]
        }]
      }
    },
    nunjucks: {
      options: {
        tags: {
          blockStart: '<%',
          blockEnd: '%>',
          variableStart: '<$',
          variableEnd: '$>',
          commentStart: '<#',
          commentEnd: '#>'
        },
        data: {}
      },
      render: {
        files: [
          {
            expand: true,
            cwd: 'partials/',
            src: '*.html',
            dest: 'templates/',
            ext: '.html'
          }
        ]
      }
    }
  })

  grunt.registerTask('l10n-extract', 'Extract strings from templates for localization.', function () {
    var done = this.async()

    var walker = extract({
      'input-dir': path.join(__dirname, 'templates'),
      'output-dir': __dirname,
      'output': 'server.pot',
      'join-existing': true,
      'keyword': 't',
      parsers: {
        '.txt': 'handlebars',
        '.html': 'handlebars'
      }
    })

    walker.on('end', function () {
      var jsWalker = extract({
        'input-dir': __dirname,
        /* node_modules and test should not contain any strings
         * Gruntfile causes an error and should contain no strings
         * bin/server.js extracts "/", so it is excluded.
         */
        exclude: /(node_modules|test|Gruntfile|bin)/,
        'output-dir': __dirname,
        'output': 'server.pot',
        'join-existing': true,
        'keyword': 'translator.gettext',
        parsers: {
          '.js': 'javascript'
        }
      })

      jsWalker.on('end', function () {
        done()
      })
    })
  })

  // load local Grunt tasks
  grunt.loadTasks('tasks')

  grunt.registerTask('lint', 'Alias for eslint tasks', ['eslint'])
  grunt.registerTask('templates', 'Alias for the template task', ['nunjucks'])

  grunt.registerTask('default', [ 'templates', 'copy:strings', 'l10n-extract' ])

}
