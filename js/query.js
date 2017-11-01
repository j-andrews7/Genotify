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
                console.log(species);
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
                                top_hit = data.hits[0]
                                var symbol = top_hit.symbol
                                var geneId = top_hit._id
                                var geneName = top_hit.name
                                document.getElementById('basics').textContent = 'Official Gene Symbol: ' + symbol + '; Official Gene Name: ' + geneName + '; Entrez ID: ' + geneId;
                                annotateGene(geneId);
                            } else {
                                document.getElementById('basics').textContent = 'No hits.'
                                document.getElementById('summary').textContent = ''
                            }
                        });
                    }
                )
                .catch(function(err) {
                    console.error('Fetch Query Error', err);
                });
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
                            var summary = data.summary
                            document.getElementById('summary').textContent = 'Gene Summary: ' + summary;
                        });
                    }
                )
                .catch(function(err) {
                    console.error('Fetch Gene Annotation Error', err);
                });
        }
    })();