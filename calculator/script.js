class Calculator {
    constructor() {
        this.previousElement = document.getElementById('previous');
        this.currentElement = document.getElementById('current');
        this.clear();
    }

    clear() {
        this.current = '0';
        this.previous = '';
        this.operation = undefined;
    }

    delete() {
        if (this.current === '0') return;
        this.current = this.current.slice(0, -1);
        if (this.current === '') this.current = '0';
    }

    appendNumber(number) {
        if (number === '.' && this.current.includes('.')) return;
        if (this.current === '0' && number !== '.') {
            this.current = number;
        } else {
            this.current += number;
        }
    }

    chooseOperation(operation) {
        if (this.current === '0') return;
        if (this.previous !== '') {
            this.compute();
        }
        this.operation = operation;
        this.previous = this.current;
        this.current = '0';
    }

    compute() {
        let computation;
        const prev = parseFloat(this.previous);
        const current = parseFloat(this.current);
        if (isNaN(prev) || isNaN(current)) return;

        switch (this.operation) {
            case '+':
                computation = prev + current;
                break;
            case '-':
                computation = prev - current;
                break;
            case '×':
                computation = prev * current;
                break;
            case '÷':
                if (current === 0) {
                    alert('不能除以0！');
                    return;
                }
                computation = prev / current;
                break;
            default:
                return;
        }

        this.current = computation.toString();
        this.operation = undefined;
        this.previous = '';
    }

    updateDisplay() {
        this.currentElement.textContent = this.current;
        if (this.operation != null) {
            this.previousElement.textContent = `${this.previous} ${this.operation}`;
        } else {
            this.previousElement.textContent = this.previous;
        }
    }
}

const calculator = new Calculator();

// Number buttons
document.querySelectorAll('.number').forEach(button => {
    button.addEventListener('click', () => {
        calculator.appendNumber(button.textContent);
        calculator.updateDisplay();
    });
});

// Operator buttons
document.querySelectorAll('.operator').forEach(button => {
    button.addEventListener('click', () => {
        calculator.chooseOperation(button.textContent);
        calculator.updateDisplay();
    });
});

// Equals button
document.querySelector('.equals').addEventListener('click', () => {
    calculator.compute();
    calculator.updateDisplay();
});

// Clear button
document.querySelector('.clear').addEventListener('click', () => {
    calculator.clear();
    calculator.updateDisplay();
});

// Delete button
document.querySelector('.delete').addEventListener('click', () => {
    calculator.delete();
    calculator.updateDisplay();
});
