let isLoading = false;



async function uploadPDF() {

    const fileInput =
        document.getElementById("pdfFile");

    const status =
        document.getElementById("uploadStatus");

    if (!fileInput.files.length) {

        status.textContent =
            "Please select a PDF.";

        status.className = "error-status";

        return;
    }

    const file =
        fileInput.files[0];

    if (
        !file.name
            .toLowerCase()
            .endsWith(".pdf")
    ) {

        status.textContent =
            "Only PDF files are supported.";

        status.className = "error-status";

        return;
    }

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    status.textContent =
        "Uploading and indexing document...";

    status.className =
        "loading-status";


    try {

        const response =
            await fetch(
                "/api/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Upload failed"
            );

        }


        const chunks =
            data.data?.chunks || 0;


        status.innerHTML =
            `
            <span class="success-icon">✓</span>
            Document indexed successfully
            <span class="chunk-count">
                ${chunks} chunks
            </span>
            `;

        status.className =
            "success-status";


    }

    catch (error) {

        status.textContent =
            "Error: " + error.message;

        status.className =
            "error-status";

    }

}


/* =========================================
   SEND QUESTION
========================================= */

async function sendQuestion(text = null) {

    if (isLoading) {
        return;
    }


    const input =
        document.getElementById("question");


    const question =
        text ||
        input.value.trim();


    if (!question) {
        return;
    }


    isLoading = true;


    addMessage(
        question,
        "user"
    );


    input.value = "";


    const loadingId =
        showTyping();


    try {

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        question: question
                    })
                }
            );


        const data =
            await response.json();


        removeTyping(
            loadingId
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Chat failed"
            );

        }


        addMessage(
            data.answer ||
            "I couldn't generate an answer.",
            "bot"
        );

    }

    catch (error) {

        removeTyping(
            loadingId
        );


        addMessage(
            `Sorry, something went wrong.

${error.message}`,
            "bot"
        );

    }

    finally {

        isLoading = false;

        input.focus();

    }

}


/* =========================================
   ADD MESSAGE
========================================= */

function addMessage(
    text,
    type
) {

    const chatBox =
        document.getElementById("chatBox");


    const row =
        document.createElement("div");


    row.className =
        `message-row ${type}`;


    /* BOT AVATAR */

    if (type === "bot") {

        const avatar =
            document.createElement("div");

        avatar.className =
            "avatar";

        avatar.innerHTML =
            "✦";

        row.appendChild(
            avatar
        );

    }


    /* MESSAGE */

    const message =
        document.createElement("div");


    message.className =
        `message ${type}`;


    if (type === "bot") {

        message.innerHTML =
            formatAIResponse(text);

    }

    else {

        message.textContent =
            text;

    }


    row.appendChild(
        message
    );


    chatBox.appendChild(
        row
    );


    scrollToBottom();

}


/* =========================================
   AI RESPONSE FORMATTER
========================================= */

