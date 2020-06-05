/**
 * The following functions are from
 * 
 *   https://github.com/rreusser/minimize-powell
 *   https://github.com/scijs/minimize-golden-section-1d
 * 
 * © 2015--2017 Ricky Reusser. MIT License.
 * 
 * Modified by Jaywan Chung (2020) to support async.
 */

'use strict';

var minimizer = {
    goldenSectionMinimize: null,
    bracketMinimum: null,
    minimize: null,
    powellsMethod: null,
    PHI_RATIO: 2 / (1 + Math.sqrt(5)),
};

minimizer.goldenSectionMinimize = function goldenSectionMinimize (f, xL, xU, tol, maxIterations, status) {
    var xF, fF;
    var iteration = 0;
    var x1 = xU - minimizer.PHI_RATIO * (xU - xL);
    var x2 = xL + minimizer.PHI_RATIO * (xU - xL);
    // Initial bounds:
    var f1 = f(x1);
    var f2 = f(x2);

    // Store these values so that we can return these if they're better.
    // This happens when the minimization falls *approaches* but never
    // actually reaches one of the bounds
    var f10 = f(xL);
    var f20 = f(xU);
    var xL0 = xL;
    var xU0 = xU;

    // Simple, robust golden section minimization:
    while (++iteration < maxIterations && Math.abs(xU - xL) > tol) {
        if (f2 > f1) {
            xU = x2;
            x2 = x1;
            f2 = f1;
            x1 = xU - minimizer.PHI_RATIO * (xU - xL);
            f1 = f(x1);
        } else {
        xL = x1;
        x1 = x2;
        f1 = f2;
        x2 = xL + minimizer.PHI_RATIO * (xU - xL);
        f2 = f(x2);
        }
    };

    xF = 0.5 * (xU + xL);
    fF = 0.5 * (f1 + f2);

    if (status) {
        status.iterations = iteration;
        status.argmin = xF;
        status.minimum = fF;
        status.converged = true;
    }

    if (isNaN(f2) || isNaN(f1)) {
        if (status) {
            status.converged = false;
        }
        console.log("A serious problem occured in Golden section search!");
        return NaN;
    }
    // maxIteration is no longer a fatal error.
    if (iteration === maxIterations) {
        if (status) {
            status.converged = false;
        }
        return xF; // modified by Jaywan Chung (2020.06.02)
    }

    if (f10 < fF) {
        return xL0;
    } else if (f20 < fF) {
        return xU0;
    } else {
        return xF;
    }
};

minimizer.bracketMinimum = function bracketMinimum (bounds, f, x0, dx, xMin, xMax, maxIter) {
    // If either size is unbounded (=infinite), Expand the guess
    // range until we either bracket a minimum or until we reach the bounds:
    var fU, fL, fMin, n, xL, xU, bounded;
    n = 1;
    xL = x0;
    xU = x0;
    fMin = fL = fU = f(x0);
    while (!bounded && isFinite(dx) && !isNaN(dx)) {
        ++n;
        bounded = true;

        if (fL <= fMin) {
            fMin = fL;
            xL = Math.max(xMin, xL - dx);
            fL = f(xL);
            bounded = false;
        }
        if (fU <= fMin) {
            fMin = fU;
            xU = Math.min(xMax, xU + dx);
            fU = f(xU);
            bounded = false;
        }

        // Track the smallest value seen so far:
        fMin = Math.min(fMin, fL, fU);

        // If either of these is the case, then the function appears
        // to be minimized against one of the bounds, so although we
        // haven't bracketed a minimum, we'll considere the procedure
        // complete because we appear to have bracketed a minimum
        // against a bound:
        if ((fL === fMin && xL === xMin) || (fU === fMin && xU === xMax)) {
            bounded = true;
        }

        // Increase the increment at a very quickly increasing rate to account
        // for the fact that we have *no* idea what floating point magnitude is
        // desirable. In order to avoid this, you should really provide *any
        // reasonable bounds at all* for the variables.
        dx *= n < 4 ? 2 : Math.exp(n * 0.5);

        if (!isFinite(dx)) {
            bounds[0] = -Infinity;
            bounds[1] = Infinity;

            return bounds;
        }
    }

    bounds[0] = xL;
    bounds[1] = xU;

    return bounds;
};

