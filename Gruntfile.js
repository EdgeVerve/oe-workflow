/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

module.exports = function GruntConfig(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    eslint: {
      target: [
        'common/**/*.js',
        'server/**/*.js',
        'test/**/*.js'
      ]
    },

    clean: {
      coverage: {
        src: ['coverage/']
      }
    },

    mocha_istanbul: {
      coverage: {
        src: [
          'test/*.js',
          'test/activiti-integeration/*.js'
        ],
        options: {
          excludes: [],
          timeout: 60000,
          check: {
            lines: 75,
            statements: 75,
            branches: 65,
            functions: 75
          },
          reportFormats: ['lcov']
        }
      }
    }
  });

  // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-mocha-istanbul');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.loadNpmTasks('grunt-eslint');

  grunt.registerTask('default', ['eslint']);
  grunt.registerTask('just-eslint', ['eslint']);
  grunt.registerTask('just-mocha-istanbul', ['mocha_istanbul']);
  grunt.registerTask('test-with-coverage', ['clean:coverage', 'mocha_istanbul']);
  grunt.registerTask('eslint-test-coverage', [ 'eslint', 'clean:coverage', 'mocha_istanbul']);
  grunt.registerTask('all', ['eslint', 'clean:coverage', 'mocha_istanbul']);
};
