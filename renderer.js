const loadJsonFile = require('load-json-file');
const ipcRenderer = require('electron').ipcRenderer;
const clipboard = require('electron').clipboard;
const {
  app
} = require('electron').remote;

window.$ = window.jQuery = require('jquery');
require('datatables.net')(window, $);
require('./assets/js/ellipsis.js');
window.Bootstrap = require('bootstrap');
require('./assets/js/jquery.flexdatalist.min.js');
var ProtVista = require('ProtVista');

var speciesObj = null;
var expObj = null;
var xmlParser = new DOMParser();
var currentHit = null;
var species = [];
var hitsTable;
var expTable;
var diseaseTable;
var idMap = {};
var hits;
var currentExp = null;

var basepath = app.getAppPath();

document.addEventListener('DOMContentLoaded', function(event) {
  retrieveSpeciesJSON();
  retrieveExpList();

  ipcRenderer.send('loaded');
  // Listen for command to read from clipboard.
  ipcRenderer.on('queryFromClipboard', function(event, clipboardContents) {
    document.getElementById('query').value = clipboardContents;
    newQuery(clipboardContents);
  });

  // Used for tooltip to tell user text has been copied to clipboard.
  $('.text').tooltip({
    trigger: 'click',
    placement: 'top',
    title: 'Copied!',
    delay: {
      show: 0,
      hide: 500
    }
  });

  // Help tooltip functionality.
  $('[data-toggle="tooltip"]').tooltip({
    placement: 'top',
    delay: {
      show: 300,
      hide: 300
    }
  });

  function hideTooltip(x) {
    setTimeout(function() {
      x.tooltip('hide');
    }, 1000);
  }

  // Table initializations.
  hitsTable = $('#hits-table').DataTable({
    scrollY: '150px',
    scrollX: false,
    scrollCollapse: true,
    paging: false,
    language: {
      'search': 'Search Hits:'
    },
    columns: [{
      title: 'Symbol'
    }, {
      title: 'ID'
    }, {
      title: 'Species'
    }, {
      title: 'Score'
    }],
    order: [
      [3, 'desc']
    ],
    columnDefs: [{
      targets: 1,
      render: $.fn.dataTable.render.ellipsis(9)
    }]
  });

  expTable = $('#exp-table').DataTable({
    scrollY: '150px',
    scrollX: false,
    scrollCollapse: true,
    paging: false,
    language: {
      'search': 'Search Experiments:'
    },
    columns: [{
      title: 'ID',
      width: '20%'
    }, {
      title: 'Description'
    }, {
      title: 'Type'
    }]
  });

  diseaseTable = $('#disease-table').DataTable({
    scrollY: '150px',
    scrollX: false,
    scrollCollapse: true,
    paging: false,
    columns: [{
      title: 'Disease'
    }, {
      title: 'Disease ID'
    }, {
      title: 'PubMed/OMIM IDs'
    }, {
      title: 'CTDbase'
    }]
  });

  // Handle switching which hit is displayed.
  document.querySelector('#hits-table tbody').addEventListener('click',
    function(event) {
      var td = event.target;
      var tbl = document.getElementById('hits-table');
      while (td !== this && !td.matches('td')) {
        td = td.parentNode;
      }
      if (td === this) {
        console.log('No table cell found');
      } else {
        // Use row and cell indices to get the hit data for row clicked on.
        var row = td.parentNode.rowIndex;
        var hitID = tbl.rows[row].cells[1].innerHTML;
        // Deal with possible ellipses in content.
        if (hitID.includes('span')) {
          var s = $(hitID);
          hitID = s[0].title;
        }
        parseGeneData(hits[idMap[hitID]]).then(function(results) {
          displayData(results);
        });
      }
    });

  // Handle switching which expression experiment is displayed.
  document.querySelector('#exp-table tbody').addEventListener('click',
    function(event) {
      var td = event.target;
      var tbl = document.getElementById('exp-table');
      while (td !== this && !td.matches('td')) {
        td = td.parentNode;
      }
      if (td === this) {
        console.log('No table cell found');
      } else {
        // Use row and cell indices to get the hit data for row clicked on.
        var row = td.parentNode.rowIndex;
        var hitID = tbl.rows[row].cells[0].innerHTML;
        currentExp = {
          species: currentHit.species,
          experiment: hitID
        };

        renderSingleExperiment(hitID);
      }
    });

  // Species search input setup.
  $('.flexdatalist').flexdatalist({
    minLength: 1,
    searchIn: 'name',
    textProperty: 'name',
    valueProperty: 'id',
    data: 'species_search.json'
  });

  $('.flexdatalist').on('change:flexdatalist', function() {
    species = $('.flexdatalist').flexdatalist('value');
  });

  // Ensure tables are properly adjusted on window resize.
  window.onresize = function() {
    hitsTable.columns.adjust().draw();
    expTable.columns.adjust().draw();
  }

  // Reset expression widget to default view on button press.
  document.querySelector('#reset-button').addEventListener('click',
    function() {
      renderExpression([currentHit.ensembl, currentHit.species], true);
    });

  // Used for header collapse.
  $('#summary-div').on('hide.bs.collapse', function() {
    $('#function-header').html(
      '<span class="glyphicon glyphicon-collapse-down"></span>Function'
    );
  });
  $('#summary-div').on('show.bs.collapse', function() {
    $('#function-header').html(
      '<span class="glyphicon glyphicon-collapse-up"></span>Function'
    );
  });

  $('#basics').on('hide.bs.collapse', function() {
    $('#basics-header').html(
      '<span class="glyphicon glyphicon-collapse-down"></span>Gene Basics'
    );
  });
  $('#basics').on('show.bs.collapse', function() {
    $('#basics-header').html(
      '<span class="glyphicon glyphicon-collapse-up"></span>Gene Basics'
    );
  });

  $('#accessions').on('hide.bs.collapse', function() {
    $('#accessions-header').html(
      '<span class="glyphicon glyphicon-collapse-down"></span>Accessions'
    );
  });
  $('#accessions').on('show.bs.collapse', function() {
    $('#accessions-header').html(
      '<span class="glyphicon glyphicon-collapse-up"></span>Accessions'
    );
  });

  $('#expression').on('hide.bs.collapse', function() {
    $('#expression-header').html(
      '<span class="glyphicon glyphicon-collapse-down"></span>Expression'
    );
    expTable.columns.adjust().draw();
  });
  $('#expression').on('show.bs.collapse', function() {
    $('#expression-header').html(
      '<span class="glyphicon glyphicon-collapse-up"></span>Expression'
    );
    expTable.columns.adjust().draw();
  });

  $('#protein').on('hide.bs.collapse', function() {
    $('#protein-header').html(
      '<span class="glyphicon glyphicon-collapse-down"></span>Protein Viewer'
    );
  });
  $('#protein').on('show.bs.collapse', function() {
    $('#protein-header').html(
      '<span class="glyphicon glyphicon-collapse-up"></span>Protein Viewer'
    );
  });

  $('#diseases').on('hide.bs.collapse', function() {
    $('#diseases-header').html(
      '<span class="glyphicon glyphicon-collapse-down"></span>Disease Associations'
    );
    diseaseTable.columns.adjust().draw();
  });
  $('#diseases').on('show.bs.collapse', function() {
    $('#diseases-header').html(
      '<span class="glyphicon glyphicon-collapse-up"></span>Disease Associations'
    );
    diseaseTable.columns.adjust().draw();
  });

  // Copies a clicked div element text to the clipboard.
  var copyToClipboard = function() {
    var pop = $(this);
    var text = this.textContent;
    clipboard.writeText(text);
    $(this).tooltip('show');
    hideTooltip($(this));
  };

  var textDivs = document.getElementsByClassName('text');

  for (var i = 0; i < textDivs.length; i++) {
    textDivs[i].addEventListener('click', copyToClipboard, false);
  }

  // Listen for search button click or enter key press to initiate query.
  document.getElementById('search-button').addEventListener('click',
    newQuery);
  document.getElementById('query').addEventListener('keypress', function(e) {
    var key = e.which || e.keyCode;

    if (key === 13) {
      newQuery(term = document.getElementById('query').value);
    }
  });
});


