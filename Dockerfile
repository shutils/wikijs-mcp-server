FROM node:22-alpine

WORKDIR /app

COPY ./package*.json /app/
COPY ./tsconfig.json /app/

RUN npm ci

COPY ./src /app/src

RUN npm run prestart
CMD ["npm", "start"]