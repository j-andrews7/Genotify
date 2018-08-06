# Genotify

---

Genotify is a light-weight, cross-platform desktop application for quick gene annotations. If you're a molecular biology researcher or bioinformaticist, you likely find yourself Googling gene names relatively frequently, especially when doing a heavy lit review or poring through tables of differentially expressed genes. **Genotify** provides up-to-date gene info and access to multiple interactive widgets without opening a browser. Simply copy a gene name, ID, or symbol to your clipboard and use `ctrl+q` (or `cmd+q`) to query for that gene. Limit by species if you so desire. Click any of the resulting text boxes to copy them to your clipboard.

This program aims to give you access to all of the resources you could ever want for a gene, from links to all of the major databases to functional summaries. Hopefully it does it well.

---

## Installation
Just download the [release](https://github.com/j-andrews7/GenotifyDesktop/releases) for your OS, unpack, and run. To build from source with `node.js`, you can clone the repo and run `npm install` followed by `npm start`.

## Usage
Genotify is dead simple to use. Type a query into the search box and click the search button, hit enter, or use the hotkey `ctrl+q` (or `cmd+q`) to query from clipboard (even if Genotify isn't focused!). Search for and select species with the species filter, or filter hits in the hits table dynamically. Clicking on a different hit in the hits table will show the information for that hit. Expand the various sections to read what said gene does, explore expression data, see disease associations, or view links out to various data sources. Clicking on a text box will copy its contents to your clipboard for easy copying.

## Issues/Comments
Hit up the issues pages here and describe the issue in detail. Screenshots may be helpful. I'm usually pretty quick to respond. We are also open to suggestions for new features.

## Contributing
For developing, you will need [`node.js`](https://nodejs.org/en/) installed. Clone the repo and install with `npm install` and run with `npm start`. If you want to contribute, open a pull request that addresses a known issue or adds something of value.

## License
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see http://www.gnu.org/licenses/.

Copyright 2018, Payton Lab
