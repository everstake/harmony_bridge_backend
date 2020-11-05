FROM node:lts

WORKDIR /app
COPY ./package*.json ./
RUN chown -R node:node /app
RUN npm install -g knex
RUN npm install
COPY . .
USER node
EXPOSE 3000