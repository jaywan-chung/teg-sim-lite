/**
 * JavaScript code for TEG simulation webpage.
 *
 * 2020 Jaywan Chung
 *
**/

const simWindow = {
    isTepFuncUpdated: false,
    chartHeight: 500,
    colorRawData: '#1976D2', // '#1E88E5', //'#1565C0',
    colorFormula: '#D32F2F',
    animateColorIndex: 0,
    // animateColors: ['#FF0000', '#DC143C', '#FF4500', '#FF6347', '#FF7F50',],
    animateColors: ['#922B21', '#8B0000', '#76448A', '#1F618D', '#148F77', '#1E8449', '#B7950B', '#AF601A',],
    //animateColors: ['#922B21',],
    numMinMeshPoints: 101,  // how many points we draw in a chart; should be larger than 2
    tableSeebeck: null,
    tableElecResi: null,
    tableThrmCond: null,
    chartSeebeck: null,
    chartElecResi: null,
    chartThrmCond: null,
    chartCurrentVsPower: null,
    chartCurrentVsEfficiency: null,
    chartTest: null,
    simTaskName: null,
    simTaskMessage: null,
    simTaskDisplayInterval: null,
    isTestMode: false,
    //isTestMode: true,    
    // testName: 'testDiffusionTerm',
    // testName: 'testJouleTermConstElecResi',
    // testName: 'testJouleTermLinearElecResi',
    // testName: 'testThomsonTerm',  // need 31 nodes
    // testName: 'testPerformance',
    // testName: 'testPowellMethod',  // a case that Picard iteration does not work.
    // testName: 'testPromise',  // to practice Promise async.
};
const simParam = {
    // solverName: 'picard-iteration',
    solverName: 'powell-method',
    funcSeebeck: null,
    funcElecResi: null,
    funcThrmCond: null, 
    minTemp: -Infinity,
    maxTemp: Infinity,
    length: null,
    area: null,
    numLegs: null,
    coldTemp: null,
    hotTemp: null,
    initialRefCurrent: null,
    finalRefCurrent: null,
    deltaTemp: null,
    barSeebeck: null,
    barElecResi: null,
    barThrmCond: null,
    refTemp: null,
    refSeebeck: null,
    refElecResi: null,
    refThrmCond: null,
    refJ: null,
    refI: null,
    refLength: null,
    integralEps: 1e-12,
};
const dimlessSimParam = {
    funcSeebeck: null,
    funcElecResi: null,
    funcThrmCond: null, 
    minTemp: null,
    maxTemp: null,
    length: null,
    numLegs: null,
    coldTemp: null,
    hotTemp: null,
    deltaTemp: null,
    barSeebeck: null,
    ZdeltaT: null,
    initialCurrent: null,
    finalCurrent: null,
    numMeshPoints: null,
    // numSolChebyshevNodes: 31,
    numSolChebyshevNodes: 11,
    numCurrentChebyshevNodes: null,
    integralEps: 1e-8,  // for adaptive Simpson method
    maxIntegralDepth: 9,  // for adaptive Simpson method
    numMaxIteration: 100,
    solverTol: 1e-7,
};

$(function(){
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(activateChartsAndButtons); // activate buttons when google charts is loaded.
    
    /* responsive chart */
    $(window).resize(function() {
        if(simWindow.isTepFuncUpdated) {
            drawTepCharts();
        };
    });

    // Hide buttons for empty charts
    $("#tep-chart-container").hide();
    $("#chart-message").html("Computing Analytic Formulae ...")
    $("#chart-message").hide();
    // Initialize the tables for TEP input.
    initTepTables();
    // Initialize the forms for TEP formulas
    initTepFormulaMethodForms();
    // Initialize the forms for simulation parameters
    initSimParamForms();

    if(simWindow.isTestMode) {
        setTestInterpolationOption();
    };
});

function activateChartsAndButtons() {
    initTepCharts();
    initSimResultCharts();
    activateComputeFormulaButton();
    activateRunSimButton();

    // for test
    if(simWindow.isTestMode) {
        activateTestRunButton();
    }
    else {
        $("#test-section").hide();
    };

    return true;
}

function activateRunSimButton() {
    $("#run-sim-button").click(function() {
        if(simWindow.isTepFuncUpdated) {
            new Promise(function(resolve, reject) {
                updateSolverParamsFromForms();
                updateSimParamsFromForms();
                updateDimlessSimParams();
                console.log("Update Solver Params ok.");
                resolve();
            })
            .then(function() {
                return new Promise(function(resolve, reject) {
                    window.setTimeout(async function() {
                        await runSimulation();
                        resolve();
                    });
                });
            })
            .then(function() {
                window.setTimeout(() => {
                    console.log("Simulation complete.");
                });
            });
        }
        else {
            window.alert("Please compute TEP formula first.");
        }
    });
};

function activateTestRunButton() {
    $("#test-run").click(function() {
        computeTepFormula()
        .then(function() {
            return new Promise(function(resolve, reject) {
                console.log("Loop1 ok.");
                resolve();
            });
        })
        .then(function() {
            return new Promise(function(resolve, reject) {
                updateSimParamsFromForms();
                updateDimlessSimParams();
                console.log("Loop2 ok.");
                resolve();
            });
        })
        .then(function() {
            return new Promise(function(resolve, reject) {
                window.setTimeout(async function() {
                    await drawTestChart();
                    console.log("Loop3 ok.");
                    resolve();
                });
            });
        })
        .then(function() {
            console.log("Loop4 ok.");
        });
    });
};

function activateComputeFormulaButton() {
    $("#compute-formula").click(function() {
        computeTepFormula();
    });
};

function computeTepFormula() {
    var promise = new Promise(function(resolve, reject) {
        // do regression or interpolation of TEPs
        $("#compute-formula").hide();
        $("#chart-message").show();
        $("#tep-chart-container").hide();
        resolve();
    })
    .then(function() {
        return new Promise(function(resolve, reject) {
            simWindow.isTepFuncUpdated = updateTepFuncs();
            console.log("Compute chart ok.");

            window.setTimeout(function() {
                $("#chart-message").hide();
                $("#compute-formula").show();

                if(simWindow.isTepFuncUpdated) {
                    // draw charts
                    $("#tep-chart-container").show();
                    drawTepCharts();
                    console.log("Draw chart ok.");
                };
                resolve();
            });    
        });
    });
    return promise;
};

function animateSimTaskMessageColor(isAnimateColor=true) {
    const maxColorIndex = simWindow.animateColors.length-1;
    const prevColorIndex = simWindow.animateColorIndex;
    if(!isAnimateColor) {
        simWindow.animateColorIndex = 0;  // do not change the color
    }
    else if(prevColorIndex<0 || prevColorIndex>maxColorIndex) {
        simWindow.animateColorIndex = 0;  // restart
    }
    else {
        simWindow.animateColorIndex += 1;
    }

    $("#sim-task-message").css("color", simWindow.animateColors[simWindow.animateColorIndex]);
};

function printSimTaskMessage(simTaskMessage) {
    window.setTimeout(() => {
        simWindow.simTaskMessage = simTaskMessage;
        const msgStr = `${simWindow.simTaskName}: ${simWindow.simTaskMessage}`;
        $("#sim-task-message").html(msgStr);
    }, 100);
};

function updateSolverParamsFromForms() {
    simParam.solverName = $("#select-nonlinear-solver").val();
    dimlessSimParam.numSolChebyshevNodes = Number($("#select-num-of-mesh-points").val());
    dimlessSimParam.numMaxIteration = parseInt($("#select-max-num-of-iteration").val());
    dimlessSimParam.solverTol = Number($("#select-solver-tol").val());
    dimlessSimParam.numCurrentChebyshevNodes = parseInt($("#select-num-of-current-mesh-points").val());
};

function updateSimParamsFromForms() {
    // for test
    if(simWindow.isTestMode) {
        if(simWindow.testName == 'testPerformance') {
            $("#input-module-length").val("1"); // [mm]
            $("#input-module-area").val("1"); // [mm^2]
            $("input-num-of-legs").val("1"); // [1]
            $("#input-cold-side-temp").val("300");
            $("#input-hot-side-temp").val("900");
        };
    };

    simParam.length = Number($("#input-module-length").val()) * 1e-3;  // [mm]
    simParam.area = Number($("#input-module-area").val()) * 1e-6;  // [mm^2]
    simParam.numLegs = Number($("#input-num-of-legs").val());
    simParam.coldTemp = Number($("#input-cold-side-temp").val());
    simParam.hotTemp = Number($("#input-hot-side-temp").val());
    simParam.initialRefCurrent = Number($("#input-initial-current").val());
    simParam.finalRefCurrent = Number($("#input-final-current").val());

    // handle missing values
    var diffMinAndMaxTemp = simParam.maxTemp - simParam.minTemp;
    if($("#input-cold-side-temp").val().trim() == "" || isNaN(simParam.coldTemp)) {
        simParam.coldTemp = parseInt(simParam.minTemp + diffMinAndMaxTemp*0.1);
        $("#input-cold-side-temp").val(simParam.coldTemp);
    };
    if($("#input-hot-side-temp").val().trim() == "" || isNaN(simParam.hotTemp)) {
        simParam.hotTemp = parseInt(simParam.maxTemp - diffMinAndMaxTemp*0.1);
        $("#input-hot-side-temp").val(simParam.hotTemp);
    };
};

