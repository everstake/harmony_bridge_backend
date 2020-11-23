FROM node:lts

WORKDIR /app
COPY ./package*.json ./
RUN npm install -g knex
RUN npm install
RUN cp -r node_modules/scrypt-js node_modules/scrypt-shim
COPY . .

# EXPOSE 3000
# CMD npm start