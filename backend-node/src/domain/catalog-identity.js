"use strict";
const { v5: uuid5 } = require("uuid");
const NAMESPACE = "541788ee-fbf0-4d85-9d33-e593b82f303c";
const importedProductId = (key) => uuid5(`product:${key}`, NAMESPACE);
module.exports = { NAMESPACE, importedProductId };