function initSimParamForms() {
    $("#select-nonlinear-solver").html(
        `
        <option value="picard-iteration">Picard Iteration (Fast)</option>
        <option value="powell-method">Powell Optimization Method</option>
        `);
    $("#select-nonlinear-solver").change(changeSolverOptionForms);

    $("#select-num-of-current-mesh-points").html(
        `
        <option value="8">8 Chebyshev Nodes (Fast)</option>
        <option value="11">11 Chebyshev Nodes </option>
        <option value="14">14 Chebyshev Nodes </option>
        <option value="17">17 Chebyshev Nodes</option>
        <option value="20">20 Chebyshev Nodes (Accurate)</option>
        `);

    $("#input-module-length").val("1");
    $("#input-module-area").val("1");
    $("#input-num-of-legs").val("1");
    $("#input-initial-current").val("0");
    $("#input-final-current").val("1");

    $("#select-nonlinear-solver").val("picard-iteration")  // initial choice
    changeSolverOptionForms();
    $("#select-num-of-current-mesh-points").val("11");
};

function changeSolverOptionForms() {
    const selectedSolver = $("#select-nonlinear-solver").val();
    if(selectedSolver == "picard-iteration") {
        $("#select-num-of-mesh-points").html(
            `
            <option value="8">8 Chebyshev Nodes (Fast)</option>
            <option value="11">11 Chebyshev Nodes</option>
            <option value="22">22 Chebyshev Nodes</option>
            <option value="33">33 Chebyshev Nodes</option>
            <option value="44">44 Chebyshev Nodes (Accurate)</option>
            `);
        $("#select-num-of-mesh-points").val("11");

        $("#select-max-num-of-iteration").html(
            `
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            `);
        $("#select-max-num-of-iteration").val("20");

        $("#select-solver-tol").html(
            `
            <option value="1e-5">1e-5 (Fast)</option>
            <option value="1e-6">1e-6</option>
            <option value="1e-7">1e-7</option>
            <option value="1e-8">1e-8 (Accurate)</option>
            `);
        $("#select-solver-tol").val("1e-8");
    }
    else if(selectedSolver == "powell-method") {
        $("#select-num-of-mesh-points").html(
            `
            <option value="8">8 Chebyshev Nodes (Fast)</option>
            <option value="11">11 Chebyshev Nodes </option>
            <option value="14">14 Chebyshev Nodes </option>
            <option value="17">17 Chebyshev Nodes</option>
            <option value="20">20 Chebyshev Nodes (Accurate)</option>
            `);
        $("#select-num-of-mesh-points").val("8");

        $("#select-max-num-of-iteration").html(
            `
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            `);
        $("#select-max-num-of-iteration").val("50");

        $("#select-solver-tol").html(
            `
            <option value="1e-5">1e-5 (Fast)</option>
            <option value="1e-6">1e-6</option>
            <option value="1e-7">1e-7</option>
            <option value="1e-8">1e-8 (Accurate)</option>
            `);
        $("#select-solver-tol").val("1e-6");
    }
    else {
        console.log("Fatal Error: Unknown solver!");
    }
};

function updateTepFuncs() {
    if(!updateSingleTepFunc("funcSeebeck", simWindow.tableSeebeck, "seebeck", "seebeck")) {
        window.alert("Analytic formula for Seebeck coefficient cannot be found!");
        return false;
    }
    if(!updateSingleTepFunc("funcElecResi", simWindow.tableElecResi, "elecResi", "elec-resi")) {
        window.alert("Analytic formula for electrical resistivity cannot be found!");
        return false;
    }
    if(!updateSingleTepFunc("funcThrmCond", simWindow.tableThrmCond, "thrmCond", "thrm-cond", 1.0)) {
        window.alert("Analytic formula for thermal conductivity cannot be found!");
        return false;
    }
    return true;
};

function updateSingleTepFunc(tepFuncName, table, yField, tepName, costScale=1.0) {
    const tableData = table.getData();
    const xField = "temperature";
    const selectTepMethodId = getSelectTepMethodId(tepName);
    const selectTepMethodSuboptionId = getSelectTepMethodSuboptionId(tepName);
    var dataRows, minXValue, maxXValue;

    [dataRows, minXValue, maxXValue] = getDataRows(tableData, xField, yField);
    // keep recording a valid temperature range.
    if(simParam.minTemp <= minXValue) {
        simParam.minTemp = minXValue;
    };
    if(simParam.maxTemp >= maxXValue) {
        simParam.maxTemp = maxXValue;
    };

    // make a linear function if there are only two nodes
    if(dataRows.length == 2) {
        const xValueFirst = dataRows[0][0];
        const xValueSecond = dataRows[1][0];
        const yValueFirst = dataRows[0][1];
        const yValueSecond = dataRows[1][1];
        const dydx = (yValueSecond-yValueFirst)/(xValueSecond-xValueFirst)
        simParam[tepFuncName] = (x) => (yValueFirst + dydx*(x-xValueFirst));
        return true;
    };

    // for real
    func = getTepFunc(dataRows, selectTepMethodId, selectTepMethodSuboptionId);
    if(func) {
        simParam[tepFuncName] = func;
        return true;
    };

    return false;
};

function getTepFunc(dataRows, selectTepMethodId, selectTepMethodSuboptionId, costScale=1.0) {
    const selectTepMethodVal = $(selectTepMethodId).val();
    if(selectTepMethodVal == "polynomial-regression") {
        const degPoly = Number($(selectTepMethodSuboptionId).val());
        //console.log(`deg of ${selectTepMethodId} is ${degPoly}`);
        if(dataRows.length >= 2) {
            return getPolyRegressFunc(degPoly, dataRows, costScale);
        };
    }
    else if(selectTepMethodVal == "polynomial-interpolation") {
        const numNodes = Number($(selectTepMethodSuboptionId).val());
        if(dataRows.length >= 2) {
            return getPolyChebyshevFuncFromDataRows(numNodes, dataRows);
        };
    };
    return undefined;
};

function setChartContainerStyle() {
    $(".section .chart-container")
        .css("display", "flex")
        .css("flex-wrap", "wrap")
        .css("align-items", "stretch")
        .css("align-content", "flex-start")
        .css("justify-content", "space-around")
        .css("margin-left", "0px")
        .css("margin-right", "0px");
};

function drawTepCharts() {
    drawSeebeckChart();
    drawElecResiChart();
    drawThrmCondChart();
    drawElecCondChart();
    drawPowerFactorChart();
    drawFigureOfMeritChart();

    setChartContainerStyle();
};

function drawSeebeckChart() {
    const chart = simWindow.chartSeebeck;
    const table = simWindow.tableSeebeck;
    const xField = "temperature";
    const yField = "seebeck";
    const xLabel = "Temperature [K]";
    const yLabel = "Seebeck coefficient [μV/K]";
    const yTableLabel = "raw data";
    const yScale = 1e6;  // [μV/K]

    const data = getChartData(table, xField, yField, xLabel, yTableLabel, yScale);

    var view = new google.visualization.DataView(data);
    view.setColumns([0, 1, {
      label: 'formula',
      type: 'number',
      calc: function (dt, row) {
          var xValue = dt.getValue(row, 0)
          return simParam.funcSeebeck(xValue) * yScale;  // [μV/K]
      }
    }]);

    var options = {
      seriesType: 'scatter',
      series: {
        1: {
          type: 'line',
          curveType: 'function',
        }
      },
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
      legend: { position: 'bottom', alignment: 'center' },
      colors: [simWindow.colorRawData, simWindow.colorFormula],
      height: simWindow.chartHeight,
    };
  
    chart.draw(view, options);
};

function drawElecResiChart() {
    const chart = simWindow.chartElecResi;
    const table = simWindow.tableElecResi;
    const xField = "temperature";
    const yField = "elecResi";
    const xLabel = "Temperature [K]";
    const yLabel = "Electrical resistivity [mΩ cm]";
    const yTableLabel = "raw data";
    const yScale = 1e5;  // [mΩ cm]

    var data = getChartData(table, xField, yField, xLabel, yTableLabel, yScale);

    var view = new google.visualization.DataView(data);
    view.setColumns([0, 1, {
      label: 'formula',
      type: 'number',
      calc: function (dt, row) {
        var xValue = dt.getValue(row, 0)
        return simParam.funcElecResi(xValue) * 1e5;  // [mΩ cm]
      }
    }]);

    var options = {
      seriesType: 'scatter',
      series: {
        1: {
          type: 'line',
        }
      },
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
      legend: { position: 'bottom', alignment: 'center' },
      colors: [simWindow.colorRawData, simWindow.colorFormula],
      height: simWindow.chartHeight,
    };
  
    chart.draw(view, options);
};

function drawThrmCondChart() {
    const chart = simWindow.chartThrmCond;
    const table = simWindow.tableThrmCond;
    const xField = "temperature";
    const yField = "thrmCond";
    const xLabel = "Temperature [K]";
    const yLabel = "Thermal conductivity [W/m/K]";
    const yTableLabel = "raw data";
    const yScale = 1.0;

    var data = getChartData(table, xField, yField, xLabel, yTableLabel, yScale);

    var view = new google.visualization.DataView(data);
    view.setColumns([0, 1, {
      label: 'formula',
      type: 'number',
      calc: function (dt, row) {
        var xValue = dt.getValue(row, 0)
        return simParam.funcThrmCond(xValue) * yScale;
      }
    }]);

    var options = {
      seriesType: 'scatter',
      series: {
        1: {
          type: 'line',
        }
      },
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15, minValue:0.0, maxValue:5.0,},},
      legend: { position: 'bottom', alignment: 'center' },
      colors: [simWindow.colorRawData, simWindow.colorFormula],
      height: simWindow.chartHeight,
    };
  
    chart.draw(view, options);
};

