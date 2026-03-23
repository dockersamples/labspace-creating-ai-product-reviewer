FROM node:lts-slim
WORKDIR /usr/local/app
COPY package* ./
RUN npm ci && npm cache clean --force
COPY index.js ./
COPY src/ ./src/
CMD ["node", "./index.js"]
