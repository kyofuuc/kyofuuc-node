import { Defaults } from "../Defaults";
import { KyofuucEnvironment } from "../Utils";

if (Defaults.ENVIRONMENT === KyofuucEnvironment.NODE) {
    module.exports = require("./node_classes"); 
} else if (Defaults.ENVIRONMENT === KyofuucEnvironment.BROWSER) {
    module.exports = require("./browser_classes"); 
}

export default module.exports;
