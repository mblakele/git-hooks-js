#!/usr/bin/env node

try {
    require('%s/git-hooks').run(__filename, process.argv[2], function (code) {
        process.exit(code);
    });
} catch (e) {
    console.error('Cannot find git-hooks. Did you install it?');
}
