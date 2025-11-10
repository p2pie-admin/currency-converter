"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAlmostMatching = void 0;
function isAlmostMatching(str1, str2) {
    if (!str1 || !str2)
        return false;
    // If the lengths differ by more than one, they cannot be almost matching
    if (Math.abs(str1.length - str2.length) > 1) {
        return false;
    }
    let mismatchCount = 0;
    let i = 0;
    let j = 0;
    // Traverse both strings and count mismatches
    while (i < str1.length && j < str2.length) {
        if (str1[i] !== str2[j]) {
            mismatchCount++;
            if (mismatchCount > 1) {
                return false;
            }
            // If strings are of different lengths, increment the pointer of the longer string
            if (str1.length > str2.length) {
                i++;
            }
            else if (str1.length < str2.length) {
                j++;
            }
            else {
                i++;
                j++;
            }
        }
        else {
            i++;
            j++;
        }
    }
    // If there's one extra character at the end of either string
    if (i < str1.length || j < str2.length) {
        mismatchCount++;
    }
    return mismatchCount <= 1;
}
exports.isAlmostMatching = isAlmostMatching;