function drawElecCondChart() {
    const xLabel = "Temperature [K]";
    const yLabel = "Electrical conductivity [S/cm]";
    const yScale = 1e-02;  // [S/cm]
    const dx = (simParam.maxTemp - simParam.minTemp) / (simWindow.numMinMeshPoints-1);
    const dataArray = [['Temperature [K]', 'formula']]
    var xValue, yValue;

    for(let i=0; i<simWindow.numMinMeshPoints; i++) {
        xValue = simParam.minTemp + dx*i;
        yValue = 1/simParam.funcElecResi(xValue);
        dataArray.push([xValue, yValue * yScale]);
    };
    var data = google.visualization.arrayToDataTable(dataArray);

    var options = {
        title: yLabel,
        titleTextStyle: {bold: true, fontSize: 20,},
        hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
        vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
        legend: { position: 'bottom', alignment: 'center' },
        colors: [simWindow.colorFormula],
        height: simWindow.chartHeight,
    };
    simWindow.chartElecCond.draw(data, options);
};

function drawPowerFactorChart() {
    const xLabel = "Temperature [K]";
    const yLabel = "Power Factor [10\u207b\u00B3 W/m/K\u00B2]"; // [10^{-3} W/m/K^2]
    const yScale = 1e03;  // [10^{-3} W/m/K^2]
    const dx = (simParam.maxTemp - simParam.minTemp) / (simWindow.numMinMeshPoints-1);
    const dataArray = [['Temperature [K]', 'formula']]
    var xValue, yValue;

    for(let i=0; i<simWindow.numMinMeshPoints; i++) {
        xValue = simParam.minTemp + dx*i;
        yValue = Math.pow(simParam.funcSeebeck(xValue),2)/simParam.funcElecResi(xValue);
        dataArray.push([xValue, yValue * yScale]);
    };
    var data = google.visualization.arrayToDataTable(dataArray);

    var options = {
        title: yLabel,
        titleTextStyle: {bold: true, fontSize: 20,},
        hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
        vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
        legend: { position: 'bottom', alignment: 'center' },
        colors: [simWindow.colorFormula],
        height: simWindow.chartHeight,
    };
    simWindow.chartPowerFactor.draw(data, options);
};

function drawFigureOfMeritChart() {
    const xLabel = "Temperature [K]";
    const yLabel = "Figure of merit zT [1]";
    const yScale = 1.0;  // [1]
    const dx = (simParam.maxTemp - simParam.minTemp) / (simWindow.numMinMeshPoints-1);
    const dataArray = [['Temperature [K]', 'formula']]
    var xValue, yValue;

    for(let i=0; i<simWindow.numMinMeshPoints; i++) {
        xValue = simParam.minTemp + dx*i;
        yValue = Math.pow(simParam.funcSeebeck(xValue),2)/(simParam.funcElecResi(xValue)*simParam.funcThrmCond(xValue))*xValue;
        dataArray.push([xValue, yValue * yScale]);
    };
    var data = google.visualization.arrayToDataTable(dataArray);

    var options = {
        title: yLabel,
        titleTextStyle: {bold: true, fontSize: 20,},
        hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
        vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
        legend: { position: 'bottom', alignment: 'center' },
        colors: [simWindow.colorFormula],
        height: simWindow.chartHeight,
    };
    simWindow.chartFigureOfMerit.draw(data, options);
};

function getDataRows(tableData, xField, yField, yScale=1.0) {
    var xData;
    var dataRows = [];
    var minXValue = Infinity;
    var maxXValue = -Infinity;

    for(let row of tableData) {
        xData = row[xField];
        if(!isNaN(xData) && xData !== "" && xData !== null) {  // handle only when xValue is adequate
            xValue = Number(row[xField]);
            yValue = Number(row[yField]);
            dataRows.push([xValue, yValue*yScale]);
            // track min and max values
            if(minXValue > xValue) {
                minXValue = xValue;
            };
            if(maxXValue < xValue) {
                maxXValue = xValue;
            };  
        }
    };
    // sort rows in ascending temperature order
    dataRows.sort(function(a, b) {
        return a[0] - b[0];
    });

    return [dataRows, minXValue, maxXValue];
};

function getChartData(table, xField, yField, xLabel, yLabel, yScale=1.0) {
    const tableData = table.getData();
    var data = new google.visualization.DataTable();
    var xValue, dx;

    const [dataRows, minXValue, maxXValue] = getDataRows(tableData, xField, yField, yScale);
    const extendedDataRows = [...dataRows];

    // extend the data rows to satisfy the number of mesh points
    dx = (maxXValue - minXValue) / (simWindow.numMinMeshPoints-1);
    for(let i=1; i<simWindow.numMinMeshPoints-1; i++) {
        xValue = minXValue + dx*i;
        extendedDataRows.push([xValue, null]);
    };
    // sort rows in ascending temperature order
    extendedDataRows.sort(function(a, b) {
        return a[0] - b[0];
    });

    // create chart data
    data.addColumn('number', xLabel);
    data.addColumn('number', yLabel);
    data.addRows(extendedDataRows);

    return data;
};

function initSimResultCharts() {
    // sim result
    simWindow.chartCurrentVsPower = new google.visualization.ComboChart(document.getElementById('current-vs-power-chart'));
    simWindow.chartCurrentVsEfficiency = new google.visualization.ComboChart(document.getElementById('current-vs-efficiency-chart'));

    // for test
    simWindow.chartTest = new google.visualization.LineChart(document.getElementById('chart-test'));
};

function initTepCharts() {
    simWindow.chartSeebeck = new google.visualization.ComboChart(document.getElementById('chart-seebeck'));
    simWindow.chartElecResi = new google.visualization.ComboChart(document.getElementById('chart-elec-resi'));
    simWindow.chartThrmCond = new google.visualization.ComboChart(document.getElementById('chart-thrm-cond'));
    simWindow.chartElecCond = new google.visualization.LineChart(document.getElementById('chart-elec-cond'));
    simWindow.chartPowerFactor = new google.visualization.LineChart(document.getElementById('chart-power-factor'));
    simWindow.chartFigureOfMerit = new google.visualization.LineChart(document.getElementById('chart-figure-of-merit'));
};

function initTepFormulaMethodForms() {
    initTepFormulaMethodForm("seebeck");
    initTepFormulaMethodForm("elec-resi");
    initTepFormulaMethodForm("thrm-cond");
};

function initTepFormulaMethodForm(tepName) {
    const selectTepMethodId = getSelectTepMethodId(tepName);

    $(selectTepMethodId).html(
        `<option value="polynomial-regression">Polynomial Regression</option>
         <option value="polynomial-interpolation">Polynomial Interpolation</option>
         <option value="other-regression">Other Regression</option>`);
    $(selectTepMethodId).val("polynomial-interpolation")  // initial selection
    //$(selectTepMethodId).val("polynomial-regression")  // initial selection
    changeTepFormulaSuboptionForm(tepName);
    $(selectTepMethodId).change(function() {
        changeTepFormulaSuboptionForm(tepName);
    });
};

function changeTepFormulaSuboptionForm(tepName) {
    const selectTepMethodId = getSelectTepMethodId(tepName);
    const selectTepMethodSuboptionId = getSelectTepMethodSuboptionId(tepName);
    const labelTepMethodSuboptionId = `#label-${tepName}-suboption`;

    if ($(`${selectTepMethodId} option:selected`).val() == "polynomial-regression") {
        $(labelTepMethodSuboptionId).html("Select Polynomial Degree:");
        $(selectTepMethodSuboptionId).html(
            `
            <option value="1">Linear</option>
            <option value="2">Quadratic</option>
            <option value="3">Cubic</option>
            <option value="4">4th</option>
            <option value="5">5th</option>
            `
        );
        $(selectTepMethodSuboptionId).val("3");  // change initial choice
    }
    else if ($(`${selectTepMethodId} option:selected`).val() == "polynomial-interpolation") {
        $(labelTepMethodSuboptionId).html("Select Interpolation Method:");
        $(selectTepMethodSuboptionId).html(
            `
            <option value="8">8 Chebyshev Nodes</option>
            <option value="9">9 Chebyshev Nodes</option>
            <option value="10">10 Chebyshev Nodes</option>
            <option value="11">11 Chebyshev Nodes</option>
            <option value="12">12 Chebyshev Nodes</option>
            <option value="13">13 Chebyshev Nodes</option>
            <option value="14">14 Chebyshev Nodes</option>
            <option value="15">15 Chebyshev Nodes</option>
            <option value="16">16 Chebyshev Nodes</option>
            `
        );
        $(selectTepMethodSuboptionId).val("11");  // change initial choice
    }
    else if ($(`${selectTepMethodId} option:selected`).val() == "other-regression") {
        $(labelTepMethodSuboptionId).html("Select Regression Method:");
        $(selectTepMethodSuboptionId).html(
            `
            <option value="na">Not Available</option>
            `
        );
        $(selectTepMethodSuboptionId).val("na");  // change initial choice
    };
};

function getSelectTepMethodId(tepName) {
    return `#select-${tepName}-method`;
};

function getSelectTepMethodSuboptionId(tepName) {
    return `#select-${tepName}-suboption`;
};

