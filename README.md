## Getting Started

First, install Docker on your computer and open it. Then run:

```bash
npm i
cd codeRunner
docker build -t skillbit .
cd ..
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

---

# Docker

## Install docker

- Update the packages on your instance: `sudo yum update -y`
- Install Docker: `sudo yum install docker -y`
- Start the Docker Service: `sudo service docker start`
- Add the ec2-user to the docker group so you can execute Docker commands without using sudo: `sudo usermod -a -G docker ec2-user`

## Upload files

- `cd ~`
- `mkdir code_runner`
- `cd code_runner`
- `nano Dockerfile` and paste contents
- `nano package.json` and paste contents
- `nano codeRunner.env` and paste contents
- `nano server.js` and paste contents
- `cd ~`

## build image

- `cd ~`
- `sudo docker build -t code_runner ./code_runner`

## Edit docker service unit file

- Edit the Docker service unit file: `sudo systemctl edit docker`

Make sure the lines exist and/or read:

```
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H tcp://0.0.0.0:2375 -H unix:///var/run/docker.sock
```

- Reload the daemon: `sudo systemctl daemon-reload`
- Restart docker: `sudo systemctl restart docker`

## Set up nginx

- install nginx: `sudo yum install nginx`
- `sudo nano /etc/nginx/conf.d/dynamic-ports.conf`
- start nginx: `sudo systemctl start nginx`
- paste this in the file:

```
server {
    listen 80;
    server_name api.skillbit.org 127.0.0.1;

location ~ "^/(?<port>[1-9]\d{0,3})/?(?<restOfPath>.*)$" {
    # Rewrite the URL to remove the port from the path.
    # For example, /3001/socket.io/ becomes /socket.io/
    rewrite "^/(?<port>[1-9]\d{0,3})/?(.*)$ /$2" break;

    # Use HTTP/1.1 for WebSocket support.
    proxy_http_version 1.1;

    # Pass upgrade headers for WebSocket connections.
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Forward the request to the backend, appending the original query string.
    proxy_pass http://127.0.0.1:$port/$restOfPath$is_args$args;

    # Pass along other headers.
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:3002$request_uri;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
}
```

- test: `sudo nginx -t`
- reload: `sudo systemctl reload nginx`

## Update DNS

## Other general commands

- Remove all docker containers (active and inactive): `docker rm -v -f $(docker ps -qa)`
- Remove only inactive docker containers: `docker rm -v $(docker ps --filter status=exited -q)`
- Show all containers: `docker ps -all`
- Restart docker: `sudo systemctl restart docker`
- Stop docker: `sudo systemctl stop docker`
- Start docker manually with desired hosts: `sudo dockerd -H tcp://0.0.0.0:2375 -H unix:///var/run/docker.sock`

- Remember to set elastic IP address on EC2 instance