// Grab the JSON file with species/TaxID mappings.
function retrieveSpeciesJSON() {
  loadJsonFile(basepath + '/species.json').then(function(json) {
    speciesObj = json;
  });
}

// Grab the list of all expression experiments.
function retrieveExpList() {
  $.getJSON('https://www.ebi.ac.uk/gxa/json/experiments', function(data) {
    expObj = data.aaData;
  });
}

function newQuery(term = null) {
  if (speciesObj === null) {
    return;
  }

  // Check if no term was passed and pull it from the input value if so.
  // Also does an ugly check to make sure click event itself isn't passed as the term if
  // search button used.
  if (term == null || term instanceof MouseEvent) {
    term = document.getElementById('query').value;
  }
  var queryUrl = 'https://mygene.info/v3/query?q=' + term +
    '&fields=all&size=1000';
  var querySpecies = '';

  if (species.length > 0) {
    querySpecies = species[0]
    for (var i = 1; i < species.length; i++) {
      querySpecies = querySpecies + '%2C' + species[i]
    }
    queryUrl = 'https://mygene.info/v3/query?q=' + term + '&species=' +
      querySpecies + '&fields=all&size=1000';
  }

  fetch(queryUrl).then(function(response) {
      if (response.status !== 200) {
        console.log('Fetch Query Error. Status Code: ' + response.status);
        return;
      }
      response.json().then(function(data) {
        console.log(data);
        if (data.total !== 0 && data.success !== false) {
          hits = data.hits;
          topHit = hits[0];
          for (var i = 0; i < hits.length; i++) {
            idMap[hits[i]._id] = i;
          };

          var basics = {
            'hits': hits.length
          };

          // Display all info for the top hit.
          displayData(basics);
          displayHits(data);
          displayHeadings();
          parseGeneData(topHit).then(function(topHit) {
            displayData(topHit);
          });
        } else {
          // Empty hits list.
          $('#hitbody').empty();
          var empty = {
            'hits': 'No hits',
            'match-score': 0
          };

          // Wipe the rest of the fields.
          displayData(empty);
          hideData(document.getElementById('info-div'));
          hideData(document.getElementById('loc-div'));
          hideData(document.getElementById('summary-div'));
          hideData(document.getElementById('expression'));
          hideData(document.getElementById('protein'));
          hideData(document.getElementById('diseases'));
          hideData(document.getElementById('hits-div'));
          hideData(document.getElementById('species-div'));
          hideData(document.getElementById('db-div'));
          hideData(document.getElementById('db2-div'));
          hideHeadings();
        }
      });
    })
    .catch(function(err) {
      console.error('Fetch Query Error', err);
    });
}

