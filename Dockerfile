FROM node:12-slim
WORKDIR /usr/src/app
RUN chown -R node:node /usr/src/app
USER node
COPY --chown=node:node ./dist/src/ ./
RUN npm install --only=prod && npm cache clean --force
COPY --chown=node:node . .
EXPOSE 8081
CMD [ "node","index.js" ]