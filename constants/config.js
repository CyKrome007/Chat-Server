const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:4173',
        'http://192.168.1.7:5173/',
        'http://192.168.1.6:5173/',
        'http://192.168.1.5:5173/',
        process.env.CLIENT_URL
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
};

export {corsOptions};