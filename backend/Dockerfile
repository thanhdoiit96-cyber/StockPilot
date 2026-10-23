FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY .sequelizerc ./
COPY src ./src
COPY scripts ./scripts
USER node
EXPOSE 5000
CMD ["npm", "start"]
