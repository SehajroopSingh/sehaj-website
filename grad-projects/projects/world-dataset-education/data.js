/* ============================================================
   Real numbers from the project (Dec 2022), recomputed from the
   published RecentData.csv (one row per country, parents = avg,
   children = all) plus the README's regression results.
   ============================================================ */
window.WDS_DATA = {
  // Size of the two curated datasets
  twentyYear: { rows: 6137, columns: 239, countries: 198, from: 1990, to: 2020 },
  recent: { rows: 3249, columns: 27, countries: 71 },

  // Mean years of schooling of the child generation, by World Bank income group
  byIncome: [
    ["Low income", 2.25, 4],
    ["Lower middle income", 7.05, 17],
    ["Upper middle income", 8.69, 21],
    ["High income", 11.11, 26],
  ],

  // Correlation of each variable with the child generation's mean years of schooling
  corr: [
    ["Parents' years of schooling", 0.86],
    ["Average IQ (country study)", 0.69],
    ["Political stability", 0.60],
    ["Average income (USD)", 0.54],
    ["Education spend per inhabitant", 0.52],
    ["Gender Equality Index", 0.48],
    ["Daily max temperature (°C)", -0.58],
  ],

  // Scatter: [country, daily max temperature °C, child mean years of schooling, income group]
  scatter: [["Afghanistan",24,5.58,"Low income"],["Albania",21,7.88,"Upper middle income"],["Angola",27,9.16,"Lower middle income"],["Australia",24,11.85,"High income"],["Austria",13,11.59,"High income"],["Bangladesh",30,7.69,"Lower middle income"],["Belarus",12,10.96,"Upper middle income"],["Belgium",15,11.35,"High income"],["Bolivia",27,4.94,"Lower middle income"],["Brazil",31,5.46,"Upper middle income"],["Bulgaria",18,10.29,"Upper middle income"],["Cambodia",33,8.49,"Lower middle income"],["Cameroon",31,7.23,"Lower middle income"],["Chad",35,2.05,"Low income"],["Chile",18,8.39,"High income"],["China",20,3.84,"Upper middle income"],["Colombia",29,5.6,"Upper middle income"],["Croatia",18,9.09,"High income"],["Denmark",13,11.11,"High income"],["Ecuador",24,6.24,"Upper middle income"],["Estonia",10,13.24,"High income"],["Ethiopia",27,0.39,"Low income"],["Fiji",30,11.83,"Upper middle income"],["Finland",8,11.48,"High income"],["France",17,10.88,"High income"],["Georgia",20,12.67,"Upper middle income"],["Germany",14,12.57,"High income"],["Ghana",32,4.51,"Lower middle income"],["Greece",22,8.22,"High income"],["Hungary",17,11.6,"High income"],["Iceland",8,12.36,"High income"],["India",30,4.77,"Lower middle income"],["Indonesia",32,4.34,"Lower middle income"],["Ireland",13,12.23,"High income"],["Israel",25,11.48,"High income"],["Italy",18,8.57,"High income"],["Kazakhstan",14,11.7,"Upper middle income"],["Kenya",28,6.84,"Lower middle income"],["Latvia",11,12.33,"High income"],["Malaysia",32,11.19,"Upper middle income"],["Mauritius",27,14.28,"Upper middle income"],["Mexico",29,5.33,"Upper middle income"],["Mongolia",8,9.64,"Lower middle income"],["Morocco",24,3.29,"Lower middle income"],["Nepal",25,0.96,"Low income"],["Netherlands",14,12.47,"High income"],["North Macedonia",18,8.31,"Upper middle income"],["Norway",9,12.46,"High income"],["Pakistan",31,7.7,"Lower middle income"],["Peru",26,6.15,"Upper middle income"],["Philippines",32,8.52,"Lower middle income"],["Poland",13,10.77,"High income"],["Portugal",21,5.79,"High income"],["Romania",16,9.19,"Upper middle income"],["Senegal",35,4.18,"Lower middle income"],["Serbia",18,8.66,"Upper middle income"],["South Africa",25,6.07,"Upper middle income"],["Spain",21,8.62,"High income"],["Sri Lanka",30,9.0,"Upper middle income"],["Sweden",10,12.12,"High income"],["Switzerland",15,10.95,"High income"],["Thailand",33,11.91,"Upper middle income"],["Turkey",20,5.99,"Upper middle income"],["Ukraine",14,12.3,"Lower middle income"],["United Kingdom",13,13.36,"High income"],["United States",19,13.95,"High income"],["Vietnam",29,10.79,"Lower middle income"],["Zambia",29,5.49,"Lower middle income"]],

  // PCA: proportion of variance explained by each of the 9 components
  pca: [0.660, 0.102, 0.085, 0.055, 0.034, 0.030, 0.020, 0.012, 0.003],

  // Linear regression of child schooling on the other variables (README table)
  regression: { r2: 0.826, parentCoef: 0.67, parentSE: 0.03 },

  // CO2 facts from the 20-year dataset (README)
  co2: { increased1970: 72.6, increased2006: 58.5 },
};
