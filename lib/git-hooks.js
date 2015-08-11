var path = require('path');
var util = require('util');
var spawn = require('child_process').spawn;
var fs = require('fs');
var fsHelpers = require('./fs-helpers');

var HOOKS_DIRNAME = 'hooks';
var HOOKS_DIRNAME_OLD = 'hooks.old';
var HOOKS_TEMPLATE_FILE_NAME = 'hook-template.sh';
var HOOKS = [
    'applypatch-msg',
    'commit-msg',
    'post-applypatch',
    'post-checkout',
    'post-commit',
    'post-merge',
    'post-receive',
    'pre-applypatch',
    'pre-auto-gc',
    'pre-commit',
    'pre-push',
    'pre-rebase',
    'pre-receive',
    'prepare-commit-msg',
    'update'
];

module.exports = {
    /**
     * Installs git hooks.
     *
     * @param {String} [workingDirectory]
     * @throws {Error}
     */
    install: function (workingDirectory) {
        var gitPath = getClosestGitPath(workingDirectory);

        if (!gitPath) {
            throw new Error('git-hooks must be run inside a git repository');
        }

        var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
        var hooksPathOld = path.resolve(gitPath, HOOKS_DIRNAME_OLD);
        var hooksPathExists = fsHelpers.exists(hooksPath);
        var hooksPathOldExists = fsHelpers.exists(hooksPathOld);

        // TODO This is not particularly accurate.
        // What if something else uses the same `.old` suffix?
        if (hooksPathExists && hooksPathOldExists) {
            throw new Error('git-hooks already installed');
        }

        if (hooksPathExists) {
            if (hooksPathOldExists) {
                fsHelpers.removeDir(hooksPathOld);
            }
            fs.renameSync(hooksPath, hooksPathOld);
        }

        var hookTemplate = fs.readFileSync(__dirname + '/' + HOOKS_TEMPLATE_FILE_NAME);
        var pathToGitHooks = path.relative(hooksPath, __dirname);
        var hook = util.format(hookTemplate.toString(), pathToGitHooks);

        fsHelpers.makeDir(hooksPath);
        HOOKS.forEach(function (hookName) {
            var hookPath = path.resolve(hooksPath, hookName);
            fs.writeFileSync(hookPath, hook, {mode: '0777'});
        });
    },

    /**
     * Uninstalls git hooks.
     *
     * @param {String} [workingDirectory]
     * @throws {Error}
     */
    uninstall: function (workingDirectory) {
        var gitPath = getClosestGitPath(workingDirectory);

        if (!gitPath) {
            throw new Error('git-hooks must be run inside a git repository');
        }

        var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
        var hooksPathOld = path.resolve(gitPath, HOOKS_DIRNAME_OLD);

        if (!fsHelpers.exists(hooksPath)) {
            throw new Error('git-hooks is not installed');
        }

        fsHelpers.removeDir(hooksPath);

        if (fsHelpers.exists(hooksPathOld)) {
            fs.renameSync(hooksPathOld, hooksPath);
        }
    },

    /**
     * Runs a git hook.
     *
     * @param {String} filename Path to git hook.
     * @param {String} [arg] Git hook argument.
     * @param {Function} callback, defaults to exit with return code.
     */
    run: function (filename, arg, callback) {
        if (typeof callback !== "function") {
            callback = function(code) { process.exit(code); };
        }
        var hookName = path.basename(filename);
        var hooksDirname = path.resolve(path.dirname(filename), '../../.githooks', hookName);

        if (fsHelpers.exists(hooksDirname)) {
            var list = fs.readdirSync(hooksDirname);
            var hooks = list.map(function (hookName) {
                return path.resolve(hooksDirname, hookName);
            });

            runHooks(hooks, [arg], callback);
        } else {
            callback(0);
        }
    }
};

/**
 * Runs hooks.
 *
 * @param {String[]} hooks List of hook names to execute.
 * @param {String[]} args
 * @param {Function} callback
 */
function runHooks(hooks, args, callback) {
    if (!hooks.length) {
        callback(0);
        return;
    }

    var hook = spawn(hooks.shift(), args, {stdio: 'inherit'});
    hook.on('close', function (code) {
        if (code === 0) {
            runHooks(hooks, args, callback);
        } else {
            callback(code);
        }
    });
}

/**
 * Returns the closest git directory.
 * It starts looking from the current directory and does it up to the fs root.
 * It returns undefined in case where the specified directory isn't found.
 *
 * @param {String} [currentPath] Current started path to search.
 * @returns {String|undefined}
 */
function getClosestGitPath(currentPath) {
    currentPath = currentPath || __dirname;
    // reaches the fs root
    if (currentPath === '/') {
        return;
    }
    var dirnamePath = path.join(currentPath, '.git');

    return fsHelpers.exists(dirnamePath) ?
        dirnamePath :
        getClosestGitPath(path.resolve(currentPath, '..'));
}