function formatAIResponse(text) {

    if (!text) {
        return "";
    }


    /*
     * Escape HTML first.
     * This prevents the AI response from
     * inserting unwanted HTML.
     */

    let html =
        escapeHTML(text);


    /*
     * TABLES
     */

    html =
        convertMarkdownTables(html);


    /*
     * HEADINGS
     */

    html =
        html.replace(
            /^### (.+)$/gm,
            '<h3>$1</h3>'
        );


    html =
        html.replace(
            /^## (.+)$/gm,
            '<h2>$1</h2>'
        );


    html =
        html.replace(
            /^# (.+)$/gm,
            '<h2>$1</h2>'
        );


    /*
     * BOLD
     */

    html =
        html.replace(
            /\*\*(.*?)\*\*/g,
            '<strong>$1</strong>'
        );


    /*
     * ITALIC
     */

    html =
        html.replace(
            /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
            '<em>$1</em>'
        );


    /*
     * BULLET LISTS
     */

    html =
        convertBulletLists(html);


    /*
     * NUMBERED LISTS
     */

    html =
        convertNumberedLists(html);


    /*
     * INLINE CODE
     */

    html =
        html.replace(
            /`([^`]+)`/g,
            '<code>$1</code>'
        );


    /*
     * Horizontal line
     */

    html =
        html.replace(
            /^---$/gm,
            '<hr>'
        );


    /*
     * Paragraph spacing
     */

    html =
        convertParagraphs(html);


    /*
     * Remaining line breaks
     */

    html =
        html.replace(
            /\n/g,
            "<br>"
        );


    /*
     * Remove <br> directly around block elements
     */

    html =
        html.replace(
            /<br>\s*(<\/?(?:h2|h3|ul|ol|table|hr))/g,
            "$1"
        );


    html =
        html.replace(
            /(<\/(?:h2|h3|ul|ol|table|hr)>)\s*<br>/g,
            "$1"
        );


    return html;
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


/* =========================================
   MARKDOWN TABLE
========================================= */

function convertMarkdownTables(html) {

    const lines =
        html.split("\n");


    let output = [];

    let i = 0;


    while (i < lines.length) {

        const line =
            lines[i].trim();


        /*
         * Detect table header
         */

        if (
            line.includes("|") &&
            i + 1 < lines.length &&
            lines[i + 1]
                .trim()
                .match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/)
        ) {

            const headers =
                parseTableRow(line);


            i += 2;


            let rows = [];


            while (
                i < lines.length &&
                lines[i].trim().includes("|") &&
                lines[i].trim() !== ""
            ) {

                rows.push(
                    parseTableRow(
                        lines[i]
                    )
                );

                i++;

            }


            let table =
                `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                `;


            headers.forEach(
                header => {

                    table +=
                        `<th>${header}</th>`;

                }
            );


            table +=
                `
                            </tr>
                        </thead>
                        <tbody>
                `;


            rows.forEach(
                row => {

                    table +=
                        "<tr>";


                    headers.forEach(
                        (_, index) => {

                            table +=
                                `<td>${row[index] || ""}</td>`;

                        }
                    );


                    table +=
                        "</tr>";

                }
            );


            table +=
                `
                        </tbody>
                    </table>
                </div>
                `;


            output.push(
                table
            );


            continue;

        }


        output.push(
            line
        );


        i++;

    }


    return output.join("\n");
}


/* =========================================
   PARSE TABLE ROW
========================================= */

function parseTableRow(line) {

    return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map(
            cell => cell.trim()
        );

}


/* =========================================
   BULLET LIST
========================================= */

function convertBulletLists(html) {

    const lines =
        html.split("\n");


    let result = [];

    let inList = false;


    lines.forEach(
        line => {

            const match =
                line.match(
                    /^\s*[-*]\s+(.+)$/
                );


            if (match) {

                if (!inList) {

                    result.push(
                        '<ul class="answer-list">'
                    );

                    inList = true;

                }


                result.push(
                    `<li>${match[1]}</li>`
                );

            }

            else {

                if (inList) {

                    result.push(
                        "</ul>"
                    );

                    inList = false;

                }


                result.push(
                    line
                );

            }

        }
    );


    if (inList) {

        result.push(
            "</ul>"
        );

    }


    return result.join("\n");
}


/* =========================================
   NUMBERED LIST
========================================= */

function convertNumberedLists(html) {

    const lines =
        html.split("\n");


    let result = [];

    let inList = false;


    lines.forEach(
        line => {

            const match =
                line.match(
                    /^\s*\d+\.\s+(.+)$/
                );


            if (match) {

                if (!inList) {

                    result.push(
                        '<ol class="answer-list">'
                    );

                    inList = true;

                }


                result.push(
                    `<li>${match[1]}</li>`
                );

            }

            else {

                if (inList) {

                    result.push(
                        "</ol>"
                    );

                    inList = false;

                }


                result.push(
                    line
                );

            }

        }
    );


    if (inList) {

        result.push(
            "</ol>"
        );

    }


    return result.join("\n");
}


/* =========================================
   PARAGRAPHS
========================================= */

function convertParagraphs(html) {

    const blocks =
        html.split(/\n\s*\n/);


    return blocks
        .map(
            block => {

                block =
                    block.trim();


                if (!block) {
                    return "";
                }


                if (
                    block.startsWith("<h") ||
                    block.startsWith("<ul") ||
                    block.startsWith("<ol") ||
                    block.startsWith("<table") ||
                    block.startsWith("<div") ||
                    block.startsWith("<hr")
                ) {

                    return block;

                }


                return `<p>${block}</p>`;

            }
        )
        .join("\n");
}


/* =========================================
   TYPING INDICATOR
========================================= */

function showTyping() {

    const chatBox =
        document.getElementById("chatBox");


    const id =
        `typing-${Date.now()}`;


    const row =
        document.createElement("div");


    row.id =
        id;


    row.className =
        "message-row bot";


    row.innerHTML =
        `
        <div class="avatar">✦</div>

        <div class="message bot typing-message">

            <div class="typing">

                <span></span>
                <span></span>
                <span></span>

            </div>

        </div>
        `;


    chatBox.appendChild(
        row
    );


    scrollToBottom();


    return id;
}


/* =========================================
   REMOVE TYPING
========================================= */

function removeTyping(id) {

    const element =
        document.getElementById(id);


    if (element) {

        element.remove();

    }

}


/* =========================================
   ENTER KEY
========================================= */

function handleKey(event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendQuestion();

    }

}


/* =========================================
   SUGGESTION
========================================= */

function askSuggestion(button) {

    const text =
        button.innerText.trim();


    sendQuestion(
        text
    );

}


/* =========================================
   NEW CHAT
========================================= */

function newChat() {

    const chatBox =
        document.getElementById("chatBox");


    chatBox.innerHTML =
        `
        <div class="welcome">

            <div class="welcome-icon">
                ✦
            </div>

            <span class="welcome-label">
                INTELLIGENT SUPPORT
            </span>

            <h3>
                How can I help<br>
                <span>you today?</span>
            </h3>

            <p>
                Ask me anything about your products,
                policies, services or uploaded documents.
            </p>

            <div class="suggestions">

                <button onclick="askSuggestion(this)">
                    <span>📦</span>
                    What is your return policy?
                </button>

                <button onclick="askSuggestion(this)">
                    <span>💳</span>
                    How can I get a refund?
                </button>

                <button onclick="askSuggestion(this)">
                    <span>🚚</span>
                    How long does delivery take?
                </button>

                <button onclick="askSuggestion(this)">
                    <span>🔐</span>
                    How can I contact support?
                </button>

            </div>

        </div>
        `;

}


/* =========================================
   SCROLL
========================================= */

function scrollToBottom() {

    const chatBox =
        document.getElementById("chatBox");


    requestAnimationFrame(
        () => {

            chatBox.scrollTo({
                top:
                    chatBox.scrollHeight,

                behavior:
                    "smooth"
            });

        }
    );

}