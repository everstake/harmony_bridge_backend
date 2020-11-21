FROM node:lts

WORKDIR /app
COPY ./package*.json ./
RUN chown -R node:node /app
RUN npm install -g knex
RUN npm install
RUN cp -r node_modules/scrypt-js node_modules/scrypt-shim
COPY . .
USER node

# EXPOSE 3000
# CMD npm start