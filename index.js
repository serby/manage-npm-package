var fs = require('fs')
  , join = require('path').join
  , sortKeys = require('sort-keys')

module.exports = ManagePackageJson

function ManagePackageJson (path, options) {
  this.package = null
  this._path = join(path, 'package.json')
  this.logger = options && options.logger || console
}

ManagePackageJson.prototype.addScript = function (name, command, options) {
  if (!this.package) throw new Error('package.json not loaded')
  if (!options) options = { joinOperator: '&&', overwrite: false }
  if (this.package.scripts[name] === undefined) {
    this.package.scripts[name] = command
  } else if (options.overwrite) {
    this.package.scripts[name] = command
  } else {
    this.package.scripts[name] += ' ' + options.joinOperator + ' ' + command
  }
}

ManagePackageJson.prototype.addDependency = function (name, version, options) {
  if (!this.package) throw new Error('package.json not loaded')
  if (!options) options = {}
  if (options.dev) {
    this.package.devDependencies[name] = version
    this.logger.info('"' + name + '": "' + version + '" added to "devDependencies"')
  } else {
    this.package.dependencies[name] = version
    this.logger.info('"' + name + '": "' + version + '" added to "dependencies"')
  }
  // dedupe: If package is in both remove from the devDependencies
  if (options.dedupe && this.package.dependencies[name] && this.package.devDependencies[name]) {
    this.logger.warn('"' + name + '" found at "' + this.package.dependencies[name] +
      '" in `dependencies` and at "' + this.package.devDependencies[name] +
      '" in `devDependencies`. Removing from `devDependencies`. WARNING this could cause an incompatibility.')
    ; delete this.package.devDependencies[name]
  }
}

ManagePackageJson.prototype.load = function (cb) {
  fs.readFile(this._path, function (err, contents) {
    if (err) return cb(err)
    try {
      this.package = JSON.parse(contents)
    } catch (e) {
      return cb(e)
    }
    cb(null)
  }.bind(this))
}

ManagePackageJson.prototype.save = function (cb) {

  // Order deps
  this.package.dependencies = sortKeys(this.package.dependencies)
  this.package.devDependencies = sortKeys(this.package.devDependencies)

  fs.writeFile(this._path, JSON.stringify(this.package, false, 2), function (err) {
    if (err) return cb(err)
    cb()
  })
}
