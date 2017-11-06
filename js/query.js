(function() {
    document.addEventListener('DOMContentLoaded', function(event) {
        console.log('DOM fully loaded.');
        var tx = document.getElementsByTagName('textarea');
        for (var i = 0; i < tx.length; i++) {
            tx[i].setAttribute('style', 'height:' + (tx[i].scrollHeight) + 'px;overflow-y:hidden;');
            tx[i].addEventListener("input", OnInput, false);
        }
        document.getElementById('searchButton').addEventListener('click', newQuery);
        document.getElementById('query').addEventListener('keypress', function(e) {
            var key = e.which || e.keyCode;
            if (key === 13) {
                newQuery()
            }
        });
    });

    function OnInput() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    }

    function newQuery() {
        var term = document.getElementById('query').value;
        var queryUrl = 'https://mygene.info/v3/query?q=' + term;
        var speciesOptions = document.getElementById('species');

        if (speciesOptions.selectedIndex !== -1) {
            var species = speciesOptions.options[speciesOptions.selectedIndex].value;
            queryUrl = 'https://mygene.info/v3/query?q=' + term + '&species=' + species;
        }

        fetch(queryUrl)
            .then(
                function(response) {
                    if (response.status !== 200) {
                        console.log('Looks like there was a problem. Status Code: ' +
                            response.status);
                        return;
                    }

                    response.json().then(function(data) {
                        console.log(data);
                        if (data.total !== 0 && data.success !== false) {
                            topHit = data.hits[0]
                            var basics = { 'geneSymbol': topHit.symbol, 'geneName': topHit.name, 'geneId': topHit._id, 'matchScore': topHit._score, 'hits': data.hits.length };
                            displayData(basics)
                            annotateGene(basics.geneId);
                        } else {
                            var empty = { 'hits': 'No hits', 'matchScore': '0' };
                            displayData(empty)
                            hideData(document.getElementById('infoDiv'));
                            hideData(document.getElementById('summaryDiv'));
                        }
                    });
                }
            )
            .catch(function(err) {
                console.error('Fetch Query Error', err);
            });
    }

    function displayData(dataArray) {
        for (data in dataArray) {
            currentData = document.getElementById(data);
            currentData.classList.remove('hidden');
            currentLabel = document.getElementById(data + 'Label');
            currentLabel.classList.remove('hidden');
            currentData.textContent = dataArray[data];
        }
    }

    function hideData(divObj) {
        // Hide all data in child nodes of givin div element.
        var labels = divObj.querySelectorAll("label");
        var i;
        var textArea = divObj.querySelectorAll("textarea");

        for (i = 0; i < labels.length; i++) {
            var childData = labels[i];

            if (!(childData.classList.contains('hidden'))) {
                childData.classList.add('hidden');
            }
        }

        for (i = 0; i < textArea.length; i++) {
            var childData = textArea[i];

            if (!(childData.classList.contains('hidden'))) {
                childData.classList.add('hidden');
                childData.textContent = '';
            }
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
                        var info = { 'summary': data.summary };
                        displayData(info);
                    });
                }
            )
            .catch(function(err) {
                console.error('Fetch Gene Annotation Error', err);
            });
    }
})();