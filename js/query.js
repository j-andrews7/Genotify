(function() {
    var speciesObj = null;
    var xmlParser = new DOMParser();

    document.addEventListener('DOMContentLoaded', function(event) {
        retrieveSpeciesJSON();

        document.getElementById('search-button').addEventListener('click', newQuery);
        document.getElementById('query').addEventListener('keypress', function(e) {
            var key = e.which || e.keyCode;

            if (key === 13) {
                newQuery();
            }
        });
    });

    function retrieveSpeciesJSON() {
        fetch('http://localhost:8000/species.json').then(function(response) {
            if (response.status !== 200) {
                console.log('Looks like there was a problem. Status Code: ' + response.status);
                return;
            }

            response.json().then(function(data) {
                speciesObj = data;
            }).catch(function(error) {
                console.log('Malformed or invalid species.json: ' + error);
            });
        }).catch(function(error) {
            console.log('Unable to retrieve species.json: ' + error);
        });
    }

    function newQuery() {
        if (speciesObj === null) {
            return;
        }


        var term = document.getElementById('query').value;
        var queryUrl = 'https://mygene.info/v3/query?q=' + term;
        var speciesOptions = document.getElementById('species-sel');

        if (speciesOptions.selectedIndex !== -1) {
            var species = speciesOptions.options[speciesOptions.selectedIndex].value;

            queryUrl = 'https://mygene.info/v3/query?q=' + term + '&species=' + species;
        }

        fetch(queryUrl).then(function(response) {
                if (response.status !== 200) {
                    console.log('Fetch Query Error. Status Code: ' + response.status);
                    return;
                }

                response.json().then(function(data) {
                    console.log(data);
                    if (data.total !== 0 && data.success !== false) {
                        topHit = data.hits[0];

                        var basics = {
                            'gene-symbol': topHit.symbol,
                            'gene-name': topHit.name,
                            'gene-id': {
                                db: 'https://www.ncbi.nlm.nih.gov/gene/',
                                ident: topHit._id
                            },
                            'match-score': topHit._score,
                            'hits': data.hits.length
                        };

                        displayData(basics);
                        displayHeadings();
                        annotateGene(topHit._id);
                    } else {
                        var empty = {
                            hits: 'No hits',
                            matchScore: 0
                        };

                        displayData(empty);
                        hideData(document.getElementById('info-div'));
                        hideData(document.getElementById('loc-div'));
                        hideData(document.getElementById('summary-div'));
                        hideData(document.getElementById('species-div'));
                        hideHeadings();
                    }
                });
            })
            .catch(function(err) {
                console.error('Fetch Query Error', err);
            });
    }

    function displayData(dataObj) {
        for (data in dataObj) {
            if (typeof dataObj[data] !== 'undefined' && dataObj[data] !== null) {
                currentData = document.getElementById(data);
                currentData.classList.remove('hidden');
                currentLabel = document.getElementById(data + '-label');
                currentLabel.classList.remove('hidden');

                // Add new/remove old links from appropriate divs.
                if (currentData.classList.contains('addlink')) {
                    var oldLinks = currentData.getElementsByTagName('a');
                    while (oldLinks.length > 0) {
                        oldLinks[0].parentNode.removeChild(oldLinks[0]);
                    }
                    var linkData = dataObj[data];
                    var link = linkData['db'] + linkData['ident'];
                    var aTag = document.createElement('a');
                    aTag.setAttribute('href', link);
                    aTag.textContent = linkData['ident'];
                    currentData.appendChild(aTag);
                } else {
                    currentData.textContent = dataObj[data];
                }
            } else {
                // Hide and clear any previous results.
                currentData = document.getElementById(data);
                if (!currentData.classList.contains('hidden')) {
                    currentData.textContent = '';
                    currentData.classList.add('hidden');
                }
                // Remove links of previous results.
                if (currentData.classList.contains('addlink')) {
                    var oldLinks = currentData.getElementsByTagName('a');
                    while (oldLinks.length > 0) {
                        oldLinks[0].parentNode.removeChild(oldLinks[0]);
                    }
                }
                // Hide labels too.
                currentLabel = document.getElementById(data + '-label');
                if (!currentLabel.classList.contains('hidden')) {
                    currentLabel.classList.add('hidden');
                }
            }

        }
    }

    function hideData(divObj) {
        // Hide all data in child nodes of givin div element.
        var labels = divObj.querySelectorAll("label");
        var links = divObj.querySelectorAll('a');
        var i;
        var textDivs = divObj.getElementsByClassName("text");

        for (i = 0; i < labels.length; i++) {
            var childData = labels[i];

            if (!(childData.classList.contains('hidden'))) {
                childData.classList.add('hidden');
            }
        }

        for (i = 0; i < textDivs.length; i++) {
            var childData = textDivs[i];

            if (!(childData.classList.contains('hidden'))) {
                childData.classList.add('hidden');
                childData.textContent = '';
            }
        }

        // Delete any links if necessary.
        for (i = 0; i < links.length; i++) {
            var childData = links[i];
            childData.remove();
        }
    }

    function annotateGene(gene) {
        fetch('https://mygene.info/v3/gene/' + gene)
            .then(
                function(response) {
                    if (response.status !== 200) {
                        console.log('Looks like there was a problem. Status Code: ' +
                            response.status);
                        return;
                    }

                    // Examine the text in the response
                    response.json().then(function(data) {
                        console.log(data);
                        parseGeneData(data).then(function(data) {
                            displayData(data)
                        });
                    });
                }
            )
            .catch(function(err) {
                console.error('Fetch Gene Annotation Error', err);
            });
    }

    function parseGeneData(data) {
        return new Promise(function(resolve, reject) {
            var aliases;
            var hgnc;
            var coords;
            var hg19coords;
            var mm9coords;
            var names;
            var uniprotSum;
            var wiki;
            var omim;
            var ensembl;
            var vega;
            var pfam;
            var uniprot;
            var pharmgkb;
            var prosite;

            if (data.hasOwnProperty('HGNC')) {
                hgnc = {
                    db: 'https://www.genenames.org/cgi-bin/gene_symbol_report?hgnc_id=',
                    ident: data.HGNC
                };
            } else {
                hgnc = null;
            }

            if (data.hasOwnProperty('wikipedia')) {
                wiki = {
                    db: 'https://en.wikipedia.org/wiki/',
                    ident: data.wikipedia['url_stub'].replace(/ /g, '_')
                };
            } else {
                wiki = null;
            }

            if (data.hasOwnProperty('MIM')) {
                omim = {
                    db: 'http://omim.org/entry/',
                    ident: data.MIM
                };
            } else {
                omim = null;
            }

            if (data.hasOwnProperty('ensembl')) {
                ensembl = {
                    db: 'https://www.ensembl.org/Gene/Summary?g=',
                    ident: data.ensembl['gene']
                };
            } else {
                ensembl = null;
            }

            if (data.hasOwnProperty('Vega')) {
                vega = {
                    db: 'http://vega.archive.ensembl.org/Gene/Summary?g=',
                    ident: data.Vega
                };
            } else {
                Vega = null;
            }

            if (data.hasOwnProperty('pfam')) {
                pfam = {
                    db: 'http://pfam.xfam.org/family/',
                    ident: data.pfam
                };
            } else {
                pfam = null;
            }

            if (data.hasOwnProperty('pharmgkb')) {
                pharmgkb = {
                    db: 'https://www.pharmgkb.org/gene/',
                    ident: data.pharmgkb
                };
            } else {
                pharmgkb = null;
            }

            if (data.hasOwnProperty('prosite')) {
                prosite = {
                    db: 'https://prosite.expasy.org/',
                    ident: data.prosite
                };
            } else {
                prosite = null;
            }

            if (data.hasOwnProperty('alias') && typeof data.alias === 'string') {
                aliases = data.alias;
            } else if (data.hasOwnProperty('alias')) {
                aliases = data.alias.join(', ');
            }

            if (data.hasOwnProperty('genomic_pos')) {
                coords = 'chr' + data.genomic_pos.chr + ':' + data.genomic_pos.start + '-' + data.genomic_pos.end;
            }

            if (data.hasOwnProperty('genomic_pos_hg19')) {
                hg19coords = 'chr' + data.genomic_pos_hg19.chr + ':' + data.genomic_pos_hg19.start + '-' + data.genomic_pos_hg19.end;
            }

            if (data.hasOwnProperty('genomic_pos_mm9')) {
                mm9coords = 'chr' + data.genomic_pos_mm9.chr + ':' + data.genomic_pos_mm9.start + '-' + data.genomic_pos_mm9.end;
            }

            if (data.hasOwnProperty('other_names') && typeof data.other_names === 'string') {
                names = data.other_names;
            } else if (data.hasOwnProperty('other_names')) {
                names = data.other_names.join(', ');
            }

            if (data.hasOwnProperty('uniprot') && data.uniprot['Swiss-Prot'] !== undefined) {
                uniprot = {
                    db: 'http://www.uniprot.org/uniprot/',
                    ident: data.uniprot['Swiss-Prot']
                };
                getUniprotSummary(data.uniprot['Swiss-Prot']).then(function(uniprotSum) {

                    resolve({
                        'entrez-summary': data.summary,
                        'alias': aliases,
                        'hgnc-id': hgnc,
                        'location': data.map_location,
                        'gen-pos': coords,
                        '19gen-pos': hg19coords,
                        'mm9gen-pos': mm9coords,
                        'tax-id': data.taxid,
                        'species': speciesObj[data.taxid],
                        'other-names': names,
                        'gene-type': data.type_of_gene,
                        'wikipedia': wiki,
                        'omim': omim,
                        'ensembl': ensembl,
                        'vega': vega,
                        'uniprot': uniprot,
                        'pfam': pfam,
                        'pharmgkb': pharmgkb,
                        'prosite': prosite,
                        'uniprot-summary': uniprotSum
                    });
                }).catch(function(error) {
                    console.error(error);

                    // Resolve without the uniprot summary if we can't get it
                    resolve({
                        'entrez-summary': data.summary,
                        'alias': aliases,
                        'hgnc-id': hgnc,
                        'location': data.map_location,
                        'gen-pos': coords,
                        '19gen-pos': hg19coords,
                        'mm9gen-pos': mm9coords,
                        'tax-id': data.taxid,
                        'species': speciesObj[data.taxid],
                        'other-names': names,
                        'gene-type': data.type_of_gene,
                        'wikipedia': wiki,
                        'omim': omim,
                        'ensembl': ensembl,
                        'vega': vega,
                        'uniprot': uniprot,
                        'pfam': pfam,
                        'pharmgkb': pharmgkb,
                        'prosite': prosite,
                        'uniprot-summary': null
                    });
                });
            } else {
                resolve({
                    'entrez-summary': data.summary,
                    'alias': aliases,
                    'hgnc-id': hgnc,
                    'location': data.map_location,
                    'gen-pos': coords,
                    '19gen-pos': hg19coords,
                    'mm9gen-pos': mm9coords,
                    'tax-id': data.taxid,
                    'species': speciesObj[data.taxid],
                    'other-names': names,
                    'gene-type': data.type_of_gene,
                    'wikipedia': wiki,
                    'omim': omim,
                    'ensembl': ensembl,
                    'vega': vega,
                    'uniprot': uniprot,
                    'pfam': pfam,
                    'pharmgkb': pharmgkb,
                    'prosite': prosite,
                    'uniprot-summary': null
                });
            }
        });

    }

    function getUniprotSummary(id) {
        return new Promise(function(resolve, reject) {
            if (!id) {
                reject();
            }

            var summary;

            fetch('http://www.uniprot.org/uniprot/' + id + '.xml').then(function(response) {
                if (response.status !== 200) {
                    console.log('Looks like there was a problem. Status Code: ' + response.status);

                    reject();
                }

                response.text().then(function(data) {
                    var parsedXML = xmlParser.parseFromString(data, "text/xml");
                    var comments = parsedXML.querySelectorAll('comment[type="function"]');

                    for (var i = 0; i < comments.length; i++) {
                        summary = comments[0].textContent;
                    }
                    resolve(summary);
                })
            }).catch(function(err) {
                console.error('Fetch Uniprot Error', err);

                reject();
            });
        });
    }

    // Display and hide section headings as appropriate.
    function displayHeadings() {
        var headers = document.querySelectorAll("h3");

        for (var i = 0; i < headers.length; i++) {
            var childData = headers[i];

            if (childData.classList.contains('hidden')) {
                childData.classList.remove('hidden');
            }
        }
    }

    function hideHeadings() {
        var headers = document.querySelectorAll("h3");

        for (var i = 0; i < headers.length; i++) {
            var childData = headers[i];

            if (!(childData.classList.contains('hidden'))) {
                childData.classList.add('hidden');
            }
        }
    }
})();