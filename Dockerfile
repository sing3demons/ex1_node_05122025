FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./

RUN npm install

COPY src ./src

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package.json ./

RUN npm install --only=production

CMD ["node", "dist/index.js"]