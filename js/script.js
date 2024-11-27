const mapConfig = {
    basemap: "streets-vector",
    center: [-110.0, 24.0],
    zoom: 6,
    containerID: "viewDiv"
}

const populationRangeKeys = [
    { range: "0-4", maleField: "POB86", femaleField: "POB44" },
    { range: "5-9", maleField: "POB109", femaleField: "POB68" },
    { range: "10-14", maleField: "POB110", femaleField: "POB69" },
    { range: "15-19", maleField: "POB111", femaleField: "POB70" },
    { range: "20-24", maleField: "POB112", femaleField: "POB71" },
    { range: "25-29", maleField: "POB113", femaleField: "POB72" },
    { range: "30-34", maleField: "POB114", femaleField: "POB73" },
    { range: "35-39", maleField: "POB115", femaleField: "POB74" },
    { range: "40-44", maleField: "POB116", femaleField: "POB75" },
    { range: "45-49", maleField: "POB117", femaleField: "POB76" },
    { range: "50-54", maleField: "POB118", femaleField: "POB77" },
    { range: "60-64", maleField: "POB99", femaleField: "POB58" },
    { range: "65-69", maleField: "POB120", femaleField: "POB79" },
    { range: "70-74", maleField: "POB121", femaleField: "POB80" },
    { range: "75-79", maleField: "POB122", femaleField: "POB81" },
    { range: "80-84", maleField: "POB123", femaleField: "POB82" }
];

function initializeMap(Map, MapView, config) {
    const map = new Map({ basemap: config.basemap })
    const view = new MapView({
        container: config.containerID,
        map: map,
        center: config.center,
        zoom: config.zoom
    })

    return { map, view }
}

function setupLayerVisibility(elementId, layer) {
    const toggle = document.getElementById(elementId)
    toggle.addEventListener("change", (event) => {
        layer.visible = event.target.checked;
    });
}

const getProjectsPopupTemplate = () => ({
    title: "{PROYECTO}",
    content: [
        {
            type: "text",
            text: "<p><b>Unidades Totales:</b> {UDS_TOT}</p><p><b>Unidades Vendidas:</b> {UDS_VEND}</p>"
        },
        {
            type: "media",
            mediaInfos: [
                {
                    type: "column-chart",
                    caption: "Unidades Totales vs. Vendidas",
                    value: {
                        fields: ["UDS_TOT", "UDS_VEND"],
                        normalizeField: null,
                        tooltipField: "PROYECTO"
                    }
                }
            ]
        }
    ]
})

const isObjectEmpty = (objectName) => {
    return Object.keys(objectName).length === 0 && objectName.constructor === Object;
}

const createPopulationChartbyAge = () => {
    const ctx = document.getElementById('populationChart').getContext("2d")
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                { label: 'Hombres', data: [], backgroundColor: 'rgba(54, 162, 235, 0.6)' },
                { label: 'Mujeres', data: [], backgroundColor: 'rgba(255, 99, 132, 0.6)' }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Edad' } },
                y: { title: { display: true, text: 'Población' } }
            }
        }
    });
}

const createTotalUnitsAndAbsChart = () => {
    const chartCanvas = document.getElementById('udsChart').getContext('2d');
    return new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Sumatoria de UDS_TOT', data: [], borderColor: 'blue', fill: false },
                { label: 'Promedio de ABS/MES', data: [], borderColor: 'red', fill: false }
            ]
        },
        options: {
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Unidades' } }
            }
        }
    });

}

