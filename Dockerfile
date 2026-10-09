FROM node:20-alpine

WORKDIR /app

COPY package.json app.js test.js ./

ENV PORT=3000
ENV APP_VERSION=container

EXPOSE 3000

CMD ["npm", "start"]