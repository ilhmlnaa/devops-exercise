FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY src/ ./src/

RUN addgroup -g 1001 -S nodejs
RUN adduser -S consumer -u 1001

RUN chown -R consumer:nodejs /app
USER consumer

CMD ["npm", "start"]
