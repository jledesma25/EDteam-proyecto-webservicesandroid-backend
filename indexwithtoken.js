//npm install jsonwebtoken

const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const jwt = require('jsonwebtoken');

const secretKey = 'your_secret_key'; // Change to a strong key
const dbFilePath = path.join(__dirname, 'db.json');

// Read and write functions for the JSON file
const readData = () => {
    const data = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(data);
};

const writeData = (data) => {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
};

// Helper to send responses
const sendResponse = (res, statusCode, success, message, data = null) => {
    const response = { success, message, data };
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
};

// JWT authentication middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, secretKey, (err, user) => {
            if (err) {
                return sendResponse(res, 403, false, 'Forbidden, invalid token'); // Invalid token
            }
            req.user = user; // Attach user info from token
            next();
        });
    } else {
        sendResponse(res, 401, false, 'Unauthorized, token missing'); // No token provided
    }
};

// Create a server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const { pathname, query } = parsedUrl;

    // Token generation (login simulation)
    if (req.method === 'POST' && pathname === '/login') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const { username, password } = JSON.parse(body);
            
            // This is just a basic example. Replace with your actual authentication logic
            if (username === 'admin' && password === 'password') {
                const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
                sendResponse(res, 200, true, 'Login successful', { token });
            } else {
                sendResponse(res, 401, false, 'Invalid credentials');
            }
        });

    // Protected route for getting developers, requires JWT
    } else if (req.method === 'GET' && pathname === '/developer') {
        authenticateJWT(req, res, () => {
            try {
                const items = readData();
                sendResponse(res, 200, true, 'Developers retrieved successfully', items);
            } catch (error) {
                sendResponse(res, 500, false, 'Failed to retrieve developers');
            }
        });

    // Other protected routes (GET, POST, PUT, DELETE)
    } else if (req.method === 'GET' && pathname.startsWith('/developer/')) {
        const id = parseInt(pathname.split('/')[2], 10);
        authenticateJWT(req, res, () => {
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
        });

    } else if (req.method === 'POST' && pathname === '/developer') {
        authenticateJWT(req, res, () => {
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
        });

    } else if (req.method === 'PUT' && pathname === '/developer') {
        authenticateJWT(req, res, () => {
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
        });

    } else if (req.method === 'DELETE' && pathname.startsWith('/developer/')) {
        const id = parseInt(pathname.split('/')[2], 10);
        authenticateJWT(req, res, () => {
            try {
                let items = readData();
                const index = items.findIndex(item => item.id === id);
                if (index !== -1) {
                    items.splice(index, 1); // Remove developer
                    writeData(items);
                    sendResponse(res, 200, true, `Developer has been deleted successfully`);
                } else {
                    sendResponse(res, 404, false, 'Developer not found');
                }
            } catch (error) {
                sendResponse(res, 500, false, 'Failed to delete developer');
            }
        });
    } else {
        sendResponse(res, 404, false, 'Not Found');
    }
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
