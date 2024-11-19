require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer"
], function (Map, MapView, FeatureLayer) {


    const map = new Map({
        basemap: "streets-vector"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [-110.0, 24.0],
        zoom: 6
    });

    const municipalitiesLayer = new FeatureLayer({
        url: "https://services6.arcgis.com/cdylwBTTDF2F9FTY/ArcGIS/rest/services/BCS/FeatureServer",
        title: "Municipios",
        outFields: ["*"]
    });

    const projectsLayer = new FeatureLayer({
        url: "https://services6.arcgis.com/cdylwBTTDF2F9FTY/ArcGIS/rest/services/CAPA_PROYECTOS/FeatureServer",
        title: "Proyectos",
        outFields: ["OBJECTID", "PROYECTO", "UDS_TOT", "UDS_VEND", "ABS_MES"],
        popupTemplate: getProjectsPopupTemplate()
    });

    function getProjectsPopupTemplate() {
        return {
            title: "{PROYECTO}",
            content: [
                {
                    type: "text",
                    text: `
                        <p><b>Unidades Totales:</b> {UDS_TOT}</p>
                        <p><b>Unidades Vendidas:</b> {UDS_VEND}</p>
                    `
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
        }
    };

    map.addMany([municipalitiesLayer, projectsLayer]);

    setupLayerVisibility("toggleMunicipios", municipalitiesLayer);
    setupLayerVisibility("toggleProyectos", projectsLayer);

    function setupLayerVisibility(elementId, layer) {
        const toggle = document.getElementById(elementId)
        toggle.addEventListener("change", (event) => {
            layer.visible = event.target.checked;
        });
    }

    municipalitiesLayer.when(() => console.log("Capa de Municipios cargada."));
    projectsLayer.when(() => console.log("Capa de Proyectos cargada."));


    const populationChart = createPopulationChart();
    const chartContainer = document.getElementById('chartContainer');
    /* view.ui.add(chartContainer, "top-right"); */


    function createPopulationChart() {
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

    view.watch("extent", () => queryPopulationData(municipalitiesLayer, view, populationChart));

    function queryPopulationData(layer, view, chart) {
        const query = layer.createQuery();
        query.geometry = view.extent;
        query.outFields = getPopulationFields();

        layer.queryFeatures(query).then((results) => {
            const data = processPopulationData(results.features);
            updateChart(chart, data);
        });
    }


    function updateChart(chart, data) {
        chart.data.labels = data.map(item => item.range);
        chart.data.datasets[0].data = data.map(item => item.male);
        chart.data.datasets[1].data = data.map(item => item.female);
        chart.update();
    }

    function processPopulationData(features) {
        const ranges = [
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

        return ranges.map(range => {
            let maleSum = 0, femaleSum = 0;
            features.forEach(feature => {
                maleSum += feature.attributes[range.maleField] || 0;
                femaleSum += feature.attributes[range.femaleField] || 0;
            });
            return { range: range.range, male: maleSum, female: femaleSum };
        });
    }

    function getPopulationFields() {
        return [
            "POB86", "POB44", "POB109", "POB68",
            "POB110", "POB69", "POB111", "POB70",
            "POB112", "POB71", "POB113", "POB72",
            "POB114", "POB73", "POB115", "POB74",
            "POB116", "POB75", "POB117", "POB76",
            "POB118", "POB77", "POB99", "POB58",
            "POB120", "POB79", "POB121", "POB80",
            "POB122", "POB81", "POB123", "POB82"
        ];
    }

    const municipalityFilter = document.getElementById("municipioFilter");


    async function loadMunicipalities() {
        const queryMunicipalities = municipalitiesLayer.createQuery();
        queryMunicipalities.returnDistinctValues = true;
        queryMunicipalities.outFields = ["NOMGEO"];

        try {
            const results = await municipalitiesLayer.queryFeatures(queryMunicipalities);
            if (results.features.length > 0) {
                municipalityFilter.innerHTML = "<option value='Todos'>Todos</option>";
                results.features.forEach(feature => {
                    const option = document.createElement("option");
                    option.value = feature.attributes.NOMGEO;
                    option.text = feature.attributes.NOMGEO;
                    municipalityFilter.appendChild(option);
                });
            } else {
                console.log("No se encontraron municipios.");
            }
        } catch (error) {
            console.error("Error al consultar los municipios:", error);
        }
    }

    loadMunicipalities();

    const usdChartContainer = document.getElementById('usdChartContainer');
    /* view.ui.add(usdChartContainer, "top-left"); */

    const chartCanvas = document.getElementById('udsChart').getContext('2d');
    let chartInstance;

    async function fetchAndRenderChart(filteredData = null) {
        let data = [];

        // Si hay datos filtrados, usarlos; si no, obtener todos los proyectos
        if (filteredData && filteredData.length > 0) {
            data = filteredData;
        } else {
            const queryProyectos = projectsLayer.createQuery();
            queryProyectos.outFields = ["UDS_TOT", "ABS_MES"];
            queryProyectos.returnGeometry = false;

            // Filtramos por el extent actual de la vista
            queryProyectos.geometry = view.extent; // Solo los datos dentro del área visible del mapa
            queryProyectos.spatialRelationship = "intersects"; // Intersección con el extent

            try {
                const results = await projectsLayer.queryFeatures(queryProyectos);
                data = results.features.map(f => f.attributes);
            } catch (error) {
                console.error("Error al consultar los proyectos:", error);
            }
        }

        if (data.length === 0) {
            renderChart([]);
            return;
        }

        const sumUDS = data.map(item => item.UDS_TOT);
        const avgABS = data.map(item => item.ABS_MES);
        const labels = data.map((_, index) => index + 1);

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Sumatoria de UDS_TOT', data: sumUDS, borderColor: 'blue', fill: false },
                    { label: 'Promedio de ABS/MES', data: avgABS, borderColor: 'red', fill: false }
                ]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Unidades' } }
                }
            }
        });
    }

    async function getProjectsByMunicipality(municipioName) {
        const municipalityQuery = municipalitiesLayer.createQuery();
        municipalityQuery.where = `NOMGEO = '${municipioName}'`;
        municipalityQuery.returnGeometry = true;

        try {
            const municipalityResult = await municipalitiesLayer.queryFeatures(municipalityQuery);
            if (municipalityResult.features.length > 0) {
                const municipalityGeometry = municipalityResult.features[0].geometry;
                const projectsQuery = projectsLayer.createQuery();
                projectsQuery.geometry = municipalityGeometry;
                projectsQuery.spatialRelationship = "intersects";
                const filteredProjects = await projectsLayer.queryFeatures(projectsQuery);
                return filteredProjects.features.map(f => f.attributes);
            } else {
                console.log("No se encontraron proyectos para el municipio seleccionado.");
                return [];
            }
        } catch (error) {
            console.error("Error al filtrar proyectos por municipio:", error);
            return [];
        }
    }

    fetchAndRenderChart();

    municipalityFilter.addEventListener("change", async function () {
        const selectedMunicipality = municipalityFilter.value;
        console.log("Municipio seleccionado:", selectedMunicipality);

        if (selectedMunicipality === "Todos") {
            fetchAndRenderChart();
            fetchAndRenderKPIs(); 

        } else {
            const filteredData = await getProjectsByMunicipality(selectedMunicipality);
            fetchAndRenderChart(filteredData);
            fetchAndRenderKPIs(filteredData); 
        }
    });

    view.watch("extent", function () {
        console.log("Extent del mapa cambiado, actualizando la gráfica...");
        fetchAndRenderChart();
        fetchAndRenderKPIs()
    });

    async function fetchAndRenderKPIs(filteredData = null) {
        let data = [];
    
        if (filteredData && filteredData.length > 0) {
            data = filteredData;
        } else {
            const queryProyectos = projectsLayer.createQuery();
            queryProyectos.outFields = ["UDS_TOT", "UDS_DISP", "ABS_MES"];
            queryProyectos.returnGeometry = false;
    
            queryProyectos.geometry = view.extent; 
            queryProyectos.spatialRelationship = "intersects"; 
    
            try {
                const results = await projectsLayer.queryFeatures(queryProyectos);
                data = results.features.map(f => f.attributes);
            } catch (error) {
                console.error("Error al consultar los proyectos:", error);
            }
        }
    
        if (data.length === 0) {
            renderKPIs({});
            return;
        }
    
        const totalProjects = data.length;
    
        const totalUDSTotals = data.reduce((sum, item) => sum + (item.UDS_TOT || 0), 0);
    
        const totalUDSAvailable = data.reduce((sum, item) => sum + (item.UDS_DISP || 0), 0);
    
        const validData = data.filter(item => item.UDS_TOT > 0 && item.ABS_MES != null);

        const averagePricePerUnit = validData.reduce((sum, item) => sum + (item.ABS_MES / item.UDS_TOT), 0) / validData.length;
    
        renderKPIs({
            totalProjects,
            totalUDSTotals,
            totalUDSAvailable,
            averagePricePerUnit
        });
    }

    function renderKPIs({ totalProjects, totalUDSTotals, totalUDSAvailable, averagePricePerUnit }) {
        document.getElementById('totalProjects').innerText = totalProjects;
        document.getElementById('totalUDSTotals').innerText = totalUDSTotals;
        document.getElementById('totalUDSAvailable').innerText = totalUDSAvailable;
        document.getElementById('averagePricePerUnit').innerText = averagePricePerUnit.toFixed(2); 
    }
    
    fetchAndRenderKPIs();
});
