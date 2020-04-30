/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

module.exports = function GruntConfig(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    lint: {
      target: [
        'common/**/*.js',
        'server/**/*.js',
        'test/**/*.js'
      ]
    },

    clean: {
      coverage: {
        src: ['coverage/']
      },
      dist: {
        src: ['dist/']
      }
    },

    mocha_istanbul: {
      options: {
        mochaOptions: ['--exit']
      },
      coverage: {
        src: ['test/bootstrap.js', 'test/scripts/*.js'],
        options: {
          timeout: 5000,
          check: {
            lines: 80,
            statements: 80,
            branches: 70,
            functions: 80
          },
          reportFormats: ['lcov']
        }
      }
    }
  });

  // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mocha-istanbul');

  grunt.loadNpmTasks('grunt-eslint');

  grunt.registerTask('all', ['lint', 'clean:coverage', 'mocha_istanbul']);
  grunt.registerTask('test-with-coverage', ['clean:coverage', 'mocha_istanbul']);
};
