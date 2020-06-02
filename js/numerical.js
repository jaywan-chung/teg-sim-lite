/**
 * Math Library for TEG web simulation.
 *
 * 2020 Jaywan Chung
 *
**/

function clipByValue(vec, minValue, maxValue) {
    return vec.map(function(element) {
        if(element <= minValue) {
            return minValue;
        }
        if(element >= maxValue) {
            return maxValue;
        }
        return element;
    });
};

function getLinearSpace(x0, xf, numNodes) {
    const vec = new Float64Array(numNodes);
    const dx = (xf-x0)/(numNodes-1);
    for(let i=0; i<vec.length; i++) {
        vec[i] = (x0 + dx*i);
    };
    vec[vec.length-1] = xf;

    return vec;
};

function getLinearVec(xVec, y0, yf) {
    const lenVec = xVec.length;
    const x0 = xVec[0];
    const xf = xVec[lenVec-1];
    const dydx = (yf-y0)/(xf-x0);
    const yVec = xVec.map((x) => (y0 + dydx*(x-x0)));
    yVec[lenVec-1] = yf;

    return yVec;
};

function getLInftyError(vec1, vec2) {
    const absDiffVec = vec1.map((element, index) => (Math.abs(element - vec2[index])));

    return absDiffVec.reduce((accumulator, currentValue) => Math.max(accumulator, currentValue));
};

function getL2Error(vec1, vec2) {
    const absDiffVecSquared = vec1.map( (element, index) => (Math.pow(Math.abs(element - vec2[index]),2)) );
    const sum = absDiffVecSquared.reduce((accumulator, currentValue) => (accumulator + currentValue));

    return Math.sqrt(sum / vec1.length);
};

/**
 * Calculate a polynomial function at a given point.
 *
 * @param {Array} coefVec: coefficients of a polynomial. The first item is the coefficient of the highest degree.
 * @param {Number} point: point to be evaluated.
 * @return {Number} result.
 */
function evalPoly(coefVec, point) {
    result = 0.0;
    for(let coef of coefVec) {
        result = result * point + coef;
    };

    return result;
};

function evalDerivativeOfPoly(coefVec, point) {
    const lengthOfDerivativeCoefVec = coefVec.length-1;
    var derivativeCoefVec = new Float64Array(lengthOfDerivativeCoefVec);
    for(let i=0; i<lengthOfDerivativeCoefVec; i++) {
        derivativeCoefVec[i] = (lengthOfDerivativeCoefVec-i) * coefVec[i];
    };
    return evalPoly(derivativeCoefVec, point);
};

function getPiecewiseLinearFunc(dataRows) {
    // we assume dataRows are sorted by x.
    const numRows = dataRows.length;
    const xVec = new Float64Array(numRows);
    const yVec = new Float64Array(numRows);

    for(let i=0; i<numRows; i++) {
        xVec[i] = dataRows[i][0];
        yVec[i] = dataRows[i][1];
    }

    const piecewiseLinearFunc = function(x) {
        for(let i=0; i<numRows-1; i++) {
            if(x>=xVec[i] && x<=xVec[i+1]) {
                var dydx = (yVec[i+1]-yVec[i])/(xVec[i+1]-xVec[i]);
                return yVec[i] + dydx*(x-xVec[i]);
            };
        };
        return undefined;
    };
    return piecewiseLinearFunc;
};

function getChebyshevNodes(numNodes, x0, xf) {
    const nodesVec = new Float64Array(numNodes);
    const n = numNodes-1;
    for(let i=0; i<numNodes; i++) {
        nodesVec[i] = ((x0-xf)*Math.cos(i*Math.PI/n) + (x0+xf))/2;
    };
    return nodesVec;
};

