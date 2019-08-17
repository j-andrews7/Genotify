## Change log

### _**v1.2.2**_
**Release date: August 17th, 2019**
 - Upgraded a bunch of dependency versions to fix most security issues [#43](https://github.com/j-andrews7/Genotify/issues/43).
 - Upgraded to Electron 3.1.13, which fixed the menu bar being impossible to see on linux [#45](https://github.com/j-andrews7/Genotify/issues/45).
 - Fixed a bug that caused the Hits datatable to throw mad errors when hits had no symbol provided [#44](https://github.com/j-andrews7/Genotify/issues/44).
 - Fixed a long standing bug due to multiple Uniprot IDs being returned. This caused errors in retrieving the Uniprot Summary and ProtVista data [#40](https://github.com/j-andrews7/Genotify/issues/40).
 - Fix issues building from source on linux [#42](https://github.com/j-andrews7/Genotify/issues/42) - thanks to @hmontenegro for reporting and help troubleshooting.

### _**v1.2.1**_
**Release date: August 15th, 2018**
 - Added a link back to CTDbase in the disease associations table.
 - Fixed a bug where the expression experiments search box being improperly hidden after no results were returned and then a valid query was performed.
 - Fixed a bug that occasionally resulted in the Prot Vista widget crashing (thereby crashing the app) when a hit didn't have an Ensembl ID.

### _**v1.2.0**_
**Release date: August 6th, 2018**
 - Added the Prot Vista widget from EBI for interactive protein data (domains, PTMs, variation, etc).
 - Added a table for all expression experiments available for a given species so that the expression widget can display single experiments.
 - Fixed a bug where the hits search box was being improperly hidden if no results were returned.

### _**v1.1.1**_
**Release date: July 12th, 2018**
 - Fixed 'Gene Basics' header changing to 'Overview' after un-collapsing the section.
 - Fixed a bug where headers weren't properly displayed for a hit after a query where no hits were found.

### _**v1.1.0**_
**Release date: June 27th, 2018**
 - Added splash screen.
 - Added ability to limit to multiple species rather than just one.
 - Added table so hits are easily navigable rather than showing the top hit only.
 - Added an interactive expression data widget from the EBI Expression Atlas.
 - Added concise, curated descriptions from WormBase where available.
 - Added tooltips for some of the less common database accessions.
 - Added GO function and Interpro domains fields.
 - Added UCSC browser links for mouse and human genomic positions (mm9/hg19).
 - Added curated disease associations from the Comparative Toxicogenomics Database, which includes all annotations from OMIM as well.
 - Fixed multiple entries for PFAM/PROSITE causing issues with both the UI and links themselves.
 - Fixed linebreaks not being properly removed from old queries.
 - Fixed menu on OSX, which also resolved a bug with the hotkey command.
 - Moved around various elements for better organization.
 - Added collapsible sections.
 - Prettified UI.
 - Various backend changes to better handle missing data.
