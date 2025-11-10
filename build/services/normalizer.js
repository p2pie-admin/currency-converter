"use strict";
// костыль против матрешки из data , attributes
Object.defineProperty(exports, "__esModule", { value: true });
const normalize = (data) => {
    const isObject = (data) => Object.prototype.toString.call(data) === "[object Object]";
    const isArray = (data) => Object.prototype.toString.call(data) === "[object Array]";
    const flatten = (data) => {
        if (!data.attributes)
            return data;
        return Object.assign({ id: data.id }, data.attributes);
    };
    if (isArray(data)) {
        return data.map((item) => normalize(item));
    }
    if (isObject(data)) {
        if (isArray(data.data)) {
            data = [...data.data];
        }
        else if (isObject(data.data)) {
            data = flatten(Object.assign({}, data.data));
        }
        else if (data.data === null) {
            data = null;
        }
        else {
            data = flatten(data);
        }
        for (const key in data) {
            data[key] = normalize(data[key]);
        }
        return data;
    }
    return data;
};
exports.default = normalize;