minimizer.minimize1d = function minimize (f, options, status) {
    options = options || {};
    var x0;
    var tolerance = options.tolerance === undefined ? 1e-8 : options.tolerance;
    var dx = options.initialIncrement === undefined ? 1 : options.initialIncrement;
    var xMin = options.lowerBound === undefined ? -Infinity : options.lowerBound;
    var xMax = options.upperBound === undefined ? Infinity : options.upperBound;
    var maxIterations = options.maxIterations === undefined ? 100 : options.maxIterations;
    var bounds = [0, 0];

    if (status) {
        status.iterations = 0;
        status.argmin = NaN;
        status.minimum = Infinity;
        status.converged = false;
    }

    if (isFinite(xMax) && isFinite(xMin)) {
        bounds[0] = xMin;
        bounds[1] = xMax;
    } else {
        // Construct the best guess we can:
        if (options.guess === undefined) {
        if (xMin > -Infinity) {
            x0 = xMax < Infinity ? 0.5 * (xMin + xMax) : xMin;
        } else {
            x0 = xMax < Infinity ? xMax : 0;
        }
        } else {
        x0 = options.guess;
        }

        bounds = minimizer.bracketMinimum(bounds, f, x0, dx, xMin, xMax, maxIterations);

        if (isNaN(bounds[0]) || isNaN(bounds[1])) {
            return NaN;
        }
    }

    return minimizer.goldenSectionMinimize(f, bounds[0], bounds[1], tolerance, maxIterations, status);
};



/** Modified by Jaywan Chung (2020) **/
minimizer.powellsMethodAsync = async function powellsMethodAsync (f, x0, options, status) {
    const minimize1d = minimizer.minimize1d;
    var i, j, iter, ui, tmin, pj, un, u, p0, dx, err, perr, du;

    options = options || {};
    const maxIter = options.maxIter === undefined ? 20 : options.maxIter;
    const absTol = options.absTolerance === undefined ? 1e-8 : options.absTolerance;
    const tol = options.tolerance === undefined ? 1e-8 : options.tolerance;
    const tol1d = options.lineTolerance === undefined ? tol : options.lineTolerance;
    var bounds = options.bounds === undefined ? [] : options.bounds;
    const verbose = options.verbose === undefined ? false : options.verbose;
    const ignoreRelTol = options.ignoreRelTol === undefined ? false : options.ignoreRelTol;

    if (status) status.points = [];

    // Dimensionality:
    var n = x0.length;
    // Solution vector:
    var p = x0.slice(0);

    // Search directions:
    u = [];
    un = [];
    for (i = 0; i < n; i++) {
        u[i] = [];
        for (j = 0; j < n; j++) {
            u[i][j] = i === j ? 1 : 0;
        }
    }

    // Bound the input:
    function constrain (x) {
        for (var i = 0; i < bounds.length; i++) {
            var ibounds = bounds[i];
            if (!ibounds) continue;
            if (isFinite(ibounds[0])) {
                x[i] = Math.max(ibounds[0], x[i]);
            }
            if (isFinite(ibounds[1])) {
                x[i] = Math.min(ibounds[1], x[i]);
            }
        }
    }

    constrain(p);

    if (status) status.points.push(p.slice());

    var bound = options.bounds
        ? function (p, ui) {
            var upper = Infinity;
            var lower = -Infinity;

            for (var j = 0; j < n; j++) {
                var jbounds = bounds[j];
                if (!jbounds) continue;

                if (ui[j] !== 0) {
                    if (jbounds[0] !== undefined && isFinite(jbounds[0])) {
                        lower = (ui[j] > 0 ? Math.max : Math.min)(lower, (jbounds[0] - p[j]) / ui[j]);
                    }

                    if (jbounds[1] !== undefined && isFinite(jbounds[1])) {
                        upper = (ui[j] > 0 ? Math.min : Math.max)(upper, (jbounds[1] - p[j]) / ui[j]);
                    }
                }
            }

            return [lower, upper];
        }
        : function () {
            return [-Infinity, Infinity];
        };

    iter = 0;
    perr = 0;
    var oneStepResult;
    var oneStepPrevResult;
    // here
    oneStepPrevResult = {
        isDone: false,
        iter: 1, n: n, u: u, bound: bound, bounds: bounds, minimize1d: minimize1d, absTol: absTol, tol: tol, tol1d: tol1d, f:f, verbose: verbose, callback:options.callback,
        p: p, status: status, perr: perr,
        ignoreRelTol: ignoreRelTol,
    };
    var newStep = function(oneStepPrevResult) {
        return new Promise(function(resolve, reject) {
            window.setTimeout(() => {
                resolve(powellsMethodOneStep(oneStepResult));
            });    
        });
    };
    
    oneStepResult = Object.assign({}, oneStepPrevResult);
    while(++iter <= maxIter) {
        oneStepResult = await newStep(oneStepPrevResult);
        if(oneStepResult.isDone) {
            break;
        }
    };

    return oneStepResult.p;
};

