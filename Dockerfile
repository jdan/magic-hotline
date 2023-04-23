FROM node:20-alpine3.16

WORKDIR /app
COPY . /app

RUN npm install
CMD ["npm", "start"]