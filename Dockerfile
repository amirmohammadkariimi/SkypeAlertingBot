FROM node:15.2.1-alpine3.10
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3978
CMD ["npm", "run", "pm2"]
