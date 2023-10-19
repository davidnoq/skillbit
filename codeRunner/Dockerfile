FROM ubuntu:latest
WORKDIR /server
EXPOSE 9999
RUN apt update && apt upgrade -y
RUN apt-get install -y curl && apt-get install -y nodejs build-essential && apt-get install -y npm
COPY package.json .
RUN npm install
COPY . .
RUN npm rebuild node-pty
CMD ["node", "server.js"]