function initTepTables() {
    var tabledataSeebeck, tableElecResi, tableThrmCond;
    //define some sample data
    if(simWindow.isTestMode) {
        if(simWindow.testName == 'testDiffusionTerm') {
            [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestDiffusionTermTabledata();
        }
        else if(simWindow.testName == 'testJouleTermConstElecResi') {
            [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestJouleTermConstElecResiTabledata();
        }
        else if(simWindow.testName == 'testJouleTermLinearElecResi') {
            [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestJouleTermLinearElecResiTabledata();
        }
        else if(simWindow.testName == 'testThomsonTerm') {
            [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestThomsonTermTabledata();
        }
        else if(simWindow.testName == 'testPerformance') {
            [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestPerformanceTabledata();
        }
        else if(simWindow.testName == 'testPowellMethod') {
            [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestPowellMethodTabledata();
        }
        else if(simWindow.testName == 'testPromise') {
            [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestPowellMethodTabledata();
        }
        else {
            window.alert("Invalid Test Name!");
        }
    }
    else {
        [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestRealisticTabledata();
    };

    var tableSeebeck = new Tabulator("#tep-table-seebeck", {
        height: "250px",
        data: tabledataSeebeck,
        resizableColumns: false,
        selectable: true,
        clipboard: true,
        clipboardPasteAction: "replace",
        layout: "fitColumns", //fit columns to width of table (optional)
        columns: [ //Define Table Columns
            {title:"Temp. [K]", field:"temperature", hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
            {title:"[V/K]", field:"seebeck", hozAlign:"center", sorter:"number", validator:"numeric", editor:true},
        ],
    });

    var tableElecResi = new Tabulator("#tep-table-elec-resi", {
        height: "250px",
        data: tabledataElecResi,
        resizableColumns: false,
        selectable: true,
        clipboard: true,
        clipboardPasteAction: "replace",
        layout: "fitColumns", //fit columns to width of table (optional)
        columns: [
            {title:"Temp. [K]", field:"temperature", hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
            {title:"[Ω m]", field:"elecResi", hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
        ],
    });  

    var tableThrmCond = new Tabulator("#tep-table-thrm-cond", {
        height: "250px",
        data: tabledataThrmCond,
        resizableColumns: false,
        selectable: true,
        clipboard: true,
        clipboardPasteAction: "replace",
        layout: "fitColumns", //fit columns to width of table (optional)
        columns: [
            {title:"Temp. [K]", field:"temperature", hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
            {title:"[W/m/K]", field:"thrmCond", hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
        ],
    });

    $("#add-row-tep-table-seebeck").click(function() {
        tableSeebeck.addRow({}, false);  // false means add to the bottom
    });
    $("#delete-row-tep-table-seebeck").click(function() {
        tableSeebeck.deleteRow(tableSeebeck.getSelectedRows());
    });
    $("#clear-tep-table-seebeck").click(function() {
        clearTepTable(tableSeebeck);
    });
    $("#add-row-tep-table-elec-resi").click(function() {
        tableElecResi.addRow({}, false);  // false means add to the bottom
    });
    $("#delete-row-tep-table-elec-resi").click(function() {
        tableElecResi.deleteRow(tableElecResi.getSelectedRows());
    });
    $("#clear-tep-table-elec-resi").click(function() {
        clearTepTable(tableElecResi);
    });
    $("#add-row-tep-table-thrm-cond").click(function() {
        tableThrmCond.addRow({}, false);  // false means add to the bottom
    });
    $("#delete-row-tep-table-thrm-cond").click(function() {
        tableThrmCond.deleteRow(tableThrmCond.getSelectedRows());
    });
    $("#clear-tep-table-thrm-cond").click(function() {
        clearTepTable(tableThrmCond);
    });

    simWindow.tableSeebeck = tableSeebeck;
    simWindow.tableElecResi = tableElecResi;
    simWindow.tableThrmCond = tableThrmCond;
};

function clearTepTable(table) {
    table.clearData();
    table.addRow({}, false);  // add a row to the bottom to allow pasting.
};


/* thermoelectric generator models */

async function solveTeqnByPowellMethod(J) {
    const chebyshevNodesVec = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0.0, dimlessSimParam.length);
    const initTempVecExceptBoundary = getLinearVec(chebyshevNodesVec, dimlessSimParam.hotTemp, dimlessSimParam.coldTemp).slice(1,chebyshevNodesVec.length-1);
    var bounds = [];
    for(let i=0; i<chebyshevNodesVec.length-2; i++) {
        bounds.push([dimlessSimParam.minTemp, dimlessSimParam.maxTemp]);
    };

    simWindow.simTaskName = `Powell Method for I<sub>Ref</sub>=${(J*simParam.refJ*simParam.area/simParam.refI).toFixed(3)}`;

    function costFunc(tempVecExceptBoundary) {
        return new Promise(function(resolve, reject) {
            window.setTimeout(() => {
                // we do not need to optimize the boundary points.
                var tempVec = [...tempVecExceptBoundary];
                tempVec.unshift(dimlessSimParam.hotTemp);
                tempVec.push(dimlessSimParam.coldTemp);
                var tempFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodesVec, tempVec);
                var refinedTempVec = new getLinearSpace(0.0, dimlessSimParam.length, simWindow.numMinMeshPoints);
                refinedTempVec = refinedTempVec.map((x) => (tempFunc(x)));
                
                howMuchOverMaxTemp = Math.max(...refinedTempVec) - dimlessSimParam.maxTemp;
                howMuchLessMinTemp = dimlessSimParam.minTemp - Math.min(...refinedTempVec);
                if(howMuchOverMaxTemp > 0) {
                    resolve(1.0 + howMuchOverMaxTemp);
                };
                if(howMuchLessMinTemp > 0) {
                    resolve(1.0 + howMuchOverMaxTemp);
                };
                // console.log("getIntegralTeqnRhs(), xVec, tempVec, J=", chebyshevNodesVec, tempVec, J);
                var newTempVec = getIntegralTeqnRhs(chebyshevNodesVec, tempVec, J);  // be careful!
                // console.log("getIntegralTeqnRhs() done.");

                const cost = getL2Error(newTempVec, tempVec)

                resolve(cost);
            });
        });
    };

    function callbackFunc(iter, err, msg=null) {
        return new Promise(function(resolve, reject) {
            var postfix = "th";
            if(iter == 1) {
                postfix = "st";
            }
            else if(iter == 2) {
                postfix = "nd";
            }
            else if(iter == 3) {
                postfix = "rd";
            }
            if(msg === null) {
                printSimTaskMessage(`${iter}${postfix} iteration L<sup>2</sup>-error=${err.toExponential(3)}`);
                animateSimTaskMessageColor(true);
                resolve();    
            }
            else {
                printSimTaskMessage(`${iter}${postfix} iteration: ${msg}`);
                animateSimTaskMessageColor(true);
                resolve();
            };
        });
    }

    console.log("before starting Powell method ...");
    var tempVecExceptBoundary = await minimizer.powellsMethodAsync(costFunc, initTempVecExceptBoundary, 
        {'bounds': bounds, 'maxIter': dimlessSimParam.numMaxIteration, 'absTolerance': dimlessSimParam.solverTol, 'tolerance': 1e-8, 'lineTolerance': 1e-8, 'verbose': true, 'callback': callbackFunc});

    console.log("tempVec=", tempVecExceptBoundary);
    
    var tempVec = [...tempVecExceptBoundary];
    tempVec.unshift(dimlessSimParam.hotTemp);
    tempVec.push(dimlessSimParam.coldTemp);
    
    animateSimTaskMessageColor(false);

    return {'sol': tempVec, 'success': true};
};

async function solveTeqnByPicardIteration(J) {
    const chebyshevNodesVec = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0.0, dimlessSimParam.length);
    const initTempVec = getLinearVec(chebyshevNodesVec, dimlessSimParam.hotTemp, dimlessSimParam.coldTemp);
    simWindow.simTaskName = `Picard Iteration for I<sub>Ref</sub>=${(J*simParam.refJ*simParam.area/simParam.refI).toFixed(3)}`;

    var result = await new Promise(function(resolve, reject) {
        var prevTempVec = new Float64Array(initTempVec);
        var newTempVec;
        var isConvergent = false;
        var LInftyError;
        var L2Error;
    
        for(let i=0; i<dimlessSimParam.numMaxIteration; i++) {
            newTempVec = getIntegralTeqnRhs(chebyshevNodesVec, prevTempVec, J);
            // do clipping to avoid unobserved temperatures ...
            newTempVec = clipByValue(newTempVec, dimlessSimParam.minTemp, dimlessSimParam.maxTemp);
            L2Error = getL2Error(newTempVec, prevTempVec);
            console.log(`${i}th Picard iteration L^2 error=${L2Error.toExponential(3)}`);
            printSimTaskMessage(`${i}th iteration L<sup>2</sup>-error=${L2Error.toExponential(3)}`);
            animateSimTaskMessageColor(true);
            if(L2Error <= dimlessSimParam.solverTol) {
                isConvergent = true;
                break;
            };
            prevTempVec = newTempVec;
        };
        // test convergence
        if(!isConvergent) {
            //window.alert("Picard iteration not converged!");
            resolve({'sol': null, 'success': false});
        }
        // test the validity of solution range
        var newTempFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodesVec, newTempVec);
        var refinedNewTempVec = new getLinearSpace(0.0, dimlessSimParam.length, simWindow.numMinMeshPoints);
        refinedNewTempVec = refinedNewTempVec.map((x) => (newTempFunc(x)));
        const solMaxTemp = Math.max(...refinedNewTempVec);
        const solMinTemp = Math.min(...refinedNewTempVec);
        if(solMaxTemp > dimlessSimParam.maxTemp) {
            window.alert(`Picard iteration failed: Invalid solution range! Max. Temp of solution=${solMaxTemp*simParam.hotTemp} > ${dimlessSimParam.maxTemp*simParam.hotTemp}.`);
            resolve({'sol': null, 'success': false});
        }
        if(solMinTemp < dimlessSimParam.minTemp) {
            window.alert(`Picard iteration failed: Invalid solution range! Min. Temp of solution=${solMinTemp*simParam.hotTemp} < ${dimlessSimParam.minTemp*simParam.hotTemp}.`);
            resolve({'sol': null, 'success': false});
        }
    
        resolve({'sol': newTempVec, 'success': true});
    });
    animateSimTaskMessageColor(false);
    return result;
};

function getTegPerformance(chebyshevNodesVec, tempVec, dimlessJ) {
    // dimensionless params
    const lenVec = chebyshevNodesVec.length;
    const dimlessTempFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodesVec, tempVec);
    const integralOneOfKappaTermVec = _getIntegralOneOfKappaTerm(chebyshevNodesVec, dimlessTempFunc);
    const integrandF1OverThrmCondFunc = _getIntegrandF1OverThrmCondFunc(dimlessTempFunc);
    const integrandF2OverThrmCondFunc = _getIntegrandF2OverThrmCondFunc(dimlessTempFunc);

    // dimensional params
    const L = simParam.length;
    const A = simParam.area;
    const funcSeebeck = simParam.funcSeebeck;
    const funcElecResi = simParam.funcElecResi;
    const funcThrmCond = simParam.funcThrmCond;
    const barSeebeck = simParam.barSeebeck;
    const Th = simParam.hotTemp;
    const deltaTemp = simParam.deltaTemp;
    const refSeebeck = simParam.refSeebeck;
    const refElecResi = simParam.refElecResi;
    const refThrmCond = simParam.refThrmCond;

    const V = simParam.barSeebeck*simParam.deltaTemp;
    const RRef = L*refElecResi/A;  // ok
    const KRef = A*refThrmCond/L;  // ok
    const IRef = simParam.refI;  // ok
    const smallDeltaT1Ref = refSeebeck*Th*L/refThrmCond/A;
    const smallDeltaT2Ref = (refElecResi/refThrmCond) * Math.pow(L/A, 2);

    const I = dimlessJ * IRef;
    const R = adaptiveSimpson((x) => (dimlessSimParam.funcElecResi(dimlessTempFunc(x))), 0.0, dimlessSimParam.length, dimlessSimParam.integralEps) * RRef;
    const K = (1/integralOneOfKappaTermVec[lenVec-1]) * KRef;
    const smallDeltaT1 = adaptiveSimpson((x) => (integrandF1OverThrmCondFunc(x)), 0.0, dimlessSimParam.length, dimlessSimParam.integralEps) * smallDeltaT1Ref;
    const smallDeltaT2 = adaptiveSimpson((x) => (integrandF2OverThrmCondFunc(x)), 0.0, dimlessSimParam.length, dimlessSimParam.integralEps) * smallDeltaT2Ref;
    const tau = ( (barSeebeck-funcSeebeck(Th))*Th - K*smallDeltaT1 ) / V;
    const beta = 2*K*smallDeltaT2/R - 1;
    const hotSideFlux = K*deltaTemp + I*barSeebeck*(Th-tau*deltaTemp) - 0.5*I*I*R*(1+beta);
    const power = I*(V - I*R);

    return {'hotSideFlux': hotSideFlux, 'power': power, 'efficiency': power/hotSideFlux};
};

function getIntegralTeqnRhs(chebyshevNodesVec, tempVec, J) {
    const tempFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodesVec, tempVec);
    const integralOneOfKappaTermVec = _getIntegralOneOfKappaTerm(chebyshevNodesVec, tempFunc);
    const firstTerm = _getHomogeneousTermOfIntegralTeqnRhs(integralOneOfKappaTermVec);
    const secondTerm = _getSecondTermOfIntegralTeqnRhs(chebyshevNodesVec, tempFunc, integralOneOfKappaTermVec, J);

    return firstTerm.map((element, index) => (element + secondTerm[index]));
};

function _getSecondTermOfIntegralTeqnRhs(chebyshevNodesVec, tempFunc, integralOneOfKappaTermVec, J) {
    const lenVec = chebyshevNodesVec.length;
    const integrandFOverThrmCond = _getIntegrandFOverThrmCondFunc(tempFunc, J);
    const firstVec = new Float64Array(lenVec);
    const secondVec = new Float64Array(integralOneOfKappaTermVec);
    for(let i=1; i<lenVec; i++) {
        firstVec[i] = firstVec[i-1]
            + (-adaptiveSimpson((x) => (integrandFOverThrmCond(x)), chebyshevNodesVec[i-1], chebyshevNodesVec[i], dimlessSimParam.integralEps, dimlessSimParam.maxIntegralDepth));
    };
    const smallDeltaT = -firstVec[lenVec-1];
    const KoverA = 1/integralOneOfKappaTermVec[lenVec-1];
    for(let i=1; i<lenVec; i++) {
        secondVec[i] *= (KoverA * smallDeltaT);
    };

    return firstVec.map((element, index) => (element + secondVec[index]));
};

function _getIntegrandF2OverThrmCondFunc(tempFunc) {
    const integrandF2OverThrmCondFunc = function(x) {
        const tempAtX = tempFunc(x);
        const denom = dimlessSimParam.funcThrmCond(tempAtX);
        var result = 0.0;
        
        result += adaptiveSimpson((x) => (dimlessSimParam.funcElecResi(tempFunc(x))), 0, x, dimlessSimParam.integralEps, dimlessSimParam.maxIntegralDepth);
        result /= denom;

        return result;
    };

    return integrandF2OverThrmCondFunc;
};

function _getIntegrandF1OverThrmCondFunc(tempFunc) {
    const integrandF1OverThrmCondFunc = function(x) {
        const tempAtX = tempFunc(x);
        const denom = dimlessSimParam.funcThrmCond(tempAtX);
        var result = 0.0;

        result += (+ dimlessSimParam.funcSeebeck(tempAtX) * tempAtX
                   - dimlessSimParam.funcSeebeck(dimlessSimParam.hotTemp) * dimlessSimParam.hotTemp);
        result += (-adaptiveSimpson((temp) => (dimlessSimParam.funcSeebeck(temp)), dimlessSimParam.hotTemp, tempAtX, dimlessSimParam.integralEps, dimlessSimParam.maxIntegralDepth));
        result /= denom;

        return result;
    };

    return integrandF1OverThrmCondFunc;
};

function _getIntegrandFOverThrmCondFunc(tempFunc, J) {
    const integrandFOverThrmCondFunc = function(x) {
        const tempAtX = tempFunc(x);
        // console.log("tempAtX=", tempAtX);
        const denom = dimlessSimParam.funcThrmCond(tempAtX);
        var result = 0.0;

        result += Math.pow(J,2) * adaptiveSimpson((x) => (dimlessSimParam.funcElecResi(tempFunc(x))), 0, x, dimlessSimParam.integralEps);
        result += (-J*dimlessSimParam.funcSeebeck(tempAtX)*tempAtX + J*dimlessSimParam.funcSeebeck(dimlessSimParam.hotTemp)*dimlessSimParam.hotTemp);
        result += J * adaptiveSimpson((temp) => (dimlessSimParam.funcSeebeck(temp)), dimlessSimParam.hotTemp, tempAtX, dimlessSimParam.integralEps, dimlessSimParam.maxIntegralDepth);

        result /= denom;
        return result;
    };

    return integrandFOverThrmCondFunc;
};

function _getHomogeneousTermOfIntegralTeqnRhs(integralOneOfKappaTermVec) {
    // assume chebyshevNodesVec ranges from 0 to dimensionless length.
    const lenVec = integralOneOfKappaTermVec.length
    const KoverA = 1/integralOneOfKappaTermVec[lenVec-1];

    return integralOneOfKappaTermVec.map((element) => (dimlessSimParam.hotTemp - KoverA * dimlessSimParam.deltaTemp * element));
};

function _getIntegralOneOfKappaTerm(chebyshevNodesVec, tempFunc) {
    const lenVec = chebyshevNodesVec.length
    const integralVec = new Float64Array(lenVec);
    const integrandFunc = (x) => (1/dimlessSimParam.funcThrmCond(tempFunc(x)));

    for(let i=1; i<lenVec; i++) {
        integralVec[i] = integralVec[i-1] + adaptiveSimpson(integrandFunc, chebyshevNodesVec[i-1], chebyshevNodesVec[i], dimlessSimParam.integralEps, dimlessSimParam.maxIntegralDepth);
    };
    return integralVec;
};

function updateDimlessSimParams() {
    // handle derived values
    simParam.deltaTemp = simParam.hotTemp - simParam.coldTemp;
    simParam.barSeebeck = adaptiveSimpson(simParam.funcSeebeck, simParam.coldTemp, simParam.hotTemp, simParam.integralEps) / simParam.deltaTemp;
    simParam.barThrmCond = adaptiveSimpson(simParam.funcThrmCond, simParam.coldTemp, simParam.hotTemp, simParam.integralEps) / simParam.deltaTemp;
    simParam.barElecResi = adaptiveSimpson((temp) => (simParam.funcElecResi(temp) * simParam.funcThrmCond(temp)), simParam.coldTemp, simParam.hotTemp, simParam.integralEps) / simParam.barThrmCond / simParam.deltaTemp;

    simParam.refTemp = simParam.hotTemp;
    simParam.refLength = simParam.length;
    dimlessSimParam.minTemp = simParam.minTemp / simParam.refTemp;
    dimlessSimParam.maxTemp = simParam.maxTemp / simParam.refTemp;
    dimlessSimParam.coldTemp = simParam.coldTemp / simParam.refTemp;
    dimlessSimParam.hotTemp = simParam.hotTemp / simParam.refTemp;
    dimlessSimParam.deltaTemp = simParam.deltaTemp / simParam.refTemp;
    dimlessSimParam.ZdeltaT = Math.pow(simParam.barSeebeck,2)*simParam.deltaTemp/(simParam.barElecResi*simParam.barThrmCond);

    simParam.refSeebeck = simParam.barSeebeck / dimlessSimParam.ZdeltaT;
    simParam.refElecResi = simParam.barElecResi / (dimlessSimParam.ZdeltaT * dimlessSimParam.deltaTemp);
    simParam.refThrmCond = simParam.barThrmCond;
    simParam.refR = (simParam.length*simParam.barElecResi)/simParam.area;
    simParam.refI = simParam.barSeebeck*simParam.deltaTemp/simParam.refR;
    simParam.refJ = simParam.refI/simParam.area;

    dimlessSimParam.barSeebeck = simParam.barSeebeck / simParam.refSeebeck;
    dimlessSimParam.length = simParam.length / simParam.refLength;
    dimlessSimParam.numLegs = simParam.numLegs;
    dimlessSimParam.initialCurrent = simParam.initialRefCurrent;
    dimlessSimParam.finalCurrent = simParam.finalRefCurrent;

    dimlessSimParam.funcSeebeck = function(dimlessTemp) {
        const temp = dimlessTemp * simParam.refTemp;
        return simParam.funcSeebeck(temp) / simParam.refSeebeck;
    };
    dimlessSimParam.funcElecResi = function(dimlessTemp) {
        const temp = dimlessTemp * simParam.refTemp;
        return simParam.funcElecResi(temp) / simParam.refElecResi;
    };
    dimlessSimParam.funcThrmCond = function(dimlessTemp) {
        const temp = dimlessTemp * simParam.refTemp;
        return simParam.funcThrmCond(temp) / simParam.refThrmCond;
    };

    //test
    var testValue = Math.pow(simParam.length*simParam.refJ,2)*simParam.refElecResi / (simParam.hotTemp*simParam.refThrmCond);
};

function getSolverFunc() {
    if(simParam.solverName == 'picard-iteration') {
        return solveTeqnByPicardIteration;
    }
    else if(simParam.solverName == 'powell-method') {
        return solveTeqnByPowellMethod;
    }
    else {
        return null;
    };
};


async function runSimulation() {
    const chebyshevXVec = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0.0, 1.0);
    const meshXVec = getLinearSpace(0, dimlessSimParam.length, simWindow.numMinMeshPoints);
    const numCurrentChebyshevNodes = dimlessSimParam.numCurrentChebyshevNodes;
    const dJ = 0.05;

    // set a solver
    var solveTeqn = getSolverFunc();
    if(solveTeqn === null) {
        window.alert("Unknown solver!");
        return;
    };

    new Promise(async function(resolve, reject) {
        var initialCurrent = dimlessSimParam.initialCurrent;
        var finalCurrent = dimlessSimParam.finalCurrent;    
        var resAtInitialCurrent = null;
        var resAtFinalCurrent = null;
        var J;
        var res;

        // find a suitable final current
        J = finalCurrent;
        while(J > 0) {
            res = await solveTeqn(J);
            if(res.success) {
                finalCurrent = J;
                resAtFinalCurrent = res;
                break;
            }
            else {
                J -= dJ;
            }
        };
        if(J <= 0) {
            window.alert("Seriously wrong: Final ref. current not found!");
            reject();
        }
        console.log(`Final ref. current ${finalCurrent.toFixed(3)} found.`);

        // find a suitable initial current
        if(initialCurrent > finalCurrent) {
            window.alert("Initial ref. current is too large! Make it smaller.");
            reject();
        };
        J = initialCurrent;
        while(J < finalCurrent) {
            res = await solveTeqn(J);
            if(res.success) {
                initialCurrent = J;
                resAtInitialCurrent = res;
                break;
            }
            else {
                J += dJ;
            }
        };
        if(J > finalCurrent) {
            window.alert("Seriously wrong: Initial ref. current not found!");
            reject();
        }
        console.log(`Initial ref. current ${initialCurrent.toFixed(3)} found.`);
        console.log("resAtInitialCurrent=", resAtInitialCurrent);
        console.log("resAtFinalCurrent=", resAtFinalCurrent);
        resolve({initialCurrent: initialCurrent, finalCurrent: finalCurrent, resAtInitialCurrent: resAtInitialCurrent, resAtFinalCurrent: resAtFinalCurrent});
    }).then(function(values) {
        const initialCurrent = values.initialCurrent;
        const finalCurrent = values.finalCurrent;
        const resAtInitialCurrent = values.resAtInitialCurrent;
        const resAtFinalCurrent = values.resAtFinalCurrent;
        console.log("after current found=", initialCurrent, finalCurrent, resAtInitialCurrent, resAtFinalCurrent);
        return new Promise(async function(resolve, reject) {
            // run simulation
            const refCurrentVec = getChebyshevNodes(numCurrentChebyshevNodes, initialCurrent, finalCurrent);
            const powerVec = new Float64Array(numCurrentChebyshevNodes);
            const hotSideFluxVec = new Float64Array(numCurrentChebyshevNodes);
            var J;
            var res;
            var yVec;
            var tegPerformance;

            for(let i=0; i<numCurrentChebyshevNodes; i++) {
                J = refCurrentVec[i];
                if(i==0) {  // already computed
                    yVec = resAtInitialCurrent.sol;
                }
                else if(i==numCurrentChebyshevNodes-1) {  // already computed
                    yVec = resAtFinalCurrent.sol;
                }
                else {
                    res = await solveTeqn(J);
                    if(res.success) {
                        yVec = res.sol;
                    }
                    else {
                        window.alert("Seriously wrong: Computation at an interior ref. current failed!");
                        reject();
                    }
                }
                tegPerformance = getTegPerformance(chebyshevXVec, yVec, J);
                powerVec[i] = tegPerformance.power;
                hotSideFluxVec[i] = tegPerformance.hotSideFlux;
            }
            resolve({refCurrentVec: refCurrentVec, powerVec: powerVec, hotSideFluxVec: hotSideFluxVec});
        });
    }).then(function(values) {
        const refCurrentVec = values.refCurrentVec;
        const powerVec = values.powerVec;
        const hotSideFluxVec = values.hotSideFluxVec;
        // draw I-power curve and I-efficiency curve
        const powerFunc = getPolyChebyshevFuncFromChebyshevNodes(refCurrentVec, powerVec);
        const hotSideFluxFunc = getPolyChebyshevFuncFromChebyshevNodes(refCurrentVec, hotSideFluxVec);

        drawCurrentVsPowerChart(refCurrentVec, powerFunc);
        drawCurrentVsEfficiencyChart(refCurrentVec, (x) => (powerFunc(x) / hotSideFluxFunc(x)));
    });
};

function getChartDataFromVec(xVec, yFunc, xLabel, yLabel, yScale=1.0) {
    var data = new google.visualization.DataTable();
    var xValue, dx;
    const tableData = [];
    const xField = 'x';
    const yField = 'y';
    for(let i=0; i<xVec.length; i++) {
        var tableItem = {};
        tableItem.id = i+1;
        tableItem[xField] = xVec[i];
        tableItem[yField] = yFunc(xVec[i]);
        tableData.push(tableItem);
    };

    const [dataRows, minXValue, maxXValue] = getDataRows(tableData, xField, yField, yScale);
    const extendedDataRows = [...dataRows];

    // extend the data rows to satisfy the number of mesh points
    dx = (maxXValue - minXValue) / (simWindow.numMinMeshPoints-1);
    for(let i=1; i<simWindow.numMinMeshPoints-1; i++) {
        xValue = minXValue + dx*i;
        extendedDataRows.push([xValue, null]);
    };
    // sort rows in ascending temperature order
    extendedDataRows.sort(function(a, b) {
        return a[0] - b[0];
    });

    // create chart data
    data.addColumn('number', xLabel);
    data.addColumn('number', yLabel);
    data.addRows(extendedDataRows);

    return data;
};

function drawCurrentVsPowerChart(refCurrentVec, powerFunc) {
    const chart = simWindow.chartCurrentVsPower;
    const xLabel = "Electric Current [A]";
    const yLabel = "Power [mW]";
    const yTableLabel = "simulation";
    const xScale = simParam.refI;
    const yScale = 1e3 * simParam.numLegs;  // [mW] * num of legs

    const data = getChartDataFromVec(refCurrentVec.map(x => (x*xScale)), x => powerFunc(x/xScale), xLabel, yTableLabel, yScale);
    console.log(data);

    var view = new google.visualization.DataView(data);
    view.setColumns([0, 1, {
      label: 'interpolation',
      type: 'number',
      calc: function (dataTable, rowNum) {
          var xValue = dataTable.getValue(rowNum, 0);
          return powerFunc(xValue/xScale) * yScale;
      }
    }]);

    var options = {
      seriesType: 'scatter',
      series: {
        1: {
          type: 'line',
          curveType: 'function',
        }
      },
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,}, minValue: 0,},
      legend: { position: 'bottom', alignment: 'center' },
      colors: [simWindow.colorRawData, simWindow.colorFormula],
      height: simWindow.chartHeight,
    };
  
    chart.draw(view, options);    
}

function drawCurrentVsEfficiencyChart(refCurrentVec, efficiencyFunc) {
    const chart = simWindow.chartCurrentVsEfficiency;
    const xLabel = "Electric Current [A]";
    const yLabel = "Efficiency [%]";
    const yTableLabel = "simulation";
    const xScale = simParam.refI;
    const yScale = 100.0;  // [%]

    const data = getChartDataFromVec(refCurrentVec.map((x) => (x*xScale)), x => efficiencyFunc(x/xScale), xLabel, yTableLabel, yScale);
    console.log(data);

    var view = new google.visualization.DataView(data);
    view.setColumns([0, 1, {
      label: 'interpolation',
      type: 'number',
      calc: function (dataTable, rowNum) {
          var xValue = dataTable.getValue(rowNum, 0);
          return efficiencyFunc(xValue/xScale) * yScale;
      },
    }]);

    var options = {
      seriesType: 'scatter',
      series: {
        1: {
          type: 'line',
          curveType: 'function',
        }
      },
      title: yLabel,
      titleTextStyle: {bold: true, fontSize: 20,},
      hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
      vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
      legend: { position: 'bottom', alignment: 'center' },
      colors: [simWindow.colorRawData, simWindow.colorFormula],
      height: simWindow.chartHeight,
    };

    chart.draw(view, options);    
}

async function drawTestChart() {
    const chebyshevNodes = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0.0, 1.0);
    const meshXVec = getLinearSpace(0, dimlessSimParam.length, simWindow.numMinMeshPoints);

    if(simWindow.isTestMode) {
        var res;
        var yVec;
        var dimlessTestFunc;
        var dimlessExactFunc;
        var LInftyError = null;
        var L2Error = null;
        var L2TestFun = null;
        var J;
        var solveTeqn = getSolverFunc();
        var targetName = "to exact sol.";
        if(solveTeqn === null) {
            window.alert("Unknown solver!");
            return;
        };

        if(simWindow.testName == 'testDiffusionTerm') {
            J = 0.0;
            res = await solveTeqn(J);
            console.log(res);
            if(res.success) {
                yVec = res.sol;
                dimlessTestFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodes, yVec);
                dimlessExactFunc = (x) => (Math.sqrt(1-(1-Math.pow(dimlessSimParam.coldTemp,2))*x));

                testDrawSpatialFunc(dimlessTestFunc, "Solution of TE eqn [1]");
                LInftyError = getLInftyError(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessExactFunc(x)));
                L2Error = getL2Error(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessExactFunc(x)));
            }
            else {
                console.log(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
                printSimTaskMessage(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
            }
        }
        else if(simWindow.testName == 'testJouleTermConstElecResi') {
            J = 0.5;
            res = await solveTeqn(J);
            if(res.success) {
                yVec = res.sol;
                dimlessTestFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodes, yVec);
                const factor = J*J*dimlessSimParam.funcElecResi(dimlessSimParam.hotTemp)/dimlessSimParam.funcThrmCond(dimlessSimParam.hotTemp);
                const deltaT = dimlessSimParam.deltaTemp;
                const L = dimlessSimParam.length;
                const Th = dimlessSimParam.hotTemp;
                dimlessExactFunc = (x) => (-0.5*factor*x*x +(-deltaT/L + 0.5*factor*L)*x + Th);

                testDrawSpatialFunc(dimlessTestFunc, "Solution of TE eqn [1]");
                LInftyError = getLInftyError(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessExactFunc(x)));
                L2Error = getL2Error(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessExactFunc(x)));
            }
            else {
                console.log(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
                printSimTaskMessage(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
            }
        }
        else if(simWindow.testName == 'testJouleTermLinearElecResi') {
            // J should be strictly positive for this example.
            J = 0.5;
            res = await solveTeqn(J);
            if(res.success) {
                yVec = res.sol;
                dimlessTestFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodes, yVec);
                const L = dimlessSimParam.length;
                const Th = dimlessSimParam.hotTemp;
                const Tc = dimlessSimParam.coldTemp;

                const rhoOverKappa = dimlessSimParam.funcElecResi(dimlessSimParam.hotTemp)/dimlessSimParam.hotTemp/dimlessSimParam.funcThrmCond(dimlessSimParam.hotTemp); // kappa is const.
                const factor = Math.sqrt(rhoOverKappa)*J;
                dimlessExactFunc = (x) => ( (Tc-Th*Math.cos(factor*L))*(Math.sin(factor*x))/(Math.sin(factor*L)) + Th*Math.cos(factor*x) );
                testDrawSpatialFunc(dimlessTestFunc, "Solution of TE eqn [1]");
                LInftyError = getLInftyError(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessExactFunc(x)));
                L2Error = getL2Error(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessExactFunc(x)));
            }
            else {
                console.log(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
                printSimTaskMessage(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
            }
        }
        else if(simWindow.testName == 'testThomsonTerm') {
            // J should be strictly positive for this example.
            J = 0.5;
            res = await solveTeqn(J);
            if(res.success) {
                yVec = res.sol;
                dimlessTestFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodes, yVec);
                const rhoOverAlpha = dimlessSimParam.funcElecResi(dimlessSimParam.hotTemp) / (dimlessSimParam.funcSeebeck(dimlessSimParam.hotTemp)/dimlessSimParam.hotTemp);   // rho is const.
                const alphaOverKappa = (dimlessSimParam.funcSeebeck(dimlessSimParam.hotTemp)/dimlessSimParam.hotTemp) / (dimlessSimParam.funcThrmCond(dimlessSimParam.hotTemp)/dimlessSimParam.hotTemp);
                const ThSquared = Math.pow(dimlessSimParam.hotTemp, 2);
                const TcSquared = Math.pow(dimlessSimParam.coldTemp, 2);
                const L = dimlessSimParam.length;
                dimlessExactFunc = (x) => ( Math.sqrt( ThSquared + 2*rhoOverAlpha*J*x + (TcSquared-ThSquared-2*rhoOverAlpha*J*L)*(1-Math.exp(alphaOverKappa*J*x))/(1-Math.exp(alphaOverKappa*J*L)) ) );

                testDrawSpatialFunc(dimlessTestFunc, "Solution of TE eqn [1]");
                LInftyError = getLInftyError(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessExactFunc(x)));
                L2Error = getL2Error(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessExactFunc(x)));
                L2TestFun = getLInftyError(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => (0)));
            }
            else {
                console.log(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
                printSimTaskMessage(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
            }
        }
        else if(simWindow.testName == 'testPerformance') {
            J = 4.1311822360E-01;
            res = await solveTeqn(J);
            if(res.success) {
                yVec = res.sol;
                dimlessTestFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodes, yVec);
                testDrawSpatialFunc(dimlessTestFunc, "Solution of TE eqn [1]");
                var tegPerformance = getTegPerformance(chebyshevNodes, yVec, J);
                const exactPower = 1.4547093416E-01;
                const exactEfficiency = 1.5801642696E-01;
                targetName = "to pykeri";
                LInftyError = getLInftyError([tegPerformance.power, tegPerformance.efficiency], [exactPower, exactEfficiency]);
                L2Error = getL2Error([tegPerformance.power, tegPerformance.efficiency], [exactPower, exactEfficiency]);
                console.log("performance=", tegPerformance);
                console.log(`exact power=${exactPower}, exact efficiency=${exactEfficiency}`);
            }
            else {
                console.log(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
                printSimTaskMessage(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
            }
        }
        else if(simWindow.testName == 'testPowellMethod') {
            J = 0.5;
            res = await solveTeqn(J);
            if(res.success) {
                yVec = res.sol;
                dimlessTestFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodes, yVec);
                testDrawSpatialFunc(dimlessTestFunc, "Solution of TE eqn [1]");
                var newTempVec = getIntegralTeqnRhs(chebyshevNodes, yVec, J);
                // newTempVec = clipByValue(newTempVec, dimlessSimParam.minTemp, dimlessSimParam.maxTemp); // do clipping to avoid unobserved temperatures ...
                var dimlessNewTempFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodes, newTempVec);
                targetName = "in integral formulation";
                LInftyError = getLInftyError(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessNewTempFunc(x)));
                L2Error = getL2Error(meshXVec.map(x => dimlessTestFunc(x)), meshXVec.map(x => dimlessNewTempFunc(x)));
            }
            else {
                console.log(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
                printSimTaskMessage(`'${simWindow.testName}' failed with '${simParam.solverName}'.`);
            }
        }
        else if(simWindow.testName == 'testPromise') {
            testPromise();
        }
        else {
            window.alert("Invalid Test Name!");
        }

        if(simWindow.isTestMode) {
            console.log(`'${simWindow.testName}' complete:`);
        }
        if(LInftyError !== null) {
            console.log(`L^infty error ${targetName} is ${LInftyError.toExponential(3)}`);
            printSimTaskMessage(`L<sup>&infin;</sup>-error ${targetName} is ${LInftyError.toExponential(3)}`);
        };
        if(L2Error !== null) {
            console.log(`L^2 error ${targetName} is ${L2Error.toExponential(3)}`);
            printSimTaskMessage(`L<sup>2</sup>-error ${targetName} is ${L2Error.toExponential(3)}`);
        };
        if(L2Error !== null && L2TestFun !== null) {
            console.log(`Estimated Error ${targetName} is ${(L2Error/L2TestFun*100).toExponential(3)} [%]`);
            printSimTaskMessage(`Estimated error ${targetName} is ${(L2Error/L2TestFun*100).toExponential(3)} [%]`);
        };
    };
};