// Adds all hits to the hit table.
function displayHits(hitsList) {
  var dataSet = [];
  hitsTable.clear();
  for (i in hitsList.hits) {
    var hit = hitsList.hits[i];
    var spec = 'NA';
    var symbol = 'NA';

    // Check if species is in our list.
    if (speciesObj[hit.taxid] !== undefined) {
      spec = speciesObj[hit.taxid];
    }

    // Check if symbol is part of the hit.
    if (hit.symbol !== undefined) {
      symbol = hit.symbol;
    }

    dataSet.push([
      symbol,
      hit._id,
      spec,
      hit._score.toFixed(2)
    ]);
  }
  hitsTable.rows.add(
    dataSet
  ).draw();
}

function renderExpression(data, reset) {

  // Renders the interactive widget initially.
  var targ = document.getElementById('highchartsContainer');
  if (data[0] === null || data[1] === null) {
    targ.innerHTML = 'No expression data available for this species.';
    return;
  };
  var expGene = data[0].ident;
  var expSpecies = data[1];

  // Render previously selected experiment if top hit from new search is of same species.
  // Much more convenient than continously going back and selecting the same experiment.
  if (currentExp !== null && reset !== true) {
    if (currentExp.species === data[1]) {
      renderSingleExperiment(currentExp.experiment);
      return;
    }
  }

  expressionAtlasHeatmapHighcharts.render({
    query: {
      gene: expGene,
      species: expSpecies,
    },
    target: targ,
    disableGoogleAnalytics: true,
    fail: function() {
      targ.innerHTML = 'No expression data available for this species.'
    }
  });

  // Creates the experiment table.
  displayExpers();
}

