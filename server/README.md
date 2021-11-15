ror-sheetbook-server is a web application that allows users to interactively select a RoR sheetbook configuration, in order to then generate the sheetbook PDFs on the fly.

The frontend consists of a simple Vue.js/Bootstrap UI where users can select a format and a selection of tunes. The frontend communicates with the server using socket.io, to fetch a list of tunes and to start the generation of a PDF. The PDFs are generated on the server using various command-line tools, and the log output is sent to the frontend through the socket. The generated PDFs are then stored in a temporary folder and are available for download there for one hour.

# Running the server

## Requirements

When running the server outside of its Docker image, the following command-line tools need to be installed:
* `libreoffice` (in particular, LibreOffice Writer and LibreOffice Calc) is used to convert ODT/ODS files to PDF
* `inkscape` is used to convert SVG files to PDF
* `pdfinfo` (provided by `poppler-utils` or `poppler`) is used to get page size and page count information
* `pdfjam` (provided by `texlive`) is used to scale pages to A4/A5/A6 and to put multiple A5/A6 pages onto each A4 page
* `qpdf` is used to concatenate PDF pages
* `git` is used to extract information about the sheetbook version

In addition, the following fonts need to be installed:
* Arial (often provided by a package such as `msttcorefonts-installer`, `ttf-ms-fonts` or `ttf-mscorefonts-installer`) is the main font used in the sheetbooks.
* Liberation Sans (often provided by a package such as `ttf-liberation` or `fonts-liberation`) is a free replacement for Arial and is needed to render various non-European characters in the sheetbooks.
* [BTN Grilled Cheese](../BTNGrilledCheese.zip) is used in the cover page.

To generate the PDFs, the sheetbook generator needs write access in the data directory (defaults to `data` in the root of this project, but can be changed using the `DATA_DIR` environment variable).

## Docker

The easiest way to run the sheetbook server is to use docker, as all the required dependencies are installed in the docker image.

Use the following command to start the server:
```bash
docker run -p 127.0.0.1:8955:8955 rhythmsofresistance/sheetbook-server
```

This will make the server available on http://localhost:8955/. To make it publicly available, run it behind a reverse proxy such as [nginx-proxy](https://hub.docker.com/r/jwilder/nginx-proxy) or [traefik](https://hub.docker.com/_/traefik).

## Manual build

To build the server manually, first run `yarn install` to install all the Node.js dependencies. Run `yarn build` once inside the `frontend` directory and once inside the `server` directory. Then run `yarn prod-server` in the `server` directory. Make sure to have all [requirements](#requirements) set up.

## Dev build

While developing, a dev server can be started that automatically rebuilds when files are changed, making it unnecessary to manually run a rebuild after each change. To run the dev server, run `yarn install` to install all Node.js dependencies and then run `yarn dev-server` in the `server` directory. Changes in Vue templates and SCSS files are applied live, changes in other frontend files are available after a page refresh, and changes in the server code are available after a simple server restart.