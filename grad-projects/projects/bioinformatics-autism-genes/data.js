/* ============================================================
   Real results from the project, typed in from the report and
   the data files (Nov 2022). Edit here to change any chart.
   ============================================================ */
window.BIO_DATA = {
  // SFARI genes per gene-score (number of Entrez IDs per list)
  scores: { "1": 215, "2": 690, "3": 91 },

  // Part 1 · the five most-reported gene-score-1 genes.
  // reports = SFARI "number of reports"; papers = PubMed hits for
  // "Autism Spectrum Disorder" + gene symbol (Entrez egquery, Nov 2022)
  top5: {
    "1": [
      { gene: "SHANK3", reports: 120, papers: 280 },
      { gene: "MECP2", reports: 107, papers: 152 },
      { gene: "NRXN1", reports: 100, papers: 73 },
      { gene: "SCN2A", reports: 96, papers: 63 },
      { gene: "SCN1A", reports: 84, papers: 34 },
    ],
    "2": [
      { gene: "CNTNAP2", papers: 104 },
      { gene: "OXTR", papers: 85 },
      { gene: "RBFOX1", papers: 21 },
      { gene: "KCNQ2", papers: 11 },
      { gene: "SATB2", papers: 5 },
    ],
    "3": [
      { gene: "GRB10", papers: 4 },
      { gene: "KLF7", papers: 4 },
      { gene: "YWHAZ", papers: 3 },
      { gene: "CDK5RAP2", papers: 1 },
      { gene: "MSRA", papers: 0 },
    ],
  },

  // Part 1 · PubMed papers per year, 2000..2022, for the score-1 top five
  years: { from: 2000, to: 2022 },
  perYear: {
    SHANK3: [0,0,0,0,0,1,0,3,2,2,4,4,9,10,12,22,35,30,36,43,39,39,51],
    MECP2:  [0,0,0,0,0,1,1,6,6,6,4,14,9,7,15,11,20,16,14,21,16,8,16],
    NRXN1:  [0,0,0,0,0,0,0,1,2,2,2,6,7,6,5,6,3,5,7,14,9,12,8],
    SCN2A:  [0,0,0,0,1,0,0,0,2,1,0,1,0,3,2,3,4,5,7,13,11,14,11],
    SCN1A:  [0,0,0,0,1,2,1,1,1,0,0,1,4,2,0,4,3,0,5,4,6,9,5],
  },

  // Part 2 · most common GO terms (TAS evidence only), per list
  goTop: {
    "1": [["nucleoplasm", 60], ["cytosol", 47], ["plasma membrane", 29], ["nervous system development", 8], ["membrane", 7], ["ER membrane", 7]],
    "2": [["plasma membrane", 168], ["cytosol", 137], ["nucleoplasm", 95], ["extracellular region", 38], ["signal transduction", 29], ["membrane", 15]],
    "3": [["cytosol", 28], ["plasma membrane", 16], ["nucleoplasm", 15], ["extracellular region", 6], ["signal transduction", 4], ["nucleus", 3]],
  },

  // Part 2 · PANTHER "Biological Process" classification, % of genes in
  // each list that carry the category (a gene can carry several).
  panther: {
    categories: ["cellular process", "biological regulation", "metabolic process", "response to stimulus", "localization", "signaling", "multicellular organismal process", "developmental process"],
    "1": [64.3, 44.7, 39.3, 17.6, 19.3, 16.8, 14.8, 11.5],
    "2": [62.4, 37.5, 30.8, 19.9, 18.4, 16.4, 11.7, 11.2],
    "3": [70.5, 42.1, 36.8, 26.3, 18.9, 20.0, 12.6, 14.7],
  },

  // Part 3 · STRING network of the gene-score-1 list
  string: { nodes: 213, edges: 1555, avgDegree: 14.6, clustering: 0.442, expectedEdges: 461, pValue: "< 1e-16" },

  // Part 3 · the two biggest MCL clusters (from the exported TSV)
  clusters: [
    { n: 33, theme: "synapse", genes: ["ARX","CASK","DLG4","DPYSL2","DSCAM","ELAVL3","GABRB3","GFAP","GRIN1","GRIN2A","GRIN2B","IQSEC2","LRRC4C","MAP1A","NBEA","NLGN2","NLGN3","NLGN4X","NRXN1","NRXN2","NRXN3","PCDH19","PPP1R9B","PTCHD1","RELN","RIMS1","SHANK2","SLC6A1","STXBP1","SYN1","SYNGAP1","TANC2","TRIO"] },
    { n: 26, theme: "chromatin", genes: ["ARID1B","ASXL3","ATRX","BAZ2B","BCL11A","CHD3","CHD7","CREBBP","CTCF","DNMT3A","EP300","HDLBP","KMT2A","KMT2C","LDB1","MED13","MED13L","MEF2C","PAX5","SATB1","SETBP1","SMARCA2","SMARCA4","SMARCC2","SRCAP","YY1"] },
  ],

  // Part 3 · GSEApy / Enrichr against KEGG 2021, genes ranked by degree
  kegg: [
    { term: "Long-term potentiation", overlap: "9/67", p: "2.6e-8" },
    { term: "Thyroid hormone signaling pathway", overlap: "11/121", p: "4.6e-8" },
    { term: "Nicotine addiction", overlap: "7/40", p: "1.5e-7" },
    { term: "Lysine degradation", overlap: "8/63", p: "2.4e-7" },
    { term: "Hepatocellular carcinoma", overlap: "11/168", p: "1.3e-6" },
  ],
};
