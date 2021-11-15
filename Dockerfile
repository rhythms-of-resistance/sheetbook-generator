FROM node:17-alpine AS base

RUN apk add --no-cache qpdf texlive libreoffice-calc libreoffice-writer ttf-liberation inkscape bash ncurses msttcorefonts-installer git poppler-utils yarn \
    && update-ms-fonts

ENV TERM=xterm-256color
ENV FORCE_COLOR=2

WORKDIR /opt/ror/sheetbook-generator
COPY . .

RUN unzip /opt/ror/sheetbook-generator/BTNGrilledCheese.zip -d /usr/share/fonts/truetype \
    && fc-cache -f

RUN yarn install && yarn run build

############################################################################################

FROM base AS generator

WORKDIR /opt/ror/sheetbook-generator/generator
VOLUME /sheetbook
ENTRYPOINT [ "node", "dist/cli.js", "-i", "/sheetbook", "-o", "/sheetbook/generated" ];

############################################################################################

FROM base AS server

CMD yarn run prod-server
EXPOSE 8955

RUN adduser -D -h /opt/ror -s /bin/sh ror && mkdir /opt/ror/data && chown ror:ror /opt/ror/data
ENV DATA_DIR /opt/ror/data

WORKDIR /opt/ror/sheetbook-generator/server
USER ror

RUN git config --global advice.detachedHead false