function getPolyChebyshevFuncFromChebyshevNodes(chebyshevNodesVec, yVec) {
    const numNodes = chebyshevNodesVec.length;
    const _xVec = new Float64Array(chebyshevNodesVec)
    const _yVec = new Float64Array(yVec);
    const _wVec = _xVec.map((element, index) => (Math.pow(-1,index)));
    _wVec[0] /= 2;
    _wVec[numNodes-1] /= 2;

    const polyChebyshevFunc = function(x) {
        var numerator = 0.0;
        var denominator = 0.0;
        const index = _xVec.findIndex((element) => (element == x));
        if(index >= 0) {  // already in the raw data
            return _yVec[index];
        };
        for(let i=0; i<numNodes; i++) {
            numerator += _wVec[i]/(x-_xVec[i])*_yVec[i];
            denominator += _wVec[i]/(x-_xVec[i]);
        };
        return numerator/denominator;
    };

    return polyChebyshevFunc;
}

function getPolyChebyshevFuncFromDataRows(numNodes, dataRows) {
    const piecewiseLinearFunc = getPiecewiseLinearFunc(dataRows);
    const [x0, xf] = getMinAndMaxXValue(dataRows);
    const xVec = getChebyshevNodes(numNodes, x0, xf);
    const yVec = new Float64Array(numNodes);
    const wVec = new Float64Array(numNodes);

    for(let i=0; i<numNodes; i++) {
        yVec[i] = piecewiseLinearFunc(xVec[i]);
        wVec[i] = Math.pow(-1, i);
    };
    wVec[0] /= 2;
    wVec[numNodes-1] /= 2;

    const polyChebyshevFunc = function(x) {
        var numerator = 0.0;
        var denominator = 0.0;
        const index = xVec.findIndex((element) => (element == x));
        if(index >= 0) {  // already in the raw data
            return yVec[index];
        };
        for(let i=0; i<numNodes; i++) {
            numerator += wVec[i]/(x-xVec[i])*yVec[i];
            denominator += wVec[i]/(x-xVec[i]);
        };
        return numerator/denominator;
    };

    return polyChebyshevFunc;
};

function getMinAndMaxXValue(dataRows) {
    var minXValue = Infinity;
    var maxXValue = -Infinity;
    var xValue;
    for(let row of dataRows) {
        xValue = row[0]
        if(minXValue >= xValue) {
            minXValue = xValue;
        };
        if(maxXValue <= xValue) {
            maxXValue = xValue;
        };
    };
    return [minXValue, maxXValue];
};

function getPolyRegressFunc(degPoly, dataRows, costScale=1.0) {
    var coefVec0 = new Float64Array(degPoly+1);  // initial vector
    const numRows = dataRows.length;
    const [xL2Sum, yL2Sum] = evalL2SumOfDataRows(dataRows);
    const xAvg = Math.sqrt(xL2Sum/numRows);
    var coefVec, solution;

    // objective that needs to be minimized: root mean square error
    var costFunc = function(coefVec) {
        var cost = 0.0;
        var xValue, yValue;
        for(let row of dataRows) {
            xValue = row[0];
            yValue = row[1];
            cost += Math.pow( evalPoly(coefVec, xValue/xAvg) - yValue, 2 ) / (yL2Sum+1e-16);
        };
        return cost * costScale;
    };
    var grdFunc = function(coefVec) {
        var grdVec = new Float64Array(degPoly+1);
        var xValue, yValue;
        var sumValue;
        for(let row of dataRows) {
            xValue = row[0];
            yValue = row[1];
            for(let i=0; i<degPoly+1; i++) {
                grdVec[i] += (evalPoly(coefVec, xValue/xAvg) - yValue)*Math.pow(xValue/xAvg, degPoly-i)/(yL2Sum+1e-16)*2 * costScale;
            }
        };
        return grdVec;
    };
        
    // Powell method can be applied to zero order unconstrained optimization
    //var solution = optimjs.minimize_Powell(costFunc, coefVec0);  // return 'argument' and 'fncvalue'.
    // solution = optimjs.minimize_L_BFGS(costFunc, grdFunc, coefVec0);  // return 'argument' and 'fncvalue'.
    // coefVec = solution.argument;
    coefVec = minimizer.powellsMethod(costFunc, coefVec0, {maxIter: 500, tol: 1e-8, verbose: false});

    const polyRegressFunc = function(x) {
        return evalPoly(coefVec, x/xAvg);
    };

    return polyRegressFunc;
};