// Display a single experiment chosen from the experiment list.
// Tries several different gene identifiers if ENSEMBL ID fails.
function renderSingleExperiment(expID) {
  var targ = document.getElementById('highchartsContainer');
  expressionAtlasHeatmapHighcharts.render({
    experiment: expID,
    query: {
      gene: [{
        'value': currentHit.ensembl.ident
      }]
    },
    target: targ,
    disableGoogleAnalytics: true,
    fail: function() {
      expressionAtlasHeatmapHighcharts.render({
        experiment: expID,
        query: {
          gene: [{
            'value': currentHit.uniprot.ident
          }]
        },
        target: targ,
        disableGoogleAnalytics: true,
        fail: function() {
          expressionAtlasHeatmapHighcharts.render({
            experiment: expID,
            query: {
              gene: [{
                'value': currentHit['gene-symbol']
              }]
            },
            target: targ,
            disableGoogleAnalytics: true,
            fail: function() {
              targ.innerHTML =
                'No expression data available for this gene in this experiment.'
            }
          })
        }
      })
    }
  });
}

// Populate the expression experiment table.
function displayExpers() {
  var dataSet = [];
  expTable.clear();
  for (i in expObj) {
    var exper = expObj[i];
    var exID = exper.experimentAccession;
    var exDesc = exper.experimentDescription;
    var exType;
    if (exper.experimentType === 'MICROARRAY_ANY') {
      exType = 'Microarray';
    } else if (exper.experimentType === 'RNASEQ_MRNA_DIFFERENTIAL') {
      exType = 'RNA-seq Differential'
    } else {
      exType = 'RNA-seq Baseline'
    };

    if (exper.species === currentHit.species) {
      dataSet.push([
        exID,
        exDesc,
        exType
      ]);
    }
  }
  expTable.rows.add(
    dataSet
  ).draw();
}

// Renders the ProtVista widget.
function renderProtein(data) {
  var targ = document.getElementById('proteinContainer');
  if (data[0] === null) {
    targ.innerHTML = 'No data available for this protein.';
    return;
  };

  //Snag only first Uniprot ID if multiple in array.
  if (Array.isArray(data)) {
    data = data[0]
  };

  var instance = new ProtVista({
    el: targ,
    uniprotacc: data
  });

  instance.getDispatcher().on("noDataAvailable", function(obj) {
    targ.innerHTML = 'No data available for this protein.';
  });

  instance.getDispatcher().on("noDataRetrieved", function(obj) {
    targ.innerHTML = 'No data available for this protein.';
  });

}


