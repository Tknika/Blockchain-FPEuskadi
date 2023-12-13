#!/bin/bash
docker container stop $(docker container ls -aq)
docker container prune -f
rm -r ./Node/data/caches
rm -r ./Node/data/database
rm ./Node/data/DATABASE_METADATA.json
