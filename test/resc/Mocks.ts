
import { Utils } from "../../lib/helper";

export const Mocks = {

    mockDocumentCookie() {
        return Utils.presentElseImport(typeof document,
            () => document,
            () => ({
                _cookie: "",
                get cookie() { return this._cookie; },
                set cookie(v: string) {
                    if (v.includes("Expires") && v.includes("Thu, 01 Jan 1970 00:00:01 GMT")) {
                        const key = v.split("=")[0];
                        const keyIndex = this._cookie.indexOf(";" + key);
                        let pathEndIndex = this._cookie.indexOf("Path", keyIndex + 1);
                        pathEndIndex = Math.max(this._cookie.indexOf(";", pathEndIndex + 2), this._cookie.length);
                        this._cookie = this._cookie.substring(0, keyIndex) + this._cookie.substring(pathEndIndex);
                        return;
                    }
                    this._cookie += ";" + v;
                }
            }));
    },

}
