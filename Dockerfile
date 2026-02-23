FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/esi-client/package.json packages/esi-client/package.json

RUN npm ci

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev:api"]
