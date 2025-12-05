# _pp_tr

A TypeScript project template for building Node.js applications with Express and MongoDB.

```bash
docker build -t sing3demons/node_auth:1.0.1 .
docker run --name auth_node -e PORT=3000 -e MONGODB_URL=mongodb://host.docker.internal:27017 -p 3000:3000 sing3demons/node_auth:1.0.1
```