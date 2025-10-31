
const fs = require("fs");

fs.readFile("./dist/helper/shadows/browser_classes.js", (err, data) => {
    if (!err && data) {
        fs.writeFileSync("./dist/helper/shadows/classes.js", data);
        fs.writeFileSync("./dist/helper/shadows/node_classes.js", data);
    }
});
fs.readFile("./dist/types/Compression.js", 'utf8', (err, data) => {
    if (!err && data) {
        fs.writeFileSync("./dist/types/Compression.js", data.replace('__importDefault(require("zlib"))', 'undefined'));
    }
});
