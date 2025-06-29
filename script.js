// --- New logic for running total and full expression ---
let expression = '';
let lastInputType = '';
let justCalculated = false;

function updateDisplay() {
    // Show the full expression above, formatted with commas
    document.getElementById('calculation').textContent = formatExpression(expression) || '';

    // Evaluate the expression for the result
    const resultEl = document.getElementById('result');
    let result = '';
    if (expression) {
        try {
            result = evaluateExpression(expression);
        } catch (e) {
            result = 'Error';
        }
    }
    // Show nothing (just caret) if empty, otherwise show result
    if (result === '' && !expression) {
        resultEl.textContent = '';
    } else {
        resultEl.textContent = result;
    }

    // Caret logic
    if (!expression && !justCalculated) {
        resultEl.classList.add('result-caret');
    } else {
        resultEl.classList.remove('result-caret');
    }
}

function addNumber(num) {
    if (justCalculated) {
        expression = '';
        justCalculated = false;
    }
    // If last input was a number or decimal, append; if operator, add space
    if (lastInputType === 'number' || lastInputType === 'decimal') {
        expression += num;
    } else {
        expression += (expression && /[0-9]$/.test(expression) ? '' : '') + num;
    }
    lastInputType = 'number';
    updateDisplay();
}

function addOperator(op) {
    // If just calculated, continue with result
    if (justCalculated) {
        // Get the last result from the result field
        let lastResult = document.getElementById('result').textContent.replace(/,/g, '');
        expression = lastResult + op;
        justCalculated = false;
        lastInputType = 'operator';
        updateDisplay();
        return;
    }
    if (!expression || /[+\-×÷]$/.test(expression)) {
        // Prevent two operators in a row or starting with operator
        return;
    }
    expression += op;
    lastInputType = 'operator';
    updateDisplay();
}

function addDecimal() {
    if (justCalculated) {
        expression = '';
        justCalculated = false;
    }
    // Prevent multiple decimals in a number
    let parts = expression.split(/[+\-×÷]/);
    let last = parts[parts.length - 1];
    if (last.includes('.')) return;
    if (!last) {
        expression += '0.';
    } else {
        expression += '.';
    }
    lastInputType = 'decimal';
    updateDisplay();
}

function deleteLast() {
    if (expression.length > 0) {
        expression = expression.slice(0, -1);
    }
    updateDisplay();
}

function clearAll() {
    expression = '';
    justCalculated = false;
    updateDisplay();
}

function toggleSign() {
    // Toggle sign of the last number in the expression
    let parts = expression.split(/([+\-×÷])/);
    for (let i = parts.length - 1; i >= 0; i--) {
        if (/^\d*\.?\d+$/.test(parts[i])) {
            if (parts[i].startsWith('-')) {
                parts[i] = parts[i].substring(1);
            } else {
                parts[i] = '-' + parts[i];
            }
            break;
        }
    }
    expression = parts.join('');
    updateDisplay();
}

function calculate() {
    if (!expression) return;
    try {
        let result = evaluateExpression(expression);
        justCalculated = true;
        // Clear the calculation field above
        document.getElementById('calculation').textContent = '';
        // Show the result only in the result section
        document.getElementById('result').textContent = result;
    } catch (e) {
        justCalculated = false;
        document.getElementById('result').textContent = 'Error';
    }
}

function addPercentage() {
    if (justCalculated) {
        expression = '';
        justCalculated = false;
    }
    // Add % to the current number if there is one
    if (expression && /[0-9]$/.test(expression)) {
        expression += '%';
        lastInputType = 'percentage';
        updateDisplay();
    }
}

// Evaluate the expression string safely
function evaluateExpression(expr) {
    // Replace custom operators with JS ones
    let safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
    
    // Handle percentage - convert to decimal (divide by 100)
    // This regex ensures that % is treated as a separate operator
    safeExpr = safeExpr.replace(/(\d+\.?\d*)%/g, function(match, num) {
        return '(' + num + '/100)';
    });
    
    // Remove trailing operator
    safeExpr = safeExpr.replace(/[+\-*/]$/, '');
    
    // Add implicit multiplication where needed (e.g., (0.04)100 becomes (0.04)*100)
    safeExpr = safeExpr.replace(/\)(\d)/g, ')*$1');
    safeExpr = safeExpr.replace(/(\d)\(/g, '$1*(');
    
    let result = Function('return ' + safeExpr)();
    // Format result
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return formatResult(result);
    } else {
        throw new Error('Invalid calculation');
    }
}

function formatResult(result) {
    if (Math.abs(result) < 0.000001 && result !== 0) {
        return result.toExponential(6);
    }
    if (Math.abs(result) > 999999999999) {
        return result.toExponential(6);
    }
    let rounded = Math.round(result * 100000000) / 100000000;
    let str = rounded.toString();
    if (str.includes('.')) {
        // Format integer and decimal part separately
        let [intPart, decPart] = str.split('.');
        intPart = addCommas(intPart);
        decPart = decPart.replace(/0+$/, ''); // remove trailing zeros
        if (decPart.length > 0) {
            return intPart + '.' + decPart;
        } else {
            return intPart;
        }
    } else {
        return addCommas(str);
    }
}

// Format numbers in the live input/expression with commas
function formatExpression(expr) {
    // Split by operators, format numbers, then join back
    return expr.replace(/(\d+\.?\d*)(?![+\-×÷%])/g, function(match) {
        if (match === '.') return match;
        if (match.endsWith('.')) return addCommas(match.slice(0, -1)) + '.';
        if (match.startsWith('.')) return '0.' + match.slice(1);
        return addCommas(match);
    }).replace(/(\d+\.?\d*)%/g, function(match, num) {
        // Format the number part of percentages with commas
        if (num === '.') return match;
        if (num.endsWith('.')) return addCommas(num.slice(0, -1)) + '.%';
        if (num.startsWith('.')) return '0.' + num.slice(1) + '%';
        return addCommas(num) + '%';
    });
}

// Helper to add commas to integer part
function addCommas(numStr) {
    if (numStr === '' || isNaN(numStr)) return numStr;
    let [intPart, decPart] = numStr.split('.');
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? intPart + '.' + decPart : intPart;
}

// Initialize display
updateDisplay();

// Keyboard support
document.addEventListener('keydown', function(event) {
    const key = event.key;
    if (key >= '0' && key <= '9') {
        addNumber(key);
    } else if (key === '+') {
        addOperator('+');
    } else if (key === '-') {
        addOperator('-');
    } else if (key === '*') {
        addOperator('×');
    } else if (key === '/') {
        event.preventDefault();
        addOperator('÷');
    } else if (key === '%') {
        addPercentage();
    } else if (key === '.') {
        addDecimal();
    } else if (key === 'Enter' || key === '=') {
        calculate();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearAll();
    } else if (key === 'Backspace') {
        deleteLast();
    }
});

// Modal logic for privacy policy and user agreement
function openModal(type) {
    document.getElementById(type + '-modal').style.display = 'flex';
}

function closeModal(type) {
    document.getElementById(type + '-modal').style.display = 'none';
} 