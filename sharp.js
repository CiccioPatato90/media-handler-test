const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class Sharp {
    constructor() {
        this.sharp = sharp;
    }

    async toWebP(inputPath, outputPath) {
        try {
            const data = await sharp(inputPath)
                .webp({ quality: 80 })
                .toBuffer();
            fs.writeFileSync(outputPath, data);
            // await this.sharp(inputPath)
            //     .toFormat('webp')
            //     .toFile(outputPath);
            // console.log(`Image converted to WebP successfully: ${outputPath}`);
            return outputPath;
        } catch (err) {
            console.log("Error converting image to WebP: ", err);
            throw err;
        }
    }

    async resizeImage(inputPath, width, height) {
        try {
            const outputPath = path.join(path.dirname(inputPath), `resized_${width}x${height}_${path.basename(inputPath)}`);

            await this.sharp(inputPath)
                .resize(width, height)
                .toFile(outputPath);

            console.log(`Image resized successfully: ${outputPath}`);
            return outputPath;
        } catch (err) {
            console.log("Error resizing image: ", err);
            throw err;
        }
    }
}

module.exports = Sharp;