/* for Test Modes */
function testDrawSpatialFunc(testFunc, funcName) {
    const xLabel = "Position [1]";
    const yLabel = funcName;
    const dx = (1.0 - 0.0) / (simWindow.numMinMeshPoints-1);
    const dataArray = [[xLabel, 'formula']]
    var xValue, yValue;
        
    for(let i=0; i<simWindow.numMinMeshPoints; i++) {
        xValue = 0.0 + dx*i;
        yValue = testFunc(xValue);
        dataArray.push([xValue, yValue]);
    };
    var data = google.visualization.arrayToDataTable(dataArray);
    
    var options = {
        title: yLabel,
        titleTextStyle: {bold: true, fontSize: 20,},
        hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
        vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
        legend: { position: 'bottom', alignment: 'center' },
        colors: [simWindow.colorFormula],
        height: simWindow.chartHeight,
    };
    simWindow.chartTest.draw(data, options);
};

function testDrawTempFunc(testFunc, funcName) {
    const xLabel = "Temperature [1]";
    const yLabel = funcName;
    const dx = (dimlessSimParam.maxTemp - dimlessSimParam.minTemp) / (simWindow.numMinMeshPoints-1);
    const dataArray = [[xLabel, 'formula']]
    var xValue, yValue;
        
    for(let i=0; i<simWindow.numMinMeshPoints; i++) {
        xValue = dimlessSimParam.minTemp + dx*i;
        yValue = testFunc(xValue);
        dataArray.push([xValue, yValue]);
    };
    var data = google.visualization.arrayToDataTable(dataArray);
    
    var options = {
        title: yLabel,
        titleTextStyle: {bold: true, fontSize: 20,},
        hAxis: {title: xLabel, titleTextStyle: {italic: false, fontSize: 15, color: '#333'},},
        vAxis: {title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},},
        legend: { position: 'bottom', alignment: 'center' },
        colors: [simWindow.colorFormula],
        height: simWindow.chartHeight,
    };
    simWindow.chartTest.draw(data, options);
};