function evalL2SumOfDataRows(dataRows) {
    var xL2Sum = 0.0;
    var yL2Sum = 0.0;
    var xValue, yValue;
    for(let row of dataRows) {
        xValue = row[0];
        yValue = row[1];
        xL2Sum += Math.pow(xValue, 2);
        yL2Sum += Math.pow(yValue, 2);
    };
    return [xL2Sum, yL2Sum];
};

// The following code is developed on a python implementation 
//   in https://en.wikipedia.org/wiki/Adaptive_Simpson%27s_method.
/**
 * Helper function in calculating integral of a function from a to b using Simpson quadrature.
 * Evaluates the Simpson's Rule, also returning m and f(m) to reuse
 *
 * @param {Function} f: math function to be evaluated.
 * @param {Number} a: point to initiate evaluation.
 * @param {Number} fa: function value at the point a.
 * @param {Number} b: point to complete evaluation.
 * @param {Number} fb: function value at the point b.
 * @return {Number} evaluation.
 */
function _adaptiveSimpsonMem(f, a, fa, b, fb) {
    var m = (a + b) / 2;
    var fm = f(m);
    // return [m, fm, Math.abs(b - a) / 6 * (fa + 4 * fm + fb)];
    return [m, fm, (b - a) / 6 * (fa + 4 * fm + fb)];
};

/**
 * Helper function in calculating integral of a function from a to b using Simpson quadrature.
 * Efficient recursive implementation of adaptive Simpson's rule.
 * Function values at the start, middle, end of the intervals are retained.
 *
 * @param {Function} f: math function to be evaluated.
 * @param {Number} a: point to initiate evaluation.
 * @param {Number} fa: function value at the point a.
 * @param {Number} b: point to complete evaluation.
 * @param {Number} fb: function value at the point b.
 * @param {Number} eps: Error bound (epsilon).
 * @param {Number} whole: total value.
 * @param {Number} m: midpoint.
 * @param {Number} fm: function value at the point m.
 * @return {Number} recursive evaluation of left and right side.
 */
function _adaptiveSimpson(f, a, fa, b, fb, eps, whole, m, fm, depth, maxDepth) {
    var lm, flm, left
    var rm, frm, right;
    var delta;

    [lm, flm, left]  = _adaptiveSimpsonMem(f, a, fa, m, fm);
    [rm, frm, right] = _adaptiveSimpsonMem(f, m, fm, b, fb);
    // console.log(`left=${left}, right=${right}, whole=${whole}`);
    delta = left + right - whole
    if(depth >= maxDepth) {
        // console.log("Max. depth of adaptive Simpson reached.")
        return left + right + delta / 15;
    };
    if(Math.abs(delta) <= 15 * eps) {
        return left + right + delta / 15;
    };

    // console.log(`_adaptiveSimpson(a=${a}, b=${b}), delta=${delta}, 15*eps=${15*eps} depth=${depth}`);

    return _adaptiveSimpson(f, a, fa, m, fm, eps/2, left , lm, flm, depth+1, maxDepth) 
           + _adaptiveSimpson(f, m, fm, b, fb, eps/2, right, rm, frm, depth+1, maxDepth);
};

/**
 * Integrate f from a to b using Adaptive Simpson's Rule with max error of eps.
 *
 * @param {Function} f: math function to be evaluated.
 * @param {Number} a: point to initiate evaluation.
 * @param {Number} b: point to complete evaluation.
 * @param {Number} eps: error bound (epsilon).
 * @return {Number} area underneath curve.
 */
function adaptiveSimpson(f, a, b, eps=1e-10, maxDepth=20) {
    var fa, fb;
    var m, fm, whole;
    var depth = 1;

    fa = f(a);
    fb = f(b);
    [m, fm, whole] = _adaptiveSimpsonMem(f, a, fa, b, fb);

    // console.log("adaptive Simpson complete.");

    return _adaptiveSimpson(f, a, fa, b, fb, eps, whole, m, fm, depth, maxDepth);
};