function powellsMethodOneStep(oneStepPrevResult) {
    // keep the previous results
    var oneStepResult = Object.assign({}, oneStepPrevResult);
    oneStepResult.iter = oneStepResult.iter+1;
    
    if(oneStepPrevResult.isDone) {
        return oneStepPrevResult;
    }

    // set the variables
    var u, p0, ui, tlimit, dx, tmin, un, sum, err, du;
    const iter = oneStepPrevResult.iter;
    const n = oneStepPrevResult.n;
    var u = oneStepPrevResult.u;
    var bound = oneStepPrevResult.bound;
    var bounds = oneStepPrevResult.bounds;
    const minimize1d = oneStepPrevResult.minimize1d;
    const absTol = oneStepPrevResult.absTol;
    const tol = oneStepPrevResult.tol;
    const tol1d = oneStepPrevResult.tol1d;
    const f = oneStepPrevResult.f;
    const verbose = oneStepPrevResult.verbose;
    const callback = oneStepPrevResult.callback;
    var p = oneStepPrevResult.p;
    var status = oneStepPrevResult.status;
    var perr = oneStepPrevResult.perr;
    const ignoreRelTol = oneStepPrevResult.ignoreRelTol;

    oneStepResult.p = p;

    // A function to evaluate:
    const fi = function (t) {
        var pj = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            pj[i] = p[i] + ui[i] * t;
        }
        //const fpj = f(pj);
        if (callback !== undefined) {
            var errStr;
            if(perr > 0) {
                errStr = perr.toExponential(3);
            }
            else {
                errStr = "?";
            }
            callback(iter, 0.0, `Optimizing... w/ prev. error=${errStr}`);
        }
        return f(pj);
    };

    function constrain (x) {
        for (var i = 0; i < bounds.length; i++) {
            var ibounds = bounds[i];
            if (!ibounds) continue;
            if (isFinite(ibounds[0])) {
                x[i] = Math.max(ibounds[0], x[i]);
            }
            if (isFinite(ibounds[1])) {
                x[i] = Math.min(ibounds[1], x[i]);
            }
        }
    }

    // Reinitialize the search vectors:
    if (iter % (n) === 0) {
        for (let i = 0; i < n; i++) {
            u[i] = [];
            for (let j = 0; j < n; j++) {
                u[i][j] = i === j ? 1 : 0;
            }
        }
    }
    oneStepResult.u = u;

    // Store the starting point p0:
    p0 = [];
    for (let j = 0; j < n; j++) {
        p0[j] = p[j];
    }

    // Minimize over each search direction u[i]:
    for (let i = 0; i < n; i++) {
        ui = u[i];
    
        // Compute bounds based on starting point p in the
        // direction ui:
        tlimit = bound(p, ui);
    
        // Minimize using golden section method:
        dx = 0.1;
    
        tmin = minimize1d(fi, {
            lowerBound: tlimit[0],
            upperBound: tlimit[1],
            initialIncrement: dx,
            tolerance: dx * tol1d,
        });
    
        if (tmin === 0) {
            oneStepResult.p = p;
            if (verbose) console.log('Iteration ' + iter + ': tmin === 0');
            return oneStepResult;
        }
        
        // Update the solution vector:
        for (let j = 0; j < n; j++) {
            p[j] += tmin * ui[j];
        }
        constrain(p);
        oneStepResult.p = p;  // update p
    
        if (status) {
            status.points.push(p.slice());
            oneStepResult.status = status;
        }
    }

    // Throw out the first search direction:
    u.shift();

    // Construct a new search direction:
    un = [];
    sum = 0;
    for (let j = 0; j < n; j++) {
        un[j] = p[j] - p0[j];
        sum += un[j] * un[j];
    }
    // Normalize:
    sum = Math.sqrt(sum);

    if (sum > 0) {
        for (let j = 0; j < n; j++) {
            un[j] /= sum;
        }
    } else {
        // Exactly nothing moved, so it it appears we've converged. In particular,
        // it's possible the solution is up against a boundary and simply can't
        // move farther.
        if (verbose) console.log('Iteration ' + iter + ': nothing moved.');
        oneStepResult.isDone = true;
        return oneStepResult;
    }

    u.push(un);
    // One more minimization, this time along the new direction:
    ui = un;

    tlimit = bound(p, ui);

    dx = 0.1;

    tmin = minimize1d(fi, {
        lowerBound: tlimit[0],
        upperBound: tlimit[1],
        initialIncrement: dx,
        tolerance: dx * tol1d,
    });

    if (tmin === 0) {
        oneStepResult.p = p;
        if (verbose) console.log('Iteration ' + iter + ': tmin === 0');
        return oneStepResult;
    }

    err = 0;
    for (let j = 0; j < n; j++) {
        du = tmin * ui[j];
        err += du * du;
        p[j] += du;
    }
    constrain(p);
    oneStepResult.p = p; // update p

    if (status) {
        status.points.push(p.slice());
        oneStepResult.status = status;
    };

    err = Math.sqrt(err);
    oneStepResult.err = err;

    var fp = f(p);
    if (verbose) console.log('Iteration ' + iter + ': ' + (err / perr) + ' f(' + p + ') = ' + fp);
    // callback added by Jaywan Chung
    if (callback !== undefined) {
        callback(iter, fp);
    }
    if (fp < absTol) {
        console.log(`err=${err}, fp=${fp}`);
        if (verbose) console.log("abs. accuracy satisfied.");
        oneStepResult.isDone = true;
        return oneStepResult;
    }
    if(!ignoreRelTol) {  // added by Jaywan Chung
        if (err / perr < tol) {
            if (verbose) console.log("rel. accuracy satisfied.");
            oneStepResult.isDone = true;
            return oneStepResult;
        }    
    }

    perr = err;
    oneStepResult.perr = perr;

    return oneStepResult;
};


