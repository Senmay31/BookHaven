FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install production dependencies only — no dev tools needed
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]