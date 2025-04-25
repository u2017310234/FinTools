document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const productNav = document.querySelector('.product-nav');
    const scenarioNav = document.getElementById('scenario-nav');
    const scenarioNavTitle = document.getElementById('scenario-nav-title');
    const scenarioList = document.getElementById('scenario-list');
    const scenarioTitle = document.getElementById('scenario-title');
    const scenarioDescription = document.getElementById('scenario-description');
    const scenarioInteractiveArea = document.getElementById('scenario-interactive-area');
    const scenarioExplanation = document.getElementById('scenario-explanation');
    const scenarioChartContainer = document.getElementById('scenario-chart-container');
    const payoffChartCanvas = document.getElementById('payoffChart');
    const scoreDisplay = document.getElementById('score-display'); // Added

    // --- State ---
    let currentProduct = 'options'; // Default product
    let payoffChart = null;
    let userScore = 0; // Added
    let visitedScenarios = {}; // Added: Tracks { "product-scenarioId": true }
    let answeredQuizzes = {}; // Added: Tracks { "quizId": true }

    // --- Score Management ---
    const SCORE_KEY = 'financialSimScore';
    const VISITED_KEY = 'financialSimVisited';
    const ANSWERED_QUIZ_KEY = 'financialSimAnsweredQuizzes';
    const VISIT_POINTS = 1; // Points for visiting a scenario first time
    const QUIZ_CORRECT_POINTS = 5; // Points for answering a quiz correctly

    function loadProgress() {
        const storedScore = localStorage.getItem(SCORE_KEY);
        const storedVisited = localStorage.getItem(VISITED_KEY);
        const storedAnswered = localStorage.getItem(ANSWERED_QUIZ_KEY);
        userScore = storedScore ? parseInt(storedScore, 10) : 0;
        visitedScenarios = storedVisited ? JSON.parse(storedVisited) : {};
        answeredQuizzes = storedAnswered ? JSON.parse(storedAnswered) : {};
        updateScoreDisplay();
    }

    function saveProgress() {
        localStorage.setItem(SCORE_KEY, userScore.toString());
        localStorage.setItem(VISITED_KEY, JSON.stringify(visitedScenarios));
        localStorage.setItem(ANSWERED_QUIZ_KEY, JSON.stringify(answeredQuizzes));
    }

    function updateScoreDisplay() {
        scoreDisplay.textContent = `Score: ${userScore}`;
    }

    function addScore(points) {
        userScore += points;
        updateScoreDisplay();
        saveProgress();
    }

    function markScenarioVisited(product, scenarioId) {
        const key = `${product}-${scenarioId}`;
        if (!visitedScenarios[key]) {
            visitedScenarios[key] = true;
            addScore(VISIT_POINTS); // Award points only on first visit
            // console.log(`Visited ${key} for the first time. +${VISIT_POINTS} points.`);
        }
        // No need to save here, will be saved by addScore or later
    }

    function isScenarioVisited(product, scenarioId) {
        return visitedScenarios[`${product}-${scenarioId}`] === true;
    }

    function markQuizAnswered(quizId) {
        answeredQuizzes[quizId] = true;
        saveProgress(); // Save immediately after answering correctly
    }

    function isQuizAnswered(quizId) {
        return answeredQuizzes[quizId] === true;
    }

    // --- Scenario Data ---
    const productScenarios = {
        "options": {
            title: "Options Scenarios",
            scenarios: {
                "intro": {
                    title: "Introduction to Options",
                    description: "Learn the basics of call and put options.",
                    interactiveHTML: `...`, // Keep existing HTML
                    explanationHTML: `...`, // Keep existing HTML
                    setupFunction: null,
                    chartNeeded: false
                },
                "buyer-call-profit": {
                    title: "Buyer: Call Option Profit",
                    description: "Scenario: You believe Stock XYZ, currently at $100, will rise significantly soon. You buy a call option.",
                    interactiveHTML: `
                        <p><strong>Your Action:</strong> Buy 1 Call Option Contract (100 shares)</p>
                        <div><label>Strike Price ($):</label> <input type="number" id="sc_strike" value="105" readonly></div>
                        <div><label>Premium Paid per Share ($):</label> <input type="number" id="sc_premium" value="2" readonly></div>
                        <div><label>Initial Stock Price ($):</label> <input type="number" id="sc_initial_spot" value="100" readonly></div>
                        <hr>
                        <label for="sc_final_spot">Simulate Stock Price at Expiration ($):</label>
                        <input type="number" id="sc_final_spot" value="115" step="1">
                        <button id="sc_simulate_btn">Calculate Outcome</button>
                        <div id="sc_result" class="scenario-result" style="margin-top: 15px;"></div>
                    `,
                    explanationHTML: `
                        <h3>Explanation</h3>
                        <p>As a call buyer, you want the stock price to rise *above* the strike price plus the premium you paid (your break-even point).</p>
                        <ul>
                            <li><strong>Cost:</strong> Premium Paid = $2/share * 100 shares = $200.</li>
                            <li><strong>Break-even Price:</strong> Strike Price + Premium = $105 + $2 = $107.</li>
                            <li>If the final price is above $107, you make a profit.</li>
                            <li>If the final price is below $105 (the strike), the option expires worthless, and your loss is the premium paid ($200).</li>
                            <li>If the price is between $105 and $107, you exercise but still have a net loss less than the full premium.</li>
                        </ul>
                        <h3>Key Takeaways</h3>
                        <ul>
                            <li>Buying calls is a bullish strategy.</li>
                            <li>Maximum loss is limited to the premium paid.</li>
                            <li>Profit potential is theoretically unlimited.</li>
                        </ul>
                    `,
                    setupFunction: setupOptionsBuyerCallProfitScenario,
                    chartNeeded: true
                },
                "buyer-call-loss": {
                    title: "Buyer: Call Option Loss (Time Decay)",
                    description: "Scenario: You bought a call option hoping for a price rise, but the stock price stayed flat.",
                    interactiveHTML: `
                        <p><strong>Your Action:</strong> Bought 1 Call Option Contract (100 shares)</p>
                        <div><label>Strike Price ($):</label> <input type="number" id="sc_strike" value="50" readonly></div>
                        <div><label>Premium Paid per Share ($):</label> <input type="number" id="sc_premium" value="3" readonly></div>
                        <div><label>Initial Stock Price ($):</label> <input type="number" id="sc_initial_spot" value="49" readonly></div>
                        <hr>
                        <label for="sc_final_spot">Stock Price at Expiration ($):</label>
                        <input type="number" id="sc_final_spot" value="49" step="1" readonly> <!-- Price didn't move -->
                        <div id="sc_result" class="scenario-result" style="margin-top: 15px;"></div>
                        <p style="margin-top:10px;"><em>In this scenario, the price didn't move enough by expiration.</em></p>
                    `,
                    explanationHTML: `
                        <h3>Explanation</h3>
                        <p>Options have a limited lifespan... (Keep existing HTML)</p>
                        <h3>Key Takeaways</h3>
                        <ul>... (Keep existing HTML)</ul>
                    `,
                    setupFunction: setupOptionsBuyerCallLossScenario,
                    chartNeeded: true
                },
                "seller-put-margin": {
                    title: "Seller: Put Option Margin Call",
                    description: "Scenario: You sold a put option (expecting the price to stay stable or rise), but the stock price dropped sharply.",
                    interactiveHTML: `
                        <p><strong>Your Action:</strong> Sold 1 Put Option Contract (100 shares) - Naked</p>
                        <div><label>Strike Price ($):</label> <input type="number" id="sc_strike" value="90" readonly></div>
                        <div><label>Premium Received per Share ($):</label> <input type="number" id="sc_premium" value="4" readonly></div>
                        <div><label>Initial Stock Price ($):</label> <input type="number" id="sc_initial_spot" value="92" readonly></div>
                        <div><label>Initial Account Balance ($):</label> <input type="number" id="sc_balance" value="5000" readonly></div>
                        <hr>
                        <label for="sc_final_spot">Simulate Stock Price Drop ($):</label>
                        <input type="number" id="sc_final_spot" value="75" step="1">
                        <button id="sc_simulate_btn">Check Margin Status</button>
                        <div id="sc_result" class="scenario-result" style="margin-top: 15px;"></div>
                    `,
                    explanationHTML: `
                        <h3>Explanation</h3>
                        <p>Selling ('writing') put options means you are obligated to BUY... (Keep existing HTML)</p>
                        <h3>Key Takeaways</h3>
                        <ul>... (Keep existing HTML)</ul>
                    `,
                    setupFunction: setupOptionsSellerPutMarginScenario,
                    chartNeeded: true
                },
                "exchange-risk": { // This scenario is generic enough to potentially keep or adapt
                    title: "Exchange: Managing Risk (Options)",
                    description: "Scenario: A major market event causes extreme volatility in the options market.",
                    interactiveHTML: `...`, // Keep existing HTML
                    explanationHTML: `...`, // Keep existing HTML
                    setupFunction: setupExchangeRiskScenario,
                    chartNeeded: false
                }
            }
        },
        "futures": {
            title: "Futures Scenarios",
            scenarios: {
                "intro": {
                    title: "Introduction to Futures",
                    description: "Learn the basics of futures contracts.",
                    interactiveHTML: `
                        <p>A futures contract is a standardized legal agreement to buy or sell a particular commodity or financial instrument at a predetermined price at a specified time in the future.</p>
                        <p><strong>Key Differences from Options:</strong></p>
                        <ul>
                            <li><strong>Obligation vs. Right:</strong> Both buyer (long) and seller (short) are OBLIGATED to fulfill the contract. Options give the buyer the right, not the obligation.</li>
                            <li><strong>Premium:</strong> No premium is paid upfront. Instead, both parties post margin.</li>
                            <li><strong>Standardization:</strong> Contracts are highly standardized regarding quantity, quality, delivery time, and location.</li>
                            <li><strong>Marking-to-Market:</strong> Profits and losses are typically settled daily based on price changes.</li>
                        </ul>
                        <p><strong>Key Terms:</strong></p>
                        <ul>
                            <li><strong>Long Position:</strong> Agreement to BUY the underlying asset at the specified future date. Profits if price goes UP.</li>
                            <li><strong>Short Position:</strong> Agreement to SELL the underlying asset at the specified future date. Profits if price goes DOWN.</li>
                            <li><strong>Contract Size:</strong> The specified quantity of the underlying asset (e.g., 1,000 barrels of oil, $100,000 face value of T-Bonds).</li>
                            <li><strong>Initial Margin:</strong> The deposit required to open a position.</li>
                            <li><strong>Maintenance Margin:</strong> The minimum equity required in the account. If equity drops below this, a margin call occurs.</li>
                        </ul>
                    `,
                    explanationHTML: `
                        <h3>Key Takeaways</h3>
                        <ul>
                            <li>Futures involve an OBLIGATION for both buyer and seller.</li>
                            <li>Leverage is high due to margin system, amplifying both gains and losses.</li>
                            <li>Daily settlement (marking-to-market) means cash flows in/out of the account frequently.</li>
                            <li>Used for hedging (reducing price risk) and speculation.</li>
                        </ul>
                    `,
                    setupFunction: null,
                    chartNeeded: false
                },
                "long-profit-loss": {
                    title: "Long Futures: Profit & Loss",
                    description: "Scenario: You buy (go long) a Crude Oil futures contract expecting prices to rise.",
                    interactiveHTML: `
                        <p><strong>Your Action:</strong> Buy 1 Crude Oil Futures Contract</p>
                        <div><label>Entry Price ($ per barrel):</label> <input type="number" id="sc_entry_price" value="70" readonly></div>
                        <div><label>Contract Size (barrels):</label> <input type="number" id="sc_contract_size" value="1000" readonly></div>
                        <div><label>Initial Margin Posted ($):</label> <input type="number" id="sc_initial_margin" value="5000" readonly></div>
                        <hr>
                        <label for="sc_current_price">Simulate Current Market Price ($ per barrel):</label>
                        <input type="number" id="sc_current_price" value="75" step="0.5">
                        <button id="sc_simulate_btn">Calculate P&L</button>
                        <div id="sc_result" class="scenario-result" style="margin-top: 15px;"></div>
                    `,
                    explanationHTML: `
                        <h3>Explanation</h3>
                        <p>As the holder of a long futures position, you profit if the market price rises above your entry price and lose if it falls below.</p>
                        <ul>
                            <li><strong>Profit/Loss per Barrel:</strong> Current Price - Entry Price</li>
                            <li><strong>Total Profit/Loss:</strong> (Current Price - Entry Price) * Contract Size</li>
                            <li>The P&L is realized daily through marking-to-market, affecting your account balance.</li>
                        </ul>
                        <h3>Key Takeaways</h3>
                        <ul>
                            <li>Long futures positions benefit from rising prices.</li>
                            <li>Losses can be substantial and exceed initial margin if prices fall significantly.</li>
                            <li>Leverage magnifies gains and losses.</li>
                        </ul>
                    `,
                        setupFunction: setupFuturesLongProfitLossScenario,
                        chartNeeded: true, // Linear payoff chart
                        quiz: { // Added Quiz
                            id: "futures-long-profit-1",
                            question: "If you are LONG a futures contract, how do you profit?",
                            options: [
                                "The price of the underlying asset goes down.",
                                "The price of the underlying asset goes up.",
                                "The price stays exactly the same.",
                                "Volatility increases."
                            ],
                            correctIndex: 1
                        }
                    },
                    "short-profit-loss": {
                    title: "Short Futures: Profit & Loss",
                    description: "Scenario: You sell (go short) a Corn futures contract expecting prices to fall.",
                    interactiveHTML: `
                        <p><strong>Your Action:</strong> Sell 1 Corn Futures Contract</p>
                        <div><label>Entry Price ($ per bushel):</label> <input type="number" id="sc_entry_price" value="4.50" readonly step="0.01"></div>
                        <div><label>Contract Size (bushels):</label> <input type="number" id="sc_contract_size" value="5000" readonly></div>
                        <div><label>Initial Margin Posted ($):</label> <input type="number" id="sc_initial_margin" value="2000" readonly></div>
                        <hr>
                        <label for="sc_current_price">Simulate Current Market Price ($ per bushel):</label>
                        <input type="number" id="sc_current_price" value="4.20" step="0.05">
                        <button id="sc_simulate_btn">Calculate P&L</button>
                        <div id="sc_result" class="scenario-result" style="margin-top: 15px;"></div>
                    `,
                    explanationHTML: `
                        <h3>Explanation</h3>
                        <p>As the holder of a short futures position, you profit if the market price falls below your entry price and lose if it rises above.</p>
                        <ul>
                            <li><strong>Profit/Loss per Bushel:</strong> Entry Price - Current Price</li>
                            <li><strong>Total Profit/Loss:</strong> (Entry Price - Current Price) * Contract Size</li>
                            <li>The P&L affects your account balance daily.</li>
                        </ul>
                        <h3>Key Takeaways</h3>
                        <ul>
                            <li>Short futures positions benefit from falling prices.</li>
                            <li>Losses can be substantial and exceed initial margin if prices rise significantly.</li>
                            <li>Used by producers (like farmers) to hedge against falling prices for their crops.</li>
                        </ul>
                    `,
                    setupFunction: setupFuturesShortProfitLossScenario,
                    chartNeeded: true // Linear payoff chart
                },
                 "margin-call": {
                    title: "Futures: Margin Call",
                    description: "Scenario: You are long an E-mini S&P 500 futures contract, and the market drops sharply.",
                    interactiveHTML: `
                        <p><strong>Your Position:</strong> Long 1 E-mini S&P 500 Futures Contract</p>
                        <div><label>Entry Price (Index Points):</label> <input type="number" id="sc_entry_price" value="4500" readonly></div>
                        <div><label>Contract Multiplier ($ per point):</label> <input type="number" id="sc_multiplier" value="50" readonly></div>
                        <div><label>Initial Margin ($):</label> <input type="number" id="sc_initial_margin" value="12000" readonly></div>
                        <div><label>Maintenance Margin ($):</label> <input type="number" id="sc_maint_margin" value="10800" readonly></div>
                         <div><label>Account Balance (before drop):</label> <input type="number" id="sc_balance" value="13000" readonly></div>
                        <hr>
                        <label for="sc_current_price">Simulate Market Price Drop (Index Points):</label>
                        <input type="number" id="sc_current_price" value="4450" step="5">
                        <button id="sc_simulate_btn">Check Margin Status</button>
                        <div id="sc_result" class="scenario-result" style="margin-top: 15px;"></div>
                    `,
                    explanationHTML: `
                        <h3>Explanation</h3>
                        <p>Futures accounts are marked-to-market daily. If losses reduce your account equity below the 'Maintenance Margin' level, your broker issues a 'Margin Call'.</p>
                        <ul>
                            <li><strong>Loss Calculation:</strong> (Entry Price - Current Price) * Multiplier</li>
                            <li><strong>Account Equity:</strong> Initial Balance + Unrealized P&L</li>
                            <li>If Account Equity < Maintenance Margin, a margin call is triggered.</li>
                            <li><strong>Margin Call Action:</strong> You must deposit funds to bring the balance back up to the *Initial Margin* level, or the broker may liquidate your position.</li>
                        </ul>
                        <h3>Key Takeaways</h3>
                        <ul>
                            <li>Margin calls are a critical risk in futures trading due to leverage.</li>
                            <li>Failure to meet a margin call results in forced liquidation, often at unfavorable prices.</li>
                            <li>Understanding initial and maintenance margin levels is essential.</li>
                        </ul>
                    `,
                    setupFunction: setupFuturesMarginCallScenario,
                    chartNeeded: false // Chart less relevant here than the margin calculation
                },
            }
        }
        // Add more products like "swaps", "forwards" here...
    };

    // --- Chart Logic ---
    function initializeChart() {
        if (payoffChart) payoffChart.destroy();
        const ctx = payoffChartCanvas.getContext('2d');
        payoffChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Payoff', data: [], borderColor: 'rgb(75, 192, 192)', tension: 0.1, fill: false }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Underlying Price' } }, // Generic axis label
                    y: { title: { display: true, text: 'Profit/Loss ($)' }, ticks: { callback: (value) => '$' + value } }
                },
                plugins: {
                    tooltip: { callbacks: { label: (context) => `${context.dataset.label || ''}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y)}` } },
                    legend: { display: false } // Hide legend for single line payoff
                 }
            }
        });
    }

    // Updated to handle both Options and Futures payoffs
    function calculatePayoffData(product, params) {
        const dataPoints = 50;
        let labels = [];
        let data = [];
        let strikePrice, premium, quantity, entryPrice, contractSize, multiplier, perspective, optionType, positionType;

        // Determine price range based on entry/strike
        let centerPrice = 0;
        if (product === 'options') {
            strikePrice = params.strikePrice;
            premium = params.premium;
            quantity = params.quantity || 1;
            perspective = params.perspective;
            optionType = params.optionType;
            centerPrice = strikePrice;
        } else if (product === 'futures') {
            entryPrice = params.entryPrice;
            contractSize = params.contractSize || 1; // Default if not provided
            multiplier = params.multiplier || 1; // Default for non-financial futures
            positionType = params.positionType; // 'long' or 'short'
            centerPrice = entryPrice;
        } else {
            return { labels, data }; // Unknown product
        }

         if (isNaN(centerPrice) || centerPrice <= 0) centerPrice = 100; // Default if invalid

        const priceRangeFactor = 0.3; // +/- 30% for futures/options
        const minPrice = Math.max(0, centerPrice * (1 - priceRangeFactor));
        const maxPrice = centerPrice * (1 + priceRangeFactor);
        const priceStep = (maxPrice - minPrice) / (dataPoints - 1);

        for (let i = 0; i < dataPoints; i++) {
            const currentPrice = minPrice + i * priceStep;
            labels.push(currentPrice.toFixed(2));
            let pnl = 0;

            if (product === 'options') {
                let intrinsicValue = (optionType === 'call') ? Math.max(0, currentPrice - strikePrice) : Math.max(0, strikePrice - currentPrice);
                pnl = (perspective === 'buyer') ? (intrinsicValue - premium) * quantity * 100 : (premium - intrinsicValue) * quantity * 100; // Assuming 100 multiplier for options
            } else if (product === 'futures') {
                if (positionType === 'long') {
                    pnl = (currentPrice - entryPrice) * contractSize * multiplier;
                } else { // short
                    pnl = (entryPrice - currentPrice) * contractSize * multiplier;
                }
            }
            data.push(pnl);
        }
        return { labels, data };
    }

    // Updated to accept product and params object
    function updateChart(product, params) {
        const scenario = productScenarios[product]?.scenarios[params.scenarioId];
        if (!payoffChart || !scenario || !scenario.chartNeeded || !scenarioChartContainer.style.display || scenarioChartContainer.style.display === 'none') return;

        // Adjust axis label based on product if needed (optional)
        payoffChart.options.scales.x.title.text = product === 'futures' ? 'Market Price at Settlement' : 'Spot Price at Expiration ($)';

        const { labels, data } = calculatePayoffData(product, params);

        if (labels.length === 0) {
            payoffChart.data.labels = [];
            payoffChart.data.datasets[0].data = [];
        } else {
            payoffChart.data.labels = labels;
            payoffChart.data.datasets[0].data = data;
            payoffChart.data.datasets[0].label = product === 'futures' ? `${params.positionType.charAt(0).toUpperCase() + params.positionType.slice(1)} Futures Payoff` : `${params.perspective.charAt(0).toUpperCase() + params.perspective.slice(1)} ${params.optionType.charAt(0).toUpperCase() + params.optionType.slice(1)} Payoff`;
        }
        payoffChart.update();
    }

    // --- Scenario Loading and Management ---
    function populateScenarioList(product) {
        const productData = productScenarios[product];
        if (!productData) return;

        scenarioNavTitle.textContent = productData.title;
        scenarioList.innerHTML = ''; // Clear existing list

        Object.keys(productData.scenarios).forEach(scenarioId => {
            const scenario = productData.scenarios[scenarioId];
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.setAttribute('data-scenario-id', scenarioId);
            a.textContent = scenario.title;
            li.appendChild(a);
            scenarioList.appendChild(li);
        });
    }

    function loadScenario(product, scenarioId) {
        const scenario = productScenarios[product]?.scenarios[scenarioId];
        if (!scenario) {
            // Default to intro scenario if specific one not found or on product switch
            scenarioId = 'intro';
            scenario = productScenarios[product]?.scenarios[scenarioId];
            if (!scenario) { // Handle case where even intro doesn't exist
                 scenarioTitle.textContent = "No Scenarios Available";
                 scenarioDescription.textContent = `No scenarios found for product: ${product}`;
                 scenarioInteractiveArea.innerHTML = "";
                 scenarioExplanation.innerHTML = "";
                 scenarioChartContainer.style.display = 'none';
                 return;
            }
        }

        // Update content
        scenarioTitle.textContent = scenario.title;
        scenarioDescription.textContent = scenario.description;
        scenarioInteractiveArea.innerHTML = scenario.interactiveHTML;
        scenarioExplanation.innerHTML = scenario.explanationHTML;

        // Update navigation highlight
        document.querySelectorAll('#scenario-list a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-scenario-id') === scenarioId) {
                link.classList.add('active');
            }
        });

        // Show/hide chart
        if (scenario.chartNeeded) {
            scenarioChartContainer.style.display = 'block';
            initializeChart(); // Re-initialize chart
        } else {
            scenarioChartContainer.style.display = 'none';
            if (payoffChart) {
                payoffChart.destroy();
                payoffChart = null;
             }
        }

        // Mark scenario as visited (awards points on first visit)
        markScenarioVisited(product, scenarioId);

        // Append Quiz if available and not answered
        if (scenario.quiz && !isQuizAnswered(scenario.quiz.id)) {
            const quizContainer = document.createElement('div');
            quizContainer.classList.add('scenario-quiz');
            quizContainer.id = `quiz-${scenario.quiz.id}`; // Unique ID for the quiz container

            let optionsHTML = scenario.quiz.options.map((option, index) =>
                `<button data-index="${index}">${option}</button>`
            ).join('');

            quizContainer.innerHTML = `
                <h4>Knowledge Check</h4>
                <p>${scenario.quiz.question}</p>
                <div class="quiz-options">${optionsHTML}</div>
                <div class="quiz-feedback" id="feedback-${scenario.quiz.id}"></div>
            `;
            scenarioExplanation.appendChild(quizContainer); // Append quiz after explanation
            setupQuiz(scenario.quiz); // Attach listeners
        } else if (scenario.quiz && isQuizAnswered(scenario.quiz.id)) {
             // Optionally show a message that the quiz was already completed
             const completedMsg = document.createElement('p');
             completedMsg.innerHTML = `<em>Quiz already completed. +${QUIZ_CORRECT_POINTS} points earned previously.</em>`;
             completedMsg.style.marginTop = '20px';
             scenarioExplanation.appendChild(completedMsg);
        }

        // Run scenario-specific setup function
        if (scenario.setupFunction) {
            scenario.setupFunction(scenarioId); // Pass scenarioId for context if needed
        } else {
             // Draw default chart if needed and no setup function provided
             if(scenario.chartNeeded) {
                 // Attempt to gather params for default chart draw
                 let params = { scenarioId: scenarioId };
                 if (product === 'options') {
                     const strikeEl = document.getElementById('sc_strike');
                     const premiumEl = document.getElementById('sc_premium');
                     params.strikePrice = strikeEl ? parseFloat(strikeEl.value) : NaN;
                     params.premium = premiumEl ? parseFloat(premiumEl.value) : NaN;
                     params.perspective = scenarioId.includes('buyer') ? 'buyer' : 'seller';
                     params.optionType = scenarioId.includes('call') ? 'call' : 'put';
                     params.quantity = 1;
                 } else if (product === 'futures') {
                      const entryEl = document.getElementById('sc_entry_price');
                      const sizeEl = document.getElementById('sc_contract_size');
                      const multEl = document.getElementById('sc_multiplier');
                      params.entryPrice = entryEl ? parseFloat(entryEl.value) : NaN;
                      params.contractSize = sizeEl ? parseFloat(sizeEl.value) : 1;
                      params.multiplier = multEl ? parseFloat(multEl.value) : 1;
                      params.positionType = scenarioId.includes('long') ? 'long' : 'short';
                 }
                 updateChart(product, params);
             }
        }
    }

    // --- Scenario Specific Setup Functions ---

    // OPTIONS
    function setupOptionsBuyerCallProfitScenario(scenarioId) {
        const strikeEl = document.getElementById('sc_strike');
        const premiumEl = document.getElementById('sc_premium');
        const finalSpotEl = document.getElementById('sc_final_spot');
        const simulateBtn = document.getElementById('sc_simulate_btn');
        const resultDiv = document.getElementById('sc_result');

        const calculateOutcome = () => {
            const strike = parseFloat(strikeEl.value);
            const premium = parseFloat(premiumEl.value);
            const finalSpot = parseFloat(finalSpotEl.value);
            const quantity = 1;

            if (isNaN(strike) || isNaN(premium) || isNaN(finalSpot)) {
                resultDiv.innerHTML = "<p>Please enter valid numbers.</p>"; return;
            }

            const cost = premium * quantity * 100;
            const intrinsicValue = Math.max(0, finalSpot - strike);
            const grossProfit = intrinsicValue * quantity * 100;
            const netProfit = grossProfit - cost;

            resultDiv.innerHTML = `
                <p>Total Premium Paid: <span>$${cost.toFixed(2)}</span></p>
                <p>Value at Expiration (Intrinsic): <span>$${grossProfit.toFixed(2)}</span></p>
                <p><strong>Net Profit / Loss:</strong> <span style="color: ${netProfit >= 0 ? 'green' : 'red'};">$${netProfit.toFixed(2)}</span></p>
            `;
            updateChart('options', { scenarioId, strikePrice: strike, premium, quantity, perspective: 'buyer', optionType: 'call' });
        };
        simulateBtn.addEventListener('click', calculateOutcome);
        finalSpotEl.addEventListener('input', calculateOutcome);
        calculateOutcome();
    }

    function setupOptionsBuyerCallLossScenario(scenarioId) {
        const strikeEl = document.getElementById('sc_strike');
        const premiumEl = document.getElementById('sc_premium');
        const finalSpotEl = document.getElementById('sc_final_spot');
        const resultDiv = document.getElementById('sc_result');

        const calculateOutcome = () => {
            const strike = parseFloat(strikeEl.value);
            const premium = parseFloat(premiumEl.value);
            const finalSpot = parseFloat(finalSpotEl.value);
            const quantity = 1;
            const cost = premium * quantity * 100;
            const intrinsicValue = Math.max(0, finalSpot - strike);
            const grossProfit = intrinsicValue * quantity * 100;
            const netProfit = grossProfit - cost;

            resultDiv.innerHTML = `
                 <p>Total Premium Paid: <span>$${cost.toFixed(2)}</span></p>
                 <p>Value at Expiration (Intrinsic): <span>$${grossProfit.toFixed(2)}</span></p>
                 <p><strong>Net Profit / Loss:</strong> <span style="color: red;">$${netProfit.toFixed(2)}</span></p>
             `;
            updateChart('options', { scenarioId, strikePrice: strike, premium, quantity, perspective: 'buyer', optionType: 'call' });
        };
        calculateOutcome();
    }

    function setupOptionsSellerPutMarginScenario(scenarioId) {
        const strikeEl = document.getElementById('sc_strike');
        const premiumEl = document.getElementById('sc_premium');
        const balanceEl = document.getElementById('sc_balance');
        const finalSpotEl = document.getElementById('sc_final_spot');
        const simulateBtn = document.getElementById('sc_simulate_btn');
        const resultDiv = document.getElementById('sc_result');

        const checkMargin = () => {
            const strike = parseFloat(strikeEl.value);
            const premium = parseFloat(premiumEl.value);
            const initialBalance = parseFloat(balanceEl.value);
            const finalSpot = parseFloat(finalSpotEl.value);
            const quantity = 1;

            if (isNaN(strike) || isNaN(premium) || isNaN(initialBalance) || isNaN(finalSpot)) {
                resultDiv.innerHTML = "<p>Please enter valid numbers.</p>"; return;
            }

            const premiumReceived = premium * quantity * 100;
            const intrinsicValue = Math.max(0, strike - finalSpot);
            const currentPNL = (premium - intrinsicValue) * quantity * 100;

            const otmAmount = Math.max(0, finalSpot - strike) * quantity * 100;
            let marginReq = (0.20 * strike * quantity * 100) - otmAmount + premiumReceived;
            marginReq = Math.max(marginReq, (0.10 * strike * quantity * 100) + premiumReceived);
            const currentEquity = initialBalance + premiumReceived + currentPNL;

            let marginStatus = "OK"; let statusColor = "green";
            if (currentEquity < marginReq) {
                marginStatus = `MARGIN CALL! Need $${(marginReq - currentEquity).toFixed(2)}`; statusColor = "red";
            } else if (currentEquity < marginReq * 1.25) {
                marginStatus = "Warning: Margin Close"; statusColor = "orange";
            }

            resultDiv.innerHTML = `
                <p>Premium Received: <span>$${premiumReceived.toFixed(2)}</span></p>
                <p>Current Unrealized P&L: <span style="color: ${currentPNL >= 0 ? 'green' : 'red'};">$${currentPNL.toFixed(2)}</span></p>
                <p>Estimated Margin Required: <span>$${marginReq.toFixed(2)}</span></p>
                <p>Current Account Equity: <span>$${currentEquity.toFixed(2)}</span></p>
                <p><strong>Margin Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${marginStatus}</span></p>
            `;
            updateChart('options', { scenarioId, strikePrice: strike, premium, quantity, perspective: 'seller', optionType: 'put' });
        };
        simulateBtn.addEventListener('click', checkMargin);
        finalSpotEl.addEventListener('input', checkMargin);
        checkMargin();
    }

    // FUTURES
     function setupFuturesLongProfitLossScenario(scenarioId) {
        const entryPriceEl = document.getElementById('sc_entry_price');
        const contractSizeEl = document.getElementById('sc_contract_size');
        const currentPriceEl = document.getElementById('sc_current_price');
        const simulateBtn = document.getElementById('sc_simulate_btn');
        const resultDiv = document.getElementById('sc_result');

        const calculateOutcome = () => {
            const entryPrice = parseFloat(entryPriceEl.value);
            const contractSize = parseFloat(contractSizeEl.value);
            const currentPrice = parseFloat(currentPriceEl.value);
            const multiplier = 1; // Assuming 1 for commodity futures like oil

            if (isNaN(entryPrice) || isNaN(contractSize) || isNaN(currentPrice)) {
                resultDiv.innerHTML = "<p>Please enter valid numbers.</p>"; return;
            }

            const pnl = (currentPrice - entryPrice) * contractSize * multiplier;

            resultDiv.innerHTML = `
                <p>Price Change per Unit: <span>$${(currentPrice - entryPrice).toFixed(2)}</span></p>
                <p><strong>Total Profit / Loss:</strong> <span style="color: ${pnl >= 0 ? 'green' : 'red'};">$${pnl.toFixed(2)}</span></p>
            `;
            updateChart('futures', { scenarioId, entryPrice, contractSize, multiplier, positionType: 'long' });
        };
        simulateBtn.addEventListener('click', calculateOutcome);
        currentPriceEl.addEventListener('input', calculateOutcome);
        calculateOutcome();
    }

     function setupFuturesShortProfitLossScenario(scenarioId) {
        const entryPriceEl = document.getElementById('sc_entry_price');
        const contractSizeEl = document.getElementById('sc_contract_size');
        const currentPriceEl = document.getElementById('sc_current_price');
        const simulateBtn = document.getElementById('sc_simulate_btn');
        const resultDiv = document.getElementById('sc_result');

        const calculateOutcome = () => {
            const entryPrice = parseFloat(entryPriceEl.value);
            const contractSize = parseFloat(contractSizeEl.value);
            const currentPrice = parseFloat(currentPriceEl.value);
             const multiplier = 1; // Assuming 1 for commodity futures like corn

            if (isNaN(entryPrice) || isNaN(contractSize) || isNaN(currentPrice)) {
                resultDiv.innerHTML = "<p>Please enter valid numbers.</p>"; return;
            }

            const pnl = (entryPrice - currentPrice) * contractSize * multiplier;

            resultDiv.innerHTML = `
                <p>Price Change per Unit: <span>$${(entryPrice - currentPrice).toFixed(2)}</span></p>
                <p><strong>Total Profit / Loss:</strong> <span style="color: ${pnl >= 0 ? 'green' : 'red'};">$${pnl.toFixed(2)}</span></p>
            `;
             updateChart('futures', { scenarioId, entryPrice, contractSize, multiplier, positionType: 'short' });
        };
        simulateBtn.addEventListener('click', calculateOutcome);
        currentPriceEl.addEventListener('input', calculateOutcome);
        calculateOutcome();
    }

     function setupFuturesMarginCallScenario(scenarioId) {
        const entryPriceEl = document.getElementById('sc_entry_price');
        const multiplierEl = document.getElementById('sc_multiplier');
        const initialMarginEl = document.getElementById('sc_initial_margin');
        const maintMarginEl = document.getElementById('sc_maint_margin');
        const balanceEl = document.getElementById('sc_balance');
        const currentPriceEl = document.getElementById('sc_current_price');
        const simulateBtn = document.getElementById('sc_simulate_btn');
        const resultDiv = document.getElementById('sc_result');

        const checkMargin = () => {
            const entryPrice = parseFloat(entryPriceEl.value);
            const multiplier = parseFloat(multiplierEl.value);
            const initialMargin = parseFloat(initialMarginEl.value);
            const maintMargin = parseFloat(maintMarginEl.value);
            const initialBalance = parseFloat(balanceEl.value); // This is balance *after* initial margin is posted
            const currentPrice = parseFloat(currentPriceEl.value);
            const contractSize = 1; // Futures P&L often uses multiplier directly

             if (isNaN(entryPrice) || isNaN(multiplier) || isNaN(initialMargin) || isNaN(maintMargin) || isNaN(initialBalance) || isNaN(currentPrice)) {
                 resultDiv.innerHTML = "<p>Please enter valid numbers.</p>"; return;
             }

            // Calculate P&L (Long position assumed here)
            const pnl = (currentPrice - entryPrice) * multiplier * contractSize;

            // Current Equity = Starting Balance + P&L
            // Note: A more realistic sim would track daily settlements, but this shows the concept.
            // Let's assume initialBalance is the equity *before* the current day's PNL.
            const currentEquity = initialBalance + pnl;

            let marginStatus = "OK";
            let statusColor = "green";
            let callAmount = 0;

            if (currentEquity < maintMargin) {
                marginStatus = "MARGIN CALL!";
                statusColor = "red";
                // Call amount needed to bring back to INITIAL margin
                callAmount = initialMargin - currentEquity;
            }

            resultDiv.innerHTML = `
                <p>Unrealized P&L: <span style="color: ${pnl >= 0 ? 'green' : 'red'};">$${pnl.toFixed(2)}</span></p>
                <p>Current Account Equity: <span>$${currentEquity.toFixed(2)}</span></p>
                <p>Maintenance Margin Level: <span>$${maintMargin.toFixed(2)}</span></p>
                <p><strong>Margin Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${marginStatus}</span></p>
                ${callAmount > 0 ? `<p style="color: red;">Deposit Required: <span>$${callAmount.toFixed(2)}</span></p>` : ''}
            `;
             // No chart needed for this specific margin call scenario focus
        };

        simulateBtn.addEventListener('click', checkMargin);
        currentPriceEl.addEventListener('input', checkMargin);
        checkMargin();
    }

    // GENERIC
    function setupExchangeRiskScenario(scenarioId) { // Reused function name
         const simulateBtn = document.getElementById('sc_simulate_volatility');
         const resultDiv = document.getElementById('sc_result');
         if (!simulateBtn || !resultDiv) return; // Element might not exist if HTML changed

         simulateBtn.addEventListener('click', () => {
             resultDiv.innerHTML += `
                 <p style="color: red; font-weight: bold;">High Volatility Detected!</p>
                 <ul>
                     <li>Exchange increases margin requirements across the board.</li>
                     <li>Brokers issue margin calls to clients.</li>
                     <li>Trading may be temporarily halted if limits are breached.</li>
                 </ul>
                 <p><em>This demonstrates the exchange's role in preventing systemic risk.</em></p>
             `;
             simulateBtn.disabled = true;
         });
     }

    // --- Quiz Handling ---
    function setupQuiz(quiz) {
        const quizContainer = document.getElementById(`quiz-${quiz.id}`);
        if (!quizContainer) return;

        const optionsContainer = quizContainer.querySelector('.quiz-options');
        const feedbackDiv = quizContainer.querySelector('.quiz-feedback');
        const optionButtons = optionsContainer.querySelectorAll('button');

        optionsContainer.addEventListener('click', (event) => {
            if (event.target.tagName !== 'BUTTON' || event.target.disabled) {
                return; // Ignore clicks not on enabled buttons
            }

            const selectedButton = event.target;
            const selectedIndex = parseInt(selectedButton.getAttribute('data-index'), 10);
            const isCorrect = selectedIndex === quiz.correctIndex;

            // Disable all buttons after selection
            optionButtons.forEach(button => {
                button.disabled = true;
            });

            // Provide feedback
            if (isCorrect) {
                selectedButton.classList.add('correct');
                feedbackDiv.textContent = `Correct! +${QUIZ_CORRECT_POINTS} points`;
                feedbackDiv.className = 'quiz-feedback correct'; // Use class for styling
                addScore(QUIZ_CORRECT_POINTS);
                markQuizAnswered(quiz.id);
            } else {
                selectedButton.classList.add('incorrect');
                // Highlight the correct answer as well
                if (optionButtons[quiz.correctIndex]) {
                     optionButtons[quiz.correctIndex].classList.add('correct');
                }
                feedbackDiv.textContent = `Incorrect. The correct answer is highlighted.`;
                feedbackDiv.className = 'quiz-feedback incorrect'; // Use class for styling
                // Mark as answered even if incorrect, so it doesn't reappear, but don't award points
                markQuizAnswered(quiz.id);
            }
        });
    }

    // --- Event Listeners ---
    // Product Tab Switching
    productNav.addEventListener('click', (event) => {
        if (event.target.classList.contains('product-tab') && !event.target.classList.contains('active')) {
            // Remove active class from previously active tab
            productNav.querySelector('.product-tab.active').classList.remove('active');
            // Add active class to clicked tab
            event.target.classList.add('active');
            // Update current product
            currentProduct = event.target.getAttribute('data-product');
            // Repopulate scenario list and load default scenario for the new product
            populateScenarioList(currentProduct);
            loadScenario(currentProduct, 'intro'); // Load intro scenario of the new product
        }
    });

    // Scenario Navigation
    scenarioNav.addEventListener('click', (event) => {
        if (event.target.tagName === 'A' && event.target.hasAttribute('data-scenario-id')) {
            event.preventDefault();
            const scenarioId = event.target.getAttribute('data-scenario-id');
            loadScenario(currentProduct, scenarioId);
        }
    });

    // --- Initial Load ---
    loadProgress(); // Load score and progress first
    populateScenarioList(currentProduct); // Populate list for the default product ('options')
    loadScenario(currentProduct, "intro"); // Load the default intro scenario

});