function setTestInterpolationOption() {
    setLinearRegressionFor('thrm-cond');
    if(simWindow.testName != 'testDiffusionTerm') {
        setLinearRegressionFor('seebeck');
        setLinearRegressionFor('elec-resi');
    };
};

function setLinearRegressionFor(tepName) {
    $(getSelectTepMethodId(tepName)).val("polynomial-regression");
    changeTepFormulaSuboptionForm(tepName);
    $(getSelectTepMethodSuboptionId(tepName)).val("1"); // linear regression
};

function getTestPerformanceTabledata() {
    // linear
    const tabledataSeebeck = [
        {id:1, temperature:300, seebeck:1.2909944487E-04,},
        {id:2, temperature:900, seebeck:1.2909944487E-04,},
    ];
    // linear
    const tabledataElecResi = [
        {id:1, temperature:300, elecResi:(1.0e-5).toExponential(2),},
        {id:2, temperature:900, elecResi:(1.0e-5).toExponential(2),},
        // {id:1, temperature:300, elecResi:(3.0e-5).toExponential(2),},
        // {id:2, temperature:900, elecResi:(1.0e-5).toExponential(2),},
    ];
    // linear
    const tabledataThrmCond = [
        {id:1, temperature:300, thrmCond:(1.0).toPrecision(3),},
        {id:2, temperature:900, thrmCond:(1.0).toPrecision(3),},
    ];

    return [tabledataSeebeck, tabledataElecResi, tabledataThrmCond];
};

