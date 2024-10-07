//npm install jsonwebtoken

const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const jwt = require('jsonwebtoken'); // Importa jsonwebtoken

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

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        sendResponse(res, 401, false, 'Unauthorized - Missing token');
        return;
    }
    // Verificar y decodificar el token
    jwt.verify(token, 'your_secret_key', (err, decoded) => {
        if (err) {
            sendResponse(res, 403, false, 'Forbidden - Invalid token');
            return;
        }
        // Si el token es válido, continuar con la siguiente middleware o ruta
        req.user = decoded; // Adjuntar información del usuario al objeto de solicitud
        next();
    });
};

const generateToken = (email, password) => {
    // Mock user database or authentication logic
    const users = [
        { id: 1, email: 'jledesma2509@gmail.com', password: '123' }
    ];

    // Example authentication logic (simplified)
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return null; // Invalid credentials
    }

    // Generate JWT token with user information
    const token = jwt.sign({ userId: user.id, email: user.email }, 'your_secret_key', { expiresIn: '1h' });
    return token;
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const { pathname } = parsedUrl;

    if (req.method === 'POST' && pathname === '/login') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { email, password } = JSON.parse(body);
                const token = generateToken(email, password);
                if (token) {
                    sendResponse(res, 200, true, 'Login successful', { token });
                } else {
                    sendResponse(res, 401, false, 'Invalid credentials');
                }
            } catch (error) {
                sendResponse(res, 400, false, 'Invalid JSON data');
            }
        });

    } else if (req.method === 'GET' && pathname === '/items') {
        // Aplicar autenticación para la ruta GET /items
        authenticateToken(req, res, () => {
            try {
                const items = readData();
                sendResponse(res, 200, true, 'Items retrieved successfully', items);
            } catch (error) {
                sendResponse(res, 500, false, 'Failed to retrieve items');
            }
        });

    } else if (req.method === 'POST' && pathname === '/items') {
        // Aplicar autenticación para la ruta POST /items
        authenticateToken(req, res, () => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const newItem = JSON.parse(body);
                    let items = readData();
                    newItem.id = items.length + 1; // Assuming IDs are incremental
                    items.push(newItem);
                    writeData(items);
                    sendResponse(res, 201, true, 'Item added successfully', newItem);
                } catch (error) {
                    sendResponse(res, 400, false, 'Invalid JSON data');
                }
            });
        });

    } else if (req.method === 'PUT' && pathname.startsWith('/items/')) {
        // Aplicar autenticación para la ruta PUT /items/:id
        authenticateToken(req, res, () => {
            const id = parseInt(pathname.split('/')[2], 10);
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const updatedItem = JSON.parse(body);
                    let items = readData();
                    const index = items.findIndex(item => item.id === id);
                    if (index !== -1) {
                        items[index] = { ...updatedItem, id }; // Preserve ID
                        writeData(items);
                        sendResponse(res, 200, true, 'Item updated successfully', updatedItem);
                    } else {
                        sendResponse(res, 404, false, 'Item not found');
                    }
                } catch (error) {
                    sendResponse(res, 400, false, 'Invalid JSON data');
                }
            });
        });

    } else if (req.method === 'DELETE' && pathname.startsWith('/items/')) {
        // Aplicar autenticación para la ruta DELETE /items/:id
        authenticateToken(req, res, () => {
            const id = parseInt(pathname.split('/')[2], 10);
            try {
                let items = readData();
                const filteredItems = items.filter(item => item.id !== id);
                if (filteredItems.length < items.length) {
                    writeData(filteredItems);
                    sendResponse(res, 204, true, 'Item deleted successfully');
                } else {
                    sendResponse(res, 404, false, 'Item not found');
                }
            } catch (error) {
                sendResponse(res, 500, false, 'Failed to delete item');
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
