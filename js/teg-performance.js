/**
 * JavaScript code for TEG simulation webpage.
 *
 * 2020 Jaywan Chung
 *
**/
'use strict';

const simWindow = {
    isTepFuncUpdated: false,
    isSimResultDrawn: false,
    isPerformTableDrawn: false,
    chartHeight: 500,
    colorRawData: '#1976D2', // '#1E88E5', //'#1565C0',
    colorFormula: '#D32F2F',
    animateColorIndex: 0,
    animateColors: ['#922B21', '#8B0000', '#76448A', '#1F618D', '#148F77', '#1E8449', '#B7950B', '#AF601A',],
    numMinMeshPoints: 101,  // how many points we draw in a chart; should be larger than 2
    tableSeebeck: null,
    tableElecResi: null,
    tableThrmCond: null,
    tableCopyTepFormula: null,
    tableCopyCurrentVsPerformance: null,
    tableCopyTempDistribution: null,
    numPerformTableDigits: 5,
    tabledataPerformByCurrent: null,
    tablePerformByCurrent: null,
    tablePerformReport: null,
    performAtOpenCircuit: null,
    performAtMaxPower: null,
    performAtMaxEfficiency: null,
    performArray: null,
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
};
const simParam = {
    solverName: 'picard-iteration',
    // solverName: 'powell-method',
    funcSeebeck: null,
    funcElecResi: null,
    funcThrmCond: null,
    funcPower: null,
    funcHotSideHeatRate: null,
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
    refCurrentVec: null,
    powerVec: null,
    hotSideHeatRateVec: null,
    tempVecArray: null,
    numMeshPoints: null,
    numSolChebyshevNodes: 11,
    numCurrentChebyshevNodes: null,
    integralEps: 1e-8,  // for adaptive Simpson method
    maxIntegralDepth: 15,  // for adaptive Simpson method
    numMaxIteration: null,
    solverTol: 1e-7,
};

$(function(){
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(activateChartsAndButtons); // activate buttons when google charts is loaded.
    
    if(!simWindow.isTestMode) {
        $("#test-section").hide();
    };

    /* responsive chart */
    $(window).resize(function() {
        if(simWindow.isTepFuncUpdated) {
            drawTepCharts();
        };
        if(simWindow.isSimResultDrawn) {
            drawSimResults();
        }
    });

    // Hide Step 2 buttons
    $("#copy-formula").hide();
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
    // Hide Step 3 and Final Step
    $("#section-select-sim-param").hide();
    $("#section-sim-result").hide();

    if(simWindow.isTestMode) {
        setTestInterpolationOption();
    };
});

function activateChartsAndButtons() {
    initTepCharts();
    initSimResultCharts();

    activateComputeFormulaButton();
    activateCopyFormulaButton();
    activateRunSimButton();
    activateCopyCurrentVsPerformanceButton();
    activateCopyPerformReportButton();
    activateCopyTempDistributionButton();

    // for test
    if(simWindow.isTestMode) {
        activateTestRunButton();
    };
}

function activateRunSimButton() {
    function simAborted() {
        enableAllButtons();
        console.log("Simulation aborted.")
        return;
    };

    $("#run-sim-button").click(function() {
        if(simWindow.isTepFuncUpdated) {
            new Promise(function(resolve, reject) {
                disableAllButtons();
                updateSolverParamsFromForms();
                updateSimParamsFromForms();
                updateDimlessSimParams();
                const isValidSimParams = checkValidityOfSimParams();
                if(!isValidSimParams) {
                    reject();                    
                    return;
                }
                resolve();
            })
            .then(function() {
                return new Promise(async function(resolve, reject) {
                    console.log("Update Solver Params ok.");
                    // show the result section and run the simulation.
                    $("#section-sim-result").show();
                    resolve(await runSimulation());
                });
            }, simAborted);
        }
        else {
            window.alert("Please compute TEP formula first.");
        }
    });
};

function activateTestRunButton() {
    $("#test-run").click(function() {
        disableAllButtons();
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
        enableAllButtons();
    });
};

function activateCopyTempDistributionButton() {
    $("#copy-temp-distribution").click(function() {
        if(simWindow.isPerformTableDrawn) {
            copyTempDistribution();
        } else {
            window.alert("Performance table not finished!");
        }
    });
};

function activateCopyPerformReportButton() {
    $("#copy-perform-report").click(function() {
        if(simWindow.isPerformTableDrawn) {
            copyPerformReport();
        } else {
            window.alert("Performance table not finished!");
        }
    });
};

function activateCopyCurrentVsPerformanceButton() {
    $("#copy-current-vs-performance").click(function() {
        if(simWindow.isPerformTableDrawn) {
            copyCurrentVsPerformance();
        } else {
            window.alert("Performance table not finished!");
        }
    });
};

function activateCopyFormulaButton() {
    $("#copy-formula").click(function() {
        if(simWindow.isTepFuncUpdated) {
            copyTepFormula();
        } else {
            window.alert("Thermoelectric Property Formulae not determined!");
        }
    });
};

function activateComputeFormulaButton() {
    $("#compute-formula").click(function() {
        computeTepFormula();
    });
};

function checkValidityOfSimParams() {
    console.log()
    if(simParam.coldTemp < simParam.minTemp || simParam.hotTemp < simParam.minTemp) {
        window.alert("Operation temp. is too low: the TEPs are unknown.");
        return false;
    }
    if(simParam.hotTemp > simParam.maxTemp || simParam.coldTemp > simParam.maxTemp) {
        window.alert("Operation temp. is too high: the TEPs are unknown.");
        return false;
    }
    // if(simParam.coldTemp > simParam.hotTemp) {
    //     window.alert("Hot-side temp. should be larger than cold-side temp.");        
    //     return false;
    // }
    if((simParam.initialRefCurrent > simParam.finalRefCurrent) || (simParam.initialRefCurrent < 0)) {
        window.alert("Wrong current range!");
        return false;
    }
    if(simParam.finalRefCurrent > 1.5) {
        window.alert("The current range is too large!");
        return false;
    }

    return true;
};

function drawCopyTempDistributionTable() {
    const posColumnWidth = 145; // px
    const propertyColumnWidth = 145; // px

    const numSimRows = dimlessSimParam.refCurrentVec.length;
    const dimlessSimCurrent = dimlessSimParam.refCurrentVec;
    const simCurrent = dimlessSimCurrent.map((x) => (x*simParam.refI));
    const dimlessPosVec = getLinearSpace(0, dimlessSimParam.length, simWindow.numMinMeshPoints);
    const posVec = getLinearSpace(0, simParam.length, simWindow.numMinMeshPoints);
    const dimlessChebyshevVec = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0, dimlessSimParam.length);    

    const tableColumns = [];
    const tableData = [];
    var tempFunc;
    
    // set columns
    for(let i=0; i<numSimRows; i++) {
        const subcolumn = {};
        subcolumn.title = `Current [A]`;
        subcolumn.columns = [
            {
                title:`${simCurrent[i]}`,
                columns: [
                    {title:"Position [mm]", field:`position${i}`, width: posColumnWidth, hozAlign:"center", headerSort: false,},
                    {title:"Temp. [K]", field:`temp${i}`, width: propertyColumnWidth, hozAlign:"center", headerSort: false,},        
                ],
            },
        ];
        tableColumns.push(subcolumn);
    };

    // set data
    for(let i=0; i<numSimRows; i++) {
        tempFunc = getPolyChebyshevFuncFromChebyshevNodes(dimlessChebyshevVec, dimlessSimParam.tempVecArray[i]);
        for(let j=0; j<simWindow.numMinMeshPoints; j++) {
            if(tableData[j] === undefined) {
                tableData[j] = {};
            };
            tableData[j][`position${i}`] = posVec[j];
            tableData[j][`temp${i}`] = tempFunc(dimlessPosVec[j]) * simParam.refTemp;
        };
    };

    simWindow.tableCopyTempDistribution = new Tabulator("#table-copy-temp-distribution", {
        height: "250px",
        data: tableData,
        resizableColumns: false,
        selectable: "highlight",
        clipboard: "copy",
        // layout: "fitColumns", //fit columns to width of table (optional)
        columnHeaderVertAlign:"bottom", //align header contents to bottom of cell
        columns: tableColumns,
    });
    $("#table-copy-temp-distribution").hide();
};

