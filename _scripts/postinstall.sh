#!/bin/sh -ex

_scripts/install_all.sh
pm2 delete servers.json && pm2 start servers.json
echo "Use './pm2 kill' to stop all the servers"
