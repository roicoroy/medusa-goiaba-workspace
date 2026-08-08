FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install additional OS packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends postgresql-client

# Install global node packages
RUN su node -c "npm install -g pnpm nx @medusajs/medusa-cli"
