function openProxy() {
    const url = "https://proxy-shield-git-main-coles-projects-14e9fffe.vercel.app/"; 

    if (url.includes("YOUR-APP-URL-HERE")) {
        alert("You need to set up the backend server first! Read the instructions.");
        return;
    }

    const win = window.open('about:blank', '_blank');
    if (!win) {
        alert("Pop-up blocked! Please allow pop-ups for this site.");
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Classes</title>
            <link rel="icon" href="https://ssl.gstatic.com/classroom/favicon.png">
            <style>
                body { margin: 0; padding: 0; height: 100vh; overflow: hidden; background-color: #000; }
                iframe { width: 100%; height: 100%; border: none; }
            </style>
        </head>
        <body>
            <iframe src="${url}" allowfullscreen></iframe>
        </body>
        </html>
    `;

    win.document.write(html);
    win.document.close();
}