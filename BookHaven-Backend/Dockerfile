# ── Stage 1: Base image ──
# Use Node.js 20 on Alpine Linux — Alpine is a tiny Linux distro 
# that keeps the image size small
FROM node:20-alpine

# Set the working directory inside the container
# All subsequent commands run from this folder
WORKDIR /app

# ── Stage 2: Install dependencies ──
# Copy package files first — Docker caches this layer
# so npm install only re-runs when package.json changes
COPY package*.json ./

# Install production dependencies only — no dev tools needed
RUN npm install --production

# ── Stage 3: Copy source code ──
# Copy everything else (src folder, config files etc.)
COPY . .

RUN echo "=== Contents of /app ===" && ls -la /app
RUN echo "=== Contents of /app/src ===" && ls -la /app/src

# ── Stage 4: Configure ──
# Tell the container which port your Express server uses
EXPOSE 5000

# The command that runs when the container starts
CMD ["node", "src/server.js"]