require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer"
], function (Map, MapView, FeatureLayer) {

    const { map, view } = initializeMap(Map, MapView, mapConfig);

    const municipalitiesLayer = new FeatureLayer({
        url: "https://services6.arcgis.com/cdylwBTTDF2F9FTY/ArcGIS/rest/services/BCS/FeatureServer",
        title: "Municipios",
        outFields: ["*"]
    });

    const projectsLayer = new FeatureLayer({
        url: "https://services6.arcgis.com/cdylwBTTDF2F9FTY/ArcGIS/rest/services/CAPA_PROYECTOS/FeatureServer",
        title: "Proyectos",
        outFields: ["UDS_TOT", "UDS_VEND",],
        popupTemplate: getProjectsPopupTemplate()
    });

    function createQuery(layer, options = {}) {
        const query = layer.createQuery();
        if (options.geometry) query.geometry = options.geometry;
        if (options.where) query.where = options.where;
        if (options.outFields) query.outFields = options.outFields;
        if (options.spatialRelationship) query.spatialRelationship = options.spatialRelationship;
        if (options.returnDistinctValues) query.returnDistinctValues = options.returnDistinctValues;
        query.returnGeometry = options.returnGeometry || false;
        return query;
    }

    async function executeQuery(layer, query) {
        try {
            const results = await layer.queryFeatures(query);
            return results.features;
        } catch (error) {
            console.error("Error al ejecutar la consulta", error);
        }
    }

    map.addMany([municipalitiesLayer, projectsLayer]);

    setupLayerVisibility("toggleMunicipios", municipalitiesLayer);
    setupLayerVisibility("toggleProyectos", projectsLayer);

    const populationChart = createPopulationChartbyAge();
    const totalUnitsAndAbsChart = createTotalUnitsAndAbsChart();

    view.watch("extent", async () => {
        fetchAndRenderChart();
        fetchAndRenderKPIs()
        const data = await getPopulationData(municipalitiesLayer, view.extent, ['*'], processPopulationData)
        updatePopulationChart(populationChart, data);
    });

    async function getPopulationData(layer, extent, outFields = ["*"], processFunction) {
        const query = createQuery(layer, {
            geometry: extent,
            outFields: outFields,
        });

        const features = await executeQuery(layer, query);
        return processFunction(features);
    }

    async function getTotalUnitsAndAbs(layer, extent, outFields = ['*'], processFunction) {
        const query = createQuery(layer, {
            geometry: extent,
            outFields: outFields,
            returnGeometry: false,
            spatialRelationship: "intersects"
        })

        const features = await executeQuery(layer, query)
        return processFunction(features)
    }

    function updatePopulationChart(chart, data) {
        chart.data.labels = data.map(item => item.range);
        chart.data.datasets[0].data = data.map(item => item.male);
        chart.data.datasets[1].data = data.map(item => item.female);
        chart.update();
    }

    function updateTotalUnitsChart(chart, data) {
        chart.data.labels = data.labels;
        chart.data.datasets[0].data = data.sumUDS
        chart.data.datasets[1].data = data.avgABS
        chart.update();
    }

    function processPopulationData(features) {
        return populationRangeKeys.map(range => {
            let maleSum = 0, femaleSum = 0;
            features.forEach(feature => {
                maleSum += feature.attributes[range.maleField] || 0;
                femaleSum += feature.attributes[range.femaleField] || 0;
            });
            return { range: range.range, male: maleSum, female: femaleSum };
        });
    }
    function processTotalUnitsAndAbsData(features, isFilter = false) {

        
        data = isFilter ? features: features.map(f => f.attributes);
        const sumUDS = [];
        const avgABS = [];
        const unitsAvailable = [];
        const labels = [];

        data.forEach((item, index) => {
            sumUDS.push(item.UDS_TOT);
            avgABS.push(item.ABS_MES);
            unitsAvailable.push(item.UDS_DISP);

            labels.push(index + 1);
        });

        return { sumUDS: sumUDS, avgABS: avgABS, unitsAvailable: unitsAvailable, labels: labels };
    }

    function processKpiData(feature) {
        return feature.map(f => f.attributes);
    }

    async function getMunicipalitiesAndPopulation() {
        const query = createQuery(municipalitiesLayer, {
            geometry: view.extent,
            outFields: ["NOMGEO", "POB1"],
            returnDistinctValues: true
        });

        const data = await executeQuery(municipalitiesLayer, query)

        let totalMunicipalities = data.length;
        let totalPopulation = 0;

        for (let i = 0; i < totalMunicipalities; i++) {
            totalPopulation += data[i].attributes.POB1 || 0;
        }

        return { totalMunicipalities, totalPopulation };
    }

    const municipalityFilter = document.getElementById("municipioFilter");

    async function loadMunicipalities() {
        const query = createQuery(municipalitiesLayer, {
            outFields: ["NOMGEO"],
            returnDistinctValues: true
        })

        const data = await executeQuery(municipalitiesLayer, query);

        if (data.length == 0) {
            console.log("No se encontraron municipios")
            return;
        }

        municipalityFilter.innerHTML = "<option value='Todos'>Todos</option>";

        data.forEach(element => {
            const option = document.createElement("option");
            option.value = element.attributes.NOMGEO;
            option.text = element.attributes.NOMGEO;
            municipalityFilter.appendChild(option);
        });
    }

    loadMunicipalities();

    async function fetchAndRenderChart(filteredData = {}) {
        let data = isObjectEmpty(filteredData)
            ? await getTotalUnitsAndAbs(projectsLayer, view.extent, ['UDS_TOT', 'ABS_MES', 'UDS_DISP'], processTotalUnitsAndAbsData)
            : processTotalUnitsAndAbsData(filteredData, true)

            console.log(data);

        updateTotalUnitsChart(totalUnitsAndAbsChart, data);
    }

    async function getProjectsByMunicipality(municipioName) {
        const query = createQuery(municipalitiesLayer, {
            where: `NOMGEO = '${municipioName}'`,
            returnGeometry: true,
        })


        const municipalityResult = await executeQuery(municipalitiesLayer, query);
        if (municipalityResult == 0) {
            console.log("No se encontraron proyectos para el municipio seleccionado.");
            return [];
        }

        const municipalityGeometry = municipalityResult[0].geometry;

        const queryProyect = createQuery(projectsLayer, {
            geometry: municipalityGeometry,
            spatialRelationship: 'intersects'
        })

        const filteredProjects = await executeQuery(projectsLayer, queryProyect);
        return filteredProjects.map(f => f.attributes);
        /* return processTotalUnitsAndAbsData(filteredProjects) */
    }

    municipalityFilter.addEventListener("change", async function () {
        const selectedMunicipality = municipalityFilter.value;

        if (selectedMunicipality === "Todos") {
            fetchAndRenderChart();
            fetchAndRenderKPIs();

        } else {
            const filteredData = await getProjectsByMunicipality(selectedMunicipality);
            fetchAndRenderChart(filteredData);
            fetchAndRenderKPIs(filteredData);
        }
    });

    async function fetchAndRenderKPIs(filteredData = {}) {
        let data = isObjectEmpty(filteredData)
            ? await getTotalUnitsAndAbs(projectsLayer, view.extent, ["UDS_TOT", "UDS_DISP", "ABS_MES"], processKpiData)
            : filteredData; 
            
        if (data.length === 0) {
            renderKPIs([{}]);
            return;
        }
        renderKPIs(calculateMetrics(data));
    }

    function calculateMetrics(data) {
        const totalProjects = data.length;
        const totalUDSTotals = data.reduce((sum, item) => sum + (item.UDS_TOT || 0), 0);
        const totalUDSAvailable = data.reduce((sum, item) => sum + (item.UDS_DISP || 0), 0);
        const validData = data.filter(item => item.UDS_TOT > 0 && item.ABS_MES != null);
        const averagePricePerUnit = validData.reduce((sum, item) => sum + (item.ABS_MES / item.UDS_TOT), 0) / validData.length;
        return { totalProjects, totalUDSTotals, totalUDSAvailable, averagePricePerUnit };
    }

    function renderKPIs({ totalProjects, totalUDSTotals, totalUDSAvailable, averagePricePerUnit = 0 }) {
        document.getElementById('totalProjects').innerText = totalProjects;
        document.getElementById('totalUDSTotals').innerText = totalUDSTotals;
        document.getElementById('totalUDSAvailable').innerText = totalUDSAvailable;
        document.getElementById('averagePricePerUnit').innerText = averagePricePerUnit.toFixed(2);
    }

    fetchAndRenderKPIs();

    document.getElementById("generatePDF").addEventListener("click", async () => {
        const kpi = await getMunicipalitiesAndPopulation();
        const totalMunicipalities = kpi.totalMunicipalities
        const totalPopulation = kpi.totalPopulation


        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: "landscape",
        });



        pdf.rect(0, 0, 600, 30, 'F')
        pdf.setFillColor('#A39667')
        pdf.rect(0, 30, 600, 5, 'F')

        pdf.setTextColor('#FFFFFF');
        pdf.setFontSize(32);
        pdf.text("DIGO", 60, 18);

        pdf.setFontSize(32);
        pdf.text("PROSPERIA", 185, 18);

        pdf.setTextColor('#000000');

        const screenshot = await view.takeScreenshot({
            format: "png",
            width: 1920,
            height: 1080,
            quality: 3
        });




        pdf.addImage(screenshot.dataUrl, "PNG", 0, 40, 148.5, 100);

        const populationChartCanvas = document.getElementById("populationChart");
        const usdChartCanvas = document.getElementById("udsChart");
        const populationChartImage = populationChartCanvas.toDataURL("image/png");
        const usdChartImage = usdChartCanvas.toDataURL("image/png");
        pdf.addImage(populationChartImage, "PNG", 148.5, 40, 148.5, 60);
        pdf.addImage(usdChartImage, "PNG", 148.5, 110, 148.5, 60);


        pdf.setFontSize(12);
        pdf.text('Cuidades' + '', 10, 150);
        pdf.text(totalMunicipalities + '', 18, 155);

        pdf.setFontSize(12);
        pdf.text('Población' + '', 60, 150);
        pdf.text(totalPopulation + '', 62, 155);

        pdf.setFontSize(12);

        typeCity = totalPopulation <= 200000 ? "Ciudad Pequeña" : totalPopulation <= 300000 ? "Ciudad Mediana" : "Ciudad Grande";
        pdf.text('Tipo de cuidad' + '', 100, 150);
        pdf.text(typeCity, 100, 155);

        pdf.save("mapa.pdf");
    });
});

