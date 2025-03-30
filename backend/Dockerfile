FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Instalăm dependențele, inclusiv Redis
RUN npm install
RUN npm install redis

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
