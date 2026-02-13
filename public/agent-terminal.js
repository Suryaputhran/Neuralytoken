
const AGENTS = {
    ALLOCATOR: { name: "ALLOCATOR_AGENT", color: "#43ffa8" }, // Green
    RISK: { name: "RISK_ANALYSIS", color: "#ffa843" },      // Orange
    EXEC: { name: "EXECUTION_CORE", color: "#ff4343" },     // Red
    SYSTEM: { name: "SYSTEM", color: "#9b5cff" }            // Purple
};

const CONVERSATIONS = [
    [
        { agent: "ALLOCATOR", text: "Scanning market volatility... Detected arbitrage opportunity on BNB/USDT pair." },
        { agent: "RISK", text: "Analyzing liquidity depth. Slippage projected at 0.12%. Risk parameters: ACCEPTABLE." },
        { agent: "ALLOCATOR", text: "Requesting capital allocation: 50,000 USDT." },
        { agent: "EXEC", text: "Allocation approved. Executing trade via private RPC node..." },
        { agent: "SYSTEM", text: "Transaction Confirmed. Hash: 0x8a...4f2" },
        { agent: "EXEC", text: "Trade complete. Net profit: +1.4% (700 USDT). Returning capital to treasury." }
    ],
    [
        { agent: "ALLOCATOR", text: "Identifying GPU cluster underutilization in Asia-East region." },
        { agent: "RISK", text: " verifying operator uptime... 99.98% uptime confirmed." },
        { agent: "ALLOCATOR", text: "Rerouting 128 H100 units to Model Training Task #8821." },
        { agent: "EXEC", text: "Compute resources deployed. Revenue stream active." }
    ],
    [
        { agent: "SYSTEM", text: "Incoming governance proposal detected." },
        { agent: "RISK", text: "Scanning proposal for malicious payload... Scan complete. Safe." },
        { agent: "ALLOCATOR", text: "Analyzing impact on yield strategies..." },
        { agent: "ALLOCATOR", text: "Projected impact: Neutral." }
    ],
    [
        { agent: "ALLOCATOR", text: "Market sentiment shift detected. Bearish divergence on 4H timeframe." },
        { agent: "RISK", text: "Rebalancing required. Suggesting reduction in altcoin exposure." },
        { agent: "EXEC", text: "Executing delta-neutral hedge strategy." },
        { agent: "SYSTEM", text: "Hedge active. Portfolio beta reduced to 0.15." }
    ]
];

const TERMINAL_CONFIG = {
    typeSpeed: 30,
    lineDelay: 800,
    conversationDelay: 2000,
    maxLines: 12
};

let currentConversation = 0;
let currentLine = 0;
let terminalOutput;

function initTerminal() {
    terminalOutput = document.getElementById('terminal-output');
    if (!terminalOutput) return;

    // Start loop
    processNextLine();
}

function processNextLine() {
    // Get current message
    const conversation = CONVERSATIONS[currentConversation];
    const message = conversation[currentLine];
    const agentConfig = AGENTS[message.agent];

    // Create Line Element
    const p = document.createElement('div');
    p.className = 'term-line';
    p.innerHTML = `<span class="term-time">[${getCurrentTime()}]</span> <span style="color:${agentConfig.color}">${agentConfig.name}</span>: `;
    terminalOutput.appendChild(p);

    // Typing effect for the text
    typeText(p, message.text, 0, () => {
        // Line finished
        currentLine++;

        // Check if conversation finished
        if (currentLine >= conversation.length) {
            currentConversation = (currentConversation + 1) % CONVERSATIONS.length;
            currentLine = 0;
            setTimeout(processNextLine, TERMINAL_CONFIG.conversationDelay);
        } else {
            setTimeout(processNextLine, TERMINAL_CONFIG.lineDelay);
        }

        // Scroll to bottom
        terminalOutput.scrollTop = terminalOutput.scrollHeight;

        // Prune old lines
        while (terminalOutput.children.length > TERMINAL_CONFIG.maxLines) {
            terminalOutput.removeChild(terminalOutput.firstChild);
        }
    });
}

function typeText(element, text, index, callback) {
    if (index < text.length) {
        element.innerHTML += text.charAt(index);
        // Randomize speed slightly for realism
        const randomSpeed = TERMINAL_CONFIG.typeSpeed + (Math.random() * 20);
        setTimeout(() => typeText(element, text, index + 1, callback), randomSpeed);
    } else {
        callback();
    }
}

function getCurrentTime() {
    const now = new Date();
    return now.toISOString().split('T')[1].split('.')[0];
}

document.addEventListener('DOMContentLoaded', initTerminal);
