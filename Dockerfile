FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY client/dist ./client/dist
COPY server.js ./
COPY save.json ./
EXPOSE 7777
CMD ["node", "server.js"]
