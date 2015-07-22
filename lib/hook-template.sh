#!/usr/bin/env bash
#

# Bootstrap nvm environment, for GUI tools.
# This assumes nvm was installed per-user in `~/.nvm`.
if [ -z "$NVM_DIR" ]; then
  export NVM_DIR="$HOME/.nvm"
fi
NVM_SH="$NVM_DIR/nvm.sh"
if [ -x "$NVM_SH" ]; then
  source "$NVM_SH"
else
  echo FATAL: nvm.sh at $NVM_SH is missing, unreadable, or not executable!
  exit 1
fi

# The path is a little awkward.
$PWD/.git/hooks/%s/../bin/git-hooks \
  --run $0 $2

# end