/** Ricky Reusser (2017) **/
minimizer.powellsMethod = function powellsMethod (f, x0, options, status) {
    const minimize1d = minimizer.minimize1d;
    var i, j, iter, ui, tmin, pj, fi, un, u, p0, sum, dx, err, perr, du, tlimit;

    options = options || {};
    var maxIter = options.maxIter === undefined ? 20 : options.maxIter;
    var tol = options.tolerance === undefined ? 1e-8 : options.tolerance;
    var tol1d = options.lineTolerance === undefined ? tol : options.lineTolerance;
    var bounds = options.bounds === undefined ? [] : options.bounds;
    var verbose = options.verbose === undefined ? false : options.verbose;

    if (status) status.points = [];

    // Dimensionality:
    var n = x0.length;
    // Solution vector:
    var p = x0.slice(0);

    // Search directions:
    u = [];
    un = [];
    for (i = 0; i < n; i++) {
        u[i] = [];
        for (j = 0; j < n; j++) {
            u[i][j] = i === j ? 1 : 0;
        }
    }

    // Bound the input:
    function constrain (x) {
        for (var i = 0; i < bounds.length; i++) {
            var ibounds = bounds[i];
            if (!ibounds) continue;
            if (isFinite(ibounds[0])) {
                x[i] = Math.max(ibounds[0], x[i]);
            }
            if (isFinite(ibounds[1])) {
                x[i] = Math.min(ibounds[1], x[i]);
            }
        }
    }

    constrain(p);

    if (status) status.points.push(p.slice());

    var bound = options.bounds
        ? function (p, ui) {
            var upper = Infinity;
            var lower = -Infinity;

            for (var j = 0; j < n; j++) {
                var jbounds = bounds[j];
                if (!jbounds) continue;

                if (ui[j] !== 0) {
                    if (jbounds[0] !== undefined && isFinite(jbounds[0])) {
                        lower = (ui[j] > 0 ? Math.max : Math.min)(lower, (jbounds[0] - p[j]) / ui[j]);
                    }

                    if (jbounds[1] !== undefined && isFinite(jbounds[1])) {
                        upper = (ui[j] > 0 ? Math.min : Math.max)(upper, (jbounds[1] - p[j]) / ui[j]);
                    }
                }
            }

            return [lower, upper];
        }
        : function () {
            return [-Infinity, Infinity];
        };

    // A function to evaluate:
    pj = [];
    fi = function (t) {
        for (var i = 0; i < n; i++) {
            pj[i] = p[i] + ui[i] * t;
        }

        return f(pj);
    };

    iter = 0;
    perr = 0;
    while (++iter < maxIter) {
        // Reinitialize the search vectors:
        if (iter % (n) === 0) {
        for (i = 0; i < n; i++) {
            u[i] = [];
            for (j = 0; j < n; j++) {
                u[i][j] = i === j ? 1 : 0;
            }
        }
        }
    
        // Store the starting point p0:
        for (j = 0, p0 = []; j < n; j++) {
            p0[j] = p[j];
        }
    
        // Minimize over each search direction u[i]:
        for (i = 0; i < n; i++) {
            ui = u[i];
        
            // Compute bounds based on starting point p in the
            // direction ui:
        
            tlimit = bound(p, ui);
        
            // Minimize using golden section method:
            dx = 0.1;
        
            tmin = minimize1d(fi, {
                lowerBound: tlimit[0],
                upperBound: tlimit[1],
                initialIncrement: dx,
                tolerance: dx * tol1d
            });
        
            if (tmin === 0) {
                return p;
            }
        
            // Update the solution vector:
            for (j = 0; j < n; j++) {
                p[j] += tmin * ui[j];
            }
        
            constrain(p);
        
            if (status) status.points.push(p.slice());
        }
    
        // Throw out the first search direction:
        u.shift();
    
        // Construct a new search direction:
        for (j = 0, un = [], sum = 0; j < n; j++) {
            un[j] = p[j] - p0[j];
            sum += un[j] * un[j];
        }
        // Normalize:
        sum = Math.sqrt(sum);
    
        if (sum > 0) {
            for (j = 0; j < n; j++) {
                un[j] /= sum;
            }
        } else {
            // Exactly nothing moved, so it it appears we've converged. In particular,
            // it's possible the solution is up against a boundary and simply can't
            // move farther.
            return p;
        }
    
        u.push(un);
        // One more minimization, this time along the new direction:
        ui = un;
    
        tlimit = bound(p, ui);
    
        dx = 0.1;
    
        tmin = minimize1d(fi, {
            lowerBound: tlimit[0],
            upperBound: tlimit[1],
            initialIncrement: dx,
            tolerance: dx * tol1d
        });
    
        if (tmin === 0) {
            return p;
        }
    
        err = 0;
        for (j = 0; j < n; j++) {
            du = tmin * ui[j];
            err += du * du;
            p[j] += du;
        }
    
        constrain(p);
    
        if (status) status.points.push(p.slice());
    
        err = Math.sqrt(err);
    
        if (verbose) console.log('Iteration ' + iter + ': ' + (err / perr) + ' f(' + p + ') = ' + f(p));
        // callback added by Jaywan Chung
        if (options.callback !== undefined) {
            options.callback(iter, (err/ perr));
        }
    
        if (err / perr < tol) {
            return p;
        }
    
        perr = err;
    }
    
    return p;
}