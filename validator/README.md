# harmony_bridge_backend

## create .env
  ```
  cp  .env_template .env
  ```

## Running an Edgeware Node
  ```
    git clone https://github.com/yangwao/substrate_playground
    cd substrate_playground
    docker-compose up
  ```

## For interact with your node using the Polkadot UI:
  sudo docker run --rm -it --name polkadot-ui -e WS_URL=ws://edgeware_develop:9944 -p 80:80 jacogr/polkadot-js-apps:latest
