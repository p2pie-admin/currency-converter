"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeRates = exports.matchRates = exports.filterValidRates = exports.isValidRate = exports.roundAmount = void 0;
const roundAmount = (amount, rude = false) => {
    // в логарифм нули не вставляем
    const factor = rude ? 1 : 3;
    // if (amount > 99)
    //   return (
    //     +(amount / 10 ** String(amount).length).toFixed(1) *
    //     10 ** String(amount).length
    //   );
    if (!amount || typeof amount !== "number")
        return 0;
    if (amount > 100 && rude)
        return +(+(amount / 10 ** amount.toFixed(0).length).toFixed(2) *
            10 ** amount.toFixed(0).length).toFixed(0);
    // нахожу минимальный значимый порядок числа
    // это такое число, в которое нужно возвести десятку, чтобы получить тысячную долю amount
    const orderOfMagnitude = -Math.floor(Math.log10(amount / 10 ** factor));
    //  округляем только часть после точки до порядка равного orderOfMagnitude
    return +amount.toFixed(orderOfMagnitude < 0 ? 0 : orderOfMagnitude);
};
exports.roundAmount = roundAmount;
const isValidRate = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
exports.isValidRate = isValidRate;
const filterValidRates = (rates) => Object.entries(rates).reduce((res, [code, rate]) => {
    if ((0, exports.isValidRate)(rate)) {
        res[code] = rate;
    }
    return res;
}, {});
exports.filterValidRates = filterValidRates;
const matchRates = (aToEuro, bToEuro) => {
    const aEntries = Object.entries(aToEuro).filter(([, rate]) => (0, exports.isValidRate)(rate));
    const bEntries = Object.entries(bToEuro).filter(([, rate]) => (0, exports.isValidRate)(rate));
    return aEntries.reduce((rates, [aCode, aRate]) => {
        const fiatRatesForOneCrypto = bEntries.reduce((dirs, [bCode, bRate]) => {
            const dirKey1 = `${aCode.toUpperCase()}_${bCode.toUpperCase()}`;
            const dirKey2 = `${bCode.toUpperCase()}_${aCode.toUpperCase()}`;
            const dirValue1 = (0, exports.roundAmount)(bRate / aRate);
            const dirValue2 = (0, exports.roundAmount)(aRate / bRate);
            if ((0, exports.isValidRate)(dirValue1) && (0, exports.isValidRate)(dirValue2)) {
                return Object.assign(Object.assign({}, dirs), { [dirKey1]: dirValue1, [dirKey2]: dirValue2 });
            }
            return dirs;
        }, {});
        return Object.assign(Object.assign({}, rates), fiatRatesForOneCrypto);
    }, {});
};
exports.matchRates = matchRates;
// obj1 = {a: [1,4], b: []};
// obj2 = {a: 7, b: 3}
// Output: { a: [ 1, 7 ], b: [ 2, 3 ] }
function getAnyFiveElements(obj) {
    // Get all entries (key-value pairs) from the object
    const entries = Object.entries(obj);
    // Shuffle the entries array
    for (let i = entries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    // Get the first 5 entries or less if the object has fewer than 5 elements
    return entries.slice(0, 5);
}
const mergeRates = (oldRates, newRates, limit) => {
    const merged = {};
    for (const key in newRates) {
        const oldRateList = (oldRates === null || oldRates === void 0 ? void 0 : oldRates[key]) || [];
        const newRate = newRates[key];
        // If the old list is already within the limit, just add the new rate
        if (oldRateList.length < limit) {
            merged[key] = [...oldRateList, newRate];
        }
        else {
            // Slice only if needed to avoid unnecessary copying
            merged[key] = [...oldRateList.slice(1 - limit), newRate];
        }
    }
    return merged;
};
exports.mergeRates = mergeRates;