function drawCopyCurrentVsPerformanceTable() {
    const currentColumnWidth = 145; // px
    const propertyColumnWidth = 145; // px
    const N = simParam.numLegs;

    const tableData = [];
    var power, hotSideHeatRate;

    const numSimRows = dimlessSimParam.refCurrentVec.length;
    const dimlessSimCurrent = dimlessSimParam.refCurrentVec;
    const simCurrent = dimlessSimCurrent.map((x) => (x*simParam.refI));
    for(let i=0; i<numSimRows; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        power = simParam.funcPower(dimlessSimCurrent[i]);
        hotSideHeatRate = simParam.funcHotSideHeatRate(dimlessSimCurrent[i]);
        tableData[i].currentSimPower = simCurrent[i];
        tableData[i].simPower = power * N;
        tableData[i].currentSimEfficiency = simCurrent[i];
        tableData[i].simEfficiency = power/hotSideHeatRate;
        tableData[i].currentSimHotSideHeatRate = simCurrent[i];
        tableData[i].simHotSideHeatRate = hotSideHeatRate * N;
    }

    const numInterpRows = simWindow.numMinMeshPoints;
    const dimlessInterpCurrent = getLinearSpace(dimlessSimCurrent[0], dimlessSimCurrent[numSimRows-1], numInterpRows);
    const interpCurrent = dimlessInterpCurrent.map((x) => (x*simParam.refI));
    for(let i=0; i<numInterpRows; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        power = simParam.funcPower(dimlessInterpCurrent[i]);
        hotSideHeatRate = simParam.funcHotSideHeatRate(dimlessInterpCurrent[i]);
        tableData[i].currentInterpPower = interpCurrent[i];
        tableData[i].interpPower = power * N;
        tableData[i].currentInterpEfficiency = interpCurrent[i];
        tableData[i].interpEfficiency = power/hotSideHeatRate;
        tableData[i].currentInterpHotSideHeatRate = interpCurrent[i];
        tableData[i].interpHotSideHeatRate = hotSideHeatRate * N;
    }

    simWindow.tableCopyCurrentVsPerformance = new Tabulator("#table-copy-current-vs-performance", {
        height: "250px",
        data: tableData,
        resizableColumns: false,
        selectable: "highlight",
        clipboard: "copy",
        // layout: "fitColumns", //fit columns to width of table (optional)
        columnHeaderVertAlign:"bottom", //align header contents to bottom of cell
        columns:[ //Define Table Columns
            {//create column group
                title:"Power",
                columns:[
                    {
                        title:"simulation",
                        columns:[
                            {title:"Current [A]", field:"currentSimPower", width: currentColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[W]", field:"simPower", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                    {
                        title:"interpolation",
                        columns:[
                            {title:"Current [A]", field:"currentInterpPower", width: currentColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[W]", field:"interpPower", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
            {//create column group
                title:"Efficiency",
                columns:[
                    {
                        title:"simulation",
                        columns:[
                            {title:"Current [A]", field:"currentSimEfficiency", width: currentColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[1]", field:"simEfficiency", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                    {
                        title:"interpolation",
                        columns:[
                            {title:"Current [A]", field:"currentInterpEfficiency", width: currentColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[1]", field:"interpEfficiency", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
            {//create column group
                title:"Hot-side heat rate",
                columns:[
                    {
                        title:"simulation",
                        columns:[
                            {title:"Current [A]", field:"currentSimHotSideHeatRate", width: currentColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[W]", field:"simHotSideHeatRate", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                    {
                        title:"interpolation",
                        columns:[
                            {title:"Current [A]", field:"currentInterpHotSideHeatRate", width: currentColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[W]", field:"interpHotSideHeatRate", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
        ],
    });
    $("#table-copy-current-vs-performance").hide();

};

function drawCopyTepFormulaTable() {
    const tempColumnWidth = 100; // px
    const propertyColumnWidth = 145; // px

    const tableData = [];
    var xValue;

    // update Seebeck coefficient
    const [rawSeebeckDataRows, rawSeebeckMinTemp, rawSeebeckMaxTemp] = getDataRows(simWindow.tableSeebeck.getData(), "temperature", "seebeck");
    for(let i=0; i<rawSeebeckDataRows.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        tableData[i].tempRawSeebeck = rawSeebeckDataRows[i][0];
        tableData[i].rawSeebeck = rawSeebeckDataRows[i][1];
    };
    const formulaSeebeckTempVec = getLinearSpace(rawSeebeckMinTemp, rawSeebeckMaxTemp, simWindow.numMinMeshPoints);
    for(let i=0; i<formulaSeebeckTempVec.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        tableData[i].tempFormulaSeebeck = formulaSeebeckTempVec[i];
        tableData[i].formulaSeebeck = simParam.funcSeebeck(formulaSeebeckTempVec[i]);
    };
    // update Electrical resistivity
    const [rawElecResiDataRows, rawElecResiMinTemp, rawElecResiMaxTemp] = getDataRows(simWindow.tableElecResi.getData(), "temperature", "elecResi");
    for(let i=0; i<rawElecResiDataRows.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        tableData[i].tempRawElecResi = rawElecResiDataRows[i][0];
        tableData[i].rawElecResi = rawElecResiDataRows[i][1];
    };
    const formulaElecResiTempVec = getLinearSpace(rawElecResiMinTemp, rawElecResiMaxTemp, simWindow.numMinMeshPoints);
    for(let i=0; i<formulaElecResiTempVec.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        tableData[i].tempFormulaElecResi = formulaElecResiTempVec[i];
        tableData[i].formulaElecResi = simParam.funcElecResi(formulaElecResiTempVec[i]);
    };
    // update Thermal conductivity
    const [rawThrmCondDataRows, rawThrmCondMinTemp, rawThrmCondMaxTemp] = getDataRows(simWindow.tableThrmCond.getData(), "temperature", "thrmCond");
    for(let i=0; i<rawThrmCondDataRows.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        tableData[i].tempRawThrmCond = rawThrmCondDataRows[i][0];
        tableData[i].rawThrmCond = rawThrmCondDataRows[i][1];
    };
    const formulaThrmCondTempVec = getLinearSpace(rawThrmCondMinTemp, rawThrmCondMaxTemp, simWindow.numMinMeshPoints);
    for(let i=0; i<formulaThrmCondTempVec.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        tableData[i].tempFormulaThrmCond = formulaThrmCondTempVec[i];
        tableData[i].formulaThrmCond = simParam.funcThrmCond(formulaThrmCondTempVec[i]);
    };
    // update Electrical conductivity
    const formulaElecCondTempVec = getLinearSpace(rawElecResiMinTemp, rawElecResiMaxTemp, simWindow.numMinMeshPoints);
    for(let i=0; i<formulaElecCondTempVec.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        tableData[i].tempFormulaElecCond = formulaElecCondTempVec[i];
        tableData[i].formulaElecCond = 1/simParam.funcElecResi(formulaElecCondTempVec[i]);
    };
    // update Power factor
    const formulaPowerFactorTempVec = getLinearSpace(simParam.minTemp, simParam.maxTemp, simWindow.numMinMeshPoints);
    for(let i=0; i<formulaPowerFactorTempVec.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        xValue = formulaPowerFactorTempVec[i];
        tableData[i].tempFormulaPowerFactor = xValue;
        tableData[i].formulaPowerFactor = Math.pow(simParam.funcSeebeck(xValue),2)/simParam.funcElecResi(xValue);
    };
    // update Figure of merit zT
    const formulaFigureOfMeritTempVec = getLinearSpace(simParam.minTemp, simParam.maxTemp, simWindow.numMinMeshPoints);
    for(let i=0; i<formulaFigureOfMeritTempVec.length; i++) {
        if(tableData[i] === undefined) {
            tableData[i] = {};
        }
        xValue = formulaFigureOfMeritTempVec[i];
        tableData[i].tempFormulaFigureOfMerit = xValue;
        tableData[i].formulaFigureOfMerit = Math.pow(simParam.funcSeebeck(xValue),2)/(simParam.funcElecResi(xValue)*simParam.funcThrmCond(xValue))*xValue;
    };

    simWindow.tableCopyTepFormula = new Tabulator("#tep-table-copy-formula", {
        height: "250px",
        data: tableData,
        resizableColumns: false,
        selectable: "highlight",
        clipboard: "copy",
        // layout: "fitColumns", //fit columns to width of table (optional)
        columnHeaderVertAlign:"bottom", //align header contents to bottom of cell
        columns:[ //Define Table Columns
            {//create column group
                title:"Seebeck coefficient",
                columns:[
                    {
                        title:"raw data",
                        columns:[
                            {title:"Temp. [K]", field:"tempRawSeebeck", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[V/K]", field:"rawSeebeck", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                    {
                        title:"formula",
                        columns:[
                            {title:"Temp. [K]", field:"tempFormulaSeebeck", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[V/K]", field:"formulaSeebeck", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
            {//create column group
                title:"Electrical resistivity",
                columns:[
                    {
                        title:"raw data",
                        columns:[
                            {title:"Temp. [K]", field:"tempRawElecResi", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[Ω m]", field:"rawElecResi", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                    {
                        title:"formula",
                        columns:[
                            {title:"Temp. [K]", field:"tempFormulaElecResi", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[Ω m]", field:"formulaElecResi", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
            {//create column group
                title:"Thermal conductivity",
                columns:[
                    {
                        title:"raw data",
                        columns:[
                            {title:"Temp. [K]", field:"tempRawThrmCond", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[W/m/K]", field:"rawThrmCond", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                    {
                        title:"formula",
                        columns:[
                            {title:"Temp. [K]", field:"tempFormulaThrmCond", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[W/m/K]", field:"formulaThrmCond", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
            {//create column group
                title:"Electrical conductivity",
                columns:[
                    {
                        title:"formula",
                        columns:[
                            {title:"Temp. [K]", field:"tempFormulaElecCond", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[S/m]", field:"formulaElecCond", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
            {//create column group
                title:"Power factor",
                columns:[
                    {
                        title:"formula",
                        columns:[
                            {title:"Temp. [K]", field:"tempFormulaPowerFactor", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[W/m/K\u00B2]", field:"formulaPowerFactor", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
            {//create column group
                title:"Figure of merit zT",
                columns:[
                    {
                        title:"formula",
                        columns:[
                            {title:"Temp. [K]", field:"tempFormulaFigureOfMerit", width: tempColumnWidth, hozAlign:"center", headerSort: false,},
                            {title:"[1]", field:"formulaFigureOfMerit", width: propertyColumnWidth, hozAlign:"center", headerSort: false,},
                        ],
                    },
                ],
            },
        ],
    });
    $("#tep-table-copy-formula").hide();

};

function copyTempDistribution() {
    $("#table-copy-temp-distribution").show();
    simWindow.tableCopyTempDistribution.copyToClipboard("active");
    $("#table-copy-temp-distribution").hide();
};

function copyPerformReport() {
    simWindow.tablePerformReport.copyToClipboard("active");
};

function copyCurrentVsPerformance() {
    $("#table-copy-current-vs-performance").show();
    simWindow.tableCopyCurrentVsPerformance.copyToClipboard("active");
    $("#table-copy-current-vs-performance").hide();
};

function copyTepFormula() {
    $("#tep-table-copy-formula").show();
    simWindow.tableCopyTepFormula.copyToClipboard("active");
    $("#tep-table-copy-formula").hide();
};

function computeTepFormula() {
    var promise = new Promise(function(resolve, reject) {
        // do regression or interpolation of TEPs
        disableAllButtons();
        $("#compute-formula").hide();
        $("#chart-message").show();
        $("#tep-chart-container").hide();
        resolve();
    })
    .then(function() {
        return new Promise(function(resolve, reject) {
            simWindow.isTepFuncUpdated = updateTepFuncs();
            console.log("Compute chart ok.");
            resolve();
            });
    })
    .then(function() {
        window.setTimeout(function() {
            enableAllButtons();
            $("#chart-message").hide();
            $("#compute-formula").show();

            if(simWindow.isTepFuncUpdated) {
                // we can copy the TEPs to cilpboard
                drawCopyTepFormulaTable();
                $("#copy-formula").show();
                // we can go on the next step                
                $("#section-select-sim-param").show();

                // set cold-side temp and hot-side temp
                $("#input-cold-side-temp").val(String(simParam.minTemp));
                $("#input-hot-side-temp").val(String(simParam.maxTemp));

                // draw charts
                $("#tep-chart-container").show();
                drawTepCharts();
                console.log("Draw chart ok.");
            };
        });
    });
};

function disableAllButtons() {
    $(".selection-button").prop("disabled", true);
};

function enableAllButtons() {
    $(".selection-button").prop("disabled", false);
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
            <option value="1e-8">1e-8</option>
            <option value="1e-9">1e-9</option>
            <option value="1e-10">1e-10 (Accurate)</option>
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
    simParam.minTemp = -Infinity;
    simParam.maxTemp = Infinity;

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

    // do the work!
    const func = getTepFunc(dataRows, selectTepMethodId, selectTepMethodSuboptionId);
    if(func) {
        simParam[tepFuncName] = func;
        return true;
    };

    return false;
};

function getTepFunc(dataRows, selectTepMethodId, selectTepMethodSuboptionId, costScale=1.0) {
    const selectTepMethodVal = $(selectTepMethodId).val();
    var tepFunc = null;
    const [minTemp, maxTemp] = getMinAndMaxXValue(dataRows);

    if(selectTepMethodVal == "polynomial-regression") {
        const degPoly = Number($(selectTepMethodSuboptionId).val());
        if(dataRows.length >= 2) {
            tepFunc = getPolyRegressFunc(degPoly, dataRows, costScale);
        };
    }
    else if(selectTepMethodVal == "polynomial-interpolation") {
        const numNodes = Number($(selectTepMethodSuboptionId).val());
        if(dataRows.length >= 2) {
            tepFunc = getPolyChebyshevFuncFromDataRows(numNodes, dataRows);
        };
    }
    else if(selectTepMethodVal == "other-methods") {
        const subOption = $(selectTepMethodSuboptionId).val();
        if(subOption == "piecewise-linear-interpolation") {
            tepFunc = getPiecewiseLinearFunc(dataRows);
        };
    };

    if(tepFunc !== null) {
        // for positivity and safety, handle out-of-bound values
        return function(temp) {
            if(temp<minTemp) {
                return tepFunc(minTemp);
            }
            if(temp>maxTemp) {
                return tepFunc(maxTemp);
            }
            return tepFunc(temp);
        }
    };
    return null;
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
    const [, minXValue, maxXValue] = getDataRows(table.getData(), xField, yField);
    var [minYValue, maxYValue] = getMinAndMaxYValue(minXValue, maxXValue, simParam.funcSeebeck, simWindow.numMinMeshPoints);
    const dY = Math.max(Math.abs(minYValue), Math.abs(maxYValue))*0.01;
    minYValue = (minYValue-dY)*yScale;
    maxYValue = (maxYValue+dY)*yScale;

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
      vAxis: {
          title: yLabel, titleTextStyle: {italic: false, fontSize: 15,},
          viewWindow: {min: minYValue, max: maxYValue,},
        },
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
    const [, rawElecResiMinTemp, rawElecResiMaxTemp] = getDataRows(simWindow.tableElecResi.getData(), "temperature", "elecResi");
    const xLabel = "Temperature [K]";
    const yLabel = "Electrical conductivity [S/cm]";
    const yScale = 1e-02;  // [S/cm]
    const dx = (rawElecResiMaxTemp - rawElecResiMinTemp) / (simWindow.numMinMeshPoints-1);
    const dataArray = [['Temperature [K]', 'formula']]
    var xValue, yValue;

    for(let i=0; i<simWindow.numMinMeshPoints; i++) {
        xValue = rawElecResiMinTemp + dx*i;
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
    const yLabel = "Power factor [10\u207b\u00B3 W/m/K\u00B2]"; // [10^{-3} W/m/K^2]
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
    var xData, xValue, yValue;
    var dataRows = [];
    var minXValue = Infinity;
    var maxXValue = -Infinity;

    for(let row of tableData) {
        xData = String(row[xField]).trim();
        if(!isNaN(xData) && xData !== "" && xData !== "null") {  // handle only when xValue is adequate
            xValue = parseFloat(row[xField]);
            yValue = parseFloat(row[yField]);
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
         <option value="other-methods">Other Methods</option>`);
    $(selectTepMethodId).val("polynomial-interpolation")  // initial selection
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
    else if ($(`${selectTepMethodId} option:selected`).val() == "other-methods") {
        $(labelTepMethodSuboptionId).html("Select Method:");
        $(selectTepMethodSuboptionId).html(
            `
            <option value="piecewise-linear-interpolation">Piecewise Linear Interpolation</option>
            `
        );
        $(selectTepMethodSuboptionId).val("piecewise-linear-interpolation");  // change initial choice
    };
};

function getSelectTepMethodId(tepName) {
    return `#select-${tepName}-method`;
};

function getSelectTepMethodSuboptionId(tepName) {
    return `#select-${tepName}-suboption`;
};

function drawPerformTables() {
    const N = simParam.numLegs;

    function toExponentialFormatter (cell, formatterParams, onRendered){
        //cell - the cell component
        //formatterParams - parameters set for the column
        //onRendered - function to call when the formatter has been rendered
    
        const numberValue = Number(cell.getValue());
        if(numberValue === 0.0) {
            return "0";
        }
        if(numberValue>=1 && numberValue<10) {
            return numberValue.toFixed(simWindow.numPerformTableDigits);
        }
    
        return numberValue.toExponential(simWindow.numPerformTableDigits); //return the contents of the cell;
    };    

    simWindow.tablePerformByCurrent = new Tabulator("#table-perform-by-current", {
        data: simWindow.tabledataPerformByCurrent,
        resizableColumns: false,
        selectable: "highlight",
        clipboard: "copy",
        // layout: "fitColumns", //fit columns to width of table (optional)
        columns: [ //Define Table Columns
            {title:"No.", field:"id", width: 60, hozAlign:"center", sorter:"number",},
            {title:"Current [A]", field:"current", width: 150, hozAlign:"center", formatter: toExponentialFormatter, sorter:"number",},
            {title:"Power [W]", field:"power", width: 150, hozAlign:"center", formatter: toExponentialFormatter, sorter:"number",},
            {title:"Efficiency [1]", field:"efficiency", width: 150, hozAlign:"center", formatter: toExponentialFormatter, sorter:"number",},
            {title:"Q<sub>h</sub> [W]", field:"hotSideHeatRate", width: 150, hozAlign:"center", formatter: toExponentialFormatter, sorter:"number",},
        ],
    });

    var tabledataPerformReport = [
        {parameterName: "I [A]", groupName: "Device performance", openCircuit: simWindow.performAtOpenCircuit.I, maxPower: simWindow.performAtMaxPower.I, maxEfficiency: simWindow.performAtMaxEfficiency.I,},
        {parameterName: "R<sub>L</sub>/R [1]", groupName: "Device performance", openCircuit: simWindow.performAtOpenCircuit.gamma, maxPower: simWindow.performAtMaxPower.gamma, maxEfficiency: simWindow.performAtMaxEfficiency.gamma,},
        {parameterName: "V=V<sub>gen</sub>-IR [V]", groupName: "Device performance", openCircuit: simWindow.performAtOpenCircuit.V * N, maxPower: simWindow.performAtMaxPower.V * N, maxEfficiency: simWindow.performAtMaxEfficiency.V * N,},
        {parameterName: "Power [W]", groupName: "Device performance", openCircuit: simWindow.performAtOpenCircuit.power * N, maxPower: simWindow.performAtMaxPower.power * N, maxEfficiency: simWindow.performAtMaxEfficiency.power * N,},
        {parameterName: "Efficiency [1]", groupName: "Device performance", openCircuit: simWindow.performAtOpenCircuit.efficiency, maxPower: simWindow.performAtMaxPower.efficiency, maxEfficiency: simWindow.performAtMaxEfficiency.efficiency,},
        {parameterName: "Total Q<sub>h</sub> [W]", groupName: "Hot-side heat rate", openCircuit: simWindow.performAtOpenCircuit.hotSideHeatRate * N, maxPower: simWindow.performAtMaxPower.hotSideHeatRate * N, maxEfficiency: simWindow.performAtMaxEfficiency.hotSideHeatRate * N,},
        {parameterName: "Diffusion [W]", groupName: "Hot-side heat rate", openCircuit: simWindow.performAtOpenCircuit.hotSideHeatRateDiffusion * N, maxPower: simWindow.performAtMaxPower.hotSideHeatRateDiffusion * N, maxEfficiency: simWindow.performAtMaxEfficiency.hotSideHeatRateDiffusion * N,},
        {parameterName: "Peltier [W]", groupName: "Hot-side heat rate", openCircuit: simWindow.performAtOpenCircuit.hotSideHeatRatePeltier * N, maxPower: simWindow.performAtMaxPower.hotSideHeatRatePeltier * N, maxEfficiency: simWindow.performAtMaxEfficiency.hotSideHeatRatePeltier * N,},
        {parameterName: "Joule [W]", groupName: "Hot-side heat rate", openCircuit: simWindow.performAtOpenCircuit.hotSideHeatRateJoule * N, maxPower: simWindow.performAtMaxPower.hotSideHeatRateJoule * N, maxEfficiency: simWindow.performAtMaxEfficiency.hotSideHeatRateJoule * N,},
        {parameterName: "Total Q<sub>c</sub> [W]", groupName: "Cold-side heat rate", openCircuit: simWindow.performAtOpenCircuit.coldSideHeatRate * N, maxPower: simWindow.performAtMaxPower.coldSideHeatRate * N, maxEfficiency: simWindow.performAtMaxEfficiency.coldSideHeatRate * N,},
        {parameterName: "Diffusion [W]", groupName: "Cold-side heat rate", openCircuit: simWindow.performAtOpenCircuit.coldSideHeatRateDiffusion * N, maxPower: simWindow.performAtMaxPower.coldSideHeatRateDiffusion * N, maxEfficiency: simWindow.performAtMaxEfficiency.coldSideHeatRateDiffusion * N,},
        {parameterName: "Peltier [W]", groupName: "Cold-side heat rate", openCircuit: simWindow.performAtOpenCircuit.coldSideHeatRatePeltier * N, maxPower: simWindow.performAtMaxPower.coldSideHeatRatePeltier * N, maxEfficiency: simWindow.performAtMaxEfficiency.coldSideHeatRatePeltier * N,},
        {parameterName: "Joule [W]", groupName: "Cold-side heat rate", openCircuit: simWindow.performAtOpenCircuit.coldSideHeatRateJoule * N, maxPower: simWindow.performAtMaxPower.coldSideHeatRateJoule * N, maxEfficiency: simWindow.performAtMaxEfficiency.coldSideHeatRateJoule * N,},
        {parameterName: "V<sub>gen</sub> [V]", groupName: "Device parameter", openCircuit: simWindow.performAtOpenCircuit.Vgen * N, maxPower: simWindow.performAtMaxPower.Vgen * N, maxEfficiency: simWindow.performAtMaxEfficiency.Vgen * N,},
        {parameterName: "R inside module [Ω]", groupName: "Device parameter", openCircuit: simWindow.performAtOpenCircuit.R * N, maxPower: simWindow.performAtMaxPower.R * N, maxEfficiency: simWindow.performAtMaxEfficiency.R * N,},
        {parameterName: "K inside module [W]", groupName: "Device parameter", openCircuit: simWindow.performAtOpenCircuit.K * N, maxPower: simWindow.performAtMaxPower.K * N, maxEfficiency: simWindow.performAtMaxEfficiency.K * N,},
        {parameterName: "<SPAN STYLE='text-decoration:overline'>&alpha;</SPAN> [V]", groupName: "Average parameter", openCircuit: simWindow.performAtOpenCircuit.alphaBar, maxPower: simWindow.performAtMaxPower.alphaBar, maxEfficiency: simWindow.performAtMaxEfficiency.alphaBar,},
        {parameterName: "<SPAN STYLE='text-decoration:overline'>&rho;</SPAN> [Ω m]", groupName: "Average parameter", openCircuit: simWindow.performAtOpenCircuit.rhoBar, maxPower: simWindow.performAtMaxPower.rhoBar, maxEfficiency: simWindow.performAtMaxEfficiency.rhoBar,},
        {parameterName: "<SPAN STYLE='text-decoration:overline'>&kappa;</SPAN> [W/m/K]", groupName: "Average parameter", openCircuit: simWindow.performAtOpenCircuit.kappaBar, maxPower: simWindow.performAtMaxPower.kappaBar, maxEfficiency: simWindow.performAtMaxEfficiency.kappaBar,},
        {parameterName: "Z<sub>gen</sub> [1/K]", groupName: "Degrees of freedom", openCircuit: simWindow.performAtOpenCircuit.Zgen, maxPower: simWindow.performAtMaxPower.Zgen, maxEfficiency: simWindow.performAtMaxEfficiency.Zgen,},
        {parameterName: "hidden 1 [1/K]", groupName: "Degrees of freedom", openCircuit: simWindow.performAtOpenCircuit.hidden1, maxPower: simWindow.performAtMaxPower.hidden1, maxEfficiency: simWindow.performAtMaxEfficiency.hidden1,},
        {parameterName: "hidden 2 [1/K]", groupName: "Degrees of freedom", openCircuit: simWindow.performAtOpenCircuit.hidden2, maxPower: simWindow.performAtMaxPower.hidden2, maxEfficiency: simWindow.performAtMaxEfficiency.hidden2,},
    ];

    simWindow.tablePerformReport = new Tabulator("#table-perform-report", {
        data: tabledataPerformReport,
        resizableColumns: false,
        selectable: "highlight",
        clipboard: "copy",
        groupBy: "groupName",
        groupHeader: function(value, count, data, group){
            //value - the value all members of this group share
            //count - the number of rows in this group
            //data - an array of all the row data objects in this group
            //group - the group component for the group
        
            //return value + "<span style='color:#d00; margin-left:10px;'>(" + count + " item)</span>";
            return value;
        },
        //layout: "fitColumns", //fit columns to width of table (optional)
        columns: [
            {title:"Parameter", field:"parameterName", width: 150, hozAlign: "center", formatter: "html", headerSort: false,},
            {title:"Group Name", field:"groupName", visible: false, width: 150, hozAlign: "center", headerSort: false,},
            {title:"Open Circuit", field:"openCircuit", width: 150, hozAlign: "center", formatter: toExponentialFormatter, headerSort: false,},
            {title:"Max. Power", field:"maxPower", width: 150, hozAlign: "center", formatter: toExponentialFormatter, headerSort: false,},
            {title:"Max. Efficiency", field:"maxEfficiency", width: 150, hozAlign: "center", formatter: toExponentialFormatter, headerSort: false,},
        ],
    });
};

function initTepTables() {
    const rowSelectionColumnWidth = 45; // px
    const tempColumnWidth = 100; // px
    const propertyColumnWidth = 145; // px
    var tabledataSeebeck, tableElecResi, tableThrmCond;
    var tabledataSeebeck, tabledataElecResi, tabledataThrmCond;
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
        else {
            window.alert("Invalid Test Name!");
        }
    }
    else {
        [tabledataSeebeck, tabledataElecResi, tabledataThrmCond] = getTestRealisticTabledata();
    };

    function tepTableClipboardPasteParser(firstField, secondField) {
        return function pasteParser(clipboard) {
        //turn clipboard data into array
        const rows = clipboard.split("\n");
        const numRows = rows.length;
        var clipboardArray = [];
        var clipboardArrayItem;
        var cols;
        for(let row of rows) {
            cols = row.split("\t");
            if(cols.length < 2) {
                if(numRows === 1) {
                    return;  // invalid clipboard data
                }
                break;
            }
            if(isFinite(cols[0]) && isFinite(cols[1])) {
                clipboardArrayItem = {};
                clipboardArrayItem[firstField] = cols[0];
                clipboardArrayItem[secondField] = cols[1];
                clipboardArray.push(clipboardArrayItem);    
            }
        }
        return clipboardArray; //return array
        };
    }    

    var tableSeebeck = new Tabulator("#tep-table-seebeck", {
        height: "250px",
        data: tabledataSeebeck,
        resizableColumns: false,
        selectable: "highlight",
        clipboard: true,
        clipboardPasteAction: "replace",
        clipboardPasteParser: tepTableClipboardPasteParser("temperature", "seebeck"),
        // layout: "fitColumns", //fit columns to width of table (optional)
        columns: [ //Define Table Columns
            {formatter:"rowSelection", titleFormatter:"rowSelection", width: rowSelectionColumnWidth, hozAlign:"center", headerSort:false, clipboard:false,},
            {title:"Temp. [K]", field:"temperature", width: tempColumnWidth, hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
            {title:"[V/K]", field:"seebeck", width: propertyColumnWidth, hozAlign:"center", sorter:"number", validator:"numeric", editor:true},
        ],
    });

    var tableElecResi = new Tabulator("#tep-table-elec-resi", {
        height: "250px",
        data: tabledataElecResi,
        resizableColumns: false,
        selectable: "highlight",
        clipboard: true,
        clipboardPasteAction: "replace",
        clipboardPasteParser: tepTableClipboardPasteParser("temperature", "elecResi"),
        //layout: "fitColumns", //fit columns to width of table (optional)
        columns: [
            {formatter:"rowSelection", titleFormatter:"rowSelection", width: rowSelectionColumnWidth, hozAlign:"center", headerSort:false, clipboard:false,},
            {title:"Temp. [K]", field:"temperature", width: tempColumnWidth, hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
            {title:"[Ω m]", field:"elecResi", width: propertyColumnWidth, hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
        ],
    });

    var tableThrmCond = new Tabulator("#tep-table-thrm-cond", {
        height: "250px",
        data: tabledataThrmCond,
        resizableColumns: false,
        selectable: "highlight",
        clipboard: true,
        clipboardPasteAction: "replace",
        clipboardPasteParser: tepTableClipboardPasteParser("temperature", "thrmCond"),
        //layout: "fitColumns", //fit columns to width of table (optional)
        columns: [
            {formatter:"rowSelection", titleFormatter:"rowSelection", width: rowSelectionColumnWidth, hozAlign:"center", headerSort:false, clipboard:false,},
            {title:"Temp. [K]", field:"temperature", width: tempColumnWidth, hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
            {title:"[W/m/K]", field:"thrmCond", width: propertyColumnWidth, hozAlign:"center", sorter:"number", validator:"min:0", editor:true},
        ],
    });

    simWindow.tableSeebeck = tableSeebeck;
    simWindow.tableElecResi = tableElecResi;
    simWindow.tableThrmCond = tableThrmCond;

    $("#add-row-tep-table-seebeck").click(function() {
        simWindow.tableSeebeck.addRow({}, false);  // false means add to the bottom
    });
    $("#delete-row-tep-table-seebeck").click(function() {
        simWindow.tableSeebeck.deleteRow(simWindow.tableSeebeck.getSelectedRows());
    });
    $("#clear-tep-table-seebeck").click(function() {
        clearTepTable(simWindow.tableSeebeck);
    });
    $("#add-row-tep-table-elec-resi").click(function() {
        simWindow.tableElecResi.addRow({}, false);  // false means add to the bottom
    });
    $("#delete-row-tep-table-elec-resi").click(function() {
        simWindow.tableElecResi.deleteRow(simWindow.tableElecResi.getSelectedRows());
    });
    $("#clear-tep-table-elec-resi").click(function() {
        clearTepTable(simWindow.tableElecResi);
    });
    $("#add-row-tep-table-thrm-cond").click(function() {
        simWindow.tableThrmCond.addRow({}, false);  // false means add to the bottom
    });
    $("#delete-row-tep-table-thrm-cond").click(function() {
        simWindow.tableThrmCond.deleteRow(simWindow.tableThrmCond.getSelectedRows());
    });
    $("#clear-tep-table-thrm-cond").click(function() {
        clearTepTable(simWindow.tableThrmCond);
    });
};

function clearTepTable(table) {
    table.clearData();
    table.addRow({}, false);  // add a row to the bottom to allow pasting.
};


/* thermoelectric generator models */

async function solveTeqnByPowellMethod(J) {
    const chebyshevNodesVec = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0.0, dimlessSimParam.length);
    const initTempVecExceptBoundary = getLinearVec(chebyshevNodesVec, dimlessSimParam.hotTemp, dimlessSimParam.coldTemp).slice(1,chebyshevNodesVec.length-1);
    const xL = chebyshevNodesVec[0];
    const xU = chebyshevNodesVec[chebyshevNodesVec.length-1];

    var bounds = [];
    for(let i=0; i<chebyshevNodesVec.length-2; i++) {
        bounds.push([dimlessSimParam.minTemp, dimlessSimParam.maxTemp]);
    };

    simWindow.simTaskName = `Powell Method for I/I<sub>Ref</sub>=${(J*simParam.refJ*simParam.area/simParam.refI).toFixed(3)}`;

    function costFunc(tempVecExceptBoundary) {
        // ignore unreasonable values
        var maxTemp = Math.max(...tempVecExceptBoundary);
        var minTemp = Math.min(...tempVecExceptBoundary);
        if(maxTemp > dimlessSimParam.maxTemp) {
            return 1.0 + Math.abs(maxTemp);
        }
        if(minTemp < dimlessSimParam.minTemp) {
            return 1.0 + Math.abs(minTemp);
        }

        // we do not need to optimize the boundary points.
        var tempVec = [...tempVecExceptBoundary];
        tempVec.unshift(dimlessSimParam.hotTemp);
        tempVec.push(dimlessSimParam.coldTemp);        

        // // give a closer inspection: a little bit faster; (1min 29.47 sec --> 1min 28.24 sec)
        const tempFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodesVec, tempVec);
        const xOfMaxTemp = minimizer.goldenSectionMinimize((x) => (-tempFunc(x)), xL, xU, 1e-8);
        const xOfMinTemp = minimizer.goldenSectionMinimize(tempFunc, xL, xU, 1e-8);
        maxTemp = tempFunc(xOfMaxTemp);
        minTemp = tempFunc(xOfMinTemp);
        if(maxTemp > dimlessSimParam.maxTemp) {
            return 1.0 + Math.abs(maxTemp);
        }
        if(minTemp < dimlessSimParam.minTemp) {
            return 1.0 + Math.abs(minTemp);
        }

        // compute the error
        var newTempVec = getIntegralTeqnRhs(chebyshevNodesVec, tempVec, J);
        const cost = getL2Error(newTempVec, tempVec)

        return cost;
    };

    function callbackFunc(iter, err, msg=null) {
        return new Promise(function(resolve, reject) {
            if(msg === null) {
                printSimTaskMessage(`iter=${iter}: L<sup>2</sup>-error=${err.toExponential(3)}`);
                animateSimTaskMessageColor(true);
                resolve();    
            }
            else {
                printSimTaskMessage(`iter=${iter}: ${msg}`);
                animateSimTaskMessageColor(true);
                resolve();
            };
        });
    }

    var tempVecExceptBoundary = await minimizer.powellsMethodAsync(costFunc, initTempVecExceptBoundary, 
        {'bounds': bounds, 'maxIter': dimlessSimParam.numMaxIteration,
         'absTolerance': dimlessSimParam.solverTol, 'tolerance': 1e-8, 'lineTolerance': 1e-8,
         'ignoreRelTol': true, 'verbose': true, 'callback': callbackFunc});

    animateSimTaskMessageColor(false);
        
    var tempVec = [...tempVecExceptBoundary];
    tempVec.unshift(dimlessSimParam.hotTemp);
    tempVec.push(dimlessSimParam.coldTemp);

    // test the validity of solution range
    if(!isValidTempVec(chebyshevNodesVec, tempVec)) {
        return {'success': false, 'sol': null};
    }
    // compute the cost again
    const newTempVec = getIntegralTeqnRhs(chebyshevNodesVec, tempVec, J);
    const L2Error = getL2Error(newTempVec, tempVec);
    printSimTaskMessage(`L<sup>2</sup>-error=${L2Error.toExponential(3)}`);
    console.log(`Solving complete: L^2-error=${L2Error.toExponential(3)}`)

    return {'success': true, 'sol': tempVec, 'L2Error': L2Error};
};

async function solveTeqnByPicardIteration(J) {
    const chebyshevNodesVec = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0.0, dimlessSimParam.length);
    const initTempVec = getLinearVec(chebyshevNodesVec, dimlessSimParam.hotTemp, dimlessSimParam.coldTemp);
    simWindow.simTaskName = `Picard Iteration for I/I<sub>Ref</sub>=${(J*simParam.refJ*simParam.area/simParam.refI).toFixed(3)}`;

    var result = await new Promise(function(resolve, reject) {
        var prevTempVec = new Float64Array(initTempVec);
        var newTempVec;
        var isConvergent = false;
        var L2Error;
    
        for(let i=0; i<dimlessSimParam.numMaxIteration; i++) {
            newTempVec = getIntegralTeqnRhs(chebyshevNodesVec, prevTempVec, J);
            // do clipping to avoid unobserved temperatures ...
            newTempVec = clipByValue(newTempVec, dimlessSimParam.minTemp, dimlessSimParam.maxTemp);
            L2Error = getL2Error(newTempVec, prevTempVec);
            console.log(`iter=${i}: Picard iteration L^2 error=${L2Error.toExponential(3)}`);
            printSimTaskMessage(`iter=${i}: L<sup>2</sup>-error=${L2Error.toExponential(3)}`);
            animateSimTaskMessageColor(true);
            if(L2Error <= dimlessSimParam.solverTol) {
                isConvergent = true;
                break;
            };
            prevTempVec = newTempVec;
        };
        // test convergence
        if(!isConvergent) {
            resolve({'success': false, 'sol': null});
        }
        // test the validity of solution range
        if(!isValidTempVec(chebyshevNodesVec, newTempVec)) {
            resolve({'success': false, 'sol': null});
        }
    
        resolve({'success': true, 'sol': newTempVec, 'L2Error': L2Error});
    });
    animateSimTaskMessageColor(false);
    return result;
};

function isValidTempVec(chebyshevNodesVec, tempVec) {
        // test the validity of solution range
        const tempFunc = getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodesVec, tempVec);
        const xL = chebyshevNodesVec[0];
        const xU = chebyshevNodesVec[chebyshevNodesVec.length-1];
        const xOfMaxTemp = minimizer.goldenSectionMinimize((x) => (-tempFunc(x)), xL, xU);
        const xOfMinTemp = minimizer.goldenSectionMinimize(tempFunc, xL, xU);
        const solMaxTemp = tempFunc(xOfMaxTemp);
        const solMinTemp = tempFunc(xOfMinTemp);
        if(solMaxTemp > dimlessSimParam.maxTemp) {
            return false;
        }
        if(solMinTemp < dimlessSimParam.minTemp) {
            return false;
        }
        return true;
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
    const barSeebeck = simParam.barSeebeck;
    const Th = simParam.hotTemp;
    const deltaTemp = simParam.deltaTemp;
    const refSeebeck = simParam.refSeebeck;
    const refElecResi = simParam.refElecResi;
    const refThrmCond = simParam.refThrmCond;

    const Vgen = simParam.barSeebeck*simParam.deltaTemp;
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
    const tau = ( (barSeebeck-funcSeebeck(Th))*Th - K*smallDeltaT1 ) / Vgen;
    const beta = 2*K*smallDeltaT2/R - 1;
    const hotSideHeatRateDiffusion = K*deltaTemp;
    const hotSideHeatRatePeltier = I*barSeebeck*(Th-tau*deltaTemp)
    const hotSideHeatRateJoule = -0.5*I*I*R*(1+beta)
    const hotSideHeatRate = hotSideHeatRateDiffusion + hotSideHeatRatePeltier + hotSideHeatRateJoule;
    //const hotSideHeatRate = K*deltaTemp + I*barSeebeck*(Th-tau*deltaTemp) - 0.5*I*I*R*(1+beta);    
    const power = I*(Vgen - I*R);

    // for reference
    const Tc = simParam.coldTemp;
    const coldSideHeatRateDiffusion = K*deltaTemp;
    const coldSideHeatRatePeltier = I*barSeebeck*(Tc-tau*deltaTemp);
    const coldSideHeatRateJoule = +0.5*I*I*R*(1-beta);
    const coldSideHeatRate = coldSideHeatRateDiffusion + coldSideHeatRatePeltier + coldSideHeatRateJoule;
    const alphaBar = barSeebeck;
    const rhoBar = adaptiveSimpson((x)=>dimlessSimParam.funcElecResi(dimlessTempFunc(x)), 0.0, dimlessSimParam.length, dimlessSimParam.integralEps) * simParam.refElecResi;
    const kappaBar = simParam.refThrmCond / adaptiveSimpson((x)=>(1/dimlessSimParam.funcThrmCond(dimlessTempFunc(x))), 0.0, dimlessSimParam.length, dimlessSimParam.integralEps);

    return {'power': power, 'efficiency': power/hotSideHeatRate, 'hotSideHeatRate': hotSideHeatRate,
            'I': I, 'R': R, 'K': K, 'Vgen': Vgen, 'gamma': Vgen/(I*R)-1, 'V': Vgen-I*R,
            'hotSideHeatRateDiffusion': hotSideHeatRateDiffusion, 'hotSideHeatRatePeltier': hotSideHeatRatePeltier, 'hotSideHeatRateJoule': hotSideHeatRateJoule,
            'coldSideHeatRateDiffusion': coldSideHeatRateDiffusion, 'coldSideHeatRatePeltier': coldSideHeatRatePeltier, 'coldSideHeatRateJoule': coldSideHeatRateJoule,
            'coldSideHeatRate': coldSideHeatRate,
            'alphaBar': alphaBar, 'rhoBar': rhoBar, 'kappaBar': kappaBar,
            'Zgen': alphaBar*alphaBar/(rhoBar*kappaBar), 'tau': tau, 'beta': beta, 'deltaTemp': deltaTemp,
            'hidden1': tau/deltaTemp, 'hidden2': beta/deltaTemp,
        };
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

function resetBeforeRunSimulation() {
    // clear previous results
    if(simWindow.isSimResultDrawn) {
        simWindow.chartCurrentVsPower.clearChart();
        simWindow.chartCurrentVsEfficiency.clearChart();    
    }
    simWindow.isSimResultDrawn = false;
    if(simWindow.isPerformTableDrawn) {
        simWindow.tablePerformByCurrent.clearData();
        simWindow.tablePerformReport.clearData();
    }
    simWindow.tabledataPerformByCurrent = [];
    simWindow.performAtOpenCircuit = null;
    simWindow.performAtMaxPower = null;
    simWindow.performAtMaxEfficiency = null;
    simWindow.performArray = [];
    simWindow.isPerformTableDrawn = false;

    $("#report-list").html(`<li>I<sub>Ref</sub>=${simParam.refI} [A]</li>`);
};

function reportSimResults(J, tegPerformance, id=null) {
    var prevHtml = $("#report-list").html();
    const power = tegPerformance.power * simParam.numLegs;
    const efficiency = tegPerformance.power/tegPerformance.hotSideHeatRate;
    const hotSideHeatRate = tegPerformance.hotSideHeatRate * simParam.numLegs;
    const resultHtml = `<li>I/I<sub>Ref</sub>=${J} [1], P=${power} [W], &eta;=${efficiency} [1], Q<sub>h</sub>=${hotSideHeatRate} [W]</li>`;
    $("#report-list").html(prevHtml + resultHtml);

    if(id !== null) {
        simWindow.tabledataPerformByCurrent.push({
            id: id, current: (J*simParam.refI).toExponential(simWindow.numPerformTableDigits),
            power: power.toExponential(simWindow.numPerformTableDigits), 
            efficiency: efficiency.toExponential(simWindow.numPerformTableDigits), 
            hotSideHeatRate: hotSideHeatRate.toExponential(simWindow.numPerformTableDigits),
        });
    };
};

async function runSimulation() {
    const chebyshevXVec = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0.0, 1.0);
    const numCurrentChebyshevNodes = dimlessSimParam.numCurrentChebyshevNodes;
    const dJ = 0.05;

    disableAllButtons();
    $("#report-list").show();
    $("#copy-current-vs-performance").hide();
    $("#copy-perform-report").hide();
    $("#copy-temp-distribution").hide();
    $(".table-performance").hide();
    resetBeforeRunSimulation();

    // set a solver
    var solveTeqn = getSolverFunc();
    if(solveTeqn === null) {
        window.alert("Unknown solver!");
        return;
    };

    // for the case when simulation failed
    function simFailed() {
        printSimTaskMessage("Simulation Failed!");
        enableAllButtons();
        return;
    }

    new Promise(async function(resolve, reject) {
        var initialCurrent = dimlessSimParam.initialCurrent;
        var finalCurrent = dimlessSimParam.finalCurrent;    
        var resAtInitialCurrent = null;
        var resAtFinalCurrent = null;
        var J;
        var res;

        // find a suitable initial current
        if(initialCurrent > finalCurrent) {
            window.alert("Initial ref. current is too large! Make it smaller.");
            reject();
            return;
        };
        J = initialCurrent;
        while(J <= finalCurrent) {
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
            return;
        }
        console.log(`Initial ref. current ${initialCurrent.toFixed(3)} found.`);

        // find a suitable final current
        J = finalCurrent;
        while(J >= initialCurrent) {
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
        if(J < initialCurrent) {
            window.alert("Seriously wrong: Final ref. current not found!");
            reject();
            return;
        }
        console.log(`Final ref. current ${finalCurrent.toFixed(3)} found.`);

        resolve({initialCurrent: initialCurrent, finalCurrent: finalCurrent, resAtInitialCurrent: resAtInitialCurrent, resAtFinalCurrent: resAtFinalCurrent});
    }).then(function(values) {
        const initialCurrent = values.initialCurrent;
        const finalCurrent = values.finalCurrent;
        const resAtInitialCurrent = values.resAtInitialCurrent;
        const resAtFinalCurrent = values.resAtFinalCurrent;

        return new Promise(async function(resolve, reject) {
            // run simulation
            const refCurrentVec = getChebyshevNodes(numCurrentChebyshevNodes, initialCurrent, finalCurrent);
            const powerVec = new Float64Array(numCurrentChebyshevNodes);
            const hotSideHeatRateVec = new Float64Array(numCurrentChebyshevNodes);
            var J;
            var res;
            var yVec, L2Error;
            var maxL2Error = -Infinity;
            var tegPerformance;
            dimlessSimParam.tempVecArray = [];

            for(let i=0; i<numCurrentChebyshevNodes; i++) {
                J = refCurrentVec[i];
                if(i==0) {  // already computed
                    yVec = resAtInitialCurrent.sol;
                    L2Error = resAtInitialCurrent.L2Error;
                }
                else if(i==numCurrentChebyshevNodes-1) {  // already computed
                    yVec = resAtFinalCurrent.sol;
                    L2Error = resAtFinalCurrent.L2Error;
                }
                else {
                    res = await solveTeqn(J);
                    if(res.success) {
                        yVec = res.sol;
                        L2Error = res.L2Error;
                    }
                    else {
                        window.alert("Seriously wrong: Computation at an interior ref. current failed!");
                        reject();
                        return;
                    }
                }
                // compute performance
                tegPerformance = getTegPerformance(chebyshevXVec, yVec, J);
                powerVec[i] = tegPerformance.power;
                hotSideHeatRateVec[i] = tegPerformance.hotSideHeatRate;
                reportSimResults(J, tegPerformance, i+1); // write the performance results
                simWindow.performArray.push(tegPerformance);  // keep performance to reuse for open circuit.
                dimlessSimParam.tempVecArray.push(yVec); // keep temperature distributions in case a user wants to save them as a file.
                // compute max. L2-Error
                maxL2Error = Math.max(maxL2Error, L2Error);
            }
            dimlessSimParam.refCurrentVec = refCurrentVec;
            dimlessSimParam.powerVec = powerVec;
            dimlessSimParam.hotSideHeatRateVec = hotSideHeatRateVec;
            resolve({maxL2Error: maxL2Error, resAtInitialCurrent: resAtInitialCurrent,});
        });
    }).then(async function(values) {
        const refCurrentVec = dimlessSimParam.refCurrentVec;
        const powerVec = dimlessSimParam.powerVec;
        const hotSideHeatRateVec = dimlessSimParam.hotSideHeatRateVec;
        const maxL2Error = values.maxL2Error;
        const initialRefCurrent = refCurrentVec[0];
        const finalRefCurrent = refCurrentVec[refCurrentVec.length-1];
        const chebyshevXVec = getChebyshevNodes(dimlessSimParam.numSolChebyshevNodes, 0.0, 1.0);
        var isPostProcessingFailed = false;

        // draw I-power curve and I-efficiency curve
        simParam.funcPower = getPolyChebyshevFuncFromChebyshevNodes(refCurrentVec, powerVec);
        simParam.funcHotSideHeatRate = getPolyChebyshevFuncFromChebyshevNodes(refCurrentVec, hotSideHeatRateVec);
        drawSimResults();
        simWindow.isSimResultDrawn = true;

        // ------------- post-processing -------------
        // open circuit voltage
        const idxOpenCircuitCurrent = refCurrentVec.findIndex((element) => (element===0.0));
        if(idxOpenCircuitCurrent >= 0) {
            simWindow.performAtOpenCircuit = simWindow.performArray[idxOpenCircuitCurrent];
        } else {
            const JAtOpenCircuit = 0.0;
            const resAtOpenCircuit = await solveTeqn(JAtOpenCircuit);
            if(resAtOpenCircuit.success) {
                simWindow.performAtOpenCircuit = getTegPerformance(chebyshevXVec, resAtOpenCircuit.sol, JAtOpenCircuit);
            } else {
                isPostProcessingFailed = true;
            }
        }
        // find max. power
        const initialJForOptimization = (initialRefCurrent + finalRefCurrent)/2;
        if(!isPostProcessingFailed) {
            const JAtMaxPower = await minimizer.powellsMethod((J)=>(-simParam.funcPower(J)), [initialJForOptimization], 
                {'bounds': [[initialRefCurrent, finalRefCurrent]], 'maxIter': dimlessSimParam.numMaxIteration,
                 'absTolerance': dimlessSimParam.solverTol, 'tolerance': 1e-8, 'lineTolerance': 1e-8, 'verbose': true, });
            const resAtMaxPower = await solveTeqn(JAtMaxPower);
            if(resAtMaxPower.success) {
                simWindow.performAtMaxPower = getTegPerformance(chebyshevXVec, resAtMaxPower.sol, JAtMaxPower);
            } else {
                isPostProcessingFailed = true;
            }
        }
        // find max. efficiency
        if(!isPostProcessingFailed) {
            const JAtMaxEfficiency = await minimizer.powellsMethod((J)=>(-simParam.funcPower(J)/simParam.funcHotSideHeatRate(J)), [initialJForOptimization], 
                {'bounds': [[initialRefCurrent, finalRefCurrent]], 'maxIter': dimlessSimParam.numMaxIteration,
                'absTolerance': dimlessSimParam.solverTol, 'tolerance': 1e-8, 'lineTolerance': 1e-8, 'verbose': true, });
            const resAtMaxEfficiency = await solveTeqn(JAtMaxEfficiency);
            if(resAtMaxEfficiency.success) {
                simWindow.performAtMaxEfficiency = getTegPerformance(chebyshevXVec, resAtMaxEfficiency.sol, JAtMaxEfficiency);
            } else {
                isPostProcessingFailed = true;
            }
        }
        
        if(!isPostProcessingFailed) {
            $("#report-list").hide();
            drawCopyCurrentVsPerformanceTable();
            drawCopyTempDistributionTable();
            drawPerformTables();
            $("#copy-current-vs-performance").show();
            $("#copy-perform-report").show();
            $("#copy-temp-distribution").show();        
            $(".table-performance").show();
            simWindow.isPerformTableDrawn = true;
        }

        // simulation is complete.
        simWindow.simTaskName = `Simulation complete`;
        printSimTaskMessage(`Estimated L<sup>2</sup>-error=${maxL2Error.toExponential(3)}`);
        console.log("Simulation complete.");

        enableAllButtons();
    })
    .catch(simFailed);
};

function drawSimResults() {
    drawCurrentVsPowerChart(dimlessSimParam.refCurrentVec, simParam.funcPower);
    drawCurrentVsEfficiencyChart(dimlessSimParam.refCurrentVec, (x) => (simParam.funcPower(x) / simParam.funcHotSideHeatRate(x)));
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

function drawCurrentVsPowerChart(refCurrentVec, funcPower) {
    const chart = simWindow.chartCurrentVsPower;
    const xLabel = "Electric Current [A]";
    const yLabel = "Power [mW]";
    const yTableLabel = "simulation";
    const xScale = simParam.refI;
    const yScale = 1e3 * simParam.numLegs;  // [mW] * num of legs

    const data = getChartDataFromVec(refCurrentVec.map(x => (x*xScale)), x => funcPower(x/xScale), xLabel, yTableLabel, yScale);

    var view = new google.visualization.DataView(data);
    view.setColumns([0, 1, {
      label: 'interpolation',
      type: 'number',
      calc: function (dataTable, rowNum) {
          var xValue = dataTable.getValue(rowNum, 0);
          return funcPower(xValue/xScale) * yScale;
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