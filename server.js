const express = require('express');
const MediaService = require('./MediaService');
const Sharp = require('./sharp');
const app = express();
const PORT = process.env.PORT || 3000;

const supportedExtensions = {
    'image': ['jpg', 'jpeg', 'png'],
    'document': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'],
}
// const supportedEntities = {
//     'association': ['thumbnail', 'documents'],
//     'user': ['thumbnail', 'images'],
//     'project': ['thumbnail', 'documents', 'images', 'updates'],
// }

// const entityTypes = ["association", "user", "request"]
// const entitySubtype = ["cover", "posts", "association", "inventory", "project"]
// const category = ["cover, posts, docs, images, updates"]
// const categorySubType = []

// const rootNodes = ["association", "user", "request"]
// const nodes = ["posts", "association", "inventory", "project", "updates"]
// const leafs = ["images", "docs", "cover"]


function getFileType(inputFile) {
    const extension = inputFile.name.split('.').pop();
    console.log(extension);
    for (const [key, value] of Object.entries(supportedExtensions)) {
        if (value.includes(extension)) {
            return key;
        }
    }
    return null;
}


const idBuilder = {
    // Association entities
    "associationCover": (associationId) => `association-cover-${associationId}`,
    "associationPostsImages": (postId) => `association-posts-images-${postId}`,

    // User entities
    "userCover": (userId) => `user-cover-${userId}`,

    // Request entities
    "requestAssociationCover": (associationRequestId) => `request/association/cover/${associationRequestId}`,
    "requestAssociationDocs": (associationRequestId) => `request/association/docs/${associationRequestId}`,
    "requestInventoryDocs": (inventoryRequestId) => `request-inventory-docs-${inventoryRequestId}`,
    "requestProjectCover": (projectRequestId) => `request/project/cover/${projectRequestId}`,
    "requestProjectDocs": (projectRequestId) => `request/project/docs/${projectRequestId}`,
    "requestProjectImages": (projectRequestId) => `request/project/images/${projectRequestId}`,
    "requestProjectUpdateImages": (projectUpdateId) => `request/project/update/images/${projectUpdateId}`,
    "requestProjectUpdateDocs": (projectUpdateId) => `request/project/update/docs/${projectUpdateId}`,
    "userCover": (userId) => `user-cover-${userId}`,
    "userImages": (userId) => `user-images-${userId}`,
}
// endpoint definition
// upload (one or many)
// download (one or many)
// list
// delete (one or many)

// Middleware
app.use(express.json());

// Upload endpoint
app.get('/upload', async (req, res) => {
    try {
        // suppose we get a file here.
        // first thing we need to do is to check whether it's a doc or an image
        let inputFile = {
            id: '123',
            name: 'test.jpg',
            size: 10000,
            operation: 'requestAssociationCover'
        }

        const fileType = getFileType(inputFile);
        console.log("fileType: ", fileType);
        if (!fileType) {
            return res.status(400).json({ error: 'Unsupported file type' });
        }
        switch (fileType) {
            case 'image':
                // start with image processing
                // 1. determine the id of the image
                const id = idBuilder[`${inputFile.operation}`](inputFile.id);
                console.log("opeartion: ", inputFile.operation);
                console.log("id: ", id);
                // 2. convert to webp
                break;
            case 'document':
                // start with document processing
                break;
        }

    } catch (error) {
        res.status(500).json({ error: 'Failed to resize image', details: error.message });
    }
});

// Download endpoint
app.get('/download', (req, res) => {
    res.json({ message: 'Download endpoint - not implemented yet' });
});

// List endpoint
app.get('/list', (req, res) => {
    res.json({ message: 'List endpoint - not implemented yet' });
});

// Delete endpoint
app.get('/delete', (req, res) => {
    res.json({ message: 'Delete endpoint - not implemented yet' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});



// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

module.exports = app;
