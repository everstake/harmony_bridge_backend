

git submodule init
git submodule update

## Run in a cloud server
ssh root@139.59.132.104

nohup docker-compose up &   //  => to run in server
tail -f nohup.out
## Run on the local pc
docker-compose up
## Shut down the server
ps x
docker-compose down && rm nohup.out && git pull && docker volume rm $(docker volume ls -q) && docker image prune -a
docker volume rm $(docker volume ls -q)
docker image prune -a
docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)

worker address http://139.59.132.104:3000/