// Display all text fields.
function displayData(dataObj) {
  // dataObj is a single search hit with all gene info as a dict.
  currentHit = dataObj;
  for (data in dataObj) {
    if (dataObj.hasOwnProperty(data) && dataObj[data]) {
      // Check/call expression widget rendering.
      var currentData = document.getElementById(data);
      if (currentData.id === 'expression') {
        currentData.classList.remove('hidden');
        renderExpression(dataObj[data], false);
        continue;
      } else if (currentData.id === 'protein') {
        currentData.classList.remove('hidden');
        renderProtein(dataObj[data]);
        continue;
      } else if (currentData.id === "species" && dataObj[data].toLowerCase() ===
        "homo sapiens") {
        getCTDAssociations(dataObj['gene-id'].ident);
        diseaseData = document.getElementById('diseases');
        diseaseData.classList.remove('hidden');
        currentData.classList.remove('hidden');
        currentLabel = document.getElementById(data + '-label');
        currentLabel.classList.remove('hidden');
      } else if (currentData.id === "species" && dataObj[data].toLowerCase() !==
        "homo sapiens") {
        diseaseTable.clear().draw();
      } else {
        currentData.classList.remove('hidden');
        currentLabel = document.getElementById(data + '-label');
        currentLabel.classList.remove('hidden');
      }

      // Add new/remove old links and linebreaks from appropriate divs.
      if (currentData.classList.contains('add-link')) {
        var oldLinks = currentData.getElementsByTagName('a');
        var oldBreaks = currentData.getElementsByTagName('br');
        while (oldLinks.length > 0) {
          oldLinks[0].parentNode.removeChild(oldLinks[0]);
        }
        while (oldBreaks.length > 0) {
          oldBreaks[0].parentNode.removeChild(oldBreaks[0]);
        }
        var linkData = dataObj[data];
        // Handle potential multiple links that needs to be added.
        // And special cases like GO terms. Kind of messy.
        if (linkData['ident'].constructor === Array) {
          // Used to potentially check for redundant GO terms.
          var old = [];
          for (i in linkData['ident']) {
            if (currentData.classList.contains('interpro')) {
              var link = linkData['db'] + linkData['ident'][i].id;
              var aTag = document.createElement('a');
              aTag.setAttribute('href', link);
              aTag.textContent = linkData['ident'][i].desc;
            } else if (currentData.classList.contains('go')) {
              // Skip redundant GO terms.
              if (old.includes(linkData['ident'][i].term)) {
                continue;
              }
              var link = linkData['db'] + linkData['ident'][i].id;
              var aTag = document.createElement('a');
              aTag.setAttribute('href', link);
              aTag.textContent = linkData['ident'][i].term;
              old.push(linkData['ident'][i].term);
            } else {
              var link = linkData['db'] + linkData['ident'][i];
              var aTag = document.createElement('a');
              aTag.setAttribute('href', link);
              aTag.textContent = linkData['ident'][i];
            }
            var spacer = document.createElement('br');
            currentData.appendChild(aTag);
            currentData.appendChild(spacer);
          }
        } else {
          if (currentData.classList.contains('go')) {
            var link = linkData['db'] + linkData['ident'].id;
            var aTag = document.createElement('a');
            aTag.setAttribute('href', link);
            aTag.textContent = linkData['ident'].term;
            currentData.appendChild(aTag);
          } else if (currentData.classList.contains('interpro')) {
            var link = linkData['db'] + linkData['ident'].id;
            var aTag = document.createElement('a');
            aTag.setAttribute('href', link);
            aTag.textContent = linkData['ident'].desc;
            currentData.appendChild(aTag);
          } else {
            var link = linkData['db'] + linkData['ident'];
            var aTag = document.createElement('a');
            aTag.setAttribute('href', link);
            aTag.textContent = linkData['ident'];
            currentData.appendChild(aTag);
          }
        }
      } else {
        currentData.textContent = dataObj[data];
      }
    } else {
      // Hide and clear any previous results.
      currentData = document.getElementById(data);
      if (currentData !== null && !currentData.classList.contains(
          'hidden')) {
        currentData.classList.add('hidden');
      }
      // Remove links of previous results.
      if (currentData !== null && currentData.classList.contains(
          'add-link')) {
        var oldLinks = currentData.getElementsByTagName('a');
        while (oldLinks.length > 0) {
          oldLinks[0].parentNode.removeChild(oldLinks[0]);
        }
      }
      // Hide labels too.
      currentLabel = document.getElementById(data + '-label');
      if (currentLabel !== null && !currentLabel.classList.contains(
          'hidden')) {
        currentLabel.classList.add('hidden');
      }
    }
  }
}

