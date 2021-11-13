ror-sheetbook-generator is a Node.js library and CLI to generate PDF files from the [RoR sheetbook](https://github.com/rhythms-of-resistance/sheetbook). It mostly relies on various command-line tools to create and modify the PDF files.

For the CLI a Docker image exists, which allows to run it without having to install all the dependencies.

# Requirements

To use the Node.js library or to run the CLI outside of its Docker image, the following command-line tools need to be installed:
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

To generate the PDFs, the sheetbook generator needs write access in the output directory and in the system's temp directory (usually `/tmp`).

# CLI

## Docker

Running the CLI using docker is the most reliable way, as the dependencies and fonts are installed inside the Docker image. To run the CLI, use the following command from within a working copy of the [sheetbook repository](https://github.com/rhythms-of-resistance/sheetbook):

```bash
docker run --rm -v "$PWD:/sheetbook" rhythmsofresistance/sheetbook-generator spec...
```

`spec...` is a [sheetbook specification](#sheetbook-specification) as described below. The sheetbooks will be generated in the `generated` folder.

## NPM script

To run the CLI outside of docker, first make sure to have all the [requirements](#requirements) installed. Check out this repository, and within the `generator` directory, run `yarn install` and then `yarn build`. You can then run the CLI in the following way:
```bash
yarn cli -i /sheetbook -o /sheetbook/generated spec...
```

Where `/sheetbook` is the location of your working copy of the [sheetbook repository](https://github.com/rhythms-of-resistance/sheetbook), and `spec...` is a [sheetbook specification](#sheetbook-specification) as described below.

If you make modifications to the source code and don't want to rebuild it each time, you can also call `yarn dev-cli`, which will compile the TypeScript files on the fly.

## Sheetbook specification

The sheetbook generator has the ability to generate single-tune A4 PDFs and multi-tune A4, A5 and A6 PDF booklets. Multiple PDFs can be generated at once, which is faster than creating each PDF in a separate call since some temporary files can be reused. To tell the sheetbook generator which PDFs should be generated, one or multiple sheetbook specifications are passed as an argument.

To generate a single-tune A4 PDF, use the specificiation `single:<tune>`. `<tune>` is the name of a tune file in the [sheetbook repository](https://github.com/rhythms-of-resistance/sheetbook), without its `.ods` extension, for example `angela-davis` or `funk`. The PDF is generated as `single/<tune>.pdf` in the output directory.

You can also generate multiple single-tune A4 PDFs by specifying multiple tunes comma-separated, for example `single:angela-davis,funk`. The virtual tune name `all` stands for all tunes available (including breaks, network description and dances), so specifying `single:all` will generate sheets for all tunes. `no-ca` stands for all tunes except the controversial cultural approproation tunes.

To generate a booklet, use `booklet:<format>:<tunes>`. This will generate a booklet containing a front and back cover and the tunes selected. Blank pages might be inserted to make sure the total page count is dividable by 2 (for A4) or 4 (for A5/A6). `<format>` can be `a4`, `a5` or `a6`. `<tunes>` can be a comma-separated list of tunes, or `all` (for all existing tunes, including breaks, network description and dances) or `no-ca` (for all existing tunes except controversial cultural appropriation tunes). Examples: `booklet:a4:all`, `booklet:a6:no-ca`, `booklet:a5:breaks,angela-davis,bhangra,karla-shnikov,funk,sambasso`

To generate multiple sheets at once, simply pass multiple specifications separated by space, for example `single:all booklet:a4:all booklet:a5:all booklet:a6:all`. When using bash (and potentially other shells), this can be simplified as `single:all booklet:{a4,a5,a6}:all`.