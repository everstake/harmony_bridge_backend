

git submodule init
git submodule update

## Run in a cloud server
nohup docker-compose up —build &   to run in server
## Run on the local pc
docker-compose up
## Shut down the server
ps x
docker-compose down
docker volume rm $(docker volume ls -q)
docker image prune -a

worker address http://139.59.132.104:3000/







