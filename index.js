const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const dbFilePath = path.join(__dirname, 'db.json');

const readData = () => {
    const data = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(data);
};

const writeData = (data) => {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
};

const sendResponse = (res, statusCode, success, message, data = null) => {
    const response = { success, message, data };
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const { pathname, query } = parsedUrl;

    if (req.method === 'GET' && pathname === '/developer') {
        try {
            const items = readData();
            sendResponse(res, 200, true, 'Developers retrieved successfully', items);
        } catch (error) {
            sendResponse(res, 500, false, 'Failed to retrieve developers');
        }

    } else if (req.method === 'GET' && pathname.startsWith('/developer/')) {
        const id = parseInt(pathname.split('/')[2], 10);
        try {
            const items = readData();
            const item = items.find(item => item.id === id);
            if (item) {
                sendResponse(res, 200, true, 'Developer retrieved successfully', item);
            } else {
                sendResponse(res, 404, false, 'Developer not found');
            }
        } catch (error) {
            sendResponse(res, 500, false, 'Failed to retrieve developer');
        }

    } else if (req.method === 'POST' && pathname === '/developer') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const newItem = JSON.parse(body);
                let items = readData();
                const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
                newItem.id = newId;
                items.push(newItem);
                writeData(items);
                sendResponse(res, 201, true, 'Developer added successfully', newItem);
            } catch (error) {
                sendResponse(res, 400, false, 'Invalid JSON data');
            }
        });

    } else if (req.method === 'PUT' && pathname === '/developer') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const updatedItem = JSON.parse(body);
                if (!updatedItem.id) {
                    sendResponse(res, 400, false, 'ID is required');
                    return;
                }
                let items = readData();
                const index = items.findIndex(item => item.id === updatedItem.id);
                if (index !== -1) {
                    items[index] = { ...updatedItem }; // Preserve ID
                    writeData(items);
                    sendResponse(res, 200, true, 'Developer updated successfully', updatedItem);
                } else {
                    sendResponse(res, 404, false, 'Developer not found');
                }
            } catch (error) {
                sendResponse(res, 400, false, 'Invalid JSON data');
            }
        });

    } /*else if (req.method === 'DELETE' && pathname === '/developer') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { id } = JSON.parse(body);
                if (!id) {
                    sendResponse(res, 400, false, 'ID is required');
                    return;
                }
                let items = readData();
                const filteredItems = items.filter(item => item.id !== id);
                if (filteredItems.length < items.length) {
                    writeData(filteredItems);
                    sendResponse(res, 204, true, 'Developer deleted successfully');
                } else {
                    sendResponse(res, 404, false, 'Developer not found');
                }
            } catch (error) {
                sendResponse(res, 400, false, 'Invalid JSON data');
            }
        });*/
        else if (req.method === 'DELETE' && pathname.startsWith('/developer/')) {
            const id = parseInt(pathname.split('/')[2], 10);
            try {
                let items = readData();
                const index = items.findIndex(item => item.id === id);
                if (index !== -1) {
                    const deletedItem = items.splice(index, 1)[0]; // Eliminar y obtener el elemento eliminado
                    writeData(items);
                    sendResponse(res, 200, true, `Developer has been deleted successfully`);
                } else {
                    sendResponse(res, 404, false, 'Developer not found');
                }
            } catch (error) {
                sendResponse(res, 500, false, 'Failed to delete developer');
            }

    } else {
        sendResponse(res, 404, false, 'Not Found');
    }
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
