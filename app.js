
const http = require("http");

const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || "local";

const server = http.createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        return res.end(JSON.stringify({
            status: "healthy",
            version: VERSION
        }));
    }

    res.writeHead(200, {
        "Content-Type": "text/html"
    });

    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Jenkins CI/CD Demo</title>
        </head>
        <body style="font-family:Arial;text-align:center;margin-top:80px">
            <h1>Jenkins CI/CD Deployment Successful</h1>
            <h2>Version: ${VERSION}</h2>
            <p>Docker deployment is running.</p>
            <a href="/health">Check Health</a>
        </body>
        </html>
    `);
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Version ${VERSION} running on port ${PORT}`);
});