function getTestDiffusionTermTabledata() {
    // anything
    const tabledataSeebeck = [
        {id:1, temperature:300, seebeck:(140e-06).toExponential(2),},
        {id:2, temperature:400, seebeck:(170e-06).toExponential(2),},
        {id:3, temperature:500, seebeck:(200e-06).toExponential(2),},
        {id:4, temperature:600, seebeck:(220e-06).toExponential(2),},
        {id:5, temperature:700, seebeck:(230e-06).toExponential(2),},
        {id:6, temperature:800, seebeck:(240e-06).toExponential(2),},
        {id:7, temperature:900, seebeck:(230e-06).toExponential(2),},
    ];
    // anything
    const tabledataElecResi = [
        {id:1, temperature:300, elecResi:(1/250*1e-2).toExponential(2),},
        {id:2, temperature:400, elecResi:(1/200*1e-2).toExponential(2),},
        {id:3, temperature:500, elecResi:(1/150*1e-2).toExponential(2),},
        {id:4, temperature:600, elecResi:(1/125*1e-2).toExponential(2),},
        {id:5, temperature:700, elecResi:(1/125*1e-2).toExponential(2),},
        {id:6, temperature:800, elecResi:(1/150*1e-2).toExponential(2),},
        {id:7, temperature:900, elecResi:(1/200*1e-2).toExponential(2),},
    ];
    // linear; kappa(T) = T.
    const tabledataThrmCond = [
        {id:1, temperature:300, thrmCond:(3.0).toPrecision(3),},
        {id:4, temperature:900, thrmCond:(9.0).toPrecision(3),},
    ];

    return [tabledataSeebeck, tabledataElecResi, tabledataThrmCond];
};

