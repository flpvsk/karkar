#/usr/bin/env bash

source ~/.nvm/nvm.sh

nvm exec v22.9.0 node \
  --experimental-strip-types \
  --experimental-sqlite \
  ./fix-log-types.ts

