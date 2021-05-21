

git submodule init
git submodule update

## Run in a cloud server
nohup docker-compose up &   //  => to run in server
tail -f nohup.out
## Run on the local pc
docker-compose up
## Shut down the server
ps x
docker-compose down
docker volume rm $(docker volume ls -q)
docker image prune -a

worker address http://139.59.132.104:3000/
wscat -c "wss://139.59.132.104:9944" - check websocket connection
sudo lsof -i -P -n | grep 5432
docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)
@polkadot/api": "3.10.2",






