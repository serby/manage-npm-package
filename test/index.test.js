var assert = require('assert')
  , rewire = require('rewire')
  , ManagePackageJson = rewire('..')
  , fs = require('fs')

function logSpy (done) {
  var logger = {}
  done = done || function noop () {}
  ; [ 'info', 'warn', 'debug', 'error' ].forEach(function (level) {
    logger[level] = done.bind(done, level)
  })
  return logger
}

describe('manage-npm-package', function () {
  describe('#load()', function () {
    it('should error with file not found ', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/missing/')
      managePackageJson.load(function (err) {
        assert.equal(err.code, 'ENOENT')
        done()
      })
    })
    it('should error with invalid JSON ', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/invalid/')
      managePackageJson.load(function (err) {
        assert.equal(err.message, 'Unexpected token T')
        done()
      })
    })
  })

  describe('#package', function () {
    it('should add properties', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function (err) {
        assert.equal(err, undefined)
        managePackageJson.package.scripts.list = 'ls'
        assert.equal(managePackageJson.package.scripts.list, 'ls')
        done()
      })
    })
    it('should overwrite existing properties', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function () {
        managePackageJson.package.version = '1.0.0'
        assert.equal(managePackageJson.package.version, '1.0.0')
        done()
      })
    })
  })

  describe('#addScript', function () {
    it('should add new script if doesn\'t exist with the default options', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function (err) {
        assert.equal(err, undefined)
        managePackageJson.addScript('linty', 'my-linter .')
        assert.equal(managePackageJson.package.scripts.linty, 'my-linter .')
        done()
      })
    })
    it('should append new script if it exists using default options', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function (err) {
        assert.equal(err, undefined)
        managePackageJson.package.scripts.linty = 'other-linter .'
        managePackageJson.addScript('linty', 'my-linter .')
        assert.equal(managePackageJson.package.scripts.linty, 'other-linter . && my-linter .')
        done()
      })
    })
    it('should overwrite new script if it exists and `overwrite` is set', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function (err) {
        assert.equal(err, undefined)
        managePackageJson.package.scripts.linty = 'other-linter .'
        managePackageJson.addScript('linty', 'my-linter .', { overwrite: true })
        assert.equal(managePackageJson.package.scripts.linty, 'my-linter .')
        done()
      })
    })
    it('should append new script using custom `joinOperator`', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function (err) {
        assert.equal(err, undefined)
        managePackageJson.package.scripts.linty = 'other-linter .'
        managePackageJson.addScript('linty', 'my-linter .', { joinOperator: '||' })
        assert.equal(managePackageJson.package.scripts.linty, 'other-linter . || my-linter .')
        done()
      })
    })
  })

  describe('#addDependency()', function () {
    it('should error if package not loaded', function () {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      assert.throws(function () {
        managePackageJson.addDependency('async', '^1.4.2')
      }, 'package.json not loaded')
    })
    it('should add to dependencies', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.2')
        assert.equal(managePackageJson.package.dependencies.async, '^1.4.2')
        done()
      })
    })
    it('should add to devDependencies', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.2', { dev: true })
        assert.equal(managePackageJson.package.devDependencies.async, '^1.4.2')
        done()
      })
    })
    it('should add to both dependencies and devDependencies', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.2')
        managePackageJson.addDependency('async', '^1.4.2', { dev: true })
        assert.equal(managePackageJson.package.dependencies.async, '^1.4.2')
        assert.equal(managePackageJson.package.devDependencies.async, '^1.4.2')
        done()
      })
    })
    it('should dedupe when added to both dependencies and devDependencies', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.2', { dev: true })
        managePackageJson.addDependency('async', '^1.4.2', { dedupe: true })
        assert.equal(managePackageJson.package.dependencies.async, '^1.4.2')
        assert.equal(managePackageJson.package.devDependencies.async, undefined)
        done()
      })
    })
    it('should log.info when package is added', function (done) {
      var logger = logSpy(function (level, message) {
          assert.equal(level, 'info')
          assert.equal(message, '"async": "^1.4.2" added to "dependencies"')
          done()
        })
        , managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logger })

      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.2')
      })
    })
    it('should log.info when package is added as a dev dependency', function (done) {
      var logger = logSpy(function (level, message) {
          assert.equal(level, 'info')
          assert.equal(message, '"async": "^1.4.2" added to "devDependencies"')
          done()
        })
        , managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logger })

      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.2', { dev: true })
      })
    })
    it('should log.warn when dedupe dependencies', function (done) {
      var logger = logSpy(function (level, message) {
          if (level === 'warn') {
            assert.equal(message
              , '"async" found at "^1.4.0" in `dependencies` and at "^1.4.2" in ' +
              '`devDependencies`. Removing from `devDependencies`. WARNING this could cause an incompatibility.')
            done()
          }
        })
        , managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logger })

      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.0')
        managePackageJson.addDependency('async', '^1.4.2', { dev: true, dedupe: true })
      })
    })
  })

  describe('#save()', function () {
    it('should save package', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
        , fsMock =
          { writeFile: function (path, content) {
              assert.equal(content, JSON.stringify(managePackageJson.package, null, 2))
              reset()
              done()
            }
          , readFile: fs.readFile.bind(fs)
        }
        , reset = ManagePackageJson.__set__('fs', fsMock)

      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.2')
        managePackageJson.save()
      })
    })
    it('should pass save errors', function (done) {
      var managePackageJson = new ManagePackageJson(__dirname + '/fixture/', { logger: logSpy() })
        , fsMock =
          { writeFile: function (path, content, cb) {
              cb(new Error('Save Error'))
            }
          , readFile: fs.readFile.bind(fs)
        }
        , reset = ManagePackageJson.__set__('fs', fsMock)

      managePackageJson.load(function () {
        managePackageJson.addDependency('async', '^1.4.2')
        managePackageJson.save(function (err) {
          assert.equal(err.message, 'Save Error')
          reset()
          done()
        })
      })
    })
  })
})
