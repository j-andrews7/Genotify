(function() {
    document.addEventListener('DOMContentLoaded', function(event) {
        console.log('DOM fully loaded.');
        document.getElementById('searchButton').addEventListener('click', newQuery);
    });

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
                            var basics = { 'geneSymbol': topHit.symbol, 'geneName': topHit.name, 'geneId': topHit._id, 'matchScore': topHit._score };
                            displayData(basics)
                            annotateGene(basics.geneId);
                        } else {
                            document.getElementById('basics').textContent = 'No hits.';
                            document.getElementById('summary').textContent = '';
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
            console.log(data)
            currentData = document.getElementById(data);
            currentData.classList.remove('hidden');
            currentLabel = document.getElementById(data + 'Label');
            currentLabel.classList.remove('hidden');
            currentData.textContent = dataArray[data]

            hideData(document.getElementById("info"))
        }
    }

    function hideData(divObj) {
        // Hide all data in child nodes of givin div element.
        var children = divObj.querySelectorAll("label");
        for (child in children) {
            if (!(child.style.classList.contains('hidden'))) {
                child.style.classList.add('hidden');
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
                        console.log(data);
                        var summary = data.summary;
                        document.getElementById('summary').textContent = 'Gene Summary: ' + summary;
                    });
                }
            )
            .catch(function(err) {
                console.error('Fetch Gene Annotation Error', err);
            });
    }
})();