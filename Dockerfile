# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim as base

# Next.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ENV GOLD_API_URL="https://gold-api.santirev.com"
ENV GOLD_API_KEY="santi.dev"
ENV FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"goldsilver-app","private_key_id":"fb447213f94d7ad6181c72c590fba7c1795a5ebf","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+WlACbX3SxMX7\noMYmcfHNvQVnRRTjp7KfW9NapuVDakandLYufWx3UjHVibissYynjulkL78q2ZPR\nETNXinhPPi7PvDjAc424BnXV4CRGRpz+NqGJ4BgDU2WwEUbC7JS21vySLbOaAnbS\nfT4T0CeXvyXi7zlY1R+vJ34btC9ekWJ3ng8G61w1Mq0pC6wtlC/ppm+ypCJgxGrQ\nIrqMu1lSB0iC8lY7jspZ+tvlTvrxnDtukk2cdjjsuJyZkCk4EU4ScWUixmYzryM/\nDBjwMxTQaqmyZKzKTIMVEZeN2jRJmaVt4tdekiNhXzyWW6Rtqncs4b21YMpUTcck\nvy4tWGqFAgMBAAECggEAAdugePWX9c0FNa3dtpWuy4LzIOKUD/NyEzYdO6mcsT9s\nox5zghlSoV4vAwDjdDljaxCXsepOuQdYoatuTzDDIzAzMBnhNUJWJBwECGtgpJhJ\n2KgF2Zz9/wJQYBs7D+n+kEOhls0AD2/DYyM6eOJeOzqaubqmBPpHjePFH6tu5EMO\nAqQTr2VmE1TCFTgQF+cSWCrp4qXj2mYJUuz/3GKOigfrtw/YwQdCF9OdI0a4au0n\nu3d1607Ak2qOIQPSoz1PexOGpJAlfki9veF0N7oKQbbHGX08XukiXvAUwKblWdyW\nW6FiUARPIap9FuWOABDmhs29CW6PeFuBkaOCrZx0XQKBgQD1XjpglTMZk9rY6Uqh\nGzdXXisyI4QIJPsALE8IFYiP6d9Dbr4SvwIog8SZ3hMm73R/bk3urd91fh+ZhEPQ\ncT404Anz2xFWcJYX/ERIgnIinuo7R3lC3wvrbglJPbG5pGZUft8T8lfqL534sQA/\nMGr0jJ8pDsVZhtB8I+KmQMMmpwKBgQDGmdJGd7B3swTR/Ycnojz/RPEDkiZwS9be\nLpHhq3Vilbq7LkJ6XXYsAhXa864kuZ8iEndPSIAhri2r4FtLJQcapJgdETrXj4Kw\nTE6lIkcn63OQ3LYb0dZKhEzdj6pHYdtQ2LTPzVzZSacVLyNGLL7wiPEiqBo2Z7Zr\nOpfVyGC28wKBgEalE5+9NVI27LqpKJCMGnnwJfWwnhIOO6pIF5UXRhNRXbO3jcgt\n8HwjvBYlB1Sdeug5pPyEWSMl5gk4OKIqCKQGoTbxquM9VSmguzQ5Qo1PPddFc9da\nCr+FFe1dcu8lM0U+phHDI6bMgOoaZBzNXu38EtMqao2lMB+d4WLGoKlfAoGAaF8q\nnRIF0cJpRBqjTvb6a4VFzISgYt/YekerLxg2xqq9yeVT1o8LrbEi30C1QmOy9+sQ\nfMAzZn/tTKjKEcHR6/SAZJ5LeEHZguF3a12KW7Zns7fqlNBAeETzSHVaHc2VvvVE\ngPkCVMdaYc22EgkuB6dQYtBJhlIXEl9msFlwSnUCgYEAr96lPokwCNoX8AUMrgXr\nF7Tx0T4k+GiaGOXJKMa46DEBSYhTgcOUrm2WLolpeq5Cv3bYmKI+HXeLoELeZfSO\ng2mzs3zMU/+Fw1DXxlvDSStn5XrPyuFQ7khKwjbaX3PV+QPZRK0nAaneIN4yBmlk\nk4S558pfPxJOJbOFyoqGGf8=\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@goldsilver-app.iam.gserviceaccount.com","client_id":"112309070645377858711","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40goldsilver-app.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'


# Throw-away build stage to reduce size of final image
FROM base as build

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Public API endpoint baked at build time (overridable via build-arg)
ARG NEXT_PUBLIC_GOLD_API_URL=https://gold-api.santirev.com
ARG NEXT_PUBLIC_GOLD_API_KEY=santi.dev
ENV NEXT_PUBLIC_GOLD_API_URL=$NEXT_PUBLIC_GOLD_API_URL
ENV NEXT_PUBLIC_GOLD_API_KEY=$NEXT_PUBLIC_GOLD_API_KEY

# Build application (drop Next build cache to slim the image)
RUN npm run build && rm -rf .next/cache

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000

# Comando para iniciar la aplicación
CMD [ "npm", "run", "start" ]
#CMD ["sh", "-c", "npx playwright install --with-deps && npm run start"]