function getTestJouleTermConstElecResiTabledata() {
    // const
    const tabledataSeebeck = [
        {id:1, temperature:300, seebeck:(100.0e-6).toExponential(2),},
        {id:2, temperature:900, seebeck:(100.0e-6).toExponential(2),},
    ];
    // const
    const tabledataElecResi = [
        {id:1, temperature:300, elecResi:(1.0e-5).toExponential(2),},
        {id:2, temperature:900, elecResi:(1.0e-5).toExponential(2),},
    ];
    // const
    const tabledataThrmCond = [
        {id:1, temperature:300, thrmCond:(1.0).toPrecision(3),},
        {id:2, temperature:900, thrmCond:(1.0).toPrecision(3),},
    ];

    return [tabledataSeebeck, tabledataElecResi, tabledataThrmCond];
};

function getTestJouleTermLinearElecResiTabledata() {
    // const
    const tabledataSeebeck = [
        {id:1, temperature:300, seebeck:(100.0e-6).toExponential(2),},
        {id:2, temperature:900, seebeck:(100.0e-6).toExponential(2),},
    ];
    // linear
    const tabledataElecResi = [
        {id:1, temperature:300, elecResi:(3.0e-5).toExponential(2),},
        {id:2, temperature:900, elecResi:(9.0e-5).toExponential(2),},
    ];
    // const
    const tabledataThrmCond = [
        {id:1, temperature:300, thrmCond:(1.0).toPrecision(3),},
        {id:2, temperature:900, thrmCond:(1.0).toPrecision(3),},
    ];

    return [tabledataSeebeck, tabledataElecResi, tabledataThrmCond];
};

function getTestThomsonTermTabledata() {
    // linear
    const tabledataSeebeck = [
        {id:1, temperature:300, seebeck:(300.0e-6).toExponential(2),},
        {id:2, temperature:900, seebeck:(900.0e-6).toExponential(2),},
    ];
    // const
    const tabledataElecResi = [
        {id:1, temperature:300, elecResi:(1.0e-5).toExponential(2),},
        {id:2, temperature:900, elecResi:(1.0e-5).toExponential(2),},
    ];
    // linear
    const tabledataThrmCond = [
        {id:1, temperature:300, thrmCond:(3.0).toPrecision(3),},
        {id:2, temperature:900, thrmCond:(9.0).toPrecision(3),},
    ];

    return [tabledataSeebeck, tabledataElecResi, tabledataThrmCond];
};

function getTestPowellMethodTabledata() {
    // linear
    const tabledataSeebeck = [
        {id:1, temperature:300, seebeck:(300.0e-6).toExponential(2),},
        {id:2, temperature:900, seebeck:(900.0e-6).toExponential(2),},
    ];
    // const
    const tabledataElecResi = [
        {id:1, temperature:300, elecResi:(1.0e-5).toExponential(2),},
        {id:2, temperature:900, elecResi:(1.0e-5).toExponential(2),},
    ];
    // linear
    const tabledataThrmCond = [
        {id:1, temperature:300, thrmCond:(3.0).toPrecision(3),},
        {id:2, temperature:900, thrmCond:(9.0).toPrecision(3),},
    ];

    return [tabledataSeebeck, tabledataElecResi, tabledataThrmCond];
};

function getTestRealisticTabledata() {
    //define some sample data
    const tabledataSeebeck = [
        {id:1, temperature:300, seebeck:(140e-06).toExponential(2),},
        {id:2, temperature:400, seebeck:(170e-06).toExponential(2),},
        {id:3, temperature:500, seebeck:(200e-06).toExponential(2),},
        {id:4, temperature:600, seebeck:(220e-06).toExponential(2),},
        {id:5, temperature:700, seebeck:(230e-06).toExponential(2),},
        {id:6, temperature:800, seebeck:(240e-06).toExponential(2),},
        {id:7, temperature:900, seebeck:(230e-06).toExponential(2),},
    ];
    const tabledataElecResi = [
        {id:1, temperature:350, elecResi:(1/250*1e-2).toExponential(2),},
        {id:2, temperature:400, elecResi:(1/200*1e-2).toExponential(2),},
        {id:3, temperature:500, elecResi:(1/150*1e-2).toExponential(2),},
        {id:4, temperature:600, elecResi:(1/125*1e-2).toExponential(2),},
        {id:5, temperature:700, elecResi:(1/125*1e-2).toExponential(2),},
        {id:6, temperature:800, elecResi:(1/150*1e-2).toExponential(2),},
        {id:7, temperature:900, elecResi:(1/200*1e-2).toExponential(2),},
    ];
    const tabledataThrmCond = [
        {id:1, temperature:300, thrmCond:(4.5).toPrecision(3),},
        {id:2, temperature:400, thrmCond:(3.9).toPrecision(3),},
        {id:3, temperature:500, thrmCond:(3.6).toPrecision(3),},
        {id:4, temperature:600, thrmCond:(3.5).toPrecision(3),},
        {id:5, temperature:700, thrmCond:(3.5).toPrecision(3),},
        {id:6, temperature:800, thrmCond:(3.6).toPrecision(3),},
        {id:7, temperature:850, thrmCond:(4.0).toPrecision(3),},
    ];

    return [tabledataSeebeck, tabledataElecResi, tabledataThrmCond];
};


/* test functions */
function testGetPiecewiseLinearFunc() {
    var dataRows, minXValue, maxXValue;
    [dataRows, minXValue, maxXValue] = getDataRows(simWindow.tableSeebeck.getData(), "temperature", "seebeck");
    return getPiecewiseLinearFunc(dataRows);
};

async function testPromise() {
    var result = await testPromiseAsync();

    console.log("testPromise=", result);
};

let testVar = 0.0;
async function testPromiseAsync() {
    var result = 0.0;
    var promise;
    var allPromise = [];
    simWindow.simTaskName = simWindow.testName;

    for(let i=0; i<100; i++) {
        promise = sleep(i*20).then(() => {
            printSimTaskMessage(`${i}th Doing!`);
            animateSimTaskMessageColor(true);
            return i;
        });
        allPromise.push(promise);
    };
    testVar = await Promise.all(allPromise).then((values) => {
        animateSimTaskMessageColor(false);
        console.log(values);
        return values.reduce((accumulatedValue, currentValue) => (accumulatedValue + currentValue));
    });
    console.log("testVar=", testVar);
    console.log("result=", result);

    return result
};

// sleep time expects milliseconds
function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
};