// Hide all data in child nodes of given div element.
function hideData(divObj) {
  var labels = divObj.querySelectorAll('label');
  var links = divObj.querySelectorAll('a');
  var i;
  var textDivs = divObj.getElementsByClassName('text');

  if (divObj.id === 'diseases') {
    diseaseTable.clear().draw();
  }

  if (divObj.id === 'hits-div') {
    hitsTable.clear().draw();
    return;
  }

  // Handle the expression data.
  if (divObj.id === 'expression' || divObj.id === 'protein') {
    divObj.classList.add('hidden');
    expTable.clear().draw();
    return;
  }

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

// Parses all gene data from a given hit into an Object.
function parseGeneData(data) {
  return new Promise(function(resolve, reject) {
    var aliases = null;
    var hgnc = null;
    var coords = null;
    var hg19coords = null;
    var mm9coords = null;
    var names = null;
    var uniprotSum = null;
    var wiki = null;
    var omim = null;
    var ensembl = null;
    var pfam = null;
    var uniprot = null;
    var protein = null;
    var pharmgkb = null;
    var expression = null;
    var prosite = null;
    var interpro = null;
    var wormbaseSum = null;
    var gobp = null;
    var gomf = null;
    var gocc = null;
    var symbol = null;

    if (data.hasOwnProperty('go')) {
      if (data.go.hasOwnProperty('BP')) {
        gobp = {
          db: 'https://www.ebi.ac.uk/QuickGO/term/',
          ident: data.go.BP
        }
      };
      if (data.go.hasOwnProperty('MF')) {
        gomf = {
          db: 'https://www.ebi.ac.uk/QuickGO/term/',
          ident: data.go.MF
        }
      };
      if (data.go.hasOwnProperty('CC')) {
        gocc = {
          db: 'https://www.ebi.ac.uk/QuickGO/term/',
          ident: data.go.CC
        }
      };
    }

    if (data.hasOwnProperty('HGNC')) {
      hgnc = {
        db: 'https://www.genenames.org/cgi-bin/gene_symbol_report?hgnc_id=',
        ident: data.HGNC
      };
    }

    if (data.hasOwnProperty('wikipedia')) {
      wiki = {
        db: 'https://en.wikipedia.org/wiki/',
        ident: data.wikipedia['url_stub'].replace(/ /g, '_')
      };
    }

    if (data.hasOwnProperty('MIM')) {
      omim = {
        db: 'http://omim.org/entry/',
        ident: data.MIM
      };
    }

    if (data.hasOwnProperty('ensembl')) {
      if (data.ensembl.constructor === Array) {
        ensembl = {
          db: 'https://www.ensembl.org/Gene/Summary?g=',
          ident: data.ensembl[0].gene
        };
      } else {
        ensembl = {
          db: 'https://www.ensembl.org/Gene/Summary?g=',
          ident: data.ensembl['gene']
        };
      }
    }

    if (data.hasOwnProperty('pfam')) {
      pfam = {
        db: 'http://pfam.xfam.org/family/',
        ident: data.pfam
      };
    }

    if (data.hasOwnProperty('pharmgkb')) {
      pharmgkb = {
        db: 'https://www.pharmgkb.org/gene/',
        ident: data.pharmgkb
      };
    }

    if (data.hasOwnProperty('prosite')) {
      prosite = {
        db: 'https://prosite.expasy.org/',
        ident: data.prosite
      };
    }

    if (data.hasOwnProperty('interpro')) {
      interpro = {
        db: 'http://www.ebi.ac.uk/interpro/entry/',
        ident: data.interpro
      };
    }

    if (data.hasOwnProperty('alias')) {
      if (typeof data.alias === 'string') {
        aliases = data.alias;
      } else {
        aliases = data.alias.join(', ');
      }
    }

    if (data.hasOwnProperty('genomic_pos')) {
      if (data.genomic_pos.constructor === Array) {
        coords = 'chr' + data.genomic_pos[0].chr + ':' + data.genomic_pos[
            0]
          .start +
          '-' + data.genomic_pos[0].end;
      } else {
        coords = 'chr' + data.genomic_pos.chr + ':' + data.genomic_pos
          .start +
          '-' + data.genomic_pos.end;
      }
    }

    if (data.hasOwnProperty('genomic_pos_hg19')) {
      if (data.genomic_pos_hg19.constructor === Array) {
        hg19coords = {
          db: "http://genome.ucsc.edu/cgi-bin/hgTracks?org=human&db=hg19&position=",
          ident: 'chr' + data.genomic_pos_hg19[0].chr + ':' + data.genomic_pos_hg19[
              0]
            .start + '-' + data.genomic_pos_hg19[0].end
        };
      } else {
        hg19coords = {
          db: "http://genome.ucsc.edu/cgi-bin/hgTracks?org=human&db=hg19&position=",
          ident: 'chr' + data.genomic_pos_hg19.chr + ':' + data.genomic_pos_hg19
            .start + '-' + data.genomic_pos_hg19.end
        };
      }
    }

    if (data.hasOwnProperty('genomic_pos_mm9')) {
      if (data.genomic_pos_mm9.constructor === Array) {
        mm9coords = {
          db: "http://genome.ucsc.edu/cgi-bin/hgTracks?org=mouse&db=mm9&position=",
          ident: 'chr' + data.genomic_pos_mm9[0].chr + ':' + data.genomic_pos_mm9[
              0]
            .start + '-' + data.genomic_pos_mm9[0].end
        };
      } else {
        mm9coords = {
          db: "http://genome.ucsc.edu/cgi-bin/hgTracks?org=mouse&db=mm9&position=",
          ident: 'chr' + data.genomic_pos_mm9.chr + ':' + data.genomic_pos_mm9
            .start + '-' + data.genomic_pos_mm9.end
        };
      }
    }

    if (data.hasOwnProperty('other_names') && typeof data.other_names ===
      'string') {
      names = data.other_names;
    } else if (data.hasOwnProperty('other_names')) {
      names = data.other_names.join(', ');
    }

    if (data.hasOwnProperty('WormBase')) {
      wormbaseSum = getWormbaseSummary(data.WormBase);
    }

    if (data.hasOwnProperty('uniprot') && data.uniprot['Swiss-Prot'] !==
      undefined) {
      if (Array.isArray(data.uniprot['Swiss-Prot'])) {
        uniprot = {
          db: 'http://www.uniprot.org/uniprot/',
          ident: data.uniprot['Swiss-Prot'][0]
        };
      } else {
        uniprot = {
          db: 'http://www.uniprot.org/uniprot/',
          ident: data.uniprot['Swiss-Prot']
        };
      }
      uniprotSum = getUniprotSummary(data.uniprot['Swiss-Prot']);
      protein = data.uniprot['Swiss-Prot'];
    }

    if (data.hasOwnProperty('symbol') !== undefined) {
      symbol = data.symbol;
    } else {
      symbol = "NA"
    }

    if (data.hasOwnProperty('WormBase') || data.hasOwnProperty(
        'uniprot')) {
      Promise.all([wormbaseSum, uniprotSum]).then(function(values) {
        wormbaseSum = values[0];
        uniprotSum = values[1];
        // Resolve original promise.
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
          'expression': [ensembl, speciesObj[data.taxid]],
          'other-names': names,
          'gene-type': data.type_of_gene,
          'wikipedia': wiki,
          'omim': omim,
          'ensembl': ensembl,
          'uniprot': uniprot,
          'protein': protein,
          'pfam': pfam,
          'pharmgkb': pharmgkb,
          'prosite': prosite,
          'interpro': interpro,
          'gobp': gobp,
          'gomf': gomf,
          'gocc': gocc,
          'uniprot-summary': uniprotSum,
          'wormbase-summary': wormbaseSum,
          'gene-symbol': symbol,
          'gene-name': data.name,
          'gene-id': {
            db: 'https://www.ncbi.nlm.nih.gov/gene/',
            ident: data._id
          },
          'match-score': data._score
        })
      });
    } else {
      // Resolve original promise.
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
        'expression': [ensembl, speciesObj[data.taxid]],
        'other-names': names,
        'gene-type': data.type_of_gene,
        'wikipedia': wiki,
        'omim': omim,
        'ensembl': ensembl,
        'uniprot': uniprot,
        'protein': protein,
        'pfam': pfam,
        'pharmgkb': pharmgkb,
        'prosite': prosite,
        'interpro': interpro,
        'gobp': gobp,
        'gomf': gomf,
        'gocc': gocc,
        'uniprot-summary': uniprotSum,
        'wormbase-summary': wormbaseSum,
        'gene-symbol': symbol,
        'gene-name': data.name,
        'gene-id': {
          db: 'https://www.ncbi.nlm.nih.gov/gene/',
          ident: data._id
        },
        'match-score': data._score
      })
    }
  });
};

// Fetch the function summary for given protein from UniprotKB.
function getUniprotSummary(id) {
  return new Promise(function(resolve, reject) {
    if (!id) {
      reject();
    }

    // Necessary for edge cases where multiple IDs are returned.
    if (Array.isArray(id)) {
      id = id[0];
    }

    var summary;

    fetch('https://www.uniprot.org/uniprot/' + id + '.xml').then(
      function(
        response) {
        if (response.status !== 200) {
          console.log(
            'Looks like there was a problem. Status Code: ' +
            response.status);

          reject();
        }

        response.text().then(function(data) {
          var parsedXML = xmlParser.parseFromString(data,
            'text/xml');
          var comments = parsedXML.querySelectorAll(
            'comment[type="function"]');

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

// Fetch the function summary for given protein from Wormbase.
function getWormbaseSummary(id) {
  return new Promise(function(resolve, reject) {
    if (!id) {
      reject();
    }
    var summary;
    fetch('http://rest.wormbase.org/rest/field/gene/' + id +
      '/concise_description').then(function(
      response) {
      if (response.status !== 200) {
        console.log(
          'Looks like there was a problem. Status Code: ' +
          response.status);
        reject();
      }
      response.json().then(function(data) {
        summary = data.concise_description.data.text
        resolve(summary);
      })
    }).catch(function(err) {
      console.error('Fetch Wormbase Error', err);
      reject();
    });
  });
}

// Fetch disease associations from CTDbase and add them to the disease table.
function getCTDAssociations(id) {
  var queryUrl =
    'http://ctdbase.org/tools/batchQuery.go?inputType=gene&inputTerms=' +
    id +
    '&report=diseases_curated&format=json';

  fetch(queryUrl).then(function(response) {
      if (response.status !== 200) {
        console.log('CTD Fetch Query Error. Status Code: ' + response.status);
        return;
      }
      response.json().then(function(data) {
        diseaseTable.clear().draw();
        if (data[0].hasOwnProperty('DiseaseName')) {
          var diseaseList = [];
          for (var x in data) {
            x = data[x];
            var name = x.DiseaseName;
            var id = '<a href=https://id.nlm.nih.gov/mesh/' +
              x.DiseaseID
              .split(':')[1] + '.html>' + x.DiseaseID + '</a>';
            var linkList = [];
            if (x.hasOwnProperty('PubMedIDs')) {
              var pubs = x.PubMedIDs.split('|');
              for (i in pubs) {
                var newLink =
                  '<a href=https://www.ncbi.nlm.nih.gov/pubmed/' +
                  pubs[
                    i] +
                  '>' +
                  pubs[i] + '</a>';
                linkList.push(newLink);
              }
            } else {
              var pubs = x.OmimIDs.split('|');
              for (i in pubs) {
                var newLink =
                  '<a href=https://www.omim.org/entry/' + pubs[i] +
                  '>' +
                  pubs[i] + '</a>';
                linkList.push(newLink);
              }
            }
            var link =
              '<a href=http://ctdbase.org/detail.go?type=gene&acc=' + x.GeneID +
              '>' +
              'link' + '</a>';

            var refs = linkList.join(' ');
            diseaseList.push([name, id, refs, link])
          }
          diseaseTable.rows.add(
            diseaseList
          ).draw();
        }
      });
    })
    .catch(function(err) {
      console.error('Fetch Query Error', err);
    });
}

// Display and hide section headings as appropriate.
function displayHeadings() {
  var headers = document.querySelectorAll('.sect-header');

  for (var i = 0; i < headers.length; i++) {
    var childData = headers[i];

    if (childData.classList.contains('hidden')) {
      childData.classList.remove('hidden');
    }
  }
}

function hideHeadings() {
  var headers = document.getElementsByClassName('sect-header');

  for (var i = 0; i < headers.length; i++) {
    var childData = headers[i];
    if (!(childData.classList.contains('hidden'))) {
      childData.classList.add('hidden');
    }
